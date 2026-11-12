/**
 * RESOLVEGRAPH — Investigator Follow-up / No-Response / Additional Request API
 *
 * POST /api/seller/requests/[requestId]/follow-up
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { SellerResponseService, SellerPortalAccessError } from '@/server/seller';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { requestId } = await context.params;
    const body = await request.json();

    const action = String(body.action || 'FOLLOW_UP').toUpperCase();

    if (action === 'MARK_NO_RESPONSE') {
      const updated = await SellerResponseService.markNoResponse({
        requestId,
        actor: user,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
      });
      return NextResponse.json({ success: true, request: updated });
    }

    if (action === 'REQUEST_ADDITIONAL_EVIDENCE') {
      if (!body.prompt || typeof body.prompt !== 'string') {
        return NextResponse.json(
          { error: 'prompt is required for additional evidence requests.' },
          { status: 400 }
        );
      }
      const items = Array.isArray(body.additionalItems)
        ? body.additionalItems.map((it: { label?: unknown; description?: unknown }) => ({
            label: String(it.label || 'Additional Clarification'),
            description: String(it.description || body.prompt),
          }))
        : [
            {
              label: 'Investigator Follow-up Clarification',
              description: body.prompt,
            },
          ];

      const updated = await SellerResponseService.requestAdditionalSellerEvidence({
        requestId,
        actor: user,
        prompt: body.prompt,
        additionalItems: items,
      });
      return NextResponse.json({ success: true, request: updated });
    }

    const updated = await SellerResponseService.issueFollowUp({
      requestId,
      actor: user,
      message: typeof body.message === 'string' ? body.message : undefined,
      extendHours: typeof body.extendHours === 'number' ? body.extendHours : undefined,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process follow-up action' },
      { status: 500 }
    );
  }
}
