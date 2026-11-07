/**
 * Agent Run Service
 * 
 * Provides high-level management for agent runs:
 * creation, execution, status polling, cancellation, and artifact queries.
 */

import { prisma } from '@/lib/prisma';
import { AgentUserContext, AgentRunStatus } from '../types/agent.types';
import { AgentOrchestrator } from './agent-orchestrator';

export interface StartAgentRunInput {
  prompt: string;
  caseId?: string;
  organizationId: string;
  actor: AgentUserContext;
  title?: string;
  maxSteps?: number;
}

export class AgentRunService {
  /**
   * Starts a new multi-agent run.
   */
  public static async startRun(input: StartAgentRunInput) {
    const title = input.title || `Copilot: ${input.prompt.substring(0, 50)}...`;

    // 1. Create durable record
    const run = await prisma.agentRun.create({
      data: {
        organizationId: input.organizationId,
        caseId: input.caseId,
        userId: input.actor.id,
        title,
        prompt: input.prompt,
        status: 'QUEUED',
        maxSteps: input.maxSteps || 10
      }
    });

    // 2. Execute Orchestration
    await AgentOrchestrator.execute({
      runId: run.id,
      prompt: input.prompt,
      caseId: input.caseId,
      organizationId: input.organizationId,
      actor: input.actor,
      maxSteps: input.maxSteps
    });

    // 3. Return full run status
    return this.getRunById(run.id);
  }

  /**
   * Retrieves an agent run by ID including steps, tool invocations, approvals, and artifacts.
   */
  public static async getRunById(runId: string) {
    return prisma.agentRun.findUnique({
      where: { id: runId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            toolInvocations: { orderBy: { createdAt: 'asc' } },
            approvals: true
          }
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestedBy: { select: { id: true, fullName: true, role: true } },
            approvedBy: { select: { id: true, fullName: true, role: true } }
          }
        },
        artifacts: {
          orderBy: { createdAt: 'asc' }
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            stage: true,
            amountMinor: true,
            currency: true
          }
        },
        user: {
          select: { id: true, fullName: true, email: true, role: true }
        }
      }
    });
  }

  /**
   * Lists runs with filtering and pagination.
   */
  public static async listRuns(params: {
    organizationId?: string;
    caseId?: string;
    userId?: string;
    status?: AgentRunStatus;
    limit?: number;
  }) {
    const limit = params.limit || 20;

    return prisma.agentRun.findMany({
      where: {
        ...(params.organizationId ? { organizationId: params.organizationId } : {}),
        ...(params.caseId ? { caseId: params.caseId } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
        ...(params.status ? { status: params.status } : {})
      },
      include: {
        case: { select: { id: true, caseNumber: true, title: true } },
        user: { select: { id: true, fullName: true } },
        _count: { select: { steps: true, approvals: true, artifacts: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Cancels a running or waiting agent run.
   */
  public static async cancelRun(runId: string, actorId?: string) {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId }
    });

    if (!run) {
      throw new Error(`Agent run "${runId}" not found.`);
    }

    if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELLED') {
      return run;
    }

    return prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        resultSummary: actorId ? `Run cancelled by user ${actorId}.` : 'Run cancelled by user.'
      }
    });
  }
}
