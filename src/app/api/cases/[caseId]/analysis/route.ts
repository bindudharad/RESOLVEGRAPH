import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { getCaseByIdAuthorized } from '@/server/dal/get-case-by-id';
import { AnalysisQueue } from '@/server/ai/jobs/analysis-queue';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const provider = body.provider || process.env.AI_PROVIDER || 'test';
    const model = body.model;
    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const run = await AnalysisQueue.enqueueAnalysis({
      caseId: realDbCaseId,
      requestedById: user.id,
      provider,
      model,
      analysisType: body.analysisType || 'FULL_BERR'
    });

    return NextResponse.json(
      {
        runId: run.id,
        status: run.status,
        provider: run.provider,
        model: run.model,
        message: 'AI investigation analysis run queued successfully'
      },
      { status: 202 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/cases/[caseId]/analysis POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const runs = await prisma.aIAnalysisRun.findMany({
      where: { caseId: realDbCaseId },
      include: {
        requestedBy: {
          select: { id: true, name: true, role: true }
        },
        _count: {
          select: {
            extractedFacts: true,
            assessments: true,
            findings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      caseId: realDbCaseId,
      caseNumber: caseRecord.caseNumber,
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        provider: r.provider,
        model: r.model,
        analysisType: r.analysisType,
        requestedBy: r.requestedBy,
        durationMs: r.durationMs,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        counts: {
          facts: r._count.extractedFacts,
          assessments: r._count.assessments,
          findings: r._count.findings
        }
      }))
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/cases/[caseId]/analysis GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
