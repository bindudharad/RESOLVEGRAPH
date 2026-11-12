/**
 * RESOLVEGRAPH — Seller Directory API (Admin / Investigator)
 *
 * GET  /api/seller/directory   List central Seller Directory entries & organizations
 * POST /api/seller/directory   Register or update a seller entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { UserRole } from '@/generated/prisma/client';
import { SellerDirectoryService } from '@/server/seller';

function hasDirectoryAccess(user: { isPlatformAdmin: boolean; role: string }) {
  return (
    user.isPlatformAdmin ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.RESOLUTION_MANAGER
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!hasDirectoryAccess(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Investigator or Admin permissions required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const registrationStatus = searchParams.get('registrationStatus') || undefined;

    const [sellers, organizations] = await Promise.all([
      SellerDirectoryService.listDirectory({ search, registrationStatus }),
      prisma.organization.findMany({
        select: { id: true, name: true, slug: true, isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ sellers, organizations });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Seller Directory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (!hasDirectoryAccess(user)) {
      return NextResponse.json(
        { error: 'Forbidden: Investigator or Admin permissions required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body.legalName || typeof body.legalName !== 'string' || body.legalName.trim().length < 2) {
      return NextResponse.json({ error: 'Valid legalName is required.' }, { status: 400 });
    }

    const entry = await SellerDirectoryService.registerOrUpdateSeller({
      legalName: body.legalName,
      displayName: body.displayName,
      gstin: body.gstin,
      businessAddress: body.businessAddress,
      state: body.state,
      identityStatus: body.identityStatus,
      registrationStatus: body.registrationStatus,
      verificationStatus: body.verificationStatus,
      identificationSource: body.identificationSource || 'MANUAL_ADMIN',
      linkedOrganizationId: body.linkedOrganizationId || null,
      linkedMerchantUserId: body.linkedMerchantUserId || null,
      marketplaceAccount: body.marketplace
        ? {
            marketplace: body.marketplace,
            marketplaceSellerId: body.marketplaceSellerId || null,
            storefrontName: body.storefrontName || null,
            marketplaceUrl: body.marketplaceUrl || null,
            relationshipType: body.relationshipType || null,
            isVerified: Boolean(body.verificationStatus === 'VERIFIED'),
          }
        : undefined,
    });

    return NextResponse.json({ success: true, seller: entry }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update Seller Directory' },
      { status: 400 }
    );
  }
}
