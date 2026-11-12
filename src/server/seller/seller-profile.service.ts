/**
 * RESOLVEGRAPH — Seller Business Profile Service
 *
 * Manages authenticated seller organization identity, verified business fields,
 * marketplace associations, and automatic re-verification workflows whenever
 * critical legal/tax attributes (legalName, gstin) are modified.
 */

import { prisma } from '@/lib/prisma';
import type { AuthenticatedUser } from '@/server/auth/session';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import {
  OrganizationRole,
  UserRole,
} from '@/generated/prisma/client';
import { SellerPortalAccessError } from './seller-response.service';
import { normalizeMarketplaceName } from './seller.types';

export interface SellerBusinessProfileModel {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  membershipRole: OrganizationRole;
  availableOrganizations: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    membershipRole: OrganizationRole;
  }>;
  canEditOperationalFields: boolean;
  canEditIdentityFields: boolean;
  canViewSensitiveTaxDetails: boolean;
  sellerDirectoryId: string | null;
  legalName: string;
  displayName: string;
  businessType: string;
  gstin: string | null;
  panMasked: string | null;
  businessAddress: string;
  state: string;
  businessEmail: string;
  verifiedContactNumber: string;
  registrationStatus: string;
  verificationStatus: string;
  identityStatus: string;
  reverificationNotice: string | null;
  verifiedAt: string | null;
  marketplaceAccounts: Array<{
    id: string;
    marketplace: string;
    marketplaceSellerId: string | null;
    storefrontName: string | null;
    marketplaceUrl: string | null;
    relationshipType: string | null;
    isVerified: boolean;
  }>;
}

export interface UpdateSellerProfileInput {
  organizationId?: string;
  displayName?: string;
  businessType?: string;
  businessAddress?: string;
  state?: string;
  businessEmail?: string;
  verifiedContactNumber?: string;
  legalName?: string;
  gstin?: string | null;
  marketplaceAccount?: {
    marketplace: string;
    marketplaceSellerId?: string;
    storefrontName?: string;
    marketplaceUrl?: string;
  };
}

