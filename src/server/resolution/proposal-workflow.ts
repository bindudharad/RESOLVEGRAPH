/**
 * RESOLVEGRAPH — Step 5: Resolution Proposal Workflow Engine
 * State machine managing bilateral proposal creation, counterparty responses, and agreement transitions.
 */

import { prisma } from "@/lib/prisma";
import { CaseService } from "@/server/services/case.service";
import { DeliveryReminderService } from "@/server/services/delivery-reminder.service";
import { EventType, OrganizationRole, UserRole } from "@/generated/prisma/client";

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
  basedOnAssessmentId?: string;
  executionMode?: string;
}

export interface PartyResponseInput {
  proposalId: string;
  responderId: string;
  response: "ACCEPTED" | "REJECTED" | "REQUESTED_CHANGES";
  comment?: string;
}

const FINANCIAL_AUTHORIZER_ORG_ROLES: OrganizationRole[] = [
  OrganizationRole.OWNER,
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.RESOLUTION_MANAGER,
];

async function isAuthorizedOrgOrManagerResponder(
  userId: string,
  caseRecord: {
    buyerId: string;
    merchantId: string;
    assignedManagerId: string | null;
    organizationId: string | null;
  }
): Promise<{
  isBuyer: boolean;
  isMerchantSide: boolean;
  isAuthorizedApprover: boolean;
}> {
  const isBuyer = userId === caseRecord.buyerId;
  if (isBuyer) {
    return { isBuyer: true, isMerchantSide: false, isAuthorizedApprover: false };
  }

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    include: { orgMemberships: true },
  });

  if (!userRecord || !userRecord.isActive) {
    return { isBuyer: false, isMerchantSide: false, isAuthorizedApprover: false };
  }

  if (
    userRecord.isPlatformAdmin ||
    userRecord.role === UserRole.ADMIN ||
    userRecord.role === UserRole.RESOLUTION_MANAGER ||
    caseRecord.assignedManagerId === userId
  ) {
    return { isBuyer: false, isMerchantSide: true, isAuthorizedApprover: true };
  }

  const orgMembership = caseRecord.organizationId
    ? userRecord.orgMemberships.find(
        (m) => m.organizationId === caseRecord.organizationId && m.isActive
      )
    : undefined;

  if (orgMembership && orgMembership.role !== OrganizationRole.VIEWER) {
    return {
      isBuyer: false,
      isMerchantSide: true,
      isAuthorizedApprover: FINANCIAL_AUTHORIZER_ORG_ROLES.includes(orgMembership.role),
    };
  }

  if (userId === caseRecord.merchantId) {
    return { isBuyer: false, isMerchantSide: true, isAuthorizedApprover: true };
  }

  return { isBuyer: false, isMerchantSide: false, isAuthorizedApprover: false };
}

function inferExecutionMode(proposalType: string): string {
  if (
    proposalType === "FULL_REFUND" ||
    proposalType === "PARTIAL_REFUND" ||
    proposalType === "RETURN_AND_REFUND"
  ) {
    return "PAYPAL_REFUND";
  }
  if (proposalType === "REPLACEMENT") {
    return "REPLACEMENT_FULFILLMENT";
  }
  if (proposalType === "STORE_CREDIT") {
    return "STORE_CREDIT";
  }
  return "MANUAL_SETTLEMENT";
}

