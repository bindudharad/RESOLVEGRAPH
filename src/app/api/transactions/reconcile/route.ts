/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { CrossPlatformMatchingService } from '@/server/services/cross-platform-matching.service';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
      return NextResponse.json({ error: 'caseId query parameter is required.' }, { status: 400 });
    }

    const summary = await CrossPlatformMatchingService.getReconciliationSummary(caseId);
    return NextResponse.json({ success: true, data: summary });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Reconciliation lookup failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const body = await request.json();

    if (!body.caseId) {
      return NextResponse.json({ error: 'caseId is required in request body.' }, { status: 400 });
    }

    const result = await CrossPlatformMatchingService.reconcileCase(body.caseId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Reconciliation execution failed' }, { status: 500 });
  }
}
