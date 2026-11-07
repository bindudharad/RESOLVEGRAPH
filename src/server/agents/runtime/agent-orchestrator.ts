/**
 * Central Multi-Agent Orchestrator
 * 
 * Coordinates triage, specialist delegation, bounded step limits,
 * financial guardrail enforcement, and approval interrupts.
 */

import { prisma, EventType } from '@/lib/prisma';
import {
  AgentExecutionContext,
  AgentUserContext,
  AgentRoleName,
  AgentRunStatus
} from '../types/agent.types';
import { registerAllTools } from '../tools';
import { CaseTriageAgent } from '../specialists/case-triage.agent';
import { EvidenceInvestigatorAgent } from '../specialists/evidence-investigator.agent';
import { PolicyRemedyAgent } from '../specialists/policy-remedy.agent';
import { CommunicationDrafterAgent } from '../specialists/communication-drafter.agent';
import { QualityReviewAgent } from '../specialists/quality-review.agent';
import { EventOrchestrationService } from '@/server/orchestration/event-orchestration.service';

export interface ExecuteOrchestratorParams {
  runId: string;
  prompt: string;
  caseId?: string;
  organizationId: string;
  actor: AgentUserContext;
  maxSteps?: number;
}

export class AgentOrchestrator {
  private static readonly MAX_ALLOWED_STEPS = 12;

