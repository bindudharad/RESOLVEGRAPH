/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { IdempotencyService } from '../utils/idempotency';
import { calculateRemainingRefundable } from '../utils/money';
import { CaseService } from '@/server/services/case.service';
import { EventType, CaseStatus, UserRole, OrganizationRole } from '@/generated/prisma/client';
import { AuthenticatedUser } from '@/server/auth/session';
import { PayPalSyncService } from './paypal-sync.service';
import { KillSwitchService } from '@/server/services/kill-switch.service';
import { DeliveryReminderService } from '@/server/services/delivery-reminder.service';

export interface ExecuteRefundInput {
  paymentId: string;
  amountMinor?: number; // If omitted, full remaining balance is refunded
  reason: string;
  resolutionProposalId?: string;
  noteToPayer?: string;
  idempotencyKey?: string;
}

const paymentLocks = new Map<string, Promise<unknown>>();

async function withPaymentLock<T>(paymentId: string, fn: () => Promise<T>): Promise<T> {
  const prev = paymentLocks.get(paymentId) ?? Promise.resolve();
  let releaseLock!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  const chained = prev.catch(() => {}).then(() => gate);
  paymentLocks.set(paymentId, chained);
  await prev.catch(() => {});
  try {
    return await fn();
  } finally {
    releaseLock();
    if (paymentLocks.get(paymentId) === chained) {
      paymentLocks.delete(paymentId);
    }
  }
}

