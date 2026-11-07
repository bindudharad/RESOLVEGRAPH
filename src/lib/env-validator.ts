/**
 * RESOLVEGRAPH — Environment Configuration Validator
 * 
 * Validates essential environment variables and fails safely during startup
 * if critical security, database, or payment secrets are missing or insecure.
 */

import 'dotenv/config';

export interface EnvValidationResult {
  isValid: boolean;
  environment: 'development' | 'test' | 'staging' | 'production';
  errors: string[];
  warnings: string[];
}

export class EnvValidator {
  /**
   * Validates runtime configuration against current execution environment.
   */
  public static validate(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
    const rawEnv = (env.NODE_ENV || 'development').toLowerCase();
    const environment: EnvValidationResult['environment'] =
      rawEnv === 'production'
        ? 'production'
        : rawEnv === 'staging'
        ? 'staging'
        : rawEnv === 'test'
        ? 'test'
        : 'development';

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Database Configuration
    if (!env.DATABASE_URL) {
      errors.push('DATABASE_URL is missing. A valid database connection string is required.');
    } else if (environment === 'production' && env.DATABASE_URL.startsWith('file:')) {
      errors.push('Production deployment cannot use local SQLite file storage. A managed PostgreSQL DATABASE_URL is required.');
    }

    // 2. Authentication Secrets (Better-Auth)
    const authSecret = env.BETTER_AUTH_SECRET || '';
    if (!authSecret) {
      errors.push('BETTER_AUTH_SECRET is missing. Required for session encryption and CSRF tokens.');
    } else if (authSecret.length < 32) {
      errors.push(`BETTER_AUTH_SECRET must be at least 32 characters long (current length: ${authSecret.length}).`);
    } else if (
      environment === 'production' &&
      (authSecret.includes('dev-') || authSecret.includes('change-this') || authSecret.includes('placeholder'))
    ) {
      errors.push('BETTER_AUTH_SECRET in production cannot contain default placeholder or development keywords.');
    }

    // 3. Application URL & Security
    const appUrl = env.NEXT_PUBLIC_APP_URL || '';
    if (!appUrl) {
      warnings.push('NEXT_PUBLIC_APP_URL is not set. Defaulting to origin in client requests.');
    } else if (environment === 'production' && !appUrl.startsWith('https://')) {
      errors.push(`NEXT_PUBLIC_APP_URL in production must use HTTPS (received: ${appUrl}).`);
    }

    // 4. PayPal Configuration & Safety Gates
    const paypalLive = env.PAYPAL_LIVE_ENABLED === 'true';
    const paypalEnv = (env.PAYPAL_ENV || 'sandbox').toLowerCase();

    if (paypalLive) {
      if (paypalEnv !== 'live') {
        errors.push('PAYPAL_LIVE_ENABLED is set to true, but PAYPAL_ENV is not set to "live". Conflicting payment settings.');
      }
      if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
        errors.push('Live PayPal transactions enabled, but PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing.');
      }
      if (environment !== 'production') {
        errors.push('PAYPAL_LIVE_ENABLED is strictly forbidden in non-production environments (development/staging/test).');
      }
    }

    // 5. AI Processing Configuration
    const aiEnabled = env.AI_PROCESSING_ENABLED === 'true';
    const aiProvider = (env.AI_PROVIDER || 'test').toLowerCase();

    if (aiEnabled && aiProvider === 'openai' && !env.OPENAI_API_KEY) {
      errors.push('AI_PROCESSING_ENABLED is true with provider "openai", but OPENAI_API_KEY is missing.');
    }

    return {
      isValid: errors.length === 0,
      environment,
      errors,
      warnings,
    };
  }

  /**
   * Asserts environment validity on startup. Logs warnings and throws on fatal errors in production/staging.
   */
  public static assertStartupValid(): void {
    const result = this.validate();

    if (result.warnings.length > 0) {
      console.warn('[EnvValidator] Environment Warnings:\n' + result.warnings.map((w) => `  - ${w}`).join('\n'));
    }

    if (!result.isValid) {
      const msg = '[EnvValidator] FATAL Configuration Errors:\n' + result.errors.map((e) => `  - ${e}`).join('\n');
      console.error(msg);
      if (result.environment === 'production' || result.environment === 'staging') {
        throw new Error(msg);
      }
    }
  }
}
