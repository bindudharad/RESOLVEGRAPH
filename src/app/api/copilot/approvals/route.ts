import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { AgentApprovalService } from '@/server/agents/runtime/agent-approval.service';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const organizationId = searchParams.get('organizationId') || undefined;
    const caseId = searchParams.get('caseId') || undefined;

    const approvals = await AgentApprovalService.listPendingApprovals(organizationId, caseId);
    return NextResponse.json({ approvals });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/copilot/approvals GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list approvals' },
      { status: 500 }
    );
  }
}
