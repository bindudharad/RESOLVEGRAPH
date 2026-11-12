import { prisma } from "@/lib/prisma";
import {
  ProposalWorkflowService,
  CreateProposalInput,
  PartyResponseInput,
} from "../resolution/proposal-workflow";
import { ResolutionEngine } from "../resolution/resolution-engine";
import { CaseLifecycleService } from "./case-lifecycle.service";
import { PaymentOrchestrationService } from "./payment-orchestration.service";
import { ReplacementExecutionService } from "./replacement-execution.service";
import { RefundService } from "../paypal/services/refund.service";
import { EventOrchestrationService } from "./event-orchestration.service";
import { AuthenticatedUser } from "../auth/session";
import { DeliveryReminderService } from "@/server/services/delivery-reminder.service";
import { SecurityAuditService } from "@/server/services/security-audit.service";
import {
  CaseStage,
  CaseStatus,
  EventType,
  OrganizationRole,
  RemedyType,
  UserRole,
} from "@/generated/prisma/client";

function toUserAuthContext(
  u: {
    id: string;
    email: string;
    name: string;
    fullName: string;
    role: UserRole;
    isPlatformAdmin: boolean;
    isActive: boolean;
    avatarUrl: string | null;
    organization: string | null;
    orgMemberships: Array<{
      organizationId: string;
      role: OrganizationRole;
      organization: { id: string; name: string; slug: string };
    }>;
  }
): AuthenticatedUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    fullName: u.fullName,
    role: u.role,
    isPlatformAdmin: u.isPlatformAdmin,
    isActive: u.isActive,
    avatarUrl: u.avatarUrl,
    organization: u.organization,
    orgMemberships: u.orgMemberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
      },
    })),
  };
}

export class ResolutionOrchestrationService {
  /**
   * Evaluates organization policies against case facts and returns suggested remedies.
   */
  public static async evaluateCasePolicies(caseId: string) {
    return ResolutionEngine.evaluateCase(caseId);
  }

  /**
   * Creates a formal bilateral resolution proposal grounded in policy evaluation.
   */
  public static async proposeRemedy(input: CreateProposalInput) {
    const proposal = await ProposalWorkflowService.createProposal(input);

    await CaseLifecycleService.transitionStage({
      caseId: input.caseId,
      nextStage: CaseStage.RESOLUTION_PROPOSED,
      actorId: input.proposedById,
      note: `Remedy proposed: ${proposal.proposalType} — ${proposal.title}`,
    });

    await EventOrchestrationService.recordCaseEvent({
      caseId: input.caseId,
      eventType: EventType.RESOLUTION_PROPOSED,
      actorId: input.proposedById,
      description: `Formal resolution proposal created: ${proposal.title} (${proposal.proposalType})`,
      metadata: {
        proposalId: proposal.id,
        proposalType: proposal.proposalType,
        amountMinor: proposal.amountMinor,
      },
    });

    await EventOrchestrationService.recordTimelineEvent({
      caseId: input.caseId,
      eventType: "RESOLUTION_PROPOSED",
      title: `Remedy Proposed: ${proposal.title}`,
      description: proposal.description,
      occurredAt: new Date(),
      timeBasis: "SYSTEM_OBSERVED",
      sourceParty: "SYSTEM",
      actorId: input.proposedById,
    });

    return proposal;
  }

