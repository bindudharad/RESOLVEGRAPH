/**
 * RESOLVEGRAPH — Seller Directory & Priority Identity Matching Service
 *
 * Central persistent seller identity directory separating:
 * - Legal business entity (SellerDirectoryEntry)
 * - Marketplace storefront account (SellerMarketplaceAccount)
 * - RESOLVEGRAPH merchant Organization & Users
 *
 * Matching rules:
 * 1. Exact GSTIN match against verified seller record
 * 2. Exact marketplace + marketplaceSellerId match
 * 3. Normalized legal business name (strict; fuzzy matching is candidate discovery only)
 * 4. Business address & state corroboration
 * 5. Marketplace association
 *
 * Fuzzy name similarity NEVER grants automatic access to a registered merchant account.
 */

import { prisma } from '@/lib/prisma';
import { OrganizationRole } from '@/generated/prisma/client';
import {
  normalizeMarketplaceName,
  type ExtractedSellerIdentity,
  type SellerIdentityStatus,
  type SellerMatchOutcome,
  type SellerRegistrationStatus,
} from './seller.types';

export interface SellerRegistrationCheck {
  registrationStatus: SellerRegistrationStatus;
  organizationId: string | null;
  organizationName: string | null;
  merchantUserId: string | null;
  eligibleMemberUserIds: string[];
  reason: string;
}

export interface SellerMatchResolution {
  sellerEntry: {
    id: string;
    legalName: string;
    displayName: string | null;
    gstin: string | null;
    state: string | null;
    identityStatus: string;
    registrationStatus: string;
    verificationStatus: string;
    linkedOrganizationId: string | null;
  } | null;
  matchOutcome: SellerMatchOutcome;
  confidence: number;
  signals: string[];
  candidateSellerIds: string[];
  requiresHumanReview: boolean;
  reviewReasons: string[];
  registration: SellerRegistrationCheck;
}

export interface UpsertSellerDirectoryInput {
  legalName: string;
  displayName?: string | null;
  gstin?: string | null;
  panMasked?: string | null;
  panHash?: string | null;
  businessAddress?: string | null;
  state?: string | null;
  identityStatus?: SellerIdentityStatus;
  registrationStatus?: 'REGISTERED' | 'UNREGISTERED' | 'INACTIVE' | 'UNKNOWN';
  verificationStatus?: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  identificationSource?: string;
  linkedOrganizationId?: string | null;
  linkedMerchantUserId?: string | null;
  marketplaceAccount?: {
    marketplace: string;
    marketplaceSellerId?: string | null;
    storefrontName?: string | null;
    marketplaceUrl?: string | null;
    relationshipType?: string | null;
    isVerified?: boolean;
  };
}

const ELIGIBLE_PORTAL_ROLES: OrganizationRole[] = [
  OrganizationRole.OWNER,
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.MERCHANT_AGENT,
  OrganizationRole.RESOLUTION_MANAGER,
];

