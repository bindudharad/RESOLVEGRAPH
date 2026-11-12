/**
 * RESOLVEGRAPH — Seller Evidence Request Detail & In-Progress Draft API
 *
 * GET   /api/seller/requests/[requestId]   Returns detail (marks VIEWED on first seller open)
 * PATCH /api/seller/requests/[requestId]   Saves in-progress draft response without submitting
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import {
  SellerResponseService,
  SellerPortalAccessError,
  type SellerDraftPayload,
} from '@/server/seller';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { requestId } = await context.params;
    const detail = await SellerResponseService.getRequestDetailForUser(requestId, user);

    return NextResponse.json({ request: detail });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/seller/requests/[requestId] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load seller request' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { requestId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { draft?: SellerDraftPayload };

    if (!body.draft || typeof body.draft !== 'object') {
      return NextResponse.json({ error: 'draft payload object is required.' }, { status: 400 });
    }

    const saved = await SellerResponseService.saveDraftResponse({
      requestId,
      user,
      draft: body.draft,
    });

    return NextResponse.json({ success: true, ...saved });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('PATCH /api/seller/requests/[requestId] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save draft' },
      { status: 500 }
    );
  }
}
