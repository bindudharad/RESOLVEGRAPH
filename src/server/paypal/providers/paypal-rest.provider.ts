/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IPayPalProvider,
  CreatePayPalOrderParams,
  PayPalOrderResponse,
  PayPalCaptureResponse,
  PayPalRefundParams,
  PayPalRefundResponse,
  VerifyWebhookSignatureParams,
  PayPalDisputeSummary,
  PayPalDisputeDetail,
  DisputeEvidenceSubmission,
} from './paypal-provider.interface';
import { PayPalClient } from '../paypal-client';
import { toDecimalString } from '../utils/money';

export class PayPalRestProvider implements IPayPalProvider {
  public async createOrder(
    params: CreatePayPalOrderParams,
    idempotencyKey?: string
  ): Promise<PayPalOrderResponse> {
    const currency = (params.currency || 'USD').toUpperCase();
    const valueStr = toDecimalString(params.amountMinor, currency);

    const purchaseUnit: any = {
      reference_id: params.referenceId,
      amount: {
        currency_code: currency,
        value: valueStr,
      },
    };

    if (params.customId) purchaseUnit.custom_id = params.customId;
    if (params.invoiceId) purchaseUnit.invoice_id = params.invoiceId;

    if (params.items && params.items.length > 0) {
      let itemTotalMinor = 0;
      purchaseUnit.items = params.items.map((item) => {
        const itemTotal = item.unitAmountMinor * item.quantity;
        itemTotalMinor += itemTotal;
        return {
          name: item.name.slice(0, 127),
          unit_amount: {
            currency_code: currency,
            value: toDecimalString(item.unitAmountMinor, currency),
          },
          quantity: String(item.quantity),
          sku: item.sku ? item.sku.slice(0, 127) : undefined,
        };
      });

      purchaseUnit.amount.breakdown = {
        item_total: {
          currency_code: currency,
          value: toDecimalString(itemTotalMinor, currency),
        },
      };
    }

    const payload: any = {
      intent: params.intent || 'CAPTURE',
      purchase_units: [purchaseUnit],
    };

    if (params.returnUrl || params.cancelUrl) {
      payload.payment_source = {
        paypal: {
          experience_context: {
            return_url: params.returnUrl,
            cancel_url: params.cancelUrl,
            user_action: 'PAY_NOW',
          },
        },
      };
    }

    return PayPalClient.request<PayPalOrderResponse>({
      method: 'POST',
      path: '/v2/checkout/orders',
      body: payload,
      requestId: idempotencyKey,
      prefer: 'return=representation',
    });
  }

  public async getOrder(orderId: string): Promise<PayPalOrderResponse> {
    return PayPalClient.request<PayPalOrderResponse>({
      method: 'GET',
      path: `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    });
  }

  public async captureOrder(
    orderId: string,
    idempotencyKey?: string
  ): Promise<PayPalCaptureResponse> {
    const response = await PayPalClient.request<any>({
      method: 'POST',
      path: `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      requestId: idempotencyKey,
      prefer: 'return=representation',
    });

    // Locate capture in purchase_units
    const capture =
      response.purchase_units?.[0]?.payments?.captures?.[0] || response;

    return {
      id: capture.id || orderId,
      status: capture.status || response.status,
      amount: capture.amount || { value: '0.00', currency_code: 'USD' },
      final_capture: capture.final_capture ?? true,
      seller_protection: capture.seller_protection,
      seller_receivable_breakdown: capture.seller_receivable_breakdown,
      create_time: capture.create_time || response.create_time,
      update_time: capture.update_time || response.update_time,
    };
  }

  public async getCapture(captureId: string): Promise<PayPalCaptureResponse> {
    return PayPalClient.request<PayPalCaptureResponse>({
      method: 'GET',
      path: `/v2/payments/captures/${encodeURIComponent(captureId)}`,
    });
  }

  public async refundCapture(
    params: PayPalRefundParams,
    idempotencyKey: string
  ): Promise<PayPalRefundResponse> {
    const payload: any = {};
    if (params.amountMinor !== undefined && params.amountMinor > 0) {
      const currency = (params.currency || 'USD').toUpperCase();
      payload.amount = {
        currency_code: currency,
        value: toDecimalString(params.amountMinor, currency),
      };
    }

    if (params.noteToPayer) payload.note_to_payer = params.noteToPayer.slice(0, 255);
    if (params.invoiceId) payload.invoice_id = params.invoiceId.slice(0, 127);

    return PayPalClient.request<PayPalRefundResponse>({
      method: 'POST',
      path: `/v2/payments/captures/${encodeURIComponent(params.captureId)}/refund`,
      body: payload,
      requestId: idempotencyKey,
      prefer: 'return=representation',
    });
  }

  public async getRefund(refundId: string): Promise<PayPalRefundResponse> {
    return PayPalClient.request<PayPalRefundResponse>({
      method: 'GET',
      path: `/v2/payments/refunds/${encodeURIComponent(refundId)}`,
    });
  }

  public async verifyWebhookSignature(
    params: VerifyWebhookSignatureParams
  ): Promise<boolean> {
    try {
      const body = {
        auth_algo: params.authAlgo,
        cert_url: params.certUrl,
        transmission_id: params.transmissionId,
        transmission_sig: params.transmissionSig,
        transmission_time: params.transmissionTime,
        webhook_id: params.webhookId,
        webhook_event: params.webhookEvent,
      };

      const result = await PayPalClient.request<{ verification_status: string }>({
        method: 'POST',
        path: '/v1/notifications/verify-webhook-signature',
        body,
      });

      return result.verification_status === 'SUCCESS';
    } catch {
      return false;
    }
  }

  public async listDisputes(params?: {
    disputeState?: string;
    page?: number;
  }): Promise<{ items: PayPalDisputeSummary[]; total_items?: number }> {
    const query = new URLSearchParams();
    if (params?.disputeState) query.set('disputed_transaction_id', params.disputeState);
    if (params?.page) query.set('page_size', '20');

    const path = `/v1/customer/disputes${query.toString() ? `?${query.toString()}` : ''}`;
    return PayPalClient.request<{ items: PayPalDisputeSummary[]; total_items?: number }>({
      method: 'GET',
      path,
    });
  }

  public async getDispute(disputeId: string): Promise<PayPalDisputeDetail> {
    return PayPalClient.request<PayPalDisputeDetail>({
      method: 'GET',
      path: `/v1/customer/disputes/${encodeURIComponent(disputeId)}`,
    });
  }

  public async submitDisputeEvidence(
    disputeId: string,
    evidence: DisputeEvidenceSubmission
  ): Promise<any> {
    return PayPalClient.request<any>({
      method: 'POST',
      path: `/v1/customer/disputes/${encodeURIComponent(disputeId)}/provide-evidence`,
      body: evidence,
    });
  }

  public async acceptDisputeClaim(disputeId: string, note?: string): Promise<any> {
    return PayPalClient.request<any>({
      method: 'POST',
      path: `/v1/customer/disputes/${encodeURIComponent(disputeId)}/accept-claim`,
      body: note ? { note } : {},
    });
  }
}
