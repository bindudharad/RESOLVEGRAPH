import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { AgentRunService } from '@/server/agents/runtime/agent-run.service';
import { AgentUserContext } from '@/server/agents/types/agent.types';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const startRunSchema = z.object({
  prompt: z.string().min(2, 'Prompt must be at least 2 characters'),
  caseId: z.string().optional(),
  organizationId: z.string().optional(),
  title: z.string().optional(),
  maxSteps: z.number().int().min(1).max(12).optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = startRunSchema.parse(body);

    let organizationId = validated.organizationId;

    // If caseId is provided, resolve organizationId from case
    if (validated.caseId) {
      const caseRecord = await prisma.caseRecord.findUnique({
        where: { id: validated.caseId },
        select: { organizationId: true }
      });
      if (!caseRecord) {
        return NextResponse.json({ error: `Case "${validated.caseId}" not found.` }, { status: 404 });
      }
      if (caseRecord.organizationId) {
        organizationId = caseRecord.organizationId;
      }
    }

    // If still no organizationId, fall back to user's first org or a default org
    if (!organizationId) {
      const userOrg = user.orgMemberships[0]?.organizationId;
      if (userOrg) {
        organizationId = userOrg;
      } else {
        const defaultOrg = await prisma.organization.findFirst({ select: { id: true } });
        organizationId = defaultOrg?.id || 'default-org';
      }
    }

    const resolvedOrgId = organizationId || 'default-org';
    const membership = user.orgMemberships.find(m => m.organizationId === resolvedOrgId);

    const actorContext: AgentUserContext = {
      id: user.id,
      email: user.email,
      fullName: user.fullName || user.name || 'User',
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      organizationId: resolvedOrgId,
      orgRole: membership?.role
    };

    const run = await AgentRunService.startRun({
      prompt: validated.prompt,
      caseId: validated.caseId,
      organizationId: resolvedOrgId,
      actor: actorContext,
      title: validated.title,
      maxSteps: validated.maxSteps
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('API /api/copilot/runs POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start agent run' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const caseId = searchParams.get('caseId') || undefined;
    const organizationId = searchParams.get('organizationId') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;

    const runs = await AgentRunService.listRuns({
      caseId,
      organizationId,
      limit
    });

    return NextResponse.json({ runs });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/copilot/runs GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list runs' },
      { status: 500 }
    );
  }
}
