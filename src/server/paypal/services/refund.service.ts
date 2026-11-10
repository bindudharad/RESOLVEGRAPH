/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { IdempotencyService } from '../utils/idempotency';
import { calculateRemainingRefundable } from '../utils/money';
import { CaseService } from '@/server/services/case.service';
import { EventType, UserRole, OrganizationRole } from '@/generated/prisma/client';
import { AuthenticatedUser } from '@/server/auth/session';
import { PayPalSyncService } from './paypal-sync.service';
import { KillSwitchService } from '@/server/services/kill-switch.service';

export interface ExecuteRefundInput {
  paymentId: string;
  amountMinor?: number; // If omitted, full remaining balance is refunded
  reason: string;
  resolutionProposalId?: string;
  noteToPayer?: string;
  idempotencyKey?: string;
}

export class RefundService {
  /**
   * Validates if a user is authorized to execute or approve a refund on behalf of the merchant.
   */
  public static isAuthorizedRefundApprover(
    user: AuthenticatedUser,
    merchantOrganizationId: string
  ): boolean {
    if (user.isPlatformAdmin) return true;
    if (user.role === UserRole.ADMIN || user.role === UserRole.RESOLUTION_MANAGER) return true;

    // Must be member of merchant org with OWNER, ORG_ADMIN, MERCHANT_AGENT, or RESOLUTION_MANAGER role
    const membership = user.orgMemberships.find(
      (m) => m.organizationId === merchantOrganizationId
    );
    if (!membership) return false;

    const permittedRoles: OrganizationRole[] = [
      OrganizationRole.OWNER,
      OrganizationRole.ORG_ADMIN,
      OrganizationRole.MERCHANT_AGENT,
      OrganizationRole.RESOLUTION_MANAGER,
    ];
    return permittedRoles.includes(membership.role);
  }

