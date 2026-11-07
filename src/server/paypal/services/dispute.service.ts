/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { toMinorUnits } from '../utils/money';
import { AuthenticatedUser } from '@/server/auth/session';
import { CaseService } from '@/server/services/case.service';
import { EventType } from '@/generated/prisma/client';

export class DisputeService {
  /**
   * Syncs disputes from PayPal API to local database for a merchant organization.
   */
  public static async syncDisputesForOrg(organizationId: string) {
    const provider = PayPalProviderFactory.getProvider();
    const result = await provider.listDisputes();

    const synced: any[] = [];
    for (const item of result.items) {
      const transactionId = item.disputed_transactions?.[0]?.seller_transaction_id;
      let linkedPayment: any = null;

      if (transactionId) {
        linkedPayment = await prisma.payPalPayment.findFirst({
          where: {
            OR: [{ captureId: transactionId }, { providerOrderId: transactionId }],
          },
          include: { commerceOrder: true },
        });
      }

      const disputeAmountMinor = toMinorUnits(
        item.dispute_amount.value,
        item.dispute_amount.currency_code
      );

      const existing = await prisma.payPalDispute.findUnique({
        where: { paypalDisputeId: item.dispute_id },
      });

      const data = {
        organizationId,
        paypalDisputeId: item.dispute_id,
        paypalTransactionId: transactionId || null,
        paymentId: linkedPayment?.id || null,
        linkedCaseId: linkedPayment?.commerceOrder.caseId || null,
        disputeReason: item.dispute_reason,
        lifecycleStage: item.dispute_life_cycle_stage,
        paypalStatus: item.status,
        sellerResponseDueDate: item.seller_response_due_date
          ? new Date(item.seller_response_due_date)
          : null,
        disputeAmountMinor,
        currency: item.dispute_amount.currency_code,
        latestSyncedAt: new Date(),
      };

      if (existing) {
        const updated = await prisma.payPalDispute.update({
          where: { id: existing.id },
          data,
        });
        synced.push(updated);
      } else {
        const created = await prisma.payPalDispute.create({
          data,
        });
        synced.push(created);
      }
    }

    return synced;
  }

  /**
   * Lists local disputes for an organization with optional status filtering.
   */
  public static async listDisputes(organizationId?: string, status?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (status && status !== 'ALL') where.paypalStatus = status;

    return prisma.payPalDispute.findMany({
      where,
      include: {
        payment: {
          include: {
            commerceOrder: {
              include: {
                buyer: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        },
        linkedCase: {
          select: { id: true, caseNumber: true, title: true, status: true },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves single dispute with details, messages, and allowed response actions.
   */
  public static async getDisputeDetails(disputeId: string) {
    const dispute = await prisma.payPalDispute.findFirst({
      where: {
        OR: [{ id: disputeId }, { paypalDisputeId: disputeId }],
      },
      include: {
        payment: {
          include: {
            commerceOrder: {
              include: {
                buyer: true,
                items: true,
              },
            },
            refunds: true,
          },
        },
        linkedCase: {
          include: {
            evidence: true,
            claims: true,
          },
        },
        organization: true,
      },
    });

    if (!dispute) return null;

    // Determine allowed actions based on dispute status and stage
    const actions: string[] = [];
    if (
      dispute.paypalStatus === 'WAITING_FOR_SELLER_RESPONSE' ||
      dispute.paypalStatus === 'OPEN'
    ) {
      actions.push('PROVIDE_EVIDENCE', 'ACCEPT_CLAIM', 'SEND_MESSAGE');
      if (dispute.lifecycleStage === 'INQUIRY') {
        actions.push('MAKE_OFFER');
      }
    }

    return {
      ...dispute,
      allowedActions: actions,
    };
  }

  /**
   * Merchant accepts dispute claim and closes it.
   */
  public static async acceptClaim(
    disputeId: string,
    actorUser: AuthenticatedUser,
    note?: string
  ) {
    const dispute = await this.getDisputeDetails(disputeId);
    if (!dispute) throw new Error(`Dispute not found: ${disputeId}`);

    const provider = PayPalProviderFactory.getProvider();
    await provider.acceptDisputeClaim(dispute.paypalDisputeId, note);

    const updated = await prisma.payPalDispute.update({
      where: { id: dispute.id },
      data: {
        paypalStatus: 'RESOLVED',
        latestSyncedAt: new Date(),
      },
    });

    if (dispute.linkedCaseId) {
      await CaseService.logEvent(
        dispute.linkedCaseId,
        EventType.PAYPAL_DISPUTE_LINKED,
        actorUser.id,
        `Merchant accepted PayPal dispute claim ${dispute.paypalDisputeId}. Note: ${note || 'None'}`
      );
    }

    return updated;
  }
}
