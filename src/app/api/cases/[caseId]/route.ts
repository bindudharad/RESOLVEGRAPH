import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { getCaseByIdAuthorized } from '@/server/dal/get-case-by-id';
import { CaseService } from '@/server/services/case.service';
import { canMutateCase } from '@/server/auth/permissions';
import { updateCaseSchema } from '@/server/validators/case.validator';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { prisma } from '@/lib/prisma';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);

    if (!caseRecord) {
      return NextResponse.json(
        { error: `Case '${caseId}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(caseRecord);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/cases/[caseId] GET error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const existing = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!existing) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    // Verify user is authorized to mutate this case
    if (!canMutateCase(user, existing)) {
      return NextResponse.json(
        { error: 'Access denied: You are not authorized to update this case.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateCaseSchema.parse(body);

    // Force actorId to the authenticated user ID (never trust client payload)
    const updatedCase = await CaseService.updateCase(caseId, {
      ...validated,
      actorId: user.id,
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'CASE_UPDATED',
      targetType: 'CaseRecord',
      targetId: existing.id,
      status: 'SUCCESS',
      metadata: {
        caseNumber: existing.caseNumber,
        newStatus: validated.status,
        newPriority: validated.priority,
      },
    });

    return NextResponse.json(updatedCase);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to update case';
    if (message.includes('Illegal status transition')) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error('API /api/cases/[caseId] PATCH error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
