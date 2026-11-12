/**
 * RESOLVEGRAPH — Per-User Seller Workspace Onboarding API
 *
 * GET   /api/seller/onboarding — Returns the signed-in seller user's Welcome Guide progress
 * PATCH /api/seller/onboarding — Updates the signed-in seller user's Welcome Guide step/status
 *
 * Strictly scoped to the authenticated user's own session (`user.id`).
 * Rejects unauthenticated callers (401), non-sellers (403), and cross-user tampering (403).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import {
  SellerOnboardingService,
  SellerPortalAccessError,
} from '@/server/seller';

const updateOnboardingSchema = z.object({
  action: z.enum(['VIEW_STEP', 'SKIP', 'COMPLETE', 'REOPEN']),
  step: z.number().int().min(1).max(4).optional(),
  source: z.string().trim().max(64).optional(),
  userId: z.string().optional(),
  targetUserId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const requestedUserId = new URL(request.url).searchParams.get('userId');
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot read onboarding state for another user.' },
        { status: 403 }
      );
    }

    const onboarding = await SellerOnboardingService.getStateForUser(user);
    return NextResponse.json({ onboarding });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/seller/onboarding error:', err);
    return NextResponse.json(
      { error: 'Failed to load Seller Workspace onboarding status.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const parsed = updateOnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid onboarding payload.' },
        { status: 400 }
      );
    }

    const attemptedUserId = parsed.data.userId ?? parsed.data.targetUserId;
    if (attemptedUserId && attemptedUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify onboarding state for another user.' },
        { status: 403 }
      );
    }

    const onboarding = await SellerOnboardingService.updateStateForUser(user, {
      action: parsed.data.action,
      step: parsed.data.step,
      source: parsed.data.source,
    });

    return NextResponse.json({ onboarding });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('PATCH /api/seller/onboarding error:', err);
    return NextResponse.json(
      { error: 'Failed to save Seller Workspace onboarding status.' },
      { status: 500 }
    );
  }
}
