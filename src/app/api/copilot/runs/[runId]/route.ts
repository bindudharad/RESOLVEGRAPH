import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { AgentRunService } from '@/server/agents/runtime/agent-run.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    await requireAuth(request);
    const { runId } = await context.params;

    const run = await AgentRunService.getRunById(runId);
    if (!run) {
      return NextResponse.json({ error: `Agent run "${runId}" not found.` }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/copilot/runs/[runId] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve run details' },
      { status: 500 }
    );
  }
}
