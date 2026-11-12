/**
 * RESOLVEGRAPH — Submitted Seller Responses History API
 *
 * GET /api/seller/responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { SellerResponseService, SellerPortalAccessError } from '@/server/seller';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || undefined;
    const verificationStatus = searchParams.get('status') || undefined;

    const responses = await SellerResponseService.listSubmittedResponsesForUser(user, {
      q,
      verificationStatus,
    });

    return NextResponse.json({ responses });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/seller/responses error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load submitted responses' },
      { status: 500 }
    );
  }
}
