import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { prisma } from '@/lib/prisma';
import { ConsentManager } from '@/server/ai/security/consent-manager';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { claimId } = await context.params;

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { case: true }
    });

    if (!claim) {
      return NextResponse.json({ error: `Claim '${claimId}' not found` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const consent = await ConsentManager.grantConsent({
      targetType: 'CLAIM',
      targetId: claim.id,
      grantedById: user.id,
      caseId: claim.caseId,
      provider: body.provider || 'openai',
      purpose: body.purpose || 'EVIDENCE_INVESTIGATION'
    });

    return NextResponse.json({
      success: true,
      consentId: consent.id,
      provider: consent.provider,
      grantedAt: consent.grantedAt
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/claims/[claimId]/ai-consent POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ claimId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { claimId } = await context.params;

    const body = await request.json().catch(() => ({}));

    const result = await ConsentManager.revokeConsent({
      targetType: 'CLAIM',
      targetId: claimId,
      revokedById: user.id,
      reason: body.reason || 'User revoked consent',
      provider: body.provider || 'openai'
    });

    return NextResponse.json({
      success: true,
      revokedCount: result.revokedCount
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/claims/[claimId]/ai-consent DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