export function normalizeSellerBusinessName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bpvt\.?\s*ltd\.?\b/g, 'private limited')
    .replace(/\bltd\.?\b/g, 'limited')
    .replace(/\binc\.?\b/g, 'incorporated')
    .replace(/\bco\.?\b/g, 'company')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenJaccardSimilarity(a: string, b: string): number {
  const stopWords = new Set(['private', 'limited', 'llp', 'inc', 'llc', 'company', 'india', 'the']);
  const tokensA = new Set(
    normalizeSellerBusinessName(a)
      .split(' ')
      .filter((t) => t.length > 1 && !stopWords.has(t))
  );
  const tokensB = new Set(
    normalizeSellerBusinessName(b)
      .split(' ')
      .filter((t) => t.length > 1 && !stopWords.has(t))
  );

  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

export class SellerDirectoryService {
  /**
   * Checks whether a matched SellerDirectoryEntry is actively registered & verified
   * on RESOLVEGRAPH with an active organization and eligible members.
   */
  public static async checkRegistrationStatus(
    sellerEntry: {
      id: string;
      legalName: string;
      identityStatus: string;
      registrationStatus: string;
      verificationStatus: string;
      linkedOrganizationId: string | null;
      linkedMerchantUserId: string | null;
    } | null
  ): Promise<SellerRegistrationCheck> {
    if (!sellerEntry) {
      return {
        registrationStatus: 'REQUIRES_REVIEW',
        organizationId: null,
        organizationName: null,
        merchantUserId: null,
        eligibleMemberUserIds: [],
        reason: 'Seller identity has not been resolved to a directory record.',
      };
    }

    if (
      sellerEntry.identityStatus === 'INACTIVE' ||
      sellerEntry.registrationStatus === 'INACTIVE'
    ) {
      return {
        registrationStatus: 'INACTIVE',
        organizationId: null,
        organizationName: null,
        merchantUserId: null,
        eligibleMemberUserIds: [],
        reason: `Seller "${sellerEntry.legalName}" is marked INACTIVE in the Seller Directory.`,
      };
    }

    if (
      sellerEntry.verificationStatus !== 'VERIFIED' ||
      !sellerEntry.linkedOrganizationId
    ) {
      return {
        registrationStatus: 'IDENTIFIED_UNREGISTERED',
        organizationId: null,
        organizationName: null,
        merchantUserId: null,
        eligibleMemberUserIds: [],
        reason: 'SELLER IDENTIFIED — NOT REGISTERED ON RESOLVEGRAPH.',
      };
    }

    const org = await prisma.organization.findUnique({
      where: { id: sellerEntry.linkedOrganizationId },
      include: {
        members: {
          where: {
            isActive: true,
            role: { in: ELIGIBLE_PORTAL_ROLES },
            user: { isActive: true },
          },
          include: {
            user: { select: { id: true, role: true, isActive: true } },
          },
        },
      },
    });

    if (!org || !org.isActive) {
      return {
        registrationStatus: 'INACTIVE',
        organizationId: null,
        organizationName: org?.name ?? null,
        merchantUserId: null,
        eligibleMemberUserIds: [],
        reason: `Linked merchant organization for "${sellerEntry.legalName}" is inactive or missing.`,
      };
    }

    const eligibleUserIds = org.members.map((m) => m.userId);
    if (eligibleUserIds.length === 0) {
      return {
        registrationStatus: 'REQUIRES_REVIEW',
        organizationId: org.id,
        organizationName: org.name,
        merchantUserId: null,
        eligibleMemberUserIds: [],
        reason: `Organization "${org.name}" has no active authorized members to receive Seller Portal requests.`,
      };
    }

    const primaryMerchant =
      org.members.find((m) => m.role === OrganizationRole.OWNER)?.userId ||
      sellerEntry.linkedMerchantUserId ||
      eligibleUserIds[0];

    return {
      registrationStatus: 'REGISTERED_VERIFIED',
      organizationId: org.id,
      organizationName: org.name,
      merchantUserId: primaryMerchant,
      eligibleMemberUserIds: eligibleUserIds,
      reason: `Verified seller linked to active RESOLVEGRAPH organization "${org.name}".`,
    };
  }

  /**
   * Registers or updates a Seller Directory entry without creating duplicates.
   */
  public static async registerOrUpdateSeller(input: UpsertSellerDirectoryInput) {
    const cleanGstin = input.gstin?.trim().toUpperCase() || null;
    const normalizedName = normalizeSellerBusinessName(input.legalName);

    let existing = cleanGstin
      ? await prisma.sellerDirectoryEntry.findUnique({ where: { gstin: cleanGstin } })
      : null;

    if (!existing && !cleanGstin) {
      const sameNameEntries = await prisma.sellerDirectoryEntry.findMany({
        where: { normalizedLegalName: normalizedName },
        take: 2,
      });
      if (sameNameEntries.length === 1 && !sameNameEntries[0].gstin) {
        existing = sameNameEntries[0];
      }
    }

    const entry = existing
      ? await prisma.sellerDirectoryEntry.update({
          where: { id: existing.id },
          data: {
            displayName: input.displayName ?? existing.displayName,
            businessAddress: input.businessAddress ?? existing.businessAddress,
            state: input.state ?? existing.state,
            panMasked: input.panMasked ?? existing.panMasked,
            panHash: input.panHash ?? existing.panHash,
            ...(input.identityStatus ? { identityStatus: input.identityStatus } : {}),
            ...(input.registrationStatus ? { registrationStatus: input.registrationStatus } : {}),
            ...(input.verificationStatus
              ? {
                  verificationStatus: input.verificationStatus,
                  verifiedAt: input.verificationStatus === 'VERIFIED' ? new Date() : null,
                }
              : {}),
            ...(input.linkedOrganizationId !== undefined
              ? { linkedOrganizationId: input.linkedOrganizationId }
              : {}),
            ...(input.linkedMerchantUserId !== undefined
              ? { linkedMerchantUserId: input.linkedMerchantUserId }
              : {}),
          },
        })
      : await prisma.sellerDirectoryEntry.create({
          data: {
            legalName: input.legalName.trim(),
            normalizedLegalName: normalizedName,
            displayName: input.displayName?.trim() || input.legalName.trim(),
            gstin: cleanGstin,
            panMasked: input.panMasked || null,
            panHash: input.panHash || null,
            businessAddress: input.businessAddress || null,
            state: input.state || null,
            identityStatus: input.identityStatus || 'IDENTIFIED',
            registrationStatus:
              input.registrationStatus ||
              (input.linkedOrganizationId ? 'REGISTERED' : 'UNREGISTERED'),
            verificationStatus: input.verificationStatus || 'UNVERIFIED',
            identificationSource: input.identificationSource || 'INVOICE_OCR',
            verifiedAt: input.verificationStatus === 'VERIFIED' ? new Date() : null,
            linkedOrganizationId: input.linkedOrganizationId || null,
            linkedMerchantUserId: input.linkedMerchantUserId || null,
          },
        });

    if (input.marketplaceAccount) {
      const mp = normalizeMarketplaceName(input.marketplaceAccount.marketplace);
      const mpSellerId = input.marketplaceAccount.marketplaceSellerId?.trim() || null;

      if (mpSellerId) {
        await prisma.sellerMarketplaceAccount.upsert({
          where: {
            marketplace_marketplaceSellerId: {
              marketplace: mp,
              marketplaceSellerId: mpSellerId,
            },
          },
          update: {
            sellerId: entry.id,
            storefrontName: input.marketplaceAccount.storefrontName ?? undefined,
            relationshipType: input.marketplaceAccount.relationshipType ?? undefined,
            isVerified: input.marketplaceAccount.isVerified ?? false,
          },
          create: {
            sellerId: entry.id,
            marketplace: mp,
            marketplaceSellerId: mpSellerId,
            storefrontName: input.marketplaceAccount.storefrontName || entry.displayName,
            marketplaceUrl: input.marketplaceAccount.marketplaceUrl || null,
            relationshipType: input.marketplaceAccount.relationshipType || 'MARKETPLACE_THIRD_PARTY',
            isVerified: input.marketplaceAccount.isVerified ?? false,
          },
        });
      } else {
        const existingMp = await prisma.sellerMarketplaceAccount.findFirst({
          where: { sellerId: entry.id, marketplace: mp },
        });
        if (!existingMp) {
          await prisma.sellerMarketplaceAccount.create({
            data: {
              sellerId: entry.id,
              marketplace: mp,
              storefrontName: input.marketplaceAccount.storefrontName || entry.displayName,
              relationshipType: input.marketplaceAccount.relationshipType || 'MARKETPLACE_THIRD_PARTY',
              isVerified: input.marketplaceAccount.isVerified ?? false,
            },
          });
        }
      }
    }

    return prisma.sellerDirectoryEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: { marketplaceAccounts: true, linkedOrganization: true },
    });
  }

  /**
   * Matches an extracted seller identity against the Seller Directory using strict
   * identifier priority. Ambiguous or fuzzy matches NEVER auto-grant registered access.
   */
  public static async matchAndResolveSeller(
    extracted: ExtractedSellerIdentity,
    options?: { autoCreateUnregistered?: boolean }
  ): Promise<SellerMatchResolution> {
    const autoCreateUnregistered = options?.autoCreateUnregistered ?? true;
    const signals: string[] = [];
    const reviewReasons: string[] = [...extracted.ambiguityReasons];

    if (extracted.isAmbiguous && !extracted.gstin && !extracted.legalName) {
      return {
        sellerEntry: null,
        matchOutcome: 'INSUFFICIENT_INFORMATION',
        confidence: extracted.confidence,
        signals: ['INSUFFICIENT_SELLER_FIELDS'],
        candidateSellerIds: [],
        requiresHumanReview: true,
        reviewReasons:
          reviewReasons.length > 0
            ? reviewReasons
            : ['Seller identity could not be extracted reliably from submitted documents.'],
        registration: {
          registrationStatus: 'REQUIRES_REVIEW',
          organizationId: null,
          organizationName: null,
          merchantUserId: null,
          eligibleMemberUserIds: [],
          reason: 'SELLER IDENTITY REQUIRES REVIEW',
        },
      };
    }

    const cleanGstin = extracted.gstin?.trim().toUpperCase() || null;

    // -------------------------------------------------------------------------
    // Priority 1: Exact GSTIN Match
    // -------------------------------------------------------------------------
    if (cleanGstin) {
      const gstinMatch = await prisma.sellerDirectoryEntry.findUnique({
        where: { gstin: cleanGstin },
      });

      if (gstinMatch) {
        signals.push('EXACT_GSTIN_MATCH');
        if (extracted.state && gstinMatch.state && extracted.state.toLowerCase() === gstinMatch.state.toLowerCase()) {
          signals.push('STATE_CORROBORATED');
        }

        const registration = await this.checkRegistrationStatus(gstinMatch);
        const isInactive = registration.registrationStatus === 'INACTIVE';

        // Ensure marketplace association is recorded if missing
        await this.attachMarketplaceAccountIfNeeded(gstinMatch.id, extracted);

        return {
          sellerEntry: gstinMatch,
          matchOutcome: gstinMatch.verificationStatus === 'VERIFIED' ? 'VERIFIED_MATCH' : 'EXACT_MATCH',
          confidence: 0.99,
          signals,
          candidateSellerIds: [gstinMatch.id],
          requiresHumanReview: isInactive || registration.registrationStatus === 'REQUIRES_REVIEW',
          reviewReasons: isInactive ? [registration.reason] : [],
          registration,
        };
      }
    }

    // -------------------------------------------------------------------------
    // Priority 2: Exact Marketplace + Marketplace Seller ID Match
    // -------------------------------------------------------------------------
    if (extracted.marketplaceSellerId) {
      const mpAccount = await prisma.sellerMarketplaceAccount.findUnique({
        where: {
          marketplace_marketplaceSellerId: {
            marketplace: extracted.marketplace,
            marketplaceSellerId: extracted.marketplaceSellerId,
          },
        },
        include: { seller: true },
      });

      if (mpAccount?.seller) {
        const matched = mpAccount.seller;
        // Detect GSTIN conflict before trusting marketplace account match
        if (cleanGstin && matched.gstin && cleanGstin !== matched.gstin) {
          return {
            sellerEntry: null,
            matchOutcome: 'MULTIPLE_MATCHES',
            confidence: 0.45,
            signals: ['MARKETPLACE_SELLER_ID_MATCH', 'GSTIN_CONFLICT'],
            candidateSellerIds: [matched.id],
            requiresHumanReview: true,
            reviewReasons: [
              `Marketplace Seller ID ${extracted.marketplaceSellerId} maps to "${matched.legalName}" (GSTIN ${matched.gstin}), which conflicts with invoice GSTIN ${cleanGstin}.`,
            ],
            registration: {
              registrationStatus: 'REQUIRES_REVIEW',
              organizationId: null,
              organizationName: null,
              merchantUserId: null,
              eligibleMemberUserIds: [],
              reason: 'SELLER IDENTITY REQUIRES REVIEW',
            },
          };
        }

        signals.push('EXACT_MARKETPLACE_SELLER_ID');
        const registration = await this.checkRegistrationStatus(matched);
        return {
          sellerEntry: matched,
          matchOutcome:
            matched.verificationStatus === 'VERIFIED' && mpAccount.isVerified
              ? 'VERIFIED_MATCH'
              : 'EXACT_MATCH',
          confidence: 0.92,
          signals,
          candidateSellerIds: [matched.id],
          requiresHumanReview:
            registration.registrationStatus === 'INACTIVE' ||
            registration.registrationStatus === 'REQUIRES_REVIEW',
          reviewReasons:
            registration.registrationStatus === 'INACTIVE' ? [registration.reason] : [],
          registration,
        };
      }
    }

    // -------------------------------------------------------------------------
    // Priority 3: Normalized Legal Business Name Match
    // -------------------------------------------------------------------------
    if (extracted.legalName && !extracted.isAmbiguous) {
      const normName = normalizeSellerBusinessName(extracted.legalName);
      const exactNameMatches = await prisma.sellerDirectoryEntry.findMany({
        where: { normalizedLegalName: normName },
        include: { marketplaceAccounts: true },
      });

      // Filter out entries with a conflicting GSTIN
      const compatibleMatches = exactNameMatches.filter((m) => {
        if (cleanGstin && m.gstin && m.gstin !== cleanGstin) return false;
        return true;
      });

      if (compatibleMatches.length > 1) {
        return {
          sellerEntry: null,
          matchOutcome: 'MULTIPLE_MATCHES',
          confidence: 0.55,
          signals: ['MULTIPLE_LEGAL_NAME_MATCHES'],
          candidateSellerIds: compatibleMatches.map((m) => m.id),
          requiresHumanReview: true,
          reviewReasons: [
            `Multiple Seller Directory records match legal name "${extracted.legalName}". Manual investigator selection is required.`,
          ],
          registration: {
            registrationStatus: 'REQUIRES_REVIEW',
            organizationId: null,
            organizationName: null,
            merchantUserId: null,
            eligibleMemberUserIds: [],
            reason: 'SELLER IDENTITY REQUIRES REVIEW',
          },
        };
      }

      if (compatibleMatches.length === 1) {
        const candidate = compatibleMatches[0];
        signals.push('NORMALIZED_LEGAL_NAME_MATCH');

        if (
          extracted.state &&
          candidate.state &&
          extracted.state.toLowerCase() === candidate.state.toLowerCase()
        ) {
          signals.push('STATE_CORROBORATED');
        }
        if (
          candidate.marketplaceAccounts.some((ma) => ma.marketplace === extracted.marketplace)
        ) {
          signals.push('MARKETPLACE_CORROBORATED');
        }

        // Security rule: If candidate is registered on RESOLVEGRAPH with a verified GSTIN on file,
        // but the invoice had NO GSTIN, require human review instead of auto-granting portal access.
        if (candidate.linkedOrganizationId && candidate.gstin && !cleanGstin) {
          return {
            sellerEntry: candidate,
            matchOutcome: 'POSSIBLE_MATCH',
            confidence: 0.72,
            signals: [...signals, 'MISSING_INVOICE_GSTIN_FOR_VERIFIED_MERCHANT'],
            candidateSellerIds: [candidate.id],
            requiresHumanReview: true,
            reviewReasons: [
              `Invoice matches registered merchant "${candidate.legalName}" by name, but GSTIN could not be verified from the document.`,
            ],
            registration: {
              registrationStatus: 'REQUIRES_REVIEW',
              organizationId: null,
              organizationName: null,
              merchantUserId: null,
              eligibleMemberUserIds: [],
              reason: 'SELLER IDENTITY REQUIRES REVIEW',
            },
          };
        }

        const registration = await this.checkRegistrationStatus(candidate);
        await this.attachMarketplaceAccountIfNeeded(candidate.id, extracted);

        return {
          sellerEntry: candidate,
          matchOutcome:
            candidate.verificationStatus === 'VERIFIED' && signals.includes('STATE_CORROBORATED')
              ? 'VERIFIED_MATCH'
              : 'EXACT_MATCH',
          confidence: 0.86,
          signals,
          candidateSellerIds: [candidate.id],
          requiresHumanReview:
            registration.registrationStatus === 'INACTIVE' ||
            registration.registrationStatus === 'REQUIRES_REVIEW',
          reviewReasons:
            registration.registrationStatus === 'INACTIVE' ? [registration.reason] : [],
          registration,
        };
      }

      // If legal name matched existing records ONLY with conflicting GSTINs, flag conflict
      if (exactNameMatches.length > 0 && compatibleMatches.length === 0) {
        return {
          sellerEntry: null,
          matchOutcome: 'POSSIBLE_MATCH',
          confidence: 0.4,
          signals: ['NAME_MATCH_WITH_GSTIN_MISMATCH'],
          candidateSellerIds: exactNameMatches.map((m) => m.id),
          requiresHumanReview: true,
          reviewReasons: [
            `Seller name "${extracted.legalName}" matches an existing directory record, but extracted GSTIN (${cleanGstin}) does not match the stored GSTIN.`,
          ],
          registration: {
            registrationStatus: 'REQUIRES_REVIEW',
            organizationId: null,
            organizationName: null,
            merchantUserId: null,
            eligibleMemberUserIds: [],
            reason: 'SELLER IDENTITY REQUIRES REVIEW',
          },
        };
      }
    }

    // -------------------------------------------------------------------------
    // Priority 4: Fuzzy Candidate Discovery ONLY (Never Auto-Grants Portal Access)
    // -------------------------------------------------------------------------
    if (extracted.legalName) {
      const allEntries = await prisma.sellerDirectoryEntry.findMany({
        take: 250,
      });

      const fuzzyCandidates = allEntries
        .map((entry) => ({
          entry,
          score: tokenJaccardSimilarity(extracted.legalName || '', entry.legalName),
        }))
        .filter((item) => {
          if (item.score < 0.6) return false;
          if (cleanGstin && item.entry.gstin && item.entry.gstin !== cleanGstin) return false;
          return true;
        })
        .sort((a, b) => b.score - a.score);

      if (fuzzyCandidates.length > 0) {
        const isMulti = fuzzyCandidates.length > 1;
        return {
          sellerEntry: isMulti ? null : fuzzyCandidates[0].entry,
          matchOutcome: isMulti ? 'MULTIPLE_MATCHES' : 'POSSIBLE_MATCH',
          confidence: fuzzyCandidates[0].score,
          signals: ['FUZZY_NAME_CANDIDATE_DISCOVERY'],
          candidateSellerIds: fuzzyCandidates.map((c) => c.entry.id),
          requiresHumanReview: true,
          reviewReasons: [
            isMulti
              ? `Multiple candidate sellers have similar names to "${extracted.legalName}". Manual investigator verification required.`
              : `Fuzzy name similarity (${Math.round(fuzzyCandidates[0].score * 100)}%) matched "${fuzzyCandidates[0].entry.legalName}". Fuzzy matches never grant automatic merchant access.`,
          ],
          registration: {
            registrationStatus: 'REQUIRES_REVIEW',
            organizationId: null,
            organizationName: null,
            merchantUserId: null,
            eligibleMemberUserIds: [],
            reason: 'SELLER IDENTITY REQUIRES REVIEW',
          },
        };
      }
    }

    // -------------------------------------------------------------------------
    // Ambiguous extraction check before creating any new Seller Directory entry
    // -------------------------------------------------------------------------
    if (extracted.isAmbiguous || !extracted.legalName) {
      return {
        sellerEntry: null,
        matchOutcome: 'INSUFFICIENT_INFORMATION',
        confidence: extracted.confidence,
        signals: ['AMBIGUOUS_OR_MISSING_SELLER_NAME'],
        candidateSellerIds: [],
        requiresHumanReview: true,
        reviewReasons:
          reviewReasons.length > 0
            ? reviewReasons
            : ['Extracted seller information is ambiguous and requires human review.'],
        registration: {
          registrationStatus: 'REQUIRES_REVIEW',
          organizationId: null,
          organizationName: null,
          merchantUserId: null,
          eligibleMemberUserIds: [],
          reason: 'SELLER IDENTITY REQUIRES REVIEW',
        },
      };
    }

    // -------------------------------------------------------------------------
    // Priority 5: NO_MATCH -> Create Unregistered IDENTIFIED Seller Directory Entry
    // -------------------------------------------------------------------------
    if (!autoCreateUnregistered) {
      return {
        sellerEntry: null,
        matchOutcome: 'NO_MATCH',
        confidence: extracted.confidence,
        signals: ['NO_EXISTING_SELLER_RECORD'],
        candidateSellerIds: [],
        requiresHumanReview: false,
        reviewReasons: [],
        registration: {
          registrationStatus: 'IDENTIFIED_UNREGISTERED',
          organizationId: null,
          organizationName: null,
          merchantUserId: null,
          eligibleMemberUserIds: [],
          reason: 'SELLER IDENTIFIED — NOT REGISTERED ON RESOLVEGRAPH.',
        },
      };
    }

    const createdEntry = await this.registerOrUpdateSeller({
      legalName: extracted.legalName,
      displayName: extracted.displayName || extracted.legalName,
      gstin: cleanGstin,
      panMasked: extracted.panMasked,
      panHash: extracted.panHash,
      businessAddress: extracted.businessAddress,
      state: extracted.state,
      identityStatus: 'IDENTIFIED',
      registrationStatus: 'UNREGISTERED',
      verificationStatus: 'UNVERIFIED',
      identificationSource: 'INVOICE_OCR',
      marketplaceAccount: {
        marketplace: extracted.marketplace,
        marketplaceSellerId: extracted.marketplaceSellerId,
        storefrontName: extracted.displayName || extracted.legalName,
        relationshipType: extracted.sellerRelationship,
        isVerified: false,
      },
    });

    return {
      sellerEntry: createdEntry,
      matchOutcome: 'NO_MATCH',
      confidence: extracted.confidence,
      signals: ['NEW_IDENTIFIED_UNREGISTERED_SELLER'],
      candidateSellerIds: [createdEntry.id],
      requiresHumanReview: false,
      reviewReasons: [],
      registration: {
        registrationStatus: 'IDENTIFIED_UNREGISTERED',
        organizationId: null,
        organizationName: null,
        merchantUserId: null,
        eligibleMemberUserIds: [],
        reason: 'SELLER IDENTIFIED — NOT REGISTERED ON RESOLVEGRAPH.',
      },
    };
  }

  private static async attachMarketplaceAccountIfNeeded(
    sellerId: string,
    extracted: ExtractedSellerIdentity
  ): Promise<void> {
    if (extracted.marketplace === 'OTHER' && !extracted.marketplaceSellerId) return;
    if (extracted.marketplaceSellerId) {
      await prisma.sellerMarketplaceAccount
        .upsert({
          where: {
            marketplace_marketplaceSellerId: {
              marketplace: extracted.marketplace,
              marketplaceSellerId: extracted.marketplaceSellerId,
            },
          },
          update: {},
          create: {
            sellerId,
            marketplace: extracted.marketplace,
            marketplaceSellerId: extracted.marketplaceSellerId,
            storefrontName: extracted.displayName || extracted.legalName,
            relationshipType: extracted.sellerRelationship,
            isVerified: false,
          },
        })
        .catch(() => {});
      return;
    }

    const exists = await prisma.sellerMarketplaceAccount.findFirst({
      where: { sellerId, marketplace: extracted.marketplace },
    });
    if (!exists) {
      await prisma.sellerMarketplaceAccount.create({
        data: {
          sellerId,
          marketplace: extracted.marketplace,
          storefrontName: extracted.displayName || extracted.legalName,
          relationshipType: extracted.sellerRelationship,
          isVerified: false,
        },
      });
    }
  }

  public static async listDirectory(params?: { search?: string; registrationStatus?: string }) {
    const where: Record<string, unknown> = {};
    if (params?.registrationStatus && params.registrationStatus !== 'ALL') {
      where.registrationStatus = params.registrationStatus;
    }
    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { legalName: { contains: q } },
        { displayName: { contains: q } },
        { gstin: { contains: q.toUpperCase() } },
        { state: { contains: q } },
      ];
    }

    return prisma.sellerDirectoryEntry.findMany({
      where,
      include: {
        marketplaceAccounts: true,
        linkedOrganization: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
        _count: {
          select: { evidenceRequests: true, identityMatches: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  public static async verifyAndLinkSeller(params: {
    sellerId: string;
    verificationStatus: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED';
    linkedOrganizationId?: string | null;
    identityStatus?: SellerIdentityStatus;
  }) {
    const existing = await prisma.sellerDirectoryEntry.findUnique({
      where: { id: params.sellerId },
    });
    if (!existing) {
      throw new Error(`Seller directory entry ${params.sellerId} not found.`);
    }

    const registrationStatus =
      params.identityStatus === 'INACTIVE'
        ? 'INACTIVE'
        : params.linkedOrganizationId && params.verificationStatus === 'VERIFIED'
        ? 'REGISTERED'
        : 'UNREGISTERED';

    return prisma.sellerDirectoryEntry.update({
      where: { id: params.sellerId },
      data: {
        verificationStatus: params.verificationStatus,
        verifiedAt: params.verificationStatus === 'VERIFIED' ? new Date() : null,
        linkedOrganizationId:
          params.linkedOrganizationId !== undefined
            ? params.linkedOrganizationId
            : existing.linkedOrganizationId,
        identityStatus:
          params.identityStatus ||
          (params.verificationStatus === 'VERIFIED' && params.linkedOrganizationId
            ? 'REGISTERED'
            : params.verificationStatus === 'VERIFIED'
            ? 'VERIFIED'
            : existing.identityStatus),
        registrationStatus,
      },
      include: { marketplaceAccounts: true, linkedOrganization: true },
    });
  }
}