export class ProposalWorkflowService {
  /**
   * Creates a new formal resolution proposal separated from AI recommendation and execution.
   */
  public static async createProposal(input: CreateProposalInput) {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: input.caseId },
      include: {
        buyer: true,
        merchant: true,
        berrAssessments: {
          orderBy: { version: "desc" },
          take: 1,
          select: { id: true, status: true, overallStatus: true, isStale: true },
        },
        orders: {
          include: {
            payments: {
              include: { refunds: true },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      throw new Error(`Case ${input.caseId} not found.`);
    }

    const isRefundProposal =
      input.proposalType === "FULL_REFUND" ||
      input.proposalType === "PARTIAL_REFUND" ||
      input.proposalType === "RETURN_AND_REFUND";
    if (isRefundProposal) {
      const pendingOrCompletedFull = caseRecord.orders.some((o) =>
        o.payments.some((p) => {
          const refundedMinor = p.refunds
            .filter((r) => r.status === "COMPLETED" || r.status === "PENDING" || r.status === "PROCESSING")
            .reduce((sum, r) => sum + r.amountMinor, 0);
          return (
            p.paymentStatus === "COMPLETED" &&
            (refundedMinor >= p.amountMinor ||
              p.refunds.some((r) => r.status === "PENDING" || r.status === "PROCESSING"))
          );
        })
      );
      if (pendingOrCompletedFull) {
        throw new Error(
          "Cannot create new refund proposal: an active pending or full refund already exists for this order."
        );
      }
    }

    const isProposedByBuyer = input.proposedById === caseRecord.buyerId;
    const initialStatus = isProposedByBuyer ? "PENDING_MERCHANT" : "PENDING_BUYER";

    // 1. Validate acting user exists
    const actingUser = await prisma.user.findUnique({
      where: { id: input.proposedById },
      select: { id: true, role: true },
    });
    if (!actingUser) {
      throw new Error(`Proposing user '${input.proposedById}' not found.`);
    }

    // 2. Validate or bootstrap organization relationship to prevent foreign-key failure
    let resolvedOrgId = caseRecord.organizationId;
    if (resolvedOrgId) {
      const orgExists = await prisma.organization.findUnique({
        where: { id: resolvedOrgId },
        select: { id: true },
      });
      if (!orgExists) {
        resolvedOrgId = null;
      }
    }

    if (!resolvedOrgId) {
      const platformOrg = await prisma.organization.upsert({
        where: { id: "org_default" },
        update: {},
        create: {
          id: "org_default",
          name: "ResolveGraph Platform Arbitration",
          slug: "resolvegraph-platform",
          description: "Authoritative platform arbitration workspace for platform-governed and unregistered seller complaints.",
          isActive: true,
        },
        select: { id: true },
      });
      resolvedOrgId = platformOrg.id;
    }

    // 3. Validate BERR assessment relation (must belong to this specific case)
    let validatedAssessmentId: string | null = null;
    const candidateAssessmentId = input.basedOnAssessmentId || caseRecord.berrAssessments[0]?.id || null;
    if (candidateAssessmentId) {
      const assessmentRecord = await prisma.berrAssessmentRecord.findFirst({
        where: { id: candidateAssessmentId, caseId: input.caseId },
        select: { id: true },
      });
      validatedAssessmentId = assessmentRecord?.id || null;
    }

    // 4. Validate policy relation if provided
    let validatedPolicyId: string | null = null;
    if (input.policyId) {
      const policyRecord = await prisma.resolutionPolicy.findUnique({
        where: { id: input.policyId },
        select: { id: true },
      });
      validatedPolicyId = policyRecord?.id || null;
    }

    // 5. Prevent duplicate pending proposals of the exact same remedy type
    const existingActiveProposal = await prisma.resolutionProposal.findFirst({
      where: {
        caseId: input.caseId,
        proposalType: input.proposalType,
        status: { in: ["DRAFT", "PENDING_BUYER", "PENDING_MERCHANT"] },
        authorizationStatus: { in: ["PENDING_APPROVAL", "APPROVED", "AUTHORIZED"] },
      },
    });
    if (existingActiveProposal) {
      return existingActiveProposal;
    }

    // 6. Safe atomic transaction
    const proposal = await prisma.$transaction(async (tx) => {
      const created = await tx.resolutionProposal.create({
        data: {
          caseId: input.caseId,
          organizationId: resolvedOrgId!,
          policyId: validatedPolicyId,
          basedOnAnalysisRunId: input.basedOnAnalysisRunId || null,
          basedOnAssessmentId: validatedAssessmentId,
          proposedById: input.proposedById,
          proposalType: input.proposalType,
          title: input.title,
          description: input.description,
          amountMinor: input.amountMinor,
          currency: input.currency || caseRecord.currency,
          reason: input.reason,
          policyVersion: input.policyVersion || "1.0",
          status: initialStatus,
          authorizationStatus: "PENDING_APPROVAL",
          executionMode: input.executionMode || inferExecutionMode(input.proposalType),
        },
      });

      await tx.caseEvent.create({
        data: {
          caseId: input.caseId,
          actorId: input.proposedById,
          eventType: EventType.RESOLUTION_PROPOSED,
          description: `New resolution proposed: ${input.title} (${input.proposalType})`,
          metadataJson: JSON.stringify({
            proposalId: created.id,
            proposalType: input.proposalType,
            amountMinor: input.amountMinor,
            status: initialStatus,
            basedOnAssessmentId: validatedAssessmentId,
          }),
        },
      });

      return created;
    });

    if (caseRecord.buyerId && !isProposedByBuyer) {
      if (input.proposalType === "INFORMATION_REQUEST") {
        await DeliveryReminderService.notifyBuyerCaseEvent({
          userId: caseRecord.buyerId,
          caseNumber: caseRecord.caseNumber,
          title: `Additional Information Required — ${caseRecord.caseNumber}`,
          body: "Additional evidence is required from you to continue investigating your complaint.",
          type: "WARNING",
        });
      } else {
        await DeliveryReminderService.notifyBuyerCaseEvent({
          userId: caseRecord.buyerId,
          caseNumber: caseRecord.caseNumber,
          title: `Resolution Decision Prepared — ${caseRecord.caseNumber}`,
          body:
            initialStatus === "PENDING_BUYER"
              ? "RESOLVEGRAPH has prepared a resolution decision. Your proposed resolution is awaiting approval."
              : "RESOLVEGRAPH has prepared a resolution decision for your complaint.",
          type: "INFO",
        });
      }
    }

    return proposal;
  }

  /**
   * Records a response from either Buyer or authorized Merchant/Manager counterparty.
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

    if (
      proposal.status === "REJECTED" ||
      proposal.status === "CANCELLED" ||
      proposal.status === "COMPLETED" ||
      proposal.authorizationStatus === "REJECTED"
    ) {
      throw new Error(
        `Proposal '${proposal.id}' is in terminal state (${proposal.status}/${proposal.authorizationStatus}) and cannot accept further party responses.`
      );
    }

    const { case: caseRecord } = proposal;
    const authRole = await isAuthorizedOrgOrManagerResponder(input.responderId, {
      buyerId: caseRecord.buyerId,
      merchantId: caseRecord.merchantId,
      assignedManagerId: caseRecord.assignedManagerId,
      organizationId: caseRecord.organizationId,
    });

    if (!authRole.isBuyer && !authRole.isMerchantSide) {
      throw new Error(
        "Unauthorized: Only the assigned buyer, merchant organization representative, or resolution manager can submit party responses."
      );
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

    // Evaluate state transition & authorization state
    let newStatus = proposal.status;
    let newAuthStatus = proposal.authorizationStatus;
    let authorizedById = proposal.authorizedById;
    let authorizedAt = proposal.authorizedAt;
    let denialReason = proposal.denialReason;

    if (input.response === "REJECTED") {
      newStatus = "REJECTED";
      newAuthStatus = "REJECTED";
      authorizedById = input.responderId;
      authorizedAt = new Date();
      denialReason = input.comment || "Proposal declined during party review.";
    } else if (input.response === "REQUESTED_CHANGES") {
      newStatus = authRole.isBuyer ? "PENDING_MERCHANT" : "PENDING_BUYER";
      newAuthStatus = "PENDING_APPROVAL";
    } else if (input.response === "ACCEPTED") {
      const otherAccepted = proposal.responses.some(
        (r) => r.responderId !== input.responderId && r.response === "ACCEPTED"
      );
      const proposerAccepted = proposal.proposedById !== input.responderId;

      if (otherAccepted || proposerAccepted) {
        newStatus = "AGREED";
        // Only an explicit authorized approver's acceptance authorizes settlement;
        // buyer acceptance of a drafted proposal keeps PENDING_APPROVAL until RM/merchant sign-off.
        if (authRole.isAuthorizedApprover) {
          newAuthStatus = "AUTHORIZED";
          authorizedById = input.responderId;
          authorizedAt = new Date();
        } else if (proposal.authorizationStatus !== "AUTHORIZED") {
          newAuthStatus = "PENDING_APPROVAL";
        }
      }
    }

    const updatedProposal = await prisma.resolutionProposal.update({
      where: { id: input.proposalId },
      data: {
        status: newStatus,
        authorizationStatus: newAuthStatus,
        authorizedById,
        authorizedAt,
        denialReason,
      },
      include: { responses: true },
    });

    // Log case audit event
    await CaseService.logEvent(
      proposal.caseId,
      newStatus === "AGREED"
        ? "RESOLUTION_AGREED"
        : newStatus === "REJECTED"
        ? "AUTHORIZATION_DENIED"
        : "RESOLUTION_RESPONSE_SUBMITTED",
      input.responderId,
      `Party response submitted for proposal "${proposal.title}": ${input.response}`,
      {
        proposalId: proposal.id,
        response: input.response,
        newStatus,
        authorizationStatus: newAuthStatus,
        comment: input.comment,
      }
    );

    if (caseRecord.buyerId && newStatus === "AGREED") {
      await DeliveryReminderService.notifyBuyerCaseEvent({
        userId: caseRecord.buyerId,
        caseNumber: caseRecord.caseNumber,
        title: `Resolution Approved — ${caseRecord.caseNumber}`,
        body:
          newAuthStatus === "AUTHORIZED"
            ? "Your resolution has been authorized and settlement steps are underway."
            : "Your response was recorded. Final Resolution Manager authorization is pending.",
        type: "SUCCESS",
      });
    } else if (caseRecord.buyerId && newStatus === "REJECTED") {
      await DeliveryReminderService.notifyBuyerCaseEvent({
        userId: caseRecord.buyerId,
        caseNumber: caseRecord.caseNumber,
        title: `Resolution Declined — ${caseRecord.caseNumber}`,
        body: denialReason || "The proposed resolution was declined and returned for review.",
        type: "WARNING",
      });
    }

    return updatedProposal;
  }
}
