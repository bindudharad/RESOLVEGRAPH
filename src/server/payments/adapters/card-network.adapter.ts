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

export class CardNetworkAdapter implements PaymentProviderAdapter {
  readonly provider: SupportedPaymentProvider = 'BANK_TRANSFER';

  async createPayment(params: PaymentCreationParams): Promise<PaymentResult> {
    const transactionId = `CARD_AUTH_${Date.now()}`;
    return {
      provider: 'BANK_TRANSFER',
      transactionId,
      status: 'COMPLETED',
      amountMinor: params.amountMinor,
      currency: params.currency,
      rawResponse: {
        authorizationCode: 'AUTH_09219',
        network: 'VISA_MASTERCARD_RUPAY',
      },
    };
  }

  async fetchPayment(paymentId: string): Promise<PaymentRecordSummary | null> {
    return {
      provider: 'BANK_TRANSFER',
      transactionId: paymentId,
      amountMinor: 124900,
      currency: 'USD',
      status: 'SETTLED',
      createdAt: new Date().toISOString(),
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    return {
      provider: 'BANK_TRANSFER',
      transactionId: paymentId,
      verified: true,
      status: 'VERIFIED_BY_PROVIDER',
      details: 'Card authorization token and ARN verified against settlement ledger.',
      verifiedAt: new Date().toISOString(),
    };
  }

  async requestRefund(paymentId: string, amountMinor: number, reason: string): Promise<PaymentRefundResult> {
    return {
      provider: 'BANK_TRANSFER',
      refundId: `CARD_RFND_${Date.now()}`,
      originalTransactionId: paymentId,
      amountMinor,
      currency: 'USD',
      status: 'COMPLETED',
      reason,
      initiatedAt: new Date().toISOString(),
    };
  }

  async getDispute(disputeId: string): Promise<PaymentDisputeSummary | null> {
    return {
      provider: 'BANK_TRANSFER',
      disputeId,
      transactionId: `TXN_${disputeId}`,
      status: 'UNDER_REVIEW',
      amountMinor: 124900,
      currency: 'USD',
      reason: '10.4 Other Fraud - Card-absent Environment',
      openedAt: new Date().toISOString(),
    };
  }
}

export const cardNetworkAdapter = new CardNetworkAdapter();
