/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { RootCauseInvestigationService } from '@/server/services/root-cause-investigation.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    await requireAuth(request);
    const { caseId } = await params;

    const result = await RootCauseInvestigationService.investigateCase(caseId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Investigation lookup failed' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    await requireAuth(request);
    const { caseId } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await RootCauseInvestigationService.investigateCase(caseId, body.category);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Investigation execution failed' }, { status: 500 });
  }
}
