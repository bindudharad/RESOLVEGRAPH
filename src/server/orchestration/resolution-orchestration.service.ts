import { prisma } from "@/lib/prisma";
import {
  ProposalWorkflowService,
  CreateProposalInput,
  PartyResponseInput,
} from "../resolution/proposal-workflow";
import { ResolutionEngine } from "../resolution/resolution-engine";
import { CaseLifecycleService } from "./case-lifecycle.service";
import { PaymentOrchestrationService } from "./payment-orchestration.service";
import { RefundService } from "../paypal/services/refund.service";
import { EventOrchestrationService } from "./event-orchestration.service";
import { AuthenticatedUser } from "../auth/session";
import { CaseStage, EventType, RemedyType } from "@/generated/prisma/client";

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
   * Records a party's response (acceptance/rejection) and, upon bilateral agreement,
   * executes associated financial refunds and finalizes case resolution.
   */
  public static async recordPartyResponse(
    input: PartyResponseInput,
    actor: AuthenticatedUser
  ) {
    const response = await ProposalWorkflowService.submitPartyResponse(input);

    // Fetch updated proposal
    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: input.proposalId },
      include: {
        case: {
          include: {
            orders: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new Error(`Proposal ${input.proposalId} not found.`);
    }

    // If both parties agreed
    if (proposal.status === "AGREED") {
      await EventOrchestrationService.recordCaseEvent({
        caseId: proposal.caseId,
        eventType: EventType.RESOLUTION_AGREED,
        actorId: actor.id,
        description: `Bilateral agreement reached on proposal "${proposal.title}".`,
        metadata: { proposalId: proposal.id, remedy: proposal.proposalType },
      });

      // Check if remedy involves a refund and auto-execute if payment exists
      let refundExecuted = false;
      let executedAmountMinor = 0;

      if (
        (proposal.proposalType === "FULL_REFUND" || proposal.proposalType === "PARTIAL_REFUND") &&
        proposal.case.orders.length > 0
      ) {
        for (const order of proposal.case.orders) {
          const completedPayment = order.payments.find((p) => p.paymentStatus === "COMPLETED");
          if (completedPayment) {
            try {
              let approverUser: AuthenticatedUser = actor;
              if (
                !RefundService.isAuthorizedRefundApprover(
                  approverUser,
                  order.merchantOrganizationId
                )
              ) {
                const merchantUserDb = await prisma.user.findUnique({
                  where: { id: proposal.proposedById },
                  include: {
                    orgMemberships: {
                      include: { organization: true },
                    },
                  },
                });
                if (merchantUserDb) {
                  approverUser = {
                    id: merchantUserDb.id,
                    email: merchantUserDb.email,
                    name: merchantUserDb.name,
                    fullName: merchantUserDb.fullName,
                    role: merchantUserDb.role,
                    isPlatformAdmin: merchantUserDb.isPlatformAdmin,
                    isActive: merchantUserDb.isActive,
                    avatarUrl: merchantUserDb.avatarUrl,
                    organization: merchantUserDb.organization,
                    orgMemberships: merchantUserDb.orgMemberships.map((m) => ({
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
              }

              const refundRes = await PaymentOrchestrationService.executeResolutionRefund(
                {
                  paymentId: completedPayment.id,
                  amountMinor: proposal.amountMinor || undefined,
                  reason: `Resolution Proposal Agreed: ${proposal.title}`,
                  resolutionProposalId: proposal.id,
                  idempotencyKey: `reso-ref-${proposal.id}`,
                },
                approverUser
              );
              refundExecuted = true;
              executedAmountMinor = refundRes.refund.amountMinor;
              break;
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              console.warn(
                `[ResolutionOrchestrationService] Automated refund could not be finalized: ${errorMessage}`
              );
            }
          }
        }
      }

      // Map proposalType string to RemedyType enum
      let remedyEnum: RemedyType = RemedyType.FULL_REFUND;
      if (proposal.proposalType === "FULL_REFUND") remedyEnum = RemedyType.FULL_REFUND;
      else if (proposal.proposalType === "PARTIAL_REFUND") remedyEnum = RemedyType.PARTIAL_REFUND;
      else if (proposal.proposalType === "REPLACEMENT") remedyEnum = RemedyType.REPLACEMENT;
      else if (proposal.proposalType === "RETURN_AND_REFUND") remedyEnum = RemedyType.RETURN_FOR_REFUND;

      await CaseLifecycleService.resolveCase({
        caseId: proposal.caseId,
        actorId: actor.id,
        remedy: remedyEnum,
        summary: `Bilateral agreement achieved on ${proposal.proposalType}. ${
          refundExecuted
            ? `Refund of $${(executedAmountMinor / 100).toFixed(2)} dispatched via PayPal.`
            : proposal.description
        }`,
      });
    }

    return {
      response,
      proposalStatus: proposal.status,
    };
  }
}
