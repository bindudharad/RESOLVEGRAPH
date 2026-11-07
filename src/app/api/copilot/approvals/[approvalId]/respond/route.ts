import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { AgentApprovalService } from '@/server/agents/runtime/agent-approval.service';
import { AgentUserContext } from '@/server/agents/types/agent.types';
import { z } from 'zod';

const respondSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional()
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ approvalId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { approvalId } = await context.params;
    const body = await request.json();
    const validated = respondSchema.parse(body);

    const approval = await AgentApprovalService.getApprovalById(approvalId);
    if (!approval) {
      return NextResponse.json({ error: `Approval "${approvalId}" not found.` }, { status: 404 });
    }

    const membership = user.orgMemberships.find(m => m.organizationId === approval.run.organizationId);

    const actorContext: AgentUserContext = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.name || 'User',
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      organizationId: approval.run.organizationId,
      orgRole: membership?.role
    };

    const result = await AgentApprovalService.respondToApproval({
      approvalId,
      decision: validated.decision,
      notes: validated.notes,
      actor: actorContext
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('API /api/copilot/approvals/[approvalId]/respond POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process approval decision' },
      { status: 400 }
    );
  }
}
