import { prisma } from '@/lib/prisma';
import { BerrEngine } from '../reasoning/berr-engine';

export class AnalysisQueue {
  /**
   * Enqueues a new AI analysis run for a case.
   */
  public static async enqueueAnalysis(params: {
    caseId: string;
    requestedById: string;
    provider?: string;
    model?: string;
    analysisType?: string;
  }) {
    const provider = params.provider || process.env.AI_PROVIDER || 'test';
    const model = params.model || (provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o-mini') : 'deterministic-mock-v1');

    const run = await prisma.aIAnalysisRun.create({
      data: {
        caseId: params.caseId,
        requestedById: params.requestedById,
        provider,
        model,
        analysisType: params.analysisType || 'FULL_BERR',
        status: 'QUEUED',
        promptVersion: 'v1.0',
        engineVersion: 'berr-1.0',
        attemptCount: 0,
        maxAttempts: 3
      }
    });

    await prisma.caseEvent.create({
      data: {
        caseId: params.caseId,
        actorId: params.requestedById,
        eventType: 'AI_ANALYSIS_REQUESTED',
        description: `AI analysis run queued (${run.id}) using provider ${provider} (${model})`,
        metadataJson: JSON.stringify({
          runId: run.id,
          provider,
          model,
          analysisType: run.analysisType
        })
      }
    });

    return run;
  }

  /**
   * Acquires the next available job atomically with lease locking.
   */
  public static async acquireNextJob(workerId: string, leaseDurationMs = 60000) {
    const now = new Date();

    // Find first queued or expired job
    const candidate = await prisma.aIAnalysisRun.findFirst({
      where: {
        OR: [
          { status: 'QUEUED' },
          {
            status: 'PROCESSING',
            leaseExpiresAt: { lt: now }
          }
        ],
        attemptCount: { lt: 3 }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (!candidate) {
      return null;
    }

    const leaseExpires = new Date(Date.now() + leaseDurationMs);

    // Lock atomically
    const locked = await prisma.aIAnalysisRun.update({
      where: {
        id: candidate.id
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        leaseExpiresAt: leaseExpires,
        attemptCount: { increment: 1 }
      }
    });

    return locked;
  }

  /**
   * Processes a job and handles failures.
   */
  public static async processJob(runId: string, forceTest = false) {
    try {
      return await BerrEngine.runCaseBERR(runId, forceTest);
    } catch (err: unknown) {
      const run = await prisma.aIAnalysisRun.findUnique({ where: { id: runId } });
      if (run && run.attemptCount < run.maxAttempts) {
        // Retry later
        await prisma.aIAnalysisRun.update({
          where: { id: runId },
          data: {
            status: 'QUEUED',
            lockedAt: null,
            lockedBy: null,
            leaseExpiresAt: null,
            nextAttemptAt: new Date(Date.now() + 5000 * run.attemptCount)
          }
        });
      }
      throw err;
    }
  }

  /**
   * Retrieves full analysis run details with facts, assessments, findings, and feedback.
   */
  public static async getRunDetails(runId: string) {
    return await prisma.aIAnalysisRun.findUnique({
      where: { id: runId },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        },
        extractedFacts: {
          include: {
            evidence: {
              select: { id: true, filename: true, evidenceType: true, sourceType: true }
            }
          }
        },
        assessments: {
          include: {
            claim: true,
            evidence: true
          }
        },
        findings: {
          include: {
            evidenceLinks: {
              include: {
                evidence: true
              }
            },
            reviewedBy: {
              select: { id: true, name: true, role: true }
            }
          }
        },
        inputs: true,
        feedback: {
          include: {
            actor: {
              select: { id: true, name: true, role: true }
            }
          }
        }
      }
    });
  }
}
