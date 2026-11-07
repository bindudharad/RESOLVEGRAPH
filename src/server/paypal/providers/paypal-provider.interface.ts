/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CreatePayPalOrderParams {
  referenceId: string;
  amountMinor: number;
  currency?: string;
  intent?: 'CAPTURE' | 'AUTHORIZE';
  items?: Array<{
    name: string;
    quantity: number;
    unitAmountMinor: number;
    sku?: string;
  }>;
  customId?: string;
  invoiceId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: string;
  purchase_units: Array<{
    reference_id?: string;
    amount: {
      currency_code: string;
      value: string;
      breakdown?: any;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
    };
    custom_id?: string;
    invoice_id?: string;
  }>;
  links?: Array<{ href: string; rel: string; method: string }>;
}

export interface PayPalCaptureResponse {
  id: string; // Capture ID
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
  amount: {
    value: string;
    currency_code: string;
  };
  final_capture?: boolean;
  seller_protection?: {
    status: string;
    dispute_categories?: string[];
  };
  seller_receivable_breakdown?: {
    gross_amount: { value: string; currency_code: string };
    paypal_fee?: { value: string; currency_code: string };
    net_amount?: { value: string; currency_code: string };
  };
  create_time?: string;
  update_time?: string;
}

export interface PayPalRefundParams {
  captureId: string;
  amountMinor?: number; // Omit for full refund
  currency?: string;
  noteToPayer?: string;
  invoiceId?: string;
}

export interface PayPalRefundResponse {
  id: string; // Refund ID
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED';
  amount: {
    value: string;
    currency_code: string;
  };
  note_to_payer?: string;
  create_time?: string;
  update_time?: string;
}

export interface VerifyWebhookSignatureParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: Record<string, any>;
}

export interface PayPalDisputeSummary {
  dispute_id: string;
  create_time: string;
  update_time: string;
  dispute_amount: {
    currency_code: string;
    value: string;
  };
  status: string;
  dispute_reason: string;
  dispute_life_cycle_stage: string;
  disputed_transactions?: Array<{
    seller_transaction_id?: string;
    buyer_transaction_id?: string;
    gross_amount?: { currency_code: string; value: string };
  }>;
  seller_response_due_date?: string;
}

export interface PayPalDisputeDetail extends PayPalDisputeSummary {
  dispute_channel?: string;
  allowed_response_actions?: string[];
  messages?: Array<{
    posted_by: string;
    time_posted: string;
    content: string;
  }>;
  offer?: any;
  refund_details?: any;
  evidence?: any[];
}

export interface DisputeEvidenceSubmission {
  evidence_type: string;
  evidence_info?: {
    tracking_info?: Array<{ carrier_name: string; tracking_number: string }>;
  };
  notes?: string;
  documents?: Array<{
    name: string;
    url?: string;
  }>;
}

export interface IPayPalProvider {
  createOrder(params: CreatePayPalOrderParams, idempotencyKey?: string): Promise<PayPalOrderResponse>;
  getOrder(orderId: string): Promise<PayPalOrderResponse>;
  captureOrder(orderId: string, idempotencyKey?: string): Promise<PayPalCaptureResponse>;
  getCapture(captureId: string): Promise<PayPalCaptureResponse>;
  refundCapture(params: PayPalRefundParams, idempotencyKey: string): Promise<PayPalRefundResponse>;
  getRefund(refundId: string): Promise<PayPalRefundResponse>;
  verifyWebhookSignature(params: VerifyWebhookSignatureParams): Promise<boolean>;
  listDisputes(params?: { disputeState?: string; page?: number }): Promise<{ items: PayPalDisputeSummary[]; total_items?: number }>;
  getDispute(disputeId: string): Promise<PayPalDisputeDetail>;
  submitDisputeEvidence(disputeId: string, evidence: DisputeEvidenceSubmission): Promise<any>;
  acceptDisputeClaim(disputeId: string, note?: string): Promise<any>;
}
