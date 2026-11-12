/**
 * RESOLVEGRAPH — Seller Business Profile API
 *
 * GET   /api/seller/profile
 * PATCH /api/seller/profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { SellerProfileService, SellerPortalAccessError } from '@/server/seller';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const organizationId = request.nextUrl.searchParams.get('organizationId') || undefined;
    const profile = await SellerProfileService.getSellerProfile(user, organizationId);
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/seller/profile error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch business profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const profile = await SellerProfileService.updateSellerProfile(user, {
      organizationId:
        typeof body.organizationId === 'string' ? body.organizationId : undefined,
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      businessType: typeof body.businessType === 'string' ? body.businessType : undefined,
      businessAddress:
        typeof body.businessAddress === 'string' ? body.businessAddress : undefined,
      state: typeof body.state === 'string' ? body.state : undefined,
      businessEmail: typeof body.businessEmail === 'string' ? body.businessEmail : undefined,
      verifiedContactNumber:
        typeof body.verifiedContactNumber === 'string'
          ? body.verifiedContactNumber
          : undefined,
      legalName: typeof body.legalName === 'string' ? body.legalName : undefined,
      gstin: body.gstin !== undefined ? (body.gstin ? String(body.gstin) : null) : undefined,
      marketplaceAccount:
        body.marketplaceAccount && typeof body.marketplaceAccount === 'object'
          ? {
              marketplace: String(body.marketplaceAccount.marketplace || ''),
              marketplaceSellerId: body.marketplaceAccount.marketplaceSellerId
                ? String(body.marketplaceAccount.marketplaceSellerId)
                : undefined,
              storefrontName: body.marketplaceAccount.storefrontName
                ? String(body.marketplaceAccount.storefrontName)
                : undefined,
              marketplaceUrl: body.marketplaceAccount.marketplaceUrl
                ? String(body.marketplaceAccount.marketplaceUrl)
                : undefined,
            }
          : undefined,
    });

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    if (err instanceof AuthError || err instanceof SellerPortalAccessError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('PATCH /api/seller/profile error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update business profile' },
      { status: 500 }
    );
  }
}
