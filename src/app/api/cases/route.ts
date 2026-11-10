import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { getAccessibleCases } from '@/server/dal/get-accessible-cases';
import { CaseService } from '@/server/services/case.service';
import { createCaseSchema } from '@/server/validators/case.validator';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;
    const organizationId = searchParams.get('organizationId') || undefined;
    const sortByRaw = searchParams.get('sortBy');
    const sortBy =
      sortByRaw === 'amountMinor' ||
      sortByRaw === 'priority' ||
      sortByRaw === 'caseNumber' ||
      sortByRaw === 'createdAt'
        ? sortByRaw
        : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const result = await getAccessibleCases(user, {
      page,
      limit,
      search,
      status,
      priority,
      category,
      organizationId,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      ...result,
      cases: result.items,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/cases GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list cases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const body = await request.json();
    const validated = createCaseSchema.parse(body);

    // Enforce ownership: if user is not platform admin, buyerId MUST be the authenticated user
    const buyerId = user.isPlatformAdmin && validated.buyerId ? validated.buyerId : user.id;

    const createdCase = await CaseService.createCase({
      ...validated,
      buyerId,
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'CASE_CREATED',
      targetType: 'CaseRecord',
      targetId: createdCase.id,
      status: 'SUCCESS',
      metadata: {
        caseNumber: createdCase.caseNumber,
        category: createdCase.category,
        amountMinor: createdCase.amountMinor,
      },
    });

    return NextResponse.json(createdCase, { status: 201 });
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
    console.error('API /api/cases POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create case';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
