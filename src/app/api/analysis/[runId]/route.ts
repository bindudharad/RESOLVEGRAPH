import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { getCaseByIdAuthorized } from '@/server/dal/get-case-by-id';
import { AnalysisQueue } from '@/server/ai/jobs/analysis-queue';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { runId } = await context.params;

    const run = await AnalysisQueue.getRunDetails(runId);
    if (!run) {
      return NextResponse.json({ error: `Analysis run '${runId}' not found` }, { status: 404 });
    }

    // Verify user has access to the parent case
    const caseRecord = await getCaseByIdAuthorized(user, run.caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: 'Access denied to this analysis record' }, { status: 403 });
    }

    return NextResponse.json(run);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/analysis/[runId] GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
