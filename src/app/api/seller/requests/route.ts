/**
 * RESOLVEGRAPH — Seller Evidence Requests List API
 *
 * GET /api/seller/requests
 * Supports ?status=ALL|NEW|IN_PROGRESS|SUBMITTED|ADDITIONAL_INFO_REQUIRED and ?q=search
 * Strictly scoped to authenticated merchant organization memberships (or platform investigators).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { SellerResponseService, SellerPortalAccessError } from '@/server/seller';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const channel = searchParams.get('channel') || undefined;
    const q = searchParams.get('q') || undefined;

    const [requests, dashboard] = await Promise.all([
      SellerResponseService.listRequestsForUser(user, { status, channel, q }),
      SellerResponseService.getDashboardDataForUser(user),
    ]);

    return NextResponse.json({
      requests,
      summary: dashboard.summary,
      recentRequests: dashboard.recentRequests,
    });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/seller/requests error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list seller evidence requests' },
      { status: 500 }
    );
  }
}
