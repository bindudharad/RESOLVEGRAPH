/**
 * RESOLVEGRAPH — Seller Directory Verification & Organization Link API
 *
 * PATCH /api/seller/directory/[sellerId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { UserRole } from '@/generated/prisma/client';
import { SellerDirectoryService } from '@/server/seller';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ sellerId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (
      !user.isPlatformAdmin &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.RESOLUTION_MANAGER
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Admin or Resolution Manager required.' },
        { status: 403 }
      );
    }

    const { sellerId } = await context.params;
    const body = await request.json();

    const updated = await SellerDirectoryService.verifyAndLinkSeller({
      sellerId,
      verificationStatus: body.verificationStatus || 'VERIFIED',
      linkedOrganizationId:
        body.linkedOrganizationId !== undefined ? body.linkedOrganizationId : undefined,
      identityStatus: body.identityStatus,
    });

    return NextResponse.json({ success: true, seller: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update seller entry' },
      { status: 400 }
    );
  }
}
