/**
 * RESOLVEGRAPH — Feature Flags & Operational Safety Toggles
 * 
 * Centrally governs feature availability across environments, enforcing
 * strict financial safeguards (e.g. blocking live payments outside production).
 */

export interface FeatureFlagsState {
  aiAnalysisEnabled: boolean;
  agentCopilotEnabled: boolean;
  graphExplorerEnabled: boolean;
  paypalSandboxEnabled: boolean;
  paypalLiveEnabled: boolean;
  merchantPilotEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
}

export class FeatureFlags {
  /**
   * Evaluates boolean environment variables with safe defaults.
   */
  private static getBoolean(key: string, defaultValue = false): boolean {
    const val = process.env[key];
    if (val === undefined || val === '') return defaultValue;
    return val.toLowerCase() === 'true' || val === '1';
  }

  public static isAiAnalysisEnabled(): boolean {
    return this.getBoolean('FEATURE_AI_ANALYSIS', true);
  }

  public static isAgentCopilotEnabled(): boolean {
    return this.getBoolean('FEATURE_AGENT_COPILOT', true);
  }

  public static isGraphExplorerEnabled(): boolean {
    return this.getBoolean('FEATURE_GRAPH_EXPLORER', true);
  }

  public static isPayPalSandboxEnabled(): boolean {
    return this.getBoolean('FEATURE_PAYPAL_SANDBOX', true);
  }

  /**
   * Hard financial guardrail: Live PayPal payments can NEVER be enabled
   * outside of an explicitly declared production environment.
   */
  public static isPayPalLiveEnabled(): boolean {
    const isProd = process.env.NODE_ENV === 'production';
    const explicitFlag = this.getBoolean('FEATURE_PAYPAL_LIVE', false);
    const legacyFlag = this.getBoolean('PAYPAL_LIVE_ENABLED', false);

    if (!isProd) {
      return false; // Hard block: Never permit live payments in dev, staging, or test
    }

    return explicitFlag || legacyFlag;
  }

  public static isMerchantPilotEnabled(): boolean {
    return this.getBoolean('FEATURE_MERCHANT_PILOT', true);
  }

  public static isAdvancedAnalyticsEnabled(): boolean {
    return this.getBoolean('FEATURE_ADVANCED_ANALYTICS', true);
  }

  /**
   * Returns current feature flag snapshot.
   */
  public static getAllFlags(): FeatureFlagsState {
    return {
      aiAnalysisEnabled: this.isAiAnalysisEnabled(),
      agentCopilotEnabled: this.isAgentCopilotEnabled(),
      graphExplorerEnabled: this.isGraphExplorerEnabled(),
      paypalSandboxEnabled: this.isPayPalSandboxEnabled(),
      paypalLiveEnabled: this.isPayPalLiveEnabled(),
      merchantPilotEnabled: this.isMerchantPilotEnabled(),
      advancedAnalyticsEnabled: this.isAdvancedAnalyticsEnabled(),
    };
  }

  public static getAll(): FeatureFlagsState {
    return this.getAllFlags();
  }
}
