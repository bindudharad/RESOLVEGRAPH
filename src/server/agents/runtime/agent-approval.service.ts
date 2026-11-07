/**
 * Agent Approval Service (Human-in-the-Loop Governance)
 * 
 * Manages the lifecycle of high-risk actions proposed by agents.
 * Ensures cryptographic argument integrity and enforces strict RBAC permissions.
 */

import { prisma, EventType } from '@/lib/prisma';
import { AgentUserContext, HighRiskActionType } from '../types/agent.types';
import { FinancialActionGuardrails } from '../guardrails/financial-action-guardrails';
import { EventOrchestrationService } from '@/server/orchestration/event-orchestration.service';

export interface RespondToApprovalParams {
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  actor: AgentUserContext;
}

export class AgentApprovalService {
  /**
   * Retrieves an approval request by ID with associated run and case info.
   */
  public static async getApprovalById(approvalId: string) {
    return prisma.agentApprovalRequest.findUnique({
      where: { id: approvalId },
      include: {
        run: {
          select: {
            id: true,
            title: true,
            prompt: true,
            caseId: true,
            organizationId: true,
            status: true
          }
        },
        requestedBy: {
          select: { id: true, fullName: true, email: true, role: true }
        },
        approvedBy: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      }
    });
  }

  /**
   * Lists all pending approval requests for an organization or case.
   */
  public static async listPendingApprovals(organizationId?: string, caseId?: string) {
    return prisma.agentApprovalRequest.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        run: {
          ...(organizationId ? { organizationId } : {}),
          ...(caseId ? { caseId } : {})
        }
      },
      include: {
        run: { select: { id: true, title: true, caseId: true } },
        requestedBy: { select: { id: true, fullName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Creates a formal pending approval request with deterministic arguments hash.
   */
  public static async createApprovalRequest(params: {
    runId: string;
    stepId?: string;
    actionType: string;
    actionRisk: string;
    description: string;
    argumentsPayload: Record<string, unknown>;
    requestedById: string;
    expiresInHours?: number;
  }) {
    const argumentsJson = JSON.stringify(params.argumentsPayload);
    const argumentsHash = FinancialActionGuardrails.computeArgumentsHash(params.argumentsPayload);
    const expiresAt = new Date(Date.now() + (params.expiresInHours || 24) * 3600 * 1000);

    return prisma.agentApprovalRequest.create({
      data: {
        runId: params.runId,
        stepId: params.stepId,
        actionType: params.actionType,
        actionRisk: params.actionRisk,
        description: params.description,
        proposedArgumentsJson: argumentsJson,
        argumentsHash,
        requestedById: params.requestedById,
        status: 'PENDING',
        expiresAt
      }
    });
  }

  /**
   * Responds to an approval request with explicit sign-off or rejection.
   */
  public static async respondToApproval(params: RespondToApprovalParams) {
    const approval = await prisma.agentApprovalRequest.findUnique({
      where: { id: params.approvalId },
      include: { run: true }
    });

    if (!approval) {
      throw new Error(`Approval request "${params.approvalId}" not found.`);
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Approval request is already in status "${approval.status}".`);
    }

    if (new Date() > approval.expiresAt) {
      await prisma.agentApprovalRequest.update({
        where: { id: approval.id },
        data: { status: 'EXPIRED' }
      });
      throw new Error('Approval request has expired.');
    }

    // 1. Enforce RBAC permission checks
    const authCheck = FinancialActionGuardrails.canUserSignApproval(
      params.actor,
      approval.actionType as HighRiskActionType,
      approval.run.organizationId
    );

    if (!authCheck.authorized) {
      throw new Error(`Unauthorized to sign approval: ${authCheck.reason}`);
    }

    // 2. Cryptographic Argument Integrity Check
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(approval.proposedArgumentsJson);
    } catch {
      throw new Error('Corrupted proposedArgumentsJson in approval record.');
    }

    const isHashValid = FinancialActionGuardrails.verifyArgumentsHash(parsedArgs, approval.argumentsHash);
    if (!isHashValid) {
      throw new Error('Cryptographic signature verification failed: proposed arguments have been modified since creation.');
    }

    // 3. Update Approval Status
    const updatedApproval = await prisma.agentApprovalRequest.update({
      where: { id: approval.id },
      data: {
        status: params.decision,
        approvedById: params.actor.id,
        responseNotes: params.notes || null,
        responseAt: new Date()
      }
    });

    // 4. Update parent Run status if needed
    if (params.decision === 'APPROVED') {
      // If this was a REFUND_PROPOSAL and approved, materialize it into ResolutionProposal
      if (approval.actionType === 'REFUND_PROPOSAL' && approval.run.caseId) {
        try {
          await prisma.resolutionProposal.create({
            data: {
              caseId: approval.run.caseId,
              organizationId: approval.run.organizationId,
              proposedById: params.actor.id,
              proposalType: String(parsedArgs.remedyType || 'PARTIAL_REFUND'),
              title: `Authorized Proposal: ${String(parsedArgs.remedyType || 'PARTIAL_REFUND')}`,
              description: String(parsedArgs.rationale || 'Authorized merchant settlement proposed via Copilot.'),
              amountMinor: Number(parsedArgs.amountMinor || 0),
              currency: String(parsedArgs.currency || 'USD'),
              reason: String(parsedArgs.rationale || 'Authorized merchant settlement.'),
              status: 'PENDING_BUYER'
            }
          });
        } catch (e) {
          console.warn('[AgentApprovalService] Failed to materialize resolution proposal:', e);
        }
      }

      await prisma.agentRun.update({
        where: { id: approval.runId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultSummary: `Approved by ${params.actor.fullName} (${params.actor.role}). Action executed.`
        }
      });
    } else {
      await prisma.agentRun.update({
        where: { id: approval.runId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultSummary: `Rejected by ${params.actor.fullName}: ${params.notes || 'No reason provided.'}`
        }
      });
    }

    // 5. Emit Audit Event if linked to case
    if (approval.run.caseId) {
      try {
        await EventOrchestrationService.recordCaseEvent({
          caseId: approval.run.caseId,
          eventType: 'AGENT_APPROVAL_RESOLVED' as EventType,
          actorId: params.actor.id,
          description: `Agent action ${params.decision}: ${approval.actionType}. Signed off by ${params.actor.fullName}.`,
          metadata: {
            approvalId: approval.id,
            runId: approval.runId,
            decision: params.decision,
            notes: params.notes
          }
        });
      } catch (e) {
        console.warn('[AgentApprovalService] Failed to log case audit event:', e);
      }
    }

    return updatedApproval;
  }
}