function safeMetaParse(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export class SellerProfileService {
  /**
   * Resolves the authenticated merchant member's verified business profile.
   */
  public static async getSellerProfile(
    user: AuthenticatedUser,
    organizationId?: string
  ): Promise<SellerBusinessProfileModel> {
    if (user.role === UserRole.BUYER && !user.isPlatformAdmin) {
      throw new SellerPortalAccessError(
        'Buyers cannot access the Seller Business Profile.',
        403
      );
    }

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        organization: { isActive: true },
      },
      include: {
        organization: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    if (memberships.length === 0) {
      throw new SellerPortalAccessError(
        'No active seller organization membership is associated with your account.',
        403
      );
    }

    const membership = organizationId
      ? memberships.find((m) => m.organizationId === organizationId)
      : memberships[0];

    if (!membership) {
      throw new SellerPortalAccessError(
        'Access denied: Requested organization is not an active seller membership for your account.',
        403
      );
    }

    const org = membership.organization;
    const directoryEntry = await prisma.sellerDirectoryEntry.findFirst({
      where: { linkedOrganizationId: org.id },
      include: { marketplaceAccounts: true },
      orderBy: { updatedAt: 'desc' },
    });

    const meta = safeMetaParse(directoryEntry?.metadataJson);
    const canManageOrg =
      user.isPlatformAdmin ||
      membership.role === OrganizationRole.OWNER ||
      membership.role === OrganizationRole.ORG_ADMIN;

    const canEditOps =
      canManageOrg ||
      membership.role === OrganizationRole.MERCHANT_AGENT ||
      membership.role === OrganizationRole.RESOLUTION_MANAGER;

    return {
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: org.slug,
      membershipRole: membership.role,
      availableOrganizations: memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        membershipRole: m.role,
      })),
      canEditOperationalFields: canEditOps,
      canEditIdentityFields: canManageOrg,
      canViewSensitiveTaxDetails: canManageOrg || membership.role !== OrganizationRole.VIEWER,
      sellerDirectoryId: directoryEntry?.id ?? null,
      legalName: directoryEntry?.legalName ?? org.name,
      displayName: directoryEntry?.displayName ?? org.name,
      businessType:
        typeof meta.businessType === 'string' && meta.businessType.trim()
          ? meta.businessType
          : 'Private Limited Commerce Entity',
      gstin:
        membership.role === OrganizationRole.VIEWER && !user.isPlatformAdmin
          ? directoryEntry?.gstin
            ? `${directoryEntry.gstin.slice(0, 4)}*******${directoryEntry.gstin.slice(-3)}`
            : null
          : directoryEntry?.gstin ?? null,
      panMasked:
        canManageOrg || user.isPlatformAdmin ? directoryEntry?.panMasked ?? null : null,
      businessAddress: directoryEntry?.businessAddress ?? org.description ?? '',
      state: directoryEntry?.state ?? '',
      businessEmail:
        typeof meta.businessEmail === 'string' && meta.businessEmail.trim()
          ? meta.businessEmail
          : user.email,
      verifiedContactNumber:
        typeof meta.verifiedContactNumber === 'string'
          ? meta.verifiedContactNumber
          : '',
      registrationStatus: directoryEntry?.registrationStatus ?? 'REGISTERED',
      verificationStatus:
        directoryEntry?.identityStatus === 'VERIFICATION_PENDING'
          ? 'VERIFICATION_PENDING'
          : directoryEntry?.verificationStatus ?? 'UNVERIFIED',
      identityStatus: directoryEntry?.identityStatus ?? 'REGISTERED',
      reverificationNotice:
        typeof meta.pendingVerificationReason === 'string'
          ? meta.pendingVerificationReason
          : null,
      verifiedAt: directoryEntry?.verifiedAt?.toISOString() ?? null,
      marketplaceAccounts:
        directoryEntry?.marketplaceAccounts.map((acc) => ({
          id: acc.id,
          marketplace: acc.marketplace,
          marketplaceSellerId: acc.marketplaceSellerId,
          storefrontName: acc.storefrontName,
          marketplaceUrl: acc.marketplaceUrl,
          relationshipType: acc.relationshipType,
          isVerified: acc.isVerified,
        })) ?? [],
    };
  }

  /**
   * Updates seller business profile with strict RBAC & re-verification when legal/GSTIN changes.
   */
  public static async updateSellerProfile(
    user: AuthenticatedUser,
    input: UpdateSellerProfileInput
  ): Promise<SellerBusinessProfileModel> {
    if (user.role === UserRole.BUYER && !user.isPlatformAdmin) {
      throw new SellerPortalAccessError('Forbidden', 403);
    }

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        organization: { isActive: true },
      },
      include: { organization: true },
      orderBy: { joinedAt: 'asc' },
    });

    const membership = input.organizationId
      ? memberships.find((m) => m.organizationId === input.organizationId)
      : memberships[0];

    if (input.organizationId && !membership) {
      throw new SellerPortalAccessError(
        'Forbidden: You do not belong to the requested seller organization.',
        403
      );
    }

    if (!membership || membership.role === OrganizationRole.VIEWER) {
      throw new SellerPortalAccessError(
        'Forbidden: Viewer members cannot modify the Seller Business Profile.',
        403
      );
    }

    const canManageOrg =
      user.isPlatformAdmin ||
      membership.role === OrganizationRole.OWNER ||
      membership.role === OrganizationRole.ORG_ADMIN;

    const org = membership.organization;
    let directoryEntry = await prisma.sellerDirectoryEntry.findFirst({
      where: { linkedOrganizationId: org.id },
      include: { marketplaceAccounts: true },
      orderBy: { updatedAt: 'desc' },
    });

    const isChangingLegalName =
      typeof input.legalName === 'string' &&
      input.legalName.trim().length > 0 &&
      input.legalName.trim() !== (directoryEntry?.legalName ?? org.name);

    const normalizedGstin =
      input.gstin !== undefined
        ? input.gstin?.trim().toUpperCase() || null
        : undefined;
    const isChangingGstin =
      normalizedGstin !== undefined && normalizedGstin !== (directoryEntry?.gstin ?? null);

    if ((isChangingLegalName || isChangingGstin) && !canManageOrg) {
      throw new SellerPortalAccessError(
        'Forbidden: Only Organization Owners or Admins can modify legal business name or GSTIN.',
        403
      );
    }

    if (normalizedGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalizedGstin)) {
      throw new SellerPortalAccessError(
        'Invalid GSTIN format. Must be 15 alphanumeric characters (e.g., 29AABCT1234E1Z5).',
        400
      );
    }

    const prevMeta = safeMetaParse(directoryEntry?.metadataJson);
    const requiresReverification = isChangingLegalName || isChangingGstin;

    const nextMeta = {
      ...prevMeta,
      ...(input.businessType !== undefined ? { businessType: input.businessType.trim() } : {}),
      ...(input.businessEmail !== undefined ? { businessEmail: input.businessEmail.trim() } : {}),
      ...(input.verifiedContactNumber !== undefined
        ? { verifiedContactNumber: input.verifiedContactNumber.trim() }
        : {}),
      ...(requiresReverification
        ? {
            pendingVerificationReason:
              'Legal name or GSTIN updated by merchant owner — pending administrator re-verification.',
            reverificationRequestedAt: new Date().toISOString(),
            reverificationRequestedBy: user.id,
          }
        : {}),
    };

    const nextLegalName = isChangingLegalName
      ? input.legalName!.trim()
      : directoryEntry?.legalName ?? org.name;

    const normalizedLegalName = nextLegalName
      .toLowerCase()
      .replace(/\bpvt\.?\s*ltd\.?\b/g, 'private limited')
      .replace(/\bltd\.?\b/g, 'limited')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!directoryEntry) {
      directoryEntry = await prisma.sellerDirectoryEntry.create({
        data: {
          legalName: nextLegalName,
          normalizedLegalName,
          displayName: input.displayName?.trim() || org.name,
          gstin: normalizedGstin ?? null,
          businessAddress: input.businessAddress?.trim() || null,
          state: input.state?.trim() || null,
          identityStatus: requiresReverification ? 'VERIFICATION_PENDING' : 'REGISTERED',
          registrationStatus: 'REGISTERED',
          verificationStatus: requiresReverification ? 'UNVERIFIED' : 'VERIFIED',
          identificationSource: 'SELLER_REGISTRATION',
          linkedOrganizationId: org.id,
          linkedMerchantUserId: user.id,
          metadataJson: JSON.stringify(nextMeta),
        },
        include: { marketplaceAccounts: true },
      });
    } else {
      directoryEntry = await prisma.sellerDirectoryEntry.update({
        where: { id: directoryEntry.id },
        data: {
          legalName: nextLegalName,
          normalizedLegalName,
          displayName:
            input.displayName !== undefined
              ? input.displayName.trim() || directoryEntry.displayName
              : directoryEntry.displayName,
          gstin:
            normalizedGstin !== undefined ? normalizedGstin : directoryEntry.gstin,
          businessAddress:
            input.businessAddress !== undefined
              ? input.businessAddress.trim() || null
              : directoryEntry.businessAddress,
          state:
            input.state !== undefined
              ? input.state.trim() || null
              : directoryEntry.state,
          ...(requiresReverification
            ? {
                verificationStatus: 'UNVERIFIED',
                identityStatus: 'VERIFICATION_PENDING',
                verifiedAt: null,
              }
            : {}),
          metadataJson: JSON.stringify(nextMeta),
        },
        include: { marketplaceAccounts: true },
      });
    }

    if (input.displayName?.trim() && input.displayName.trim() !== org.name && canManageOrg) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { name: input.displayName.trim() },
      });
    }

    if (input.marketplaceAccount?.marketplace) {
      const normMkt = normalizeMarketplaceName(input.marketplaceAccount.marketplace);
      const sellerCode = input.marketplaceAccount.marketplaceSellerId?.trim() || null;
      if (sellerCode) {
        await prisma.sellerMarketplaceAccount.upsert({
          where: {
            marketplace_marketplaceSellerId: {
              marketplace: normMkt,
              marketplaceSellerId: sellerCode,
            },
          },
          update: {
            storefrontName:
              input.marketplaceAccount.storefrontName?.trim() || directoryEntry.displayName,
            marketplaceUrl: input.marketplaceAccount.marketplaceUrl?.trim() || null,
          },
          create: {
            sellerId: directoryEntry.id,
            marketplace: normMkt,
            marketplaceSellerId: sellerCode,
            storefrontName:
              input.marketplaceAccount.storefrontName?.trim() || directoryEntry.displayName,
            marketplaceUrl: input.marketplaceAccount.marketplaceUrl?.trim() || null,
            relationshipType:
              normMkt === 'DIRECT' ? 'DIRECT_BRAND' : 'MARKETPLACE_THIRD_PARTY',
            isVerified: false,
          },
        });
      }
    }

    await SecurityAuditService.record({
      actorId: user.id,
      action: requiresReverification
        ? 'SELLER_IDENTITY_REVERIFICATION_TRIGGERED'
        : 'SELLER_PROFILE_UPDATED',
      targetType: 'SellerDirectoryEntry',
      targetId: directoryEntry.id,
      status: 'SUCCESS',
      metadata: {
        organizationId: org.id,
        requiresReverification,
        changedLegalName: isChangingLegalName,
        changedGstin: isChangingGstin,
      },
    });

    if (requiresReverification) {
      const admins = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [{ isPlatformAdmin: true }, { role: UserRole.ADMIN }],
        },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notificationMessage.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: `Re-Verification Required — ${org.name}`,
            body: `Merchant updated legal name or GSTIN on Seller Business Profile. Verify updated documents in Seller Directory.`,
            linkUrl: `/seller/directory`,
            type: 'WARNING',
          })),
        });
      }
    }

    return this.getSellerProfile(user, org.id);
  }
}
