/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { CaseService } from '@/server/services/case.service';
import { EventType } from '@/generated/prisma/client';
import { toMinorUnits } from '../utils/money';
import { PayPalSyncService } from './paypal-sync.service';

export interface ProcessWebhookResult {
  status: 'PROCESSED' | 'ALREADY_PROCESSED' | 'IGNORED' | 'FAILED';
  eventId: string;
  eventType: string;
  message?: string;
}

export class WebhookProcessingService {
  /**
   * Processes a verified PayPal webhook notification idempotently.
   */
  public static async processEvent(eventPayload: any): Promise<ProcessWebhookResult> {
    const eventId = eventPayload.id;
    const eventType = eventPayload.event_type;
    const resourceType = eventPayload.resource_type || 'unknown';
    const resource = eventPayload.resource || {};
    const resourceId = resource.id || 'unknown';

    if (!eventId || !eventType) {
      throw new Error('Malformed webhook payload: missing id or event_type.');
    }

    // Check if event already processed
    const existing = await prisma.payPalWebhookEvent.findUnique({
      where: { paypalEventId: eventId },
    });

    if (existing && existing.processingStatus === 'PROCESSED') {
      return {
        status: 'ALREADY_PROCESSED',
        eventId,
        eventType,
        message: 'Event was already successfully processed.',
      };
    }

    // Record incoming event
    const webhookRecord = existing || (await prisma.payPalWebhookEvent.create({
      data: {
        paypalEventId: eventId,
        eventType,
        resourceType,
        resourceId,
        environment: process.env.PAYPAL_ENV || 'sandbox',
        receivedAt: new Date(),
        signatureVerifiedAt: new Date(),
        processingStatus: 'PENDING',
        normalizedPayload: JSON.stringify(eventPayload),
      },
    }));

    try {
      await this.dispatchHandler(eventType, resource);

      await prisma.payPalWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processingStatus: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      return {
        status: 'PROCESSED',
        eventId,
        eventType,
      };
    } catch (err: any) {
      await prisma.payPalWebhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processingStatus: 'FAILED',
          safeErrorCode: err.message?.slice(0, 100),
          attemptCount: { increment: 1 },
        },
      });

      throw err;
    }
  }

  private static async dispatchHandler(eventType: string, resource: any): Promise<void> {
    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        await this.handleOrderApproved(resource);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handleCaptureCompleted(resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.REVERSED':
        await this.handleCaptureReversedOrDenied(resource, eventType);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await this.handleCaptureRefunded(resource);
        break;

      case 'CUSTOMER.DISPUTE.CREATED':
      case 'CUSTOMER.DISPUTE.UPDATED':
      case 'CUSTOMER.DISPUTE.RESOLVED':
        await this.handleDisputeEvent(resource, eventType);
        break;

      default:
        // Other non-critical event types acknowledged without state change
        break;
    }
  }

  private static async handleOrderApproved(resource: any): Promise<void> {
    const orderId = resource.id;
    if (!orderId) return;

    const payment = await prisma.payPalPayment.findUnique({
      where: { providerOrderId: orderId },
      include: { commerceOrder: true },
    });

    if (payment) {
      await prisma.payPalPayment.update({
        where: { id: payment.id },
        data: { paymentStatus: 'APPROVED' },
      });

      await prisma.commerceOrder.update({
        where: { id: payment.commerceOrderId },
        data: { status: 'APPROVED' },
      });
    }
  }

  private static async handleCaptureCompleted(resource: any): Promise<void> {
    const captureId = resource.id;
    if (!captureId) return;

    // Check if capture already exists
    let payment = await prisma.payPalPayment.findUnique({
      where: { captureId },
      include: { commerceOrder: true },
    });

    // If not found by captureId, search by custom_id or invoice_id
    if (!payment && resource.custom_id) {
      payment = await prisma.payPalPayment.findFirst({
        where: {
          OR: [{ id: resource.custom_id }, { commerceOrderId: resource.custom_id }],
        },
        include: { commerceOrder: true },
      });
    }

    if (payment) {
      await prisma.payPalPayment.update({
        where: { id: payment.id },
        data: {
          captureId,
          paymentStatus: 'COMPLETED',
          capturedAt: resource.create_time ? new Date(resource.create_time) : new Date(),
        },
      });

      await prisma.commerceOrder.update({
        where: { id: payment.commerceOrderId },
        data: { status: 'CAPTURED' },
      });

      // Synchronize with Canonical Transaction Engine
      try {
        await PayPalSyncService.syncCapture({
          captureId,
          providerOrderId: payment.providerOrderId,
          orderNumber: payment.commerceOrder.orderNumber,
          amountMinor: payment.amountMinor,
          currency: payment.currency,
          status: 'COMPLETED',
          caseId: payment.commerceOrder.caseId,
          payerReference: payment.payerReference,
          payeeReference: payment.payeeReference,
          timestamp: resource.create_time ? new Date(resource.create_time) : new Date(),
          rawPayload: resource,
        });
      } catch (syncErr) {
        console.warn('[WebhookProcessingService] Canonical capture sync notice:', syncErr);
      }

      if (payment.commerceOrder.caseId) {
        await CaseService.logEvent(
          payment.commerceOrder.caseId,
          EventType.PAYMENT_CAPTURED,
          payment.commerceOrder.buyerId,
          `Webhook confirmed payment capture: ${captureId}`
        );
      }
    }
  }

  private static async handleCaptureReversedOrDenied(resource: any, eventType: string): Promise<void> {
    const captureId = resource.id;
    if (!captureId) return;

    const payment = await prisma.payPalPayment.findUnique({
      where: { captureId },
      include: { commerceOrder: true },
    });

    if (payment) {
      const newStatus = eventType.includes('DENIED') ? 'DENIED' : 'REVERSED';
      await prisma.payPalPayment.update({
        where: { id: payment.id },
        data: { paymentStatus: newStatus },
      });

      await prisma.commerceOrder.update({
        where: { id: payment.commerceOrderId },
        data: { status: 'CANCELLED' },
      });
    }
  }

  private static async handleCaptureRefunded(resource: any): Promise<void> {
    const refundId = resource.id;
    const captureId = resource.links?.find((l: any) => l.rel === 'up')?.href?.split('/').pop();

    if (!captureId) return;

    const payment = await prisma.payPalPayment.findUnique({
      where: { captureId },
      include: {
        commerceOrder: true,
        refunds: true,
      },
    });

    if (payment) {
      // Check if refund already recorded
      const existingRefund = payment.refunds.find((r) => r.paypalRefundId === refundId);
      if (!existingRefund) {
        const amountMinor = resource.amount?.value
          ? toMinorUnits(resource.amount.value, resource.amount.currency_code)
          : 0;

        await prisma.refundTransaction.create({
          data: {
            paymentId: payment.id,
            refundRequestId: `WH-${refundId}`,
            paypalRefundId: refundId,
            amountMinor,
            currency: resource.amount?.currency_code || payment.currency,
            status: 'COMPLETED',
            reason: resource.note_to_payer || 'Refund recorded via PayPal webhook notification',
            requestedById: payment.commerceOrder.buyerId,
            completedAt: resource.create_time ? new Date(resource.create_time) : new Date(),
          },
        });

        // Synchronize with Canonical Transaction Engine
        try {
          await PayPalSyncService.syncRefund({
            refundId,
            captureId,
            amountMinor,
            currency: resource.amount?.currency_code || payment.currency,
            status: 'COMPLETED',
            reason: resource.note_to_payer || 'Refund recorded via PayPal webhook notification',
            caseId: payment.commerceOrder.caseId,
            timestamp: resource.create_time ? new Date(resource.create_time) : new Date(),
          });
        } catch (syncErr) {
          console.warn('[WebhookProcessingService] Canonical refund sync notice:', syncErr);
        }
      }
    }
  }

  private static async handleDisputeEvent(resource: any, eventType: string): Promise<void> {
    const disputeId = resource.dispute_id;
    if (!disputeId) return;

    const transactionId =
      resource.disputed_transactions?.[0]?.seller_transaction_id ||
      resource.disputed_transactions?.[0]?.buyer_transaction_id;

    // Check if dispute already recorded
    const existing = await prisma.payPalDispute.findUnique({
      where: { paypalDisputeId: disputeId },
    });

    const payment = transactionId
      ? await prisma.payPalPayment.findFirst({
          where: {
            OR: [{ captureId: transactionId }, { providerOrderId: transactionId }],
          },
          include: { commerceOrder: true },
        })
      : null;

    // Locate org id
    let orgId = payment?.commerceOrder.merchantOrganizationId;
    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst();
      orgId = firstOrg?.id || 'default_org';
    }

    const disputeAmountMinor = resource.dispute_amount?.value
      ? toMinorUnits(resource.dispute_amount.value, resource.dispute_amount.currency_code)
      : 0;

    const dataPayload = {
      organizationId: orgId,
      paypalDisputeId: disputeId,
      paypalTransactionId: transactionId || null,
      paymentId: payment?.id || null,
      linkedCaseId: payment?.commerceOrder.caseId || null,
      disputeReason: resource.dispute_reason || 'OTHER',
      lifecycleStage: resource.dispute_life_cycle_stage || 'INQUIRY',
      paypalStatus: resource.status || 'OPEN',
      sellerResponseDueDate: resource.seller_response_due_date
        ? new Date(resource.seller_response_due_date)
        : null,
      disputeAmountMinor,
      currency: resource.dispute_amount?.currency_code || 'USD',
      allowedActionsJson: JSON.stringify(resource.allowed_response_actions || []),
      latestSyncedAt: new Date(),
    };

    if (existing) {
      await prisma.payPalDispute.update({
        where: { id: existing.id },
        data: dataPayload,
      });
    } else {
      await prisma.payPalDispute.create({
        data: dataPayload,
      });
    }

    // If linked to a case, emit event
    if (payment?.commerceOrder.caseId) {
      await CaseService.logEvent(
        payment.commerceOrder.caseId,
        EventType.PAYPAL_DISPUTE_LINKED,
        payment.commerceOrder.buyerId,
        `PayPal Dispute ${disputeId} synced (${eventType}). Status: ${resource.status}`
      );
    }
  }
}
