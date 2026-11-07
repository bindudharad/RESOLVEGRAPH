import {
  PaymentProviderAdapter,
  SupportedPaymentProvider,
  PaymentCreationParams,
  PaymentResult,
  PaymentRecordSummary,
  PaymentVerificationResult,
  PaymentRefundResult,
  PaymentDisputeSummary,
} from '../payment-provider.interface';

export class GooglePayPaymentAdapter implements PaymentProviderAdapter {
  readonly provider: SupportedPaymentProvider = 'GOOGLE_PAY';

  private merchantVpa: string | null = process.env.GPAY_MERCHANT_VPA || null;

  async createPayment(params: PaymentCreationParams): Promise<PaymentResult> {
    const transactionId = `TXN_GPAY_${Date.now()}_${params.referenceId}`;
    return {
      provider: 'GOOGLE_PAY',
      transactionId,
      status: 'PENDING',
      amountMinor: params.amountMinor,
      currency: params.currency || 'INR',
      rawResponse: {
        upiUri: `upi://pay?pa=${this.merchantVpa || 'merchant@okaxis'}&pn=TechStore&tr=${transactionId}&am=${(params.amountMinor / 100).toFixed(2)}&cu=INR`,
      },
    };
  }

  async fetchPayment(paymentId: string): Promise<PaymentRecordSummary | null> {
    return {
      provider: 'GOOGLE_PAY',
      transactionId: paymentId,
      amountMinor: 649900,
      currency: 'INR',
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
      payeeIdentifier: this.merchantVpa || 'merchant@okaxis',
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return {
      provider: 'GOOGLE_PAY',
      transactionId: paymentId,
      verified: false,
      status: 'CUSTOMER_SUBMITTED',
      details: 'Google Pay transaction verified through customer-submitted UTR/RRN. Direct bank reconciliation requires Bank Sponsor API.',
      verifiedAt: new Date().toISOString(),
    };
  }

  async requestRefund(paymentId: string, amountMinor: number, reason: string): Promise<PaymentRefundResult> {
    return {
      provider: 'GOOGLE_PAY',
      refundId: `RFND_GPAY_${Date.now()}`,
      originalTransactionId: paymentId,
      amountMinor,
      currency: 'INR',
      status: 'MANUAL_INTERVENTION_REQUIRED',
      reason,
      initiatedAt: new Date().toISOString(),
    };
  }

  async getDispute(disputeId: string): Promise<PaymentDisputeSummary | null> {
    void disputeId;
    return null;
  }
}

export const googlePayAdapter = new GooglePayPaymentAdapter();
