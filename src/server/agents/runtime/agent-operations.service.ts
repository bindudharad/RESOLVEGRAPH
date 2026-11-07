/**
 * RESOLVEGRAPH — Agent Operations & SRE Management Service
 * 
 * Provides continuous monitoring, stuck-run recovery, approval expiration,
 * and cost/token ceilings for multi-agent Copilot runs.
 */

import { prisma } from '@/lib/prisma';

export interface AgentOperationsMetrics {
  timestamp: string;
  runs: {
    total: number;
    running: number;
    queued: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
  approvals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
  };
  resourceConsumption: {
    totalTokensEstimated: number;
    totalCostEstimatedUsd: number;
    avgTokensPerRun: number;
  };
  queueHealth: {
    stuckRunsRecovered: number;
    staleApprovalsExpired: number;
    status: 'HEALTHY' | 'DEGRADED';
  };
}

export class AgentOperationsService {
  /**
   * Sweeps for agent runs that have been stuck in RUNNING status for longer than timeout minutes.
   */
  public static async recoverStuckRuns(timeoutMinutes = 15): Promise<number> {
    const cutoffDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const stuckRuns = await prisma.agentRun.findMany({
      where: {
        status: 'RUNNING',
        updatedAt: { lt: cutoffDate },
      },
      select: { id: true },
    });

    if (stuckRuns.length === 0) return 0;

    await prisma.agentRun.updateMany({
      where: { id: { in: stuckRuns.map((r) => r.id) } },
      data: {
        status: 'FAILED',
        error: `[SRE Auto-Recovery] Agent run exceeded execution timeout limit of ${timeoutMinutes} minutes. Marked as FAILED.`,
      },
    });

    return stuckRuns.length;
  }

  /**
   * Sweeps for pending approval requests that have passed their expiration timestamp.
   */
  public static async expireStaleApprovals(): Promise<number> {
    const now = new Date();

    const staleApprovals = await prisma.agentApprovalRequest.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      select: { id: true },
    });

    if (staleApprovals.length === 0) return 0;

    await prisma.agentApprovalRequest.updateMany({
      where: { id: { in: staleApprovals.map((a) => a.id) } },
      data: {
        status: 'EXPIRED',
        responseNotes: '[SRE Auto-Expiry] Approval request expired without human operator sign-off.',
      },
    });

    return staleApprovals.length;
  }

  /**
   * Aggregates real-time operational telemetry for agent copilot runs.
   */
  public static async getOperationsMetrics(): Promise<AgentOperationsMetrics> {
    // Execute proactive cleanup
    const [stuckCount, expiredCount] = await Promise.all([
      this.recoverStuckRuns(15),
      this.expireStaleApprovals(),
    ]);

    // Aggregate counts
    const [
      totalRuns,
      runningRuns,
      queuedRuns,
      completedRuns,
      failedRuns,
      cancelledRuns,
      totalApprovals,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals,
      expiredApprovals,
      runAggregate,
    ] = await Promise.all([
      prisma.agentRun.count(),
      prisma.agentRun.count({ where: { status: 'RUNNING' } }),
      prisma.agentRun.count({ where: { status: 'QUEUED' } }),
      prisma.agentRun.count({ where: { status: 'COMPLETED' } }),
      prisma.agentRun.count({ where: { status: 'FAILED' } }),
      prisma.agentRun.count({ where: { status: 'CANCELLED' } }),
      prisma.agentApprovalRequest.count(),
      prisma.agentApprovalRequest.count({ where: { status: 'PENDING' } }),
      prisma.agentApprovalRequest.count({ where: { status: 'APPROVED' } }),
      prisma.agentApprovalRequest.count({ where: { status: 'REJECTED' } }),
      prisma.agentApprovalRequest.count({ where: { status: 'EXPIRED' } }),
      prisma.agentRun.aggregate({
        _sum: {
          totalTokens: true,
          costEstimateUsd: true,
        },
      }),
    ]);

    const totalTokens = runAggregate._sum.totalTokens || 0;
    const totalCostUsd = runAggregate._sum.costEstimateUsd || 0;
    const avgTokens = totalRuns > 0 ? Math.round(totalTokens / totalRuns) : 0;

    const isDegraded = runningRuns > 20 || failedRuns > totalRuns * 0.25;

    return {
      timestamp: new Date().toISOString(),
      runs: {
        total: totalRuns,
        running: runningRuns,
        queued: queuedRuns,
        completed: completedRuns,
        failed: failedRuns,
        cancelled: cancelledRuns,
      },
      approvals: {
        total: totalApprovals,
        pending: pendingApprovals,
        approved: approvedApprovals,
        rejected: rejectedApprovals,
        expired: expiredApprovals,
      },
      resourceConsumption: {
        totalTokensEstimated: totalTokens,
        totalCostEstimatedUsd: Number(totalCostUsd.toFixed(4)),
        avgTokensPerRun: avgTokens,
      },
      queueHealth: {
        stuckRunsRecovered: stuckCount,
        staleApprovalsExpired: expiredCount,
        status: isDegraded ? 'DEGRADED' : 'HEALTHY',
      },
    };
  }
}
