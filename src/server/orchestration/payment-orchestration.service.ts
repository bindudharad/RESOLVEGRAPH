import { prisma } from "@/lib/prisma";
import { CaptureService } from "../paypal/services/capture.service";
import { RefundService, ExecuteRefundInput } from "../paypal/services/refund.service";
import { ReconciliationService } from "../paypal/services/reconciliation.service";
import { AuthenticatedUser } from "../auth/session";
import { EventOrchestrationService } from "./event-orchestration.service";
import { EventType } from "@/generated/prisma/client";

export class PaymentOrchestrationService {
  /**
   * Captures an approved PayPal payment order, updating ledger balances and triggering audit events.
   */
  public static async capturePayment(orderId: string, providerOrderId: string, actorId?: string) {
    const result = await CaptureService.captureOrder({
      providerOrderId,
      actorUserId: actorId,
    });

    const order = await prisma.commerceOrder.findUnique({
      where: { id: orderId },
    });

    if (order?.caseId) {
      await EventOrchestrationService.recordCaseEvent({
        caseId: order.caseId,
        eventType: EventType.PAYMENT_CAPTURED,
        actorId,
        description: `Payment captured successfully via PayPal (Capture ID: ${result.payment.captureId || "N/A"}).`,
        metadata: {
          captureId: result.payment.captureId,
          providerOrderId,
          amountMinor: result.payment.amountMinor,
          currency: result.payment.currency,
        },
      });

      await EventOrchestrationService.recordTimelineEvent({
        caseId: order.caseId,
        eventType: "PAYMENT_CAPTURED",
        title: "PayPal Payment Captured",
        description: `Captured ${result.payment.currency} ${(result.payment.amountMinor / 100).toFixed(2)} under capture ID ${result.payment.captureId}`,
        occurredAt: result.payment.capturedAt || new Date(),
        timeBasis: "SYSTEM_OBSERVED",
        sourceParty: "PAYPAL",
        actorId,
      });
    }

    return result;
  }

  /**
   * Executes a refund with balance validation, proposal check, and audit logging.
   */
  public static async executeResolutionRefund(input: ExecuteRefundInput, user: AuthenticatedUser) {
    const refundResult = await RefundService.executeRefund(input, user);
    const refund = refundResult.refund;

    // Find linked case if payment has an associated order with a case
    const payment = await prisma.payPalPayment.findUnique({
      where: { id: input.paymentId },
      include: {
        commerceOrder: true,
      },
    });

    const caseId = payment?.commerceOrder?.caseId;
    if (caseId) {
      await EventOrchestrationService.recordCaseEvent({
        caseId,
        eventType: EventType.REFUND_COMPLETED,
        actorId: user.id,
        description: `Refund of ${(refund.amountMinor / 100).toFixed(2)} ${refund.currency} issued via PayPal. Reason: ${input.reason}`,
        metadata: {
          refundId: refund.id,
          paypalRefundId: refund.paypalRefundId,
          amountMinor: refund.amountMinor,
          currency: refund.currency,
        },
      });

      await EventOrchestrationService.recordTimelineEvent({
        caseId,
        eventType: "REFUND_COMPLETED",
        title: "PayPal Refund Processed",
        description: `Refunded ${(refund.amountMinor / 100).toFixed(2)} ${refund.currency} to buyer. Status: ${refund.status}`,
        occurredAt: refund.completedAt || new Date(),
        timeBasis: "SYSTEM_OBSERVED",
        sourceParty: "MERCHANT",
        actorId: user.id,
      });
    }

    return refundResult;
  }

  /**
   * Reconciles a single payment capture against PayPal Sandbox/REST ledger.
   */
  public static async reconcilePayment(paymentId: string) {
    return ReconciliationService.reconcilePayment(paymentId);
  }

  /**
   * Reconciles all active payments across the workspace.
   */
  public static async reconcileWorkspace() {
    return ReconciliationService.reconcileWorkspace();
  }
}
