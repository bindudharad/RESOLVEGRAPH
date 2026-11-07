import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { AgentRunService } from '@/server/agents/runtime/agent-run.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { runId } = await context.params;

    const cancelled = await AgentRunService.cancelRun(runId, user.id);
    return NextResponse.json(cancelled);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/copilot/runs/[runId]/cancel POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel run' },
      { status: 500 }
    );
  }
}
