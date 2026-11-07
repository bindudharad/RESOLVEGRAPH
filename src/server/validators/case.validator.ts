import { z } from 'zod';
import {
  CaseCategory,
  CasePriority,
  CaseStatus,
  CaseStage,
  RemedyType,
  PartyRole,
  ClaimType,
  EvidenceType,
  EvidenceSource,
  VerificationStatus,
  EvidenceVisibility,
  OrganizationRole,
} from '@/generated/prisma/client';

export const createCaseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.nativeEnum(CaseCategory).default(CaseCategory.OTHER),
  priority: z.nativeEnum(CasePriority).default(CasePriority.MEDIUM),
  amountMinor: z.number().int().nonnegative('Amount must be positive integer minor units'),
  currency: z.string().length(3).default('USD'),
  buyerId: z.string().min(1, 'Buyer ID is required').optional(), // Auto-filled from session for buyers
  merchantId: z.string().min(1, 'Merchant ID is required'),
  organizationId: z.string().optional(),
  assignedManagerId: z.string().optional(),
  expectedProduct: z.string().optional(),
  reportedProduct: z.string().optional(),
});

export const updateCaseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.nativeEnum(CaseCategory).optional(),
  status: z.nativeEnum(CaseStatus).optional(),
  priority: z.nativeEnum(CasePriority).optional(),
  stage: z.nativeEnum(CaseStage).optional(),
  assignedManagerId: z.string().nullable().optional(),
  recommendedRemedy: z.nativeEnum(RemedyType).nullable().optional(),
  resolutionSummary: z.string().max(3000).nullable().optional(),
  actorId: z.string().optional(), // Actor making the update (for event logging)
  note: z.string().max(1000).optional(), // Optional comment/reason for transition
});

export const createClaimSchema = z.object({
  authorId: z.string().min(1).optional(), // Auto-filled from session
  partyRole: z.nativeEnum(PartyRole).optional(), // Derived from session
  claimType: z.nativeEnum(ClaimType).default(ClaimType.OTHER),
  statement: z.string().min(10).max(5000),
  requestedRemedy: z.nativeEnum(RemedyType).optional(),
});

export const createEvidenceSchema = z.object({
  uploadedById: z.string().min(1).optional(), // Auto-filled from session
  claimId: z.string().optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().min(1).max(500),
  sha256: z.string().min(16).max(64),
  description: z.string().max(1000).optional(),
  evidenceType: z.nativeEnum(EvidenceType).optional().default(EvidenceType.OTHER),
  sourceType: z.nativeEnum(EvidenceSource).optional().default(EvidenceSource.BUYER_UPLOAD),
  verificationStatus: z.nativeEnum(VerificationStatus).optional().default(VerificationStatus.UNVERIFIED),
  visibility: z.nativeEnum(EvidenceVisibility).optional().default(EvidenceVisibility.SHARED_WITH_PARTICIPANTS),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrganizationRole).default(OrganizationRole.MERCHANT_AGENT),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(OrganizationRole),
});
