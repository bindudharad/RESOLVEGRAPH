/**
 * RESOLVEGRAPH — Production Structured JSON Logger
 * 
 * Provides structured JSON logging with:
 * - Correlation IDs (traceId, caseId, actorId)
 * - Automatic redaction of sensitive credentials, PANs, CVVs, and secrets
 * - Standardized log levels (debug, info, warn, error)
 * - ISO-8601 timestamps and process metadata
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  caseId?: string;
  actorId?: string;
  organizationId?: string;
  service?: string;
  durationMs?: number;
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /auth/i,
  /apikey/i,
  /credit[-_]?card/i,
  /pan/i,
  /cvv/i,
  /ssn/i,
  /cookie/i,
];

export class Logger {
  private static logLevelPriority: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  private static currentLogLevel(): LogLevel {
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    return this.logLevelPriority[envLevel] !== undefined ? envLevel : 'info';
  }

  /**
   * Deeply sanitizes objects to prevent leaking secrets, credentials, or cardholder PANs.
   */
  public static sanitize(value: unknown): unknown {
    if (value === null || value === undefined) return value;

    if (typeof value === 'string') {
      // Redact credit card numbers (13-19 digits with optional hyphens/spaces)
      let cleaned = value.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_PAN]');
      // Redact Bearer tokens
      cleaned = cleaned.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED_TOKEN]');
      return cleaned;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.sanitize(v));
    }

    if (typeof value === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        if (isSensitiveKey) {
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = this.sanitize(val);
        }
      }
      return sanitizedObj;
    }

    return value;
  }

  private static formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const sanitizedCtx = context ? (this.sanitize(context) as LogContext) : {};

    const payload = {
      timestamp,
      level: level.toUpperCase(),
      message,
      environment: process.env.NODE_ENV || 'development',
      ...sanitizedCtx,
    };

    const jsonString = JSON.stringify(payload);

    if (level === 'error') {
      console.error(jsonString);
    } else if (level === 'warn') {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  public static debug(message: string, context?: LogContext): void {
    if (this.logLevelPriority[this.currentLogLevel()] <= 10) {
      this.formatLog('debug', message, context);
    }
  }

  public static info(message: string, context?: LogContext): void {
    if (this.logLevelPriority[this.currentLogLevel()] <= 20) {
      this.formatLog('info', message, context);
    }
  }

  public static warn(message: string, context?: LogContext): void {
    if (this.logLevelPriority[this.currentLogLevel()] <= 30) {
      this.formatLog('warn', message, context);
    }
  }

  public static error(message: string, error?: unknown, context?: LogContext): void {
    const errorDetails: Record<string, unknown> = {};
    if (error instanceof Error) {
      errorDetails.errorMessage = error.message;
      errorDetails.errorStack = error.stack;
      errorDetails.errorName = error.name;
    } else if (error) {
      errorDetails.errorRaw = String(error);
    }

    this.formatLog('error', message, { ...context, ...errorDetails });
  }
}
