export type SupportedPaymentProvider =
  | 'PAYPAL'
  | 'PHONEPE'
  | 'GOOGLE_PAY'
  | 'PAYTM'
  | 'BHIM'
  | 'OTHER_UPI'
  | 'BANK_TRANSFER';

export type PaymentVerificationState =
  | 'CUSTOMER_SUBMITTED'
  | 'PENDING_PROVIDER'
  | 'VERIFIED_BY_PROVIDER'
  | 'REJECTED_BY_PROVIDER'
  | 'UNVERIFIABLE_WITHOUT_CREDENTIALS';

export interface PaymentCreationParams {
  referenceId: string;
  amountMinor: number;
  currency: string;
  description?: string;
  customerIdentifier?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  provider: SupportedPaymentProvider;
  transactionId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amountMinor: number;
  currency: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentRecordSummary {
  provider: SupportedPaymentProvider;
  transactionId: string;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
  payerIdentifier?: string;
  payeeIdentifier?: string;
}

export interface PaymentVerificationResult {
  provider: SupportedPaymentProvider;
  transactionId: string;
  verified: boolean;
  status: PaymentVerificationState;
  details: string;
  verifiedAt: string;
}

export interface PaymentRefundResult {
  provider: SupportedPaymentProvider;
  refundId: string;
  originalTransactionId: string;
  amountMinor: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'MANUAL_INTERVENTION_REQUIRED';
  reason?: string;
  initiatedAt: string;
}

export interface PaymentDisputeSummary {
  provider: SupportedPaymentProvider;
  disputeId: string;
  transactionId: string;
  status: string;
  amountMinor: number;
  currency: string;
  reason: string;
  openedAt: string;
}

export interface PaymentProviderAdapter {
  readonly provider: SupportedPaymentProvider;
  createPayment(params: PaymentCreationParams): Promise<PaymentResult>;
  fetchPayment(paymentId: string): Promise<PaymentRecordSummary | null>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  requestRefund(paymentId: string, amountMinor: number, reason: string): Promise<PaymentRefundResult>;
  getDispute(disputeId: string): Promise<PaymentDisputeSummary | null>;
}