  /**
   * Explicit human authorization / denial gate separated cleanly from AI/Policy recommendation
   * and from execution. Prevents REJECTED/ineligible proposals from proceeding.
   */
  public static async authorizeOrDenyProposal(params: {
    proposalId: string;
    actor: AuthenticatedUser;
    decision: "APPROVED" | "REJECTED" | "MODIFIED";
    reviewNotes?: string;
    executeOnApprove?: boolean;
  }) {
    const isReviewerRole =
      params.actor.isPlatformAdmin ||
      params.actor.role === UserRole.ADMIN ||
      params.actor.role === UserRole.RESOLUTION_MANAGER;

    if (!isReviewerRole) {
      throw new Error(
        "Forbidden: Only Resolution Managers or Administrators can authorize or deny proposals."
      );
    }

    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: params.proposalId },
      include: { case: true },
    });

    if (!proposal) {
      throw new Error(`Proposal '${params.proposalId}' not found.`);
    }

    if (proposal.status === "REJECTED" || proposal.authorizationStatus === "REJECTED") {
      throw new Error("Proposal was already rejected / denied and cannot be re-authorized.");
    }

    if (proposal.status === "COMPLETED" || proposal.authorizationStatus === "COMPLETED") {
      throw new Error("Completed proposal cannot be modified.");
    }

    if (params.decision === "REJECTED") {
      const denialReason =
        params.reviewNotes?.trim() || "Authorization denied during resolution manager review.";
      const updated = await prisma.resolutionProposal.update({
        where: { id: proposal.id },
        data: {
          status: "REJECTED",
          authorizationStatus: "REJECTED",
          authorizedById: params.actor.id,
          authorizedAt: new Date(),
          denialReason,
          reason: params.reviewNotes ? `${proposal.reason} [Denied: ${params.reviewNotes}]` : proposal.reason,
        },
      });

      if (
        proposal.case.status !== CaseStatus.RESOLVED &&
        proposal.case.status !== CaseStatus.CLOSED &&
        proposal.case.status !== CaseStatus.IN_REVIEW
      ) {
        await CaseLifecycleService.transitionStatus({
          caseId: proposal.caseId,
          nextStatus: CaseStatus.IN_REVIEW,
          actorId: params.actor.id,
          note: `Authorization denied on proposal '${proposal.title}': ${denialReason}`,
        }).catch(() => {});
      }

      await EventOrchestrationService.recordCaseEvent({
        caseId: proposal.caseId,
        eventType: EventType.AUTHORIZATION_DENIED,
        actorId: params.actor.id,
        description: `Authorization denied for proposal '${proposal.title}': ${denialReason}`,
        metadata: { proposalId: proposal.id, decision: params.decision, denialReason },
      });

      await DeliveryReminderService.notifyBuyerCaseEvent({
        userId: proposal.case.buyerId,
        caseNumber: proposal.case.caseNumber,
        title: `Authorization Denied — ${proposal.case.caseNumber}`,
        body: `Proposed resolution (${proposal.proposalType}) was declined during authorization review and returned to investigation.`,
        type: "WARNING",
      });

      await SecurityAuditService.record({
        actorId: params.actor.id,
        action: "PROPOSAL_AUTHORIZATION_DENIED",
        targetType: "ResolutionProposal",
        targetId: proposal.id,
        status: "SUCCESS",
        metadata: { caseId: proposal.caseId, denialReason },
      });

      return { proposal: updated, execution: null };
    }

    if (params.decision === "APPROVED") {
      // Check BERR / Policy blockers before granting financial or replacement authorization
      const policyEval = await ResolutionEngine.evaluateCase(proposal.caseId);
      const option = policyEval.candidateOptions.find(
        (o) => o.proposalType === proposal.proposalType
      );
      if (
        policyEval.berrSummary?.status === "INSUFFICIENT_BEG_DATA" &&
        ["FULL_REFUND", "PARTIAL_REFUND", "RETURN_AND_REFUND", "REPLACEMENT"].includes(
          proposal.proposalType
        )
      ) {
        throw new Error(
          "Authorization blocked: BERR assessment shows INSUFFICIENT_BEG_DATA. Collect and verify evidence first."
        );
      }
      if (
        policyEval.activeRefund?.hasActivePendingRefund ||
        policyEval.activeRefund?.hasCompletedFullRefund
      ) {
        if (["FULL_REFUND", "PARTIAL_REFUND", "RETURN_AND_REFUND", "REPLACEMENT"].includes(proposal.proposalType)) {
          throw new Error(
            "Authorization blocked: an active or completed refund already exists for this order."
          );
        }
      }
      if (option && !option.isEligible && option.requiresEscalation && !params.reviewNotes?.trim()) {
        throw new Error(
          `Proposal '${proposal.proposalType}' is not automatically eligible under current policy (${option.reason}). Provide explicit manager override justification in reviewNotes.`
        );
      }

      const updated = await prisma.resolutionProposal.update({
        where: { id: proposal.id },
        data: {
          status: "AGREED",
          authorizationStatus: "AUTHORIZED",
          authorizedById: params.actor.id,
          authorizedAt: new Date(),
          denialReason: null,
          reason: params.reviewNotes ? `${proposal.reason} [Authorized: ${params.reviewNotes}]` : proposal.reason,
        },
      });

      await EventOrchestrationService.recordCaseEvent({
        caseId: proposal.caseId,
        eventType: EventType.AUTHORIZATION_GRANTED,
        actorId: params.actor.id,
        description: `Resolution Manager authorized proposal '${proposal.title}' (${proposal.proposalType}).`,
        metadata: { proposalId: proposal.id, reviewNotes: params.reviewNotes },
      });

      await SecurityAuditService.record({
        actorId: params.actor.id,
        action: "PROPOSAL_AUTHORIZED",
        targetType: "ResolutionProposal",
        targetId: proposal.id,
        status: "SUCCESS",
        metadata: { caseId: proposal.caseId, proposalType: proposal.proposalType },
      });

      let execution = null;
      if (params.executeOnApprove) {
        execution = await this.executeAuthorizedProposal(proposal.id, params.actor);
      }

      return { proposal: updated, execution };
    }

    // MODIFIED
    const modified = await prisma.resolutionProposal.update({
      where: { id: proposal.id },
      data: {
        authorizationStatus: "PENDING_APPROVAL",
        reason: params.reviewNotes ? `${proposal.reason} [Modified: ${params.reviewNotes}]` : proposal.reason,
      },
    });
    return { proposal: modified, execution: null };
  }

  /**
   * Executes ONLY an already AUTHORIZED resolution proposal (Refund or Replacement).
   * Never marks PENDING/FAILED refunds or unshipped replacements as RESOLVED.
   */
  public static async executeAuthorizedProposal(
    proposalId: string,
    actor: AuthenticatedUser
  ): Promise<{
    executed: boolean;
    mode: "PAYPAL_REFUND" | "REPLACEMENT_FULFILLMENT" | "NONE";
    status: "COMPLETED" | "PENDING" | "EXECUTING_REPLACEMENT" | "FAILED" | "AWAITING_AUTHORIZATION";
    resolved: boolean;
    error?: string;
    refundId?: string;
    replacementFulfillmentId?: string;
  }> {
    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: proposalId },
      include: {
        case: {
          include: {
            orders: {
              include: {
                payments: { include: { refunds: true } },
              },
            },
          },
        },
        replacementFulfillment: true,
      },
    });

    if (!proposal) {
      throw new Error(`Proposal '${proposalId}' not found.`);
    }

    if (proposal.status === "REJECTED" || proposal.authorizationStatus === "REJECTED") {
      throw new Error(
        `Execution blocked: authorization for proposal '${proposal.id}' was denied/rejected.`
      );
    }

    if (
      proposal.authorizationStatus !== "AUTHORIZED" &&
      proposal.authorizationStatus !== "EXECUTION_FAILED" &&
      proposal.authorizationStatus !== "EXECUTION_PENDING"
    ) {
      throw new Error(
        `Execution blocked: proposal '${proposal.id}' has not been explicitly authorized (authorizationStatus=${proposal.authorizationStatus}, status=${proposal.status}).`
      );
    }

    // Verify approver authority when executing
    let approverUser: AuthenticatedUser = actor;
    const isDirectApprover =
      actor.isPlatformAdmin ||
      actor.role === UserRole.ADMIN ||
      actor.role === UserRole.RESOLUTION_MANAGER ||
      RefundService.isAuthorizedRefundApprover(actor, proposal.organizationId);

    if (!isDirectApprover) {
      // Only fall back to explicit authorizedById signer (NEVER unverified proposedById unless authorized!)
      const signerId = proposal.authorizedById;
      if (signerId) {
        const signerDb = await prisma.user.findUnique({
          where: { id: signerId },
          include: { orgMemberships: { include: { organization: true } } },
        });
        if (signerDb) {
          const candidate = toUserAuthContext(signerDb);
          if (RefundService.isAuthorizedRefundApprover(candidate, proposal.organizationId)) {
            approverUser = candidate;
          }
        }
      }
    }

    const stillUnauthorized =
      !RefundService.isAuthorizedRefundApprover(approverUser, proposal.organizationId) &&
      proposal.authorizationStatus !== "AUTHORIZED";
    if (stillUnauthorized) {
      await prisma.resolutionProposal.update({
        where: { id: proposal.id },
        data: { authorizationStatus: "PENDING_APPROVAL" },
      });
      return {
        executed: false,
        mode: "NONE",
        status: "AWAITING_AUTHORIZATION",
        resolved: false,
        error: "Awaiting authorized Resolution Manager or Merchant Owner financial sign-off.",
      };
    }

    // 1. REPLACEMENT REMEDY PATH
    if (proposal.proposalType === "REPLACEMENT") {
      const initResult = await ReplacementExecutionService.authorizeAndInitiateReplacement({
        proposalId: proposal.id,
        actor: approverUser,
      });

      return {
        executed: true,
        mode: "REPLACEMENT_FULFILLMENT",
        status: "EXECUTING_REPLACEMENT",
        resolved: false, // STRICTLY false until physical delivery confirmation!
        replacementFulfillmentId: initResult.fulfillment.id,
      };
    }

    // 2. MONETARY REFUND REMEDY PATH
    if (
      proposal.proposalType === "FULL_REFUND" ||
      proposal.proposalType === "PARTIAL_REFUND" ||
      proposal.proposalType === "RETURN_AND_REFUND"
    ) {
      const completedPayments = proposal.case.orders.flatMap((o) =>
        o.payments.filter((p) => p.paymentStatus === "COMPLETED")
      );
      const targetPayment = completedPayments[0];
      if (!targetPayment) {
        return {
          executed: false,
          mode: "NONE",
          status: "AWAITING_AUTHORIZATION",
          resolved: false,
          error: "No captured payment record linked to execute automated refund; requires manual/marketplace settlement confirmation.",
        };
      }

      let remedyEnum: RemedyType = RemedyType.FULL_REFUND;
      if (proposal.proposalType === "PARTIAL_REFUND") remedyEnum = RemedyType.PARTIAL_REFUND;
      else if (proposal.proposalType === "RETURN_AND_REFUND") remedyEnum = RemedyType.RETURN_FOR_REFUND;

      try {
        const refundRes = await PaymentOrchestrationService.executeResolutionRefund(
          {
            paymentId: targetPayment.id,
            amountMinor: proposal.amountMinor || undefined,
            reason: `Authorized Resolution: ${proposal.title}`,
            resolutionProposalId: proposal.id,
            idempotencyKey: `reso-ref-${proposal.id}`,
          },
          approverUser
        );

        const actualStatus = (refundRes.refund.status || "").toUpperCase();
        if (actualStatus === "COMPLETED") {
          await CaseLifecycleService.resolveCase({
            caseId: proposal.caseId,
            actorId: approverUser.id,
            remedy: remedyEnum,
            summary: `Authorized ${proposal.proposalType} refund of ${refundRes.refund.currency} ${(refundRes.refund.amountMinor / 100).toFixed(2)} completed via payment provider.`,
          });

          return {
            executed: true,
            mode: "PAYPAL_REFUND",
            status: "COMPLETED",
            resolved: true,
            refundId: refundRes.refund.id,
          };
        }

        // PENDING / PROCESSING: NEVER falsely resolve case!
        await prisma.caseRecord.update({
          where: { id: proposal.caseId },
          data: { status: CaseStatus.EXECUTING_REFUND, recommendedRemedy: remedyEnum },
        });
        await prisma.resolutionProposal.update({
          where: { id: proposal.id },
          data: { authorizationStatus: "EXECUTION_PENDING" },
        });

        return {
          executed: true,
          mode: "PAYPAL_REFUND",
          status: "PENDING",
          resolved: false,
          refundId: refundRes.refund.id,
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await prisma.resolutionProposal.update({
          where: { id: proposal.id },
          data: { authorizationStatus: "EXECUTION_FAILED" },
        });
        if (
          proposal.case.status !== CaseStatus.RESOLVED &&
          proposal.case.status !== CaseStatus.CLOSED
        ) {
          await prisma.caseRecord.update({
            where: { id: proposal.caseId },
            data: { status: CaseStatus.IN_REVIEW },
          });
        }
        await EventOrchestrationService.recordCaseEvent({
          caseId: proposal.caseId,
          eventType: EventType.REFUND_FAILED,
          actorId: approverUser.id,
          description: `Authorized refund execution failed: ${errorMessage}. Case kept open for retry or manual review.`,
          metadata: { proposalId: proposal.id, error: errorMessage },
        });

        return {
          executed: false,
          mode: "PAYPAL_REFUND",
          status: "FAILED",
          resolved: false,
          error: errorMessage,
        };
      }
    }

    // 3. NON-FINANCIAL / ESCALATION PROPOSALS
    if (proposal.proposalType === "INFORMATION_REQUEST") {
      await CaseLifecycleService.transitionStatus({
        caseId: proposal.caseId,
        nextStatus: CaseStatus.EVIDENCE_REQUESTED,
        actorId: actor.id,
        note: `Information request agreed/activated: ${proposal.title}`,
      }).catch(() => {});
    } else if (proposal.proposalType === "HUMAN_REVIEW") {
      await CaseLifecycleService.transitionStatus({
        caseId: proposal.caseId,
        nextStatus: CaseStatus.IN_REVIEW,
        actorId: actor.id,
        note: `Escalated for Resolution Manager review: ${proposal.title}`,
      }).catch(() => {});
    }

    return {
      executed: false,
      mode: "NONE",
      status: "AWAITING_AUTHORIZATION",
      resolved: false,
    };
  }

  /**
   * Records a party's response (acceptance/rejection) and, ONLY when genuinely agreed AND authorized,
   * triggers controlled execution without falsely completing failed refunds or unshipped replacements.
   */
  public static async recordPartyResponse(
    input: PartyResponseInput,
    actor: AuthenticatedUser
  ) {
    const response = await ProposalWorkflowService.submitPartyResponse(input);

    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: input.proposalId },
    });

    if (!proposal) {
      throw new Error(`Proposal ${input.proposalId} not found.`);
    }

    if (proposal.status === "REJECTED") {
      await CaseLifecycleService.transitionStatus({
        caseId: proposal.caseId,
        nextStatus: CaseStatus.IN_REVIEW,
        actorId: actor.id,
        note: `Proposal '${proposal.title}' rejected by party; returned to investigation review.`,
      }).catch(() => {});

      return {
        response,
        proposalStatus: proposal.status,
        authorizationStatus: proposal.authorizationStatus,
        execution: null,
      };
    }

    if (proposal.status === "AGREED") {
      if (proposal.authorizationStatus === "AUTHORIZED") {
        const execution = await this.executeAuthorizedProposal(proposal.id, actor);
        const refreshed = await prisma.resolutionProposal.findUnique({
          where: { id: proposal.id },
        });
        return {
          response: refreshed || response,
          proposalStatus: proposal.status,
          authorizationStatus: refreshed?.authorizationStatus || proposal.authorizationStatus,
          execution,
        };
      }

      // Proposal is AGREED between buyer & non-authorizer, still awaiting explicit manager authorization
      return {
        response,
        proposalStatus: proposal.status,
        authorizationStatus: proposal.authorizationStatus,
        execution: {
          executed: false,
          mode: "NONE" as const,
          status: "AWAITING_AUTHORIZATION" as const,
          resolved: false,
        },
      };
    }

    return {
      response,
      proposalStatus: proposal.status,
      authorizationStatus: proposal.authorizationStatus,
      execution: null,
    };
  }
}
