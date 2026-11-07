export interface PayPalErrorDetail {
  field?: string;
  value?: string;
  issue?: string;
  description?: string;
  location?: string;
}

export class PayPalApiError extends Error {
  public readonly statusCode: number;
  public readonly paypalDebugId?: string;
  public readonly paypalIssueCode?: string;
  public readonly details?: PayPalErrorDetail[];
  public readonly isRetryable: boolean;

  constructor(params: {
    message: string;
    statusCode?: number;
    paypalDebugId?: string;
    paypalIssueCode?: string;
    details?: PayPalErrorDetail[];
    isRetryable?: boolean;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'PayPalApiError';
    this.statusCode = params.statusCode ?? 500;
    this.paypalDebugId = params.paypalDebugId;
    this.paypalIssueCode = params.paypalIssueCode;
    this.details = params.details;
    this.isRetryable = params.isRetryable ?? (this.statusCode >= 500 && this.statusCode < 600);

    if (params.cause) {
      this.cause = params.cause;
    }
  }

  /**
   * Sanitized payload safe for client-facing API responses.
   * Strips internal authorization tokens, stack traces, and private endpoints.
   */
  public toSafeResponse() {
    return {
      error: 'PAYPAL_ERROR',
      message: this.message,
      statusCode: this.statusCode,
      paypalIssueCode: this.paypalIssueCode || 'UNKNOWN_ISSUE',
      paypalDebugId: this.paypalDebugId || null,
      details: this.details?.map((d) => ({
        issue: d.issue,
        description: d.description,
        field: d.field,
      })) || [],
    };
  }
}
