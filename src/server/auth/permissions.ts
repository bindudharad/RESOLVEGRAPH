import {
  OrganizationRole,
  EvidenceVisibility,
} from '@/generated/prisma/client';
import { AuthenticatedUser } from './session';

export interface MinimalCase {
  id: string;
  caseNumber: string;
  buyerId: string;
  merchantId: string;
  organizationId: string | null;
}

export interface MinimalEvidence {
  id: string;
  caseId: string;
  uploadedById: string;
  visibility: EvidenceVisibility;
}

/**
 * Checks whether the user has general read access to a case.
 */
export function canAccessCase(user: AuthenticatedUser, c: MinimalCase): boolean {
  if (user.isPlatformAdmin) return true;

  // Buyer access: user is the buyer on this dispute
  if (c.buyerId === user.id) return true;

  // Merchant / Organization access: case belongs to an organization the user belongs to
  if (c.organizationId) {
    const isMember = user.orgMemberships.some(
      (m) => m.organizationId === c.organizationId
    );
    if (isMember) return true;
  }

  // Merchant identity fallback (direct merchant user ID match)
  if (c.merchantId === user.id) return true;

  return false;
}

/**
 * Checks if the user is authorized to mutate the case (status, notes, etc.).
 */
export function canMutateCase(user: AuthenticatedUser, c: MinimalCase): boolean {
  if (user.isPlatformAdmin) return true;

  // Buyers can only mutate specific buyer actions (managed in service)
  if (c.buyerId === user.id) return true;

  if (c.organizationId) {
    const membership = user.orgMemberships.find(
      (m) => m.organizationId === c.organizationId
    );
    if (!membership) return false;

    // Viewers cannot mutate cases
    if (membership.role === OrganizationRole.VIEWER) return false;

    return true;
  }

  return false;
}

/**
 * Evaluates whether a user can view or download a specific evidence document.
 */
export function canViewEvidence(
  user: AuthenticatedUser,
  evidence: MinimalEvidence,
  c: MinimalCase
): boolean {
  // First, user must have base access to the case
  if (!canAccessCase(user, c)) return false;

  if (user.isPlatformAdmin) return true;

  const isBuyer = c.buyerId === user.id;
  const isOrgMember = c.organizationId
    ? user.orgMemberships.some((m) => m.organizationId === c.organizationId)
    : false;
  const isManager = user.orgMemberships.some(
    (m) =>
      m.organizationId === c.organizationId &&
      (m.role === OrganizationRole.RESOLUTION_MANAGER || m.role === OrganizationRole.OWNER || m.role === OrganizationRole.ORG_ADMIN)
  );

  switch (evidence.visibility) {
    case EvidenceVisibility.SHARED_WITH_PARTICIPANTS:
      return isBuyer || isOrgMember;

    case EvidenceVisibility.BUYER_ONLY:
      // Only the buyer (and platform admin) can view buyer-only evidence
      return isBuyer;

    case EvidenceVisibility.MERCHANT_ONLY:
      // Only merchant agents, managers, and org admins can view merchant-only evidence
      return isOrgMember;

    case EvidenceVisibility.INTERNAL:
      // Only resolution managers and platform admins can view internal evidence
      return isManager;

    default:
      return false;
  }
}

/**
 * Evaluates whether a user can upload evidence with the requested visibility.
 */
export function canUploadEvidenceWithVisibility(
  user: AuthenticatedUser,
  c: MinimalCase,
  visibility: EvidenceVisibility
): boolean {
  if (!canAccessCase(user, c)) return false;
  if (user.isPlatformAdmin) return true;

  const isBuyer = c.buyerId === user.id;
  const membership = c.organizationId
    ? user.orgMemberships.find((m) => m.organizationId === c.organizationId)
    : null;

  if (membership?.role === OrganizationRole.VIEWER) return false;

  if (isBuyer) {
    // Buyers can only upload shared or buyer-only evidence
    return (
      visibility === EvidenceVisibility.SHARED_WITH_PARTICIPANTS ||
      visibility === EvidenceVisibility.BUYER_ONLY
    );
  }

  if (membership) {
    // Resolution managers can upload internal notes
    if (
      membership.role === OrganizationRole.RESOLUTION_MANAGER ||
      membership.role === OrganizationRole.OWNER ||
      membership.role === OrganizationRole.ORG_ADMIN
    ) {
      return true;
    }

    // Merchant agents cannot upload buyer-only or internal evidence
    return (
      visibility === EvidenceVisibility.SHARED_WITH_PARTICIPANTS ||
      visibility === EvidenceVisibility.MERCHANT_ONLY
    );
  }

  return false;
}

/**
 * Checks whether the user can manage organization members and settings.
 */
export function canManageOrganization(user: AuthenticatedUser, organizationId: string): boolean {
  if (user.isPlatformAdmin) return true;

  const membership = user.orgMemberships.find((m) => m.organizationId === organizationId);
  if (!membership) return false;

  return (
    membership.role === OrganizationRole.OWNER ||
    membership.role === OrganizationRole.ORG_ADMIN
  );
}
