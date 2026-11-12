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
import { toDecimalString } from '../utils/money';
import { PayPalApiError } from '../errors/paypal-error';
import { prisma } from '@/lib/prisma';

interface MockStoredOrder {
  id: string;
  params: CreatePayPalOrderParams;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  captureId?: string;
  createTime: string;
}

interface MockStoredCapture {
  id: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
  refundedMinor: number;
  createTime: string;
}

interface MockStoredRefund {
  id: string;
  captureId: string;
  amountMinor: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED';
  noteToPayer?: string;
  createTime: string;
}

export class PayPalMockProvider implements IPayPalProvider {
  private static orders = new Map<string, MockStoredOrder>();
  private static captures = new Map<string, MockStoredCapture>();
  private static refunds = new Map<string, MockStoredRefund>();
  private static disputes = new Map<string, PayPalDisputeDetail>();
  private static operations = new Map<string, any>(); // Request-Id -> response

  public static reset(): void {
    this.orders.clear();
    this.captures.clear();
    this.refunds.clear();
    this.disputes.clear();
    this.operations.clear();
  }

  public async createOrder(
    params: CreatePayPalOrderParams,
    idempotencyKey?: string
  ): Promise<PayPalOrderResponse> {
    if (idempotencyKey && PayPalMockProvider.operations.has(idempotencyKey)) {
      return PayPalMockProvider.operations.get(idempotencyKey);
    }

    const orderId = `MOCK-ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const currency = (params.currency || 'USD').toUpperCase();
    const valueStr = toDecimalString(params.amountMinor, currency);

    const storedOrder: MockStoredOrder = {
      id: orderId,
      params,
      status: 'CREATED',
      createTime: new Date().toISOString(),
    };

    PayPalMockProvider.orders.set(orderId, storedOrder);

    const response: PayPalOrderResponse = {
      id: orderId,
      status: 'CREATED',
      intent: params.intent || 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.referenceId,
          amount: {
            currency_code: currency,
            value: valueStr,
          },
          custom_id: params.customId,
          invoice_id: params.invoiceId,
        },
      ],
      links: [
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
          rel: 'approve',
          method: 'GET',
        },
      ],
    };

    if (idempotencyKey) {
      PayPalMockProvider.operations.set(idempotencyKey, response);
    }

    return response;
  }

  public async getOrder(orderId: string): Promise<PayPalOrderResponse> {
    const order = PayPalMockProvider.orders.get(orderId);
    if (!order) {
      throw new PayPalApiError({
        message: `Order not found: ${orderId}`,
        statusCode: 404,
        paypalIssueCode: 'RESOURCE_NOT_FOUND',
      });
    }

    const currency = (order.params.currency || 'USD').toUpperCase();
    return {
      id: order.id,
      status: order.status,
      intent: order.params.intent || 'CAPTURE',
      purchase_units: [
        {
          reference_id: order.params.referenceId,
          amount: {
            currency_code: currency,
            value: toDecimalString(order.params.amountMinor, currency),
          },
          payments: order.captureId
            ? {
                captures: [
                  {
                    id: order.captureId,
                    status: 'COMPLETED',
                    amount: {
                      currency_code: currency,
                      value: toDecimalString(order.params.amountMinor, currency),
                    },
                  },
                ],
              }
            : undefined,
        },
      ],
    };
  }

  public async captureOrder(
    orderId: string,
    idempotencyKey?: string
  ): Promise<PayPalCaptureResponse> {
    if (idempotencyKey && PayPalMockProvider.operations.has(idempotencyKey)) {
      return PayPalMockProvider.operations.get(idempotencyKey);
    }

    const order = PayPalMockProvider.orders.get(orderId);
    if (!order) {
      throw new PayPalApiError({
        message: `Order not found for capture: ${orderId}`,
        statusCode: 404,
        paypalIssueCode: 'RESOURCE_NOT_FOUND',
      });
    }

    if (order.status === 'COMPLETED') {
      throw new PayPalApiError({
        message: `Order ${orderId} has already been captured.`,
        statusCode: 422,
        paypalIssueCode: 'ORDER_ALREADY_CAPTURED',
      });
    }

    const captureId = `MOCK-CAP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const currency = (order.params.currency || 'USD').toUpperCase();
    const valueStr = toDecimalString(order.params.amountMinor, currency);

    order.status = 'COMPLETED';
    order.captureId = captureId;

    const storedCapture: MockStoredCapture = {
      id: captureId,
      orderId,
      amountMinor: order.params.amountMinor,
      currency,
      status: 'COMPLETED',
      refundedMinor: 0,
      createTime: new Date().toISOString(),
    };

    PayPalMockProvider.captures.set(captureId, storedCapture);

    const response: PayPalCaptureResponse = {
      id: captureId,
      status: 'COMPLETED',
      amount: {
        value: valueStr,
        currency_code: currency,
      },
      final_capture: true,
      seller_protection: {
        status: 'ELIGIBLE',
        dispute_categories: ['ITEM_NOT_RECEIVED', 'UNAUTHORIZED_TRANSACTION'],
      },
      seller_receivable_breakdown: {
        gross_amount: { value: valueStr, currency_code: currency },
        paypal_fee: { value: '0.30', currency_code: currency },
        net_amount: {
          value: toDecimalString(Math.max(0, order.params.amountMinor - 30), currency),
          currency_code: currency,
        },
      },
      create_time: storedCapture.createTime,
      update_time: storedCapture.createTime,
    };

    if (idempotencyKey) {
      PayPalMockProvider.operations.set(idempotencyKey, response);
    }

    return response;
  }