  /**
   * Main entrypoint for running an orchestrated multi-agent copilot task.
   */
  public static async execute(params: ExecuteOrchestratorParams): Promise<{
    runId: string;
    status: AgentRunStatus;
    resultSummary: string;
    stepsExecuted: number;
    approvalRequestId?: string;
  }> {
    // 1. Initialize tools
    registerAllTools();

    const maxSteps = Math.min(params.maxSteps || 10, this.MAX_ALLOWED_STEPS);
    const startTime = Date.now();

    const ctx: AgentExecutionContext = {
      runId: params.runId,
      caseId: params.caseId,
      organizationId: params.organizationId,
      actor: params.actor,
      currentStep: 0,
      maxSteps,
      totalTokens: 0,
      costEstimateUsd: 0.0,
      startTime,
      status: 'RUNNING'
    };

    // Update run status in DB
    await prisma.agentRun.update({
      where: { id: params.runId },
      data: { status: 'RUNNING', currentStep: 0 }
    });

    if (params.caseId) {
      try {
        await EventOrchestrationService.recordCaseEvent({
          caseId: params.caseId,
          eventType: 'AGENT_RUN_STARTED' as EventType,
          actorId: params.actor.id,
          description: `AI Copilot Orchestration Started: "${params.prompt.substring(0, 120)}..."`,
          metadata: { runId: params.runId }
        });
      } catch (e) {
        console.warn('[AgentOrchestrator] Failed to record start event:', e);
      }
    }

    try {
      // 2. Triage Step
      const triageStepRecord = await prisma.agentStep.create({
        data: {
          runId: params.runId,
          stepNumber: 1,
          agentName: CaseTriageAgent.ROLE,
          goal: 'Classify user prompt intent and design specialist execution plan',
          status: 'RUNNING',
          inputJson: JSON.stringify({ prompt: params.prompt })
        }
      });

      const triageStart = Date.now();
      const triageResult = await CaseTriageAgent.triage(params.prompt, ctx);
      const triageDuration = Date.now() - triageStart;

      await prisma.agentStep.update({
        where: { id: triageStepRecord.id },
        data: {
          status: 'COMPLETED',
          outputJson: JSON.stringify(triageResult),
          durationMs: triageDuration
        }
      });

      await prisma.agentRun.update({
        where: { id: params.runId },
        data: {
          intent: triageResult.intent,
          currentStep: 1
        }
      });

      ctx.currentStep = 1;

      // 3. Specialist Execution Loop
      for (const planStep of triageResult.plan) {
        if (ctx.currentStep >= ctx.maxSteps) {
          console.warn(`[AgentOrchestrator] Run ${params.runId} reached maximum step budget (${ctx.maxSteps}). Halting.`);
          break;
        }

        const nextStepNumber = ctx.currentStep + 1;
        const stepRecord = await prisma.agentStep.create({
          data: {
            runId: params.runId,
            stepNumber: nextStepNumber,
            agentName: planStep.agentName,
            goal: planStep.goal,
            status: 'RUNNING'
          }
        });

        const stepStart = Date.now();
        let stepOutput: unknown = null;

        try {
          switch (planStep.agentName as AgentRoleName) {
            case 'EvidenceInvestigatorAgent':
              stepOutput = await EvidenceInvestigatorAgent.execute(ctx, stepRecord.id);
              break;

            case 'PolicyRemedyAgent':
              stepOutput = await PolicyRemedyAgent.execute(ctx, stepRecord.id);
              break;

            case 'CommunicationDrafterAgent':
              stepOutput = await CommunicationDrafterAgent.execute(ctx, stepRecord.id);
              break;

            case 'QualityReviewAgent':
              stepOutput = await QualityReviewAgent.execute(ctx, stepRecord.id);
              break;

            default:
              stepOutput = { message: `Executed ${planStep.agentName}` };
              break;
          }

          const stepDuration = Date.now() - stepStart;
          await prisma.agentStep.update({
            where: { id: stepRecord.id },
            data: {
              status: 'COMPLETED',
              outputJson: JSON.stringify(stepOutput),
              durationMs: stepDuration
            }
          });
        } catch (stepErr: unknown) {
          const stepDuration = Date.now() - stepStart;
          const errMsg = stepErr instanceof Error ? stepErr.message : 'Specialist step failed.';
          await prisma.agentStep.update({
            where: { id: stepRecord.id },
            data: {
              status: 'FAILED',
              error: errMsg,
              durationMs: stepDuration
            }
          });
          throw stepErr;
        }

        ctx.currentStep = nextStepNumber;
        await prisma.agentRun.update({
          where: { id: params.runId },
          data: { currentStep: ctx.currentStep }
        });

        // 4. Check for Pending Approval Requests generated during this step
        const pendingApproval = await prisma.agentApprovalRequest.findFirst({
          where: { runId: params.runId, status: 'PENDING' }
        });

        if (pendingApproval) {
          ctx.status = 'WAITING_FOR_APPROVAL';
          ctx.waitingForApprovalId = pendingApproval.id;

          await prisma.agentRun.update({
            where: { id: params.runId },
            data: {
              status: 'WAITING_FOR_APPROVAL',
              resultSummary: `Execution paused: Pending human approval for ${pendingApproval.actionType} (${pendingApproval.actionRisk} risk).`
            }
          });

          if (params.caseId) {
            try {
              await EventOrchestrationService.recordCaseEvent({
                caseId: params.caseId,
                eventType: 'AGENT_APPROVAL_REQUESTED' as EventType,
                actorId: params.actor.id,
                description: `AI Copilot Paused: ${pendingApproval.description}`,
                metadata: {
                  runId: params.runId,
                  approvalId: pendingApproval.id,
                  actionType: pendingApproval.actionType
                }
              });
            } catch (e) {
              console.warn('[AgentOrchestrator] Failed to record approval event:', e);
            }
          }

          return {
            runId: params.runId,
            status: 'WAITING_FOR_APPROVAL',
            resultSummary: `Execution paused: Pending human approval for ${pendingApproval.actionType}.`,
            stepsExecuted: ctx.currentStep,
            approvalRequestId: pendingApproval.id
          };
        }
      }

      // 5. Finalize Successful Run
      const finalSummary = `Completed multi-agent workflow for "${triageResult.intent}" in ${ctx.currentStep} step(s).`;
      await prisma.agentRun.update({
        where: { id: params.runId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultSummary: finalSummary
        }
      });

      if (params.caseId) {
        try {
          await EventOrchestrationService.recordCaseEvent({
            caseId: params.caseId,
            eventType: 'AGENT_RUN_COMPLETED' as EventType,
            actorId: params.actor.id,
            description: finalSummary,
            metadata: { runId: params.runId, steps: ctx.currentStep }
          });
        } catch (e) {
          console.warn('[AgentOrchestrator] Failed to record completion event:', e);
        }
      }

      return {
        runId: params.runId,
        status: 'COMPLETED',
        resultSummary: finalSummary,
        stepsExecuted: ctx.currentStep
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Orchestration execution failed.';
      console.error(`[AgentOrchestrator] Run ${params.runId} failed:`, error);
      await prisma.agentRun.update({
        where: { id: params.runId },
        data: {
          status: 'FAILED',
          error: errMsg,
          completedAt: new Date()
        }
      });

      if (params.caseId) {
        try {
          await EventOrchestrationService.recordCaseEvent({
            caseId: params.caseId,
            eventType: 'AGENT_RUN_FAILED' as EventType,
            actorId: params.actor.id,
            description: `AI Copilot Run Failed: ${errMsg}`,
            metadata: { runId: params.runId, error: errMsg }
          });
        } catch (e) {
          console.warn('[AgentOrchestrator] Failed to record failure event:', e);
        }
      }

      return {
        runId: params.runId,
        status: 'FAILED',
        resultSummary: errMsg,
        stepsExecuted: ctx.currentStep
      };
    }
  }
}