async function notifySellerMembersOfRefund(params: {
  organizationId: string;
  caseNumber?: string | null;
  title: string;
  body: string;
  type: string;
}) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId: params.organizationId,
      isActive: true,
      role: {
        in: [
          OrganizationRole.OWNER,
          OrganizationRole.ORG_ADMIN,
          OrganizationRole.MERCHANT_AGENT,
          OrganizationRole.RESOLUTION_MANAGER,
        ],
      },
    },
    select: { userId: true },
  });
  for (const m of members) {
    await prisma.notificationMessage
      .create({
        data: {
          userId: m.userId,
          title: params.title,
          body: params.body,
          linkUrl: '/seller/requests',
          type: params.type,
        },
      })
      .catch(() => {});
  }
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
   * Executes a refund with serialization lock, authorization verification, proposal invariant,
   * balance checks (counting PENDING + COMPLETED), retry-after-FAILED handling, and honest status tracking.
   */
  public static async executeRefund(input: ExecuteRefundInput, actorUser: AuthenticatedUser) {
    return withPaymentLock(input.paymentId, () => this.executeRefundLocked(input, actorUser));
  }

  private static async executeRefundLocked(input: ExecuteRefundInput, actorUser: AuthenticatedUser) {
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
    // Verify proposal is neither denied/rejected nor unauthorized
    if (input.resolutionProposalId) {
      const proposal = await prisma.resolutionProposal.findUnique({
        where: { id: input.resolutionProposalId },
      });

      if (!proposal) {
        throw new Error(`Resolution proposal not found: ${input.resolutionProposalId}`);
      }

      if (proposal.status === 'REJECTED' || proposal.authorizationStatus === 'REJECTED') {
        throw new Error(
          `Cannot refund based on denied or rejected resolution proposal "${proposal.id}".`
        );
      }

      if (proposal.status !== 'AGREED' && proposal.status !== 'COMPLETED') {
        throw new Error(
          `Cannot refund based on resolution proposal in "${proposal.status}" state. Proposal status must be AGREED.`
        );
      }

      if (proposal.basedOnAssessmentId) {
        const assessment = await prisma.berrAssessmentRecord.findUnique({
          where: { id: proposal.basedOnAssessmentId },
          select: { status: true },
        });
        if (assessment?.status === 'INSUFFICIENT_BEG_DATA') {
          throw new Error(
            'Cannot refund: underlying BERR assessment reports INSUFFICIENT_BEG_DATA.'
          );
        }
      }

      // Duplicate proposal refund prevention
      const existingProposalRefund = payment.refunds.find(
        (r) =>
          r.resolutionProposalId === input.resolutionProposalId &&
          (r.status === 'COMPLETED' || r.status === 'PENDING' || r.status === 'PROCESSING')
      );
      if (existingProposalRefund) {
        return {
          refund: existingProposalRefund,
          isRetry: true,
        };
      }
    }

    // Idempotency check upfront: replay completed or in-flight refunds; prepare safe retry for FAILED
    let retryFromFailedRecordId: string | null = null;
    if (input.idempotencyKey) {
      const existingByKey = await prisma.refundTransaction.findUnique({
        where: { refundRequestId: input.idempotencyKey },
      });
      if (existingByKey) {
        if (existingByKey.status === 'COMPLETED' || existingByKey.status === 'PENDING' || existingByKey.status === 'PROCESSING') {
          return {
            refund: existingByKey,
            isRetry: true,
          };
        }
        if (existingByKey.status === 'FAILED') {
          retryFromFailedRecordId = existingByKey.id;
        }
      }
    }

    // Balance Verification (calculateRemainingRefundable subtracts PENDING + COMPLETED + PROCESSING)
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

    // Idempotency Operation Tracking (if retrying a FAILED attempt, use unique retry attempt key for PayPal API)
    const operationKey = retryFromFailedRecordId
      ? `${input.idempotencyKey}-retry-${Date.now()}`
      : input.idempotencyKey;

    const idempotency = await IdempotencyService.startOperation(
      'PAYMENT_REFUND',
      payment.id,
      operationKey,
      {
        paymentId: payment.id,
        amountMinor: refundAmountMinor,
        reason: input.reason,
      }
    );

    if (!retryFromFailedRecordId && idempotency.isRetry && idempotency.existingStatus === 'SUCCEEDED' && idempotency.providerResourceId) {
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

    // Record or reset PENDING RefundTransaction in DB BEFORE calling provider
    const refundRecord = retryFromFailedRecordId
      ? await prisma.refundTransaction.update({
          where: { id: retryFromFailedRecordId },
          data: {
            refundRequestId: idempotency.requestId,
            status: 'PENDING',
            amountMinor: refundAmountMinor,
            reason: input.reason,
            requestedById: actorUser.id,
            approvedById: actorUser.id,
          },
        })
      : await prisma.refundTransaction.create({
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

      const providerStatus = (paypalRefund.status || '').toUpperCase();

      if (providerStatus === 'FAILED' || providerStatus === 'CANCELLED') {
        await IdempotencyService.failOperation(idempotency.requestId, `Provider returned status ${providerStatus}`);
        await prisma.refundTransaction.update({
          where: { id: refundRecord.id },
          data: {
            paypalRefundId: paypalRefund.id || null,
            status: 'FAILED',
            rawResponseJson: JSON.stringify(paypalRefund),
          },
        });
        if (input.resolutionProposalId) {
          await prisma.resolutionProposal.update({
            where: { id: input.resolutionProposalId },
            data: { authorizationStatus: 'EXECUTION_FAILED' },
          }).catch(() => {});
        }
        throw new Error(`PayPal refund failed with provider status: ${providerStatus}`);
      }

      if (providerStatus === 'COMPLETED') {
        const completedRefund = await prisma.refundTransaction.update({
          where: { id: refundRecord.id },
          data: {
            paypalRefundId: paypalRefund.id,
            status: 'COMPLETED',
            completedAt: paypalRefund.create_time ? new Date(paypalRefund.create_time) : new Date(),
            rawResponseJson: JSON.stringify(paypalRefund),
          },
        });

        const newRemaining = remainingRefundable - refundAmountMinor;
        const newOrderStatus = newRemaining <= 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await prisma.commerceOrder.update({
          where: { id: payment.commerceOrderId },
          data: { status: newOrderStatus },
        });

        if (input.resolutionProposalId) {
          await prisma.resolutionProposal.update({
            where: { id: input.resolutionProposalId },
            data: { status: 'COMPLETED', authorizationStatus: 'COMPLETED' },
          });
        }

        await IdempotencyService.completeOperation(idempotency.requestId, paypalRefund.id);

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

        const isSandbox = process.env.PAYPAL_ENVIRONMENT !== 'live' || Boolean(paypalRefund.id?.startsWith('MOCK-'));
        const sandboxPrefix = isSandbox ? '[Sandbox / Test] ' : '';

        if (payment.commerceOrder.caseId) {
          await CaseService.logEvent(
            payment.commerceOrder.caseId,
            EventType.REFUND_COMPLETED,
            actorUser.id,
            `${sandboxPrefix}Refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} completed. PayPal Refund ID: ${paypalRefund.id}. Reason: ${input.reason}`
          );

          if (payment.commerceOrder.case?.buyerId && payment.commerceOrder.case?.caseNumber) {
            await DeliveryReminderService.notifyBuyerCaseEvent({
              userId: payment.commerceOrder.case.buyerId,
              caseNumber: payment.commerceOrder.case.caseNumber,
              title: `${sandboxPrefix}Refund Completed — ${payment.commerceOrder.case.caseNumber}`,
              body: `Your refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} has been confirmed completed.`,
              type: 'SUCCESS',
            });
          }

          await notifySellerMembersOfRefund({
            organizationId: payment.commerceOrder.merchantOrganizationId,
            caseNumber: payment.commerceOrder.case?.caseNumber,
            title: `${sandboxPrefix}Refund Completed — ${payment.commerceOrder.case?.caseNumber || payment.commerceOrder.orderNumber}`,
            body: `Authorized refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} completed (Ref: ${paypalRefund.id}).`,
            type: 'SUCCESS',
          });
        }

        return {
          refund: completedRefund,
          paypalRefund,
          isRetry: false,
        };
      }

      // Provider returned PENDING / INITIATED / PROCESSING — NEVER falsely mark COMPLETED!
      const pendingRefund = await prisma.refundTransaction.update({
        where: { id: refundRecord.id },
        data: {
          paypalRefundId: paypalRefund.id || null,
          status: 'PENDING',
          completedAt: null,
          rawResponseJson: JSON.stringify(paypalRefund),
        },
      });

      if (input.resolutionProposalId) {
        await prisma.resolutionProposal.update({
          where: { id: input.resolutionProposalId },
          data: { authorizationStatus: 'EXECUTION_PENDING' },
        }).catch(() => {});
      }

      await IdempotencyService.completeOperation(idempotency.requestId, paypalRefund.id);

      if (payment.commerceOrder.caseId) {
        if (
          payment.commerceOrder.case &&
          payment.commerceOrder.case.status !== CaseStatus.RESOLVED &&
          payment.commerceOrder.case.status !== CaseStatus.CLOSED
        ) {
          await prisma.caseRecord.update({
            where: { id: payment.commerceOrder.caseId },
            data: { status: CaseStatus.EXECUTING_REFUND, updatedAt: new Date() },
          }).catch(() => {});
        }

        const isSandbox = process.env.PAYPAL_ENVIRONMENT !== 'live' || Boolean(paypalRefund.id?.startsWith('MOCK-'));
        const sandboxPrefix = isSandbox ? '[Sandbox / Test] ' : '';

        await CaseService.logEvent(
          payment.commerceOrder.caseId,
          EventType.REFUND_INITIATED,
          actorUser.id,
          `${sandboxPrefix}Refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} initiated and awaiting provider settlement (PayPal status: ${providerStatus || 'PENDING'}, ID: ${paypalRefund.id}).`
        );

        if (payment.commerceOrder.case?.buyerId && payment.commerceOrder.case?.caseNumber) {
          await DeliveryReminderService.notifyBuyerCaseEvent({
            userId: payment.commerceOrder.case.buyerId,
            caseNumber: payment.commerceOrder.case.caseNumber,
            title: `${sandboxPrefix}Refund Initiated — ${payment.commerceOrder.case.caseNumber}`,
            body: `Your refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} has been initiated and is awaiting payment provider confirmation.`,
            type: 'INFO',
          });
        }

        await notifySellerMembersOfRefund({
          organizationId: payment.commerceOrder.merchantOrganizationId,
          caseNumber: payment.commerceOrder.case?.caseNumber,
          title: `${sandboxPrefix}Refund Initiated — ${payment.commerceOrder.case?.caseNumber || payment.commerceOrder.orderNumber}`,
          body: `Refund of ${payment.currency} ${(refundAmountMinor / 100).toFixed(2)} is pending confirmation from payment provider.`,
          type: 'INFO',
        });
      }

      return {
        refund: pendingRefund,
        paypalRefund,
        isRetry: false,
      };
    } catch (err: any) {
      await IdempotencyService.failOperation(idempotency.requestId, err.message);
      await prisma.refundTransaction.update({
        where: { id: refundRecord.id },
        data: {
          status: 'FAILED',
          rawResponseJson: JSON.stringify({ error: err?.message || 'PayPal refund error' }),
        },
      });
      if (input.resolutionProposalId) {
        await prisma.resolutionProposal.update({
          where: { id: input.resolutionProposalId },
          data: { authorizationStatus: 'EXECUTION_FAILED' },
        }).catch(() => {});
      }
      if (payment.commerceOrder.caseId) {
        if (
          payment.commerceOrder.case &&
          payment.commerceOrder.case.status !== CaseStatus.RESOLVED &&
          payment.commerceOrder.case.status !== CaseStatus.CLOSED
        ) {
          await prisma.caseRecord.update({
            where: { id: payment.commerceOrder.caseId },
            data: { status: CaseStatus.IN_REVIEW, updatedAt: new Date() },
          }).catch(() => {});
        }
        await CaseService.logEvent(
          payment.commerceOrder.caseId,
          EventType.REFUND_FAILED,
          actorUser.id,
          `Refund attempt failed: ${err?.message || 'Unknown provider error'}`
        ).catch(() => {});
      }
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
