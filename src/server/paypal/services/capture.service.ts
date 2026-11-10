/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { IdempotencyService } from '../utils/idempotency';
import { CaseService } from '@/server/services/case.service';
import { EventType } from '@/generated/prisma/client';
import { PayPalSyncService } from './paypal-sync.service';
import { KillSwitchService } from '@/server/services/kill-switch.service';

export interface CaptureOrderInput {
  providerOrderId: string; // PayPal order ID (e.g. 5O190127TN364715T or MOCK-ORD-...)
  idempotencyKey?: string;
  actorUserId?: string;
}

export class CaptureService {
  /**
   * Captures an authorized PayPal order and updates the internal payment ledger.
   */
  public static async captureOrder(input: CaptureOrderInput) {
    // Locate internal payment record
    const payment = await prisma.payPalPayment.findUnique({
      where: { providerOrderId: input.providerOrderId },
      include: {
        commerceOrder: {
          include: {
            case: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error(`No payment record found for PayPal order: ${input.providerOrderId}`);
    }

    // Idempotency: if already captured, return immediately
    if (payment.paymentStatus === 'COMPLETED' && payment.captureId) {
      return {
        payment,
        isAlreadyCaptured: true,
      };
    }

    // Emergency Kill-Switch Guard
    const killSwitch = await KillSwitchService.getStatus();
    if (killSwitch.isOutboundPayPalKilled) {
      throw new Error('Emergency Kill Switch is ACTIVE: Outbound PayPal operations are administratively blocked.');
    }

    const idempotency = await IdempotencyService.startOperation(
      'ORDER_CAPTURE',
      payment.id,
      input.idempotencyKey
    );

    try {
      const provider = PayPalProviderFactory.getProvider();
      const captureResult = await provider.captureOrder(
        input.providerOrderId,
        idempotency.requestId
      );

      const capturedAt = captureResult.create_time
        ? new Date(captureResult.create_time)
        : new Date();

      // Update payment record
      const updatedPayment = await prisma.payPalPayment.update({
        where: { id: payment.id },
        data: {
          captureId: captureResult.id,
          paymentStatus: captureResult.status,
          capturedAt,
          rawResponseJson: JSON.stringify(captureResult),
        },
      });

      // Update CommerceOrder status
      await prisma.commerceOrder.update({
        where: { id: payment.commerceOrderId },
        data: {
          status: 'CAPTURED',
        },
      });

      await IdempotencyService.completeOperation(idempotency.requestId, captureResult.id);

      // Synchronize with Canonical Transaction Engine & Matching Engine
      try {
        await PayPalSyncService.syncCapture({
          captureId: captureResult.id,
          providerOrderId: input.providerOrderId,
          orderNumber: payment.commerceOrder.orderNumber,
          amountMinor: updatedPayment.amountMinor,
          currency: updatedPayment.currency,
          status: captureResult.status,
          caseId: payment.commerceOrder.caseId,
          payerReference: payment.payerReference,
          payeeReference: payment.payeeReference,
          timestamp: capturedAt,
          rawPayload: captureResult as unknown as Record<string, unknown>,
        });
      } catch (syncErr) {
        console.warn('[CaptureService] Canonical transaction sync notice:', syncErr);
      }

      // If linked to a case, emit audit event
      if (payment.commerceOrder.caseId) {
        const actorId = input.actorUserId || payment.commerceOrder.buyerId;
        await CaseService.logEvent(
          payment.commerceOrder.caseId,
          EventType.PAYMENT_CAPTURED,
          actorId,
          `Payment capture completed. Capture ID: ${captureResult.id}. Amount: ${updatedPayment.currency} ${(updatedPayment.amountMinor / 100).toFixed(2)}`
        );
      }

      return {
        payment: updatedPayment,
        captureResult,
        isAlreadyCaptured: false,
      };
    } catch (err: any) {
      await IdempotencyService.failOperation(idempotency.requestId, err.message);
      throw err;
    }
  }

  /**
   * Retrieves capture details directly from provider or database.
   */
  public static async getCaptureDetails(captureId: string) {
    const payment = await prisma.payPalPayment.findUnique({
      where: { captureId },
      include: {
        commerceOrder: {
          include: {
            items: true,
            merchantOrganization: true,
            buyer: true,
          },
        },
        refunds: true,
        disputes: true,
      },
    });

    return payment;
  }
}