  public async getCapture(captureId: string): Promise<PayPalCaptureResponse> {
    let capture = PayPalMockProvider.captures.get(captureId);
    if (!capture) {
      const dbPayment = await prisma.payPalPayment.findFirst({
        where: { captureId },
      });
      if (dbPayment && dbPayment.captureId) {
        capture = {
          id: dbPayment.captureId,
          orderId: dbPayment.providerOrderId,
          amountMinor: dbPayment.amountMinor,
          currency: dbPayment.currency,
          status: 'COMPLETED',
          refundedMinor: 0,
          createTime: dbPayment.capturedAt?.toISOString() || new Date().toISOString(),
        };
        PayPalMockProvider.captures.set(captureId, capture);
      }
    }

    if (!capture) {
      throw new PayPalApiError({
        message: `Capture not found: ${captureId}`,
        statusCode: 404,
        paypalIssueCode: 'RESOURCE_NOT_FOUND',
      });
    }

    return {
      id: capture.id,
      status: capture.status,
      amount: {
        value: toDecimalString(capture.amountMinor, capture.currency),
        currency_code: capture.currency,
      },
      create_time: capture.createTime,
      update_time: capture.createTime,
    };
  }

  public async refundCapture(
    params: PayPalRefundParams,
    idempotencyKey: string
  ): Promise<PayPalRefundResponse> {
    if (PayPalMockProvider.operations.has(idempotencyKey)) {
      return PayPalMockProvider.operations.get(idempotencyKey);
    }

    let capture = PayPalMockProvider.captures.get(params.captureId);
    if (!capture) {
      const dbPayment = await prisma.payPalPayment.findFirst({
        where: { captureId: params.captureId },
      });
      if (dbPayment && dbPayment.captureId) {
        capture = {
          id: dbPayment.captureId,
          orderId: dbPayment.providerOrderId,
          amountMinor: dbPayment.amountMinor,
          currency: dbPayment.currency,
          status: 'COMPLETED',
          refundedMinor: 0,
          createTime: dbPayment.capturedAt?.toISOString() || new Date().toISOString(),
        };
        PayPalMockProvider.captures.set(params.captureId, capture);
      }
    }

    if (!capture) {
      throw new PayPalApiError({
        message: `Capture not found for refund: ${params.captureId}`,
        statusCode: 404,
        paypalIssueCode: 'RESOURCE_NOT_FOUND',
      });
    }

    const availableRefundable = capture.amountMinor - capture.refundedMinor;
    const requestedRefundMinor =
      params.amountMinor !== undefined ? params.amountMinor : availableRefundable;

    if (requestedRefundMinor <= 0) {
      throw new PayPalApiError({
        message: `Refund amount must be greater than zero.`,
        statusCode: 422,
        paypalIssueCode: 'INVALID_REFUND_AMOUNT',
      });
    }

    if (requestedRefundMinor > availableRefundable) {
      throw new PayPalApiError({
        message: `Refund amount (${requestedRefundMinor}) exceeds remaining capture balance (${availableRefundable}).`,
        statusCode: 422,
        paypalIssueCode: 'REFUND_AMOUNT_EXCEEDED',
      });
    }

    capture.refundedMinor += requestedRefundMinor;
    if (capture.refundedMinor >= capture.amountMinor) {
      capture.status = 'REFUNDED';
    } else {
      capture.status = 'PARTIALLY_REFUNDED';
    }

    const refundId = `MOCK-REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const valueStr = toDecimalString(requestedRefundMinor, capture.currency);

    const storedRefund: MockStoredRefund = {
      id: refundId,
      captureId: params.captureId,
      amountMinor: requestedRefundMinor,
      currency: capture.currency,
      status: 'COMPLETED',
      noteToPayer: params.noteToPayer,
      createTime: new Date().toISOString(),
    };

    PayPalMockProvider.refunds.set(refundId, storedRefund);

    const response: PayPalRefundResponse = {
      id: refundId,
      status: 'COMPLETED',
      amount: {
        value: valueStr,
        currency_code: capture.currency,
      },
      note_to_payer: params.noteToPayer,
      create_time: storedRefund.createTime,
      update_time: storedRefund.createTime,
    };

    PayPalMockProvider.operations.set(idempotencyKey, response);
    return response;
  }

  public async getRefund(refundId: string): Promise<PayPalRefundResponse> {
    const refund = PayPalMockProvider.refunds.get(refundId);
    if (!refund) {
      throw new PayPalApiError({
        message: `Refund not found: ${refundId}`,
        statusCode: 404,
        paypalIssueCode: 'RESOURCE_NOT_FOUND',
      });
    }

    return {
      id: refund.id,
      status: refund.status,
      amount: {
        value: toDecimalString(refund.amountMinor, refund.currency),
        currency_code: refund.currency,
      },
      note_to_payer: refund.noteToPayer,
      create_time: refund.createTime,
      update_time: refund.createTime,
    };
  }

  public async verifyWebhookSignature(
    params: VerifyWebhookSignatureParams
  ): Promise<boolean> {
    // In mock mode, if transmissionSig contains "INVALID", return false, else return true
    if (params.transmissionSig?.includes('INVALID')) {
      return false;
    }
    return Boolean(params.webhookId && params.transmissionId && params.transmissionSig);
  }

  public async listDisputes(params?: {
    disputeState?: string;
    page?: number;
  }): Promise<{ items: PayPalDisputeSummary[]; total_items?: number }> {
    void params;
    const items = Array.from(PayPalMockProvider.disputes.values()).map((d) => ({
      dispute_id: d.dispute_id,
      create_time: d.create_time,
      update_time: d.update_time,
      dispute_amount: d.dispute_amount,
      status: d.status,
      dispute_reason: d.dispute_reason,
      dispute_life_cycle_stage: d.dispute_life_cycle_stage,
      seller_response_due_date: d.seller_response_due_date,
    }));

    return {
      items,
      total_items: items.length,
    };
  }

  public async getDispute(disputeId: string): Promise<PayPalDisputeDetail> {
    const dispute = PayPalMockProvider.disputes.get(disputeId);
    if (!dispute) {
      // Generate default mock dispute if requested
      const mockDispute: PayPalDisputeDetail = {
        dispute_id: disputeId,
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
        dispute_amount: { currency_code: 'USD', value: '49.99' },
        status: 'WAITING_FOR_SELLER_RESPONSE',
        dispute_reason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
        dispute_life_cycle_stage: 'INQUIRY',
        allowed_response_actions: ['ACCEPT_CLAIM', 'MAKE_OFFER', 'PROVIDE_EVIDENCE', 'SEND_MESSAGE'],
        seller_response_due_date: new Date(Date.now() + 10 * 86400000).toISOString(),
        messages: [
          {
            posted_by: 'BUYER',
            time_posted: new Date().toISOString(),
            content: 'The item arrived damaged with scratches on the display.',
          },
        ],
      };
      PayPalMockProvider.disputes.set(disputeId, mockDispute);
      return mockDispute;
    }

    return dispute;
  }

  public async submitDisputeEvidence(
    disputeId: string,
    evidence: DisputeEvidenceSubmission
  ): Promise<any> {
    const dispute = await this.getDispute(disputeId);
    if (!dispute.evidence) dispute.evidence = [];
    dispute.evidence.push(evidence);
    dispute.status = 'UNDER_REVIEW';
    return { status: 'SUCCESS', dispute_id: disputeId };
  }

  public async acceptDisputeClaim(disputeId: string): Promise<any> {
    const dispute = await this.getDispute(disputeId);
    dispute.status = 'RESOLVED';
    dispute.allowed_response_actions = [];
    return { status: 'CLAIM_ACCEPTED', dispute_id: disputeId };
  }

  /**
   * Helper for tests to seed a mock dispute
   */
  public static seedDispute(dispute: PayPalDisputeDetail): void {
    this.disputes.set(dispute.dispute_id, dispute);
  }
}
