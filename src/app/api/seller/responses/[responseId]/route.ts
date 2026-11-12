/**
 * RESOLVEGRAPH — Single Submitted Seller Response Detail API
 *
 * GET /api/seller/responses/[responseId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { SellerResponseService, SellerPortalAccessError } from '@/server/seller';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ responseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { responseId } = await context.params;
    const response = await SellerResponseService.getSubmittedResponseDetailForUser(responseId, user);

    return NextResponse.json({ response });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/seller/responses/[responseId] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load submitted response' },
      { status: 500 }
    );
  }
}