  /**
   * Executes a refund with full validation, proposal verification, balance checks, and idempotency.
   */
  public static async executeRefund(input: ExecuteRefundInput, actorUser: AuthenticatedUser) {
    const payment = await prisma.payPalPayment.findUnique({
      where: { id: input.paymentId },
      include: {
        commerceOrder: {
          include: {
            case: true,
          },
        },
        refunds: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment record not found: ${input.paymentId}`);
    }

    if (!payment.captureId) {
      throw new Error(`Cannot refund payment ${payment.id}: No PayPal capture ID exists.`);
    }

    if (payment.paymentStatus !== 'COMPLETED') {
      throw new Error(
        `Cannot refund payment with status "${payment.paymentStatus}". Capture must be COMPLETED.`
      );
    }

    // Emergency Kill-Switch Guard
    const killSwitch = await KillSwitchService.getStatus();
    if (killSwitch.isOutboundPayPalKilled) {
      throw new Error('Emergency Kill Switch is ACTIVE: Outbound PayPal operations are administratively blocked.');
    }

    // Authorization Guard: Check if actor is authorized merchant/admin
    const isAuthorized = this.isAuthorizedRefundApprover(
      actorUser,
      payment.commerceOrder.merchantOrganizationId
    );
    if (!isAuthorized) {
      throw new Error(
        'Unauthorized: Only merchant agents, organization managers, or administrators can authorize refunds.'
      );
    }

    // Resolution Proposal Invariant:
    // If a resolution proposal is cited, verify that both parties agreed to it
    if (input.resolutionProposalId) {
      const proposal = await prisma.resolutionProposal.findUnique({
        where: { id: input.resolutionProposalId },
      });

      if (!proposal) {
        throw new Error(`Resolution proposal not found: ${input.resolutionProposalId}`);
      }

      if (proposal.status !== 'AGREED' && proposal.status !== 'COMPLETED') {
        throw new Error(
          `Cannot refund based on resolution proposal in "${proposal.status}" state. Proposal status must be AGREED.`
        );
      }
    }

    // Idempotency check upfront: If this exact request was already completed, return it immediately
    if (input.idempotencyKey) {
      const existingRefund = await prisma.refundTransaction.findUnique({
        where: { refundRequestId: input.idempotencyKey },
      });
      if (existingRefund && existingRefund.status === 'COMPLETED') {
        return {
          refund: existingRefund,
          isRetry: true,
        };
      }
    }

    // Balance Verification
    const remainingRefundable = calculateRemainingRefundable(
      payment.amountMinor,
      payment.refunds
    );

    if (remainingRefundable <= 0) {
      throw new Error('This payment has already been fully refunded.');
    }

    const refundAmountMinor =
      input.amountMinor !== undefined ? input.amountMinor : remainingRefundable;

    if (refundAmountMinor <= 0) {
      throw new Error('Refund amount must be greater than zero.');
    }

    if (refundAmountMinor > remainingRefundable) {
      throw new Error(
        `Requested refund amount (${(refundAmountMinor / 100).toFixed(2)}) exceeds remaining refundable balance (${(remainingRefundable / 100).toFixed(2)}).`
      );
    }

    // Idempotency Operation Tracking
    const idempotency = await IdempotencyService.startOperation(
      'PAYMENT_REFUND',
      payment.id,
      input.idempotencyKey,
      {
        paymentId: payment.id,
        amountMinor: refundAmountMinor,
        reason: input.reason,
      }
    );

    // If retry of an already completed operation in PayPalApiOperation
    if (idempotency.isRetry && idempotency.existingStatus === 'SUCCEEDED' && idempotency.providerResourceId) {
      const existingRefund = await prisma.refundTransaction.findFirst({
        where: {
          OR: [
            { paypalRefundId: idempotency.providerResourceId },
            { refundRequestId: idempotency.requestId },
          ],
        },
      });
      if (existingRefund) {
        return {
          refund: existingRefund,
          isRetry: true,
        };
      }
    }

    // Record pending RefundTransaction in DB
    const refundRecord = await prisma.refundTransaction.create({
      data: {
        paymentId: payment.id,
        resolutionProposalId: input.resolutionProposalId || null,
        refundRequestId: idempotency.requestId,
        amountMinor: refundAmountMinor,
        currency: payment.currency,
        status: 'PENDING',
        reason: input.reason,
        requestedById: actorUser.id,
        approvedById: actorUser.id,
      },
    });

    try {
      const provider = PayPalProviderFactory.getProvider();
      const paypalRefund = await provider.refundCapture(
        {
          captureId: payment.captureId,
          amountMinor: refundAmountMinor,
          currency: payment.currency,
          noteToPayer: input.noteToPayer,
        },
        idempotency.requestId
      );

      // Update refund record to COMPLETED
      const completedRefund = await prisma.refundTransaction.update({
        where: { id: refundRecord.id },
        data: {
          paypalRefundId: paypalRefund.id,
          status: 'COMPLETED',
          completedAt: paypalRefund.create_time ? new Date(paypalRefund.create_time) : new Date(),
          rawResponseJson: JSON.stringify(paypalRefund),
        },
      });

      // Update CommerceOrder status
      const newRemaining = remainingRefundable - refundAmountMinor;
      const newOrderStatus = newRemaining <= 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      await prisma.commerceOrder.update({
        where: { id: payment.commerceOrderId },
        data: { status: newOrderStatus },
      });

      // If linked proposal was AGREED, mark it COMPLETED
      if (input.resolutionProposalId) {
        await prisma.resolutionProposal.update({
          where: { id: input.resolutionProposalId },
          data: { status: 'COMPLETED' },
        });
      }

      await IdempotencyService.completeOperation(idempotency.requestId, paypalRefund.id);

      // Synchronize with Canonical Transaction Engine
      try {
        await PayPalSyncService.syncRefund({
          refundId: paypalRefund.id,
          captureId: payment.captureId,
          amountMinor: refundAmountMinor,
          currency: payment.currency,
          status: 'COMPLETED',
          reason: input.reason,
          caseId: payment.commerceOrder.caseId,
          timestamp: completedRefund.completedAt || new Date(),
        });
      } catch (syncErr) {
        console.warn('[RefundService] Canonical refund sync notice:', syncErr);
      }

      // Log audit events on case if linked
      if (payment.commerceOrder.caseId) {
        await CaseService.logEvent(
          payment.commerceOrder.caseId,
          EventType.REFUND_COMPLETED,
          actorUser.id,
          `Refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} completed. PayPal Refund ID: ${paypalRefund.id}. Reason: ${input.reason}`
        );
      }

      return {
        refund: completedRefund,
        paypalRefund,
        isRetry: false,
      };
    } catch (err: any) {
      await IdempotencyService.failOperation(idempotency.requestId, err.message);
      await prisma.refundTransaction.update({
        where: { id: refundRecord.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  /**
   * Retrieves all refunds for a payment or merchant organization.
   */
  public static async listRefunds(paymentId: string) {
    return prisma.refundTransaction.findMany({
      where: { paymentId },
      include: {
        requestedBy: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true, email: true } },
        resolutionProposal: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
