/**
 * RESOLVEGRAPH — Step 5: Resolution Proposal Workflow Engine
 * State machine managing bilateral proposal creation, counterparty responses, and agreement transitions.
 */

import { prisma } from "@/lib/prisma";
import { CaseService } from "@/server/services/case.service";

export interface CreateProposalInput {
  caseId: string;
  proposedById: string;
  proposalType: string;
  title: string;
  description: string;
  amountMinor?: number;
  currency?: string;
  reason: string;
  policyId?: string;
  policyVersion?: string;
  basedOnAnalysisRunId?: string;
}

export interface PartyResponseInput {
  proposalId: string;
  responderId: string;
  response: "ACCEPTED" | "REJECTED" | "REQUESTED_CHANGES";
  comment?: string;
}

export class ProposalWorkflowService {
  /**
   * Creates a new formal resolution proposal.
   */
  public static async createProposal(input: CreateProposalInput) {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: input.caseId },
      include: { buyer: true, merchant: true },
    });

    if (!caseRecord) {
      throw new Error(`Case ${input.caseId} not found.`);
    }

    const isProposedByBuyer = input.proposedById === caseRecord.buyerId;
    const initialStatus = isProposedByBuyer ? "PENDING_MERCHANT" : "PENDING_BUYER";

    const proposal = await prisma.resolutionProposal.create({
      data: {
        caseId: input.caseId,
        organizationId: caseRecord.organizationId || "org_default",
        policyId: input.policyId,
        basedOnAnalysisRunId: input.basedOnAnalysisRunId,
        proposedById: input.proposedById,
        proposalType: input.proposalType,
        title: input.title,
        description: input.description,
        amountMinor: input.amountMinor,
        currency: input.currency || caseRecord.currency,
        reason: input.reason,
        policyVersion: input.policyVersion || "1.0",
        status: initialStatus,
      },
    });

    // Record audit event
    await CaseService.logEvent(
      input.caseId,
      "RESOLUTION_PROPOSED",
      input.proposedById,
      `New resolution proposed: ${input.title} (${input.proposalType})`,
      {
        proposalId: proposal.id,
        proposalType: input.proposalType,
        amountMinor: input.amountMinor,
        status: initialStatus,
      }
    );

    return proposal;
  }

  /**
   * Records a response from either Buyer or Merchant.
   */
  public static async submitPartyResponse(input: PartyResponseInput) {
    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: input.proposalId },
      include: {
        case: {
          include: { buyer: true, merchant: true },
        },
        responses: true,
      },
    });

    if (!proposal) {
      throw new Error(`Proposal ${input.proposalId} not found.`);
    }

    const { case: caseRecord } = proposal;
    const isBuyer = input.responderId === caseRecord.buyerId;
    const isMerchant = input.responderId === caseRecord.merchantId;

    if (!isBuyer && !isMerchant) {
      throw new Error("Unauthorized: Only the assigned buyer or merchant can submit party responses.");
    }

    // Persist response record
    await prisma.resolutionPartyResponse.create({
      data: {
        proposalId: input.proposalId,
        responderId: input.responderId,
        response: input.response,
        comment: input.comment,
      },
    });

    // Evaluate state transition
    let newStatus = proposal.status;

    if (input.response === "REJECTED") {
      newStatus = "REJECTED";
    } else if (input.response === "REQUESTED_CHANGES") {
      newStatus = isBuyer ? "PENDING_MERCHANT" : "PENDING_BUYER";
    } else if (input.response === "ACCEPTED") {
      // Check if the other party also accepted
      const otherAccepted = proposal.responses.some(
        (r) => r.responderId !== input.responderId && r.response === "ACCEPTED"
      );

      // If proposedBy is the other party, that party implicitly accepted their own proposal!
      const proposerAccepted = proposal.proposedById !== input.responderId;

      if (otherAccepted || proposerAccepted) {
        newStatus = "AGREED";
      }
    }

    const updatedProposal = await prisma.resolutionProposal.update({
      where: { id: input.proposalId },
      data: { status: newStatus },
      include: { responses: true },
    });

    // Log case audit event
    await CaseService.logEvent(
      proposal.caseId,
      newStatus === "AGREED" ? "RESOLUTION_AGREED" : "RESOLUTION_RESPONSE_SUBMITTED",
      input.responderId,
      `Party response submitted for proposal "${proposal.title}": ${input.response}`,
      {
        proposalId: proposal.id,
        response: input.response,
        newStatus,
        comment: input.comment,
      }
    );

    return updatedProposal;
  }
}
