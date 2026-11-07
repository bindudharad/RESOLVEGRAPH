import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { canAccessCase } from '@/server/auth/permissions';
import { CaseService } from '@/server/services/case.service';
import { createClaimSchema } from '@/server/validators/case.validator';
import { PartyRole, OrganizationRole } from '@/generated/prisma/client';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (!canAccessCase(user, caseRecord)) {
      return NextResponse.json({ error: 'Access denied to this case.' }, { status: 403 });
    }

    const claims = await prisma.claim.findMany({
      where: { caseId: caseRecord.id },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(claims);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (!canAccessCase(user, caseRecord)) {
      return NextResponse.json({ error: 'Access denied: You cannot add claims to this case.' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createClaimSchema.parse(body);

    // Derive party role authoritatively from session identity
    let derivedRole: PartyRole = PartyRole.BUYER;
    if (user.isPlatformAdmin) {
      derivedRole = PartyRole.MANAGER;
    } else if (caseRecord.buyerId === user.id) {
      derivedRole = PartyRole.BUYER;
    } else {
      const membership = caseRecord.organizationId
        ? user.orgMemberships.find((m) => m.organizationId === caseRecord.organizationId)
        : null;
      if (membership?.role === OrganizationRole.RESOLUTION_MANAGER) {
        derivedRole = PartyRole.MANAGER;
      } else {
        derivedRole = PartyRole.MERCHANT;
      }
    }

    const claim = await CaseService.addClaim(caseId, {
      ...validated,
      authorId: user.id,
      partyRole: derivedRole,
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to add claim';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
