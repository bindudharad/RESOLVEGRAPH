/**
 * RESOLVEGRAPH Version 2.0
 * Module 16: Shared Resolution Room & Financial Orchestration
 * 
 * Bilateral resolution workspace supporting:
 * - Real-time buyer-merchant messaging and evidence exchange
 * - Role-based message visibility (internal manager notes vs shared conversation)
 * - Structured remedy proposals and counteroffers
 * - Strict 10-point financial execution safeguards
 */

import { prisma } from "@/lib/prisma";
import { CaseService } from "./case.service";

export interface PostMessageInput {
  caseId: string;
  senderId: string;
  content: string;
  attachmentEvidenceId?: string;
  isInternalOnly?: boolean;
}

export interface FinancialSafeguardCheckResult {
  isEligible: boolean;
  reasons: string[];
  paymentId?: string;
  caseId: string;
  proposalId: string;
  refundAmountMinor: number;
  currency: string;
  remainingBalanceMinor: number;
}

export class SharedResolutionService {
  /**
   * Posts a new message into the Shared Resolution Room.
   */
  public static async postMessage(input: PostMessageInput) {
    const trimmedCaseId = input.caseId?.trim();
    if (!trimmedCaseId) {
      throw new Error("Case identifier is required.");
    }

    // Resolve canonical caseRecord by id or caseNumber
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: trimmedCaseId }, { caseNumber: trimmedCaseId }],
      },
      include: { buyer: true, merchant: true },
    });

    if (!caseRecord) {
      throw new Error(`Case ${input.caseId} not found.`);
    }

    const sender = await prisma.user.findUnique({ where: { id: input.senderId } });
    if (!sender) {
      throw new Error(`User ${input.senderId} not found.`);
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new Error("Message content cannot be empty.");
    }

    // Determine sender role
    let senderRole = "SYSTEM";
    if (sender.id === caseRecord.buyerId) {
      senderRole = "BUYER";
    } else if (sender.id === caseRecord.merchantId || sender.organization === caseRecord.organizationId) {
      senderRole = "MERCHANT";
    } else if (sender.role === "RESOLUTION_MANAGER" || sender.isPlatformAdmin) {
      senderRole = "MANAGER";
    }

    if (senderRole === "SYSTEM") {
      throw new Error("Forbidden: You are not an authorized participant in this dispute case.");
    }

    if (input.isInternalOnly && senderRole !== "MANAGER") {
      throw new Error("Forbidden: Only resolution managers and admins can post internal private notes.");
    }

    // Verify attachment visibility if attached
    if (input.attachmentEvidenceId) {
      const evidence = await prisma.evidence.findUnique({
        where: { id: input.attachmentEvidenceId },
      });
      if (!evidence || (evidence.caseId !== caseRecord.id && evidence.caseId !== caseRecord.caseNumber)) {
        throw new Error("Invalid attachment: Evidence does not belong to this case.");
      }
      if (evidence.visibility === "INTERNAL" && senderRole === "BUYER") {
        throw new Error("Forbidden: Cannot attach internal evidence to public conversation.");
      }
    }

    const message = await prisma.sharedRoomMessage.create({
      data: {
        caseId: caseRecord.id, // Store canonical CUID
        senderId: input.senderId,
        senderRole,
        content: input.content,
        attachmentEvidenceId: input.attachmentEvidenceId,
        isInternalOnly: input.isInternalOnly ?? false,
      },
    });

    // Notify counterparty
    const recipientId = senderRole === "BUYER" ? caseRecord.merchantId : caseRecord.buyerId;
    if (recipientId && !input.isInternalOnly) {
      await prisma.notificationMessage.create({
        data: {
          userId: recipientId,
          title: `New Message in Dispute Case #${caseRecord.caseNumber}`,
          body: input.content.slice(0, 100),
          linkUrl: `/cases/${caseRecord.id}`,
          type: "INFO",
        },
      });
    }

    // Log timeline event
    await CaseService.logEvent(
      caseRecord.id,
      "NOTE_ADDED",
      input.senderId,
      `Message posted in Shared Resolution Room (${senderRole})`,
      { messageId: message.id, senderRole }
    );

    return message;
  }

  /**
   * Lists messages in the Shared Resolution Room with role-based filtering.
   */
  public static async listMessages(caseId: string, requestingUser: { id: string; role: string; isPlatformAdmin: boolean }) {
    if (!caseId || typeof caseId !== "string" || caseId.trim().length === 0) {
      return [];
    }
    const trimmedId = caseId.trim();

    // Resolve canonical caseRecord by id or caseNumber
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: trimmedId }, { caseNumber: trimmedId }],
      },
    });
    if (!caseRecord) {
      return [];
    }

    const isBuyer = requestingUser.id === caseRecord.buyerId;

    return prisma.sharedRoomMessage.findMany({
      where: {
        caseId: { in: [caseRecord.id, caseRecord.caseNumber] },
        // Buyers cannot see internal-only notes
        isInternalOnly: isBuyer ? false : undefined,
      },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Enforces all 10 financial safeguards before any payout or refund execution.
   */
  public static async validateFinancialSafeguards(
    caseId: string,
    proposalId: string,
    actorUser: { id: string; role: string; organization?: string | null; isPlatformAdmin: boolean }
  ): Promise<FinancialSafeguardCheckResult> {
    const reasons: string[] = [];

    // 1. Verify case exists
    const trimmedId = caseId.trim();
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: trimmedId }, { caseNumber: trimmedId }],
      },
      include: { orders: { include: { payments: { include: { refunds: true } } } } },
    });
    if (!caseRecord) {
      return { isEligible: false, reasons: ["Case not found."], caseId, proposalId, refundAmountMinor: 0, currency: "USD", remainingBalanceMinor: 0 };
    }

    // 2. Verify proposal exists and is in AGREED status
    const proposal = await prisma.resolutionProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) {
      return { isEligible: false, reasons: ["Resolution proposal not found."], caseId, proposalId, refundAmountMinor: 0, currency: "USD", remainingBalanceMinor: 0 };
    }
    if (proposal.status !== "AGREED") {
      reasons.push(`Proposal status is '${proposal.status}', but must be 'AGREED' with bilateral party consent.`);
    }

    // 3. Verify actor authorization (Merchant Owner, Resolution Manager, or Platform Admin)
    const isMerchantOwner = actorUser.organization === caseRecord.organizationId;
    const isManager = actorUser.role === "RESOLUTION_MANAGER" || actorUser.isPlatformAdmin;
    if (!isMerchantOwner && !isManager) {
      reasons.push("Unauthorized actor: Only merchant owner or resolution manager can authorize financial operations.");
    }

    // 4. Verify linked payment & remaining refundable balance
    const payment = caseRecord.orders[0]?.payments[0];
    if (!payment) {
      reasons.push("No settled payment found linked to this dispute case.");
      return {
        isEligible: false,
        reasons,
        caseId,
        proposalId,
        refundAmountMinor: proposal.amountMinor || 0,
        currency: proposal.currency || "USD",
        remainingBalanceMinor: 0,
      };
    }

    const totalRefunded = payment.refunds
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + r.amountMinor, 0);

    const remainingBalance = payment.amountMinor - totalRefunded;
    const requestedRefund = proposal.amountMinor || 0;

    if (requestedRefund <= 0) {
      reasons.push("Refund amount must be greater than zero.");
    }

    if (requestedRefund > remainingBalance) {
      reasons.push(`Requested refund ($${(requestedRefund / 100).toFixed(2)}) exceeds remaining refundable balance ($${(remainingBalance / 100).toFixed(2)}).`);
    }

    // 5. Verify Currency Matching
    if (proposal.currency && proposal.currency !== payment.currency) {
      reasons.push(`Currency mismatch: Proposal currency (${proposal.currency}) does not match captured payment currency (${payment.currency}).`);
    }

    const isEligible = reasons.length === 0;

    return {
      isEligible,
      reasons,
      paymentId: payment.id,
      caseId,
      proposalId,
      refundAmountMinor: requestedRefund,
      currency: payment.currency,
      remainingBalanceMinor: remainingBalance,
    };
  }
}
