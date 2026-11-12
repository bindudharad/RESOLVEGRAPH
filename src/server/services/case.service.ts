import { prisma } from '@/lib/prisma';
import {
  CaseCategory,
  CasePriority,
  CaseStatus,
  CaseStage,
  EventType,
  PartyRole,
  EvidenceSource,
  EvidenceVisibility,
  Prisma,
} from '@/generated/prisma/client';
import { z } from 'zod';
import {
  createCaseSchema,
  updateCaseSchema,
  createClaimSchema,
  createEvidenceSchema,
} from '../validators/case.validator';

export interface CaseListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  sortBy?: 'createdAt' | 'amountMinor' | 'priority' | 'caseNumber';
  sortOrder?: 'asc' | 'desc';
}

const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  [CaseStatus.DRAFT]: [CaseStatus.SUBMITTED, CaseStatus.CLOSED],
  [CaseStatus.SUBMITTED]: [
    CaseStatus.IN_REVIEW,
    CaseStatus.EVIDENCE_REQUESTED,
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.IN_REVIEW]: [
    CaseStatus.EVIDENCE_REQUESTED,
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.EXECUTING_REFUND,
    CaseStatus.EXECUTING_REPLACEMENT,
    CaseStatus.RESOLVED,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.EVIDENCE_REQUESTED]: [
    CaseStatus.EVIDENCE_SUBMITTED,
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.IN_REVIEW,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.EVIDENCE_SUBMITTED]: [
    CaseStatus.UNDER_ANALYSIS,
    CaseStatus.IN_REVIEW,
    CaseStatus.EXECUTING_REFUND,
    CaseStatus.EXECUTING_REPLACEMENT,
    CaseStatus.RESOLVED,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.UNDER_ANALYSIS]: [
    CaseStatus.IN_REVIEW,
    CaseStatus.EXECUTING_REFUND,
    CaseStatus.EXECUTING_REPLACEMENT,
    CaseStatus.RESOLVED,
    CaseStatus.EVIDENCE_REQUESTED,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.EXECUTING_REFUND]: [
    CaseStatus.RESOLVED,
    CaseStatus.IN_REVIEW,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.EXECUTING_REPLACEMENT]: [
    CaseStatus.RESOLVED,
    CaseStatus.IN_REVIEW,
    CaseStatus.CLOSED,
  ],
  [CaseStatus.RESOLVED]: [CaseStatus.CLOSED, CaseStatus.ARCHIVED, CaseStatus.IN_REVIEW],
  [CaseStatus.CLOSED]: [CaseStatus.ARCHIVED, CaseStatus.IN_REVIEW],
  [CaseStatus.ARCHIVED]: [CaseStatus.CLOSED],
};

function extractMarketplaceMetaFromDescription(desc?: string | null) {
  if (!desc) return {};
  const match = desc.match(
    /\[Platform:\s*([^|]+)\s*\|\s*Order ID:\s*([^|]+)\s*\|\s*Product:\s*([^|]+)\s*\|\s*Category:\s*([^\]]+)\]/i
  );
  if (!match) return {};
  return {
    marketplace: match[1]?.trim(),
    orderId: match[2]?.trim(),
    productName: match[3]?.trim(),
    categoryDeclared: match[4]?.trim(),
  };
}

/**
 * Format a case record into a rich representation satisfying both
 * database models and frontend expectations.
 */
export function formatCaseResponse<
  T extends Prisma.CaseRecordGetPayload<{
    include: {
      buyer: true;
      merchant: true;
      assignedManager: true;
      claims: { include: { author: true } };
      evidence: { include: { uploadedBy: true } };
      events: { include: { actor: true } };
    };
  }>
>(c: T) {
  const descMeta = extractMarketplaceMetaFromDescription(c.description);
  const sellerMatch = (c as any).sellerIdentityMatches?.[0];
  const sellerRequest = (c as any).sellerEvidenceRequests?.[0];

  const extractedLegalName =
    sellerMatch?.matchedSeller?.legalName ||
    sellerMatch?.extractedLegalName ||
    sellerRequest?.seller?.legalName ||
    sellerRequest?.sellerLegalName ||
    null;

  const extractedGstin =
    sellerMatch?.extractedGstin ||
    sellerMatch?.matchedSeller?.gstin ||
    null;

  const isUnregistered = !c.organizationId;
  const isPlatformAdminMerchant =
    (c.merchant?.isPlatformAdmin || c.merchant?.role === 'ADMIN') && isUnregistered;

  let sellerDisplayName: string;
  if (extractedLegalName) {
    sellerDisplayName = isUnregistered
      ? `${extractedLegalName} (Unregistered)`
      : (c as any).organization?.name || extractedLegalName;
  } else if ((c as any).organization?.name) {
    sellerDisplayName = (c as any).organization.name;
  } else if (!isPlatformAdminMerchant && (c.merchant?.organization || c.merchant?.fullName)) {
    sellerDisplayName = c.merchant.organization || c.merchant.fullName;
  } else {
    sellerDisplayName = isUnregistered ? 'Unregistered Seller' : (c.merchant?.fullName || 'Unknown Merchant');
  }

  const marketplace = sellerRequest?.marketplace || descMeta.marketplace || null;
  const orderId = sellerRequest?.orderId || descMeta.orderId || null;
  const productName = sellerRequest?.productName || descMeta.productName || null;
  const sellerRegStatus =
    sellerRequest?.registrationStatus ||
    (c.organizationId ? 'APPROVED_ACTIVE' : 'NOT_REGISTERED');

  return {
    ...c,
    id: c.caseNumber, // Frontend links and displays use caseNumber (e.g. RG-1001)
    dbId: c.id,
    amount: c.amountMinor / 100, // Major units (e.g. 6499.00)
    customer: c.buyer?.fullName || c.buyer?.name || 'Anonymous Customer',
    merchant: sellerDisplayName,
    sellerDisplayName,
    identifiedSeller: extractedLegalName,
    sellerGstin: extractedGstin,
    sellerRegistrationStatus: sellerRegStatus,
    marketplace,
    orderId,
    productName,
    merchantUser: c.merchant,
    merchantOrganization: (c as any).organization || null,
  };
}

export class CaseService {
  /**
   * List cases with pagination, search, and filtering
   */
  static async listCases(params: CaseListQuery) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CaseRecordWhereInput = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { caseNumber: { contains: q } },
        { title: { contains: q } },
        { description: { contains: q } },
        { buyer: { fullName: { contains: q } } },
        { merchant: { fullName: { contains: q } } },
      ];
    }

    if (params.status && params.status !== 'all') {
      // Map potential frontend status strings to enum
      const statusKey = params.status.toUpperCase().replace(/\s+/g, '_');
      if (statusKey in CaseStatus) {
        where.status = statusKey as CaseStatus;
      }
    }

    if (params.priority && params.priority !== 'all') {
      const prioKey = params.priority.toUpperCase();
      if (prioKey in CasePriority) {
        where.priority = prioKey as CasePriority;
      }
    }

    if (params.category && params.category !== 'all') {
      const catKey = params.category.toUpperCase().replace(/\s+/g, '_');
      if (catKey in CaseCategory) {
        where.category = catKey as CaseCategory;
      }
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    const [total, cases] = await Promise.all([
      prisma.caseRecord.count({ where }),
      prisma.caseRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          buyer: true,
          merchant: true,
          assignedManager: true,
          claims: { include: { author: true } },
          evidence: { include: { uploadedBy: true } },
          events: { include: { actor: true }, orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);

    return {
      items: cases.map(formatCaseResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find a single case by caseNumber (e.g. RG-1001) or cuid
   */
  static async getCaseById(caseIdOrNumber: string) {
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ caseNumber: caseIdOrNumber }, { id: caseIdOrNumber }],
      },
      include: {
        buyer: true,
        merchant: true,
        assignedManager: true,
        claims: {
          include: { author: true },
          orderBy: { createdAt: 'asc' },
        },
        evidence: {
          include: { uploadedBy: true },
          orderBy: { createdAt: 'desc' },
        },
        events: {
          include: { actor: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!caseRecord) return null;
    return formatCaseResponse(caseRecord);
  }

  /**
   * Create a new case in an atomic transaction with audit event
   */
  static async createCase(input: z.infer<typeof createCaseSchema>) {
    // Generate next sequential case number (e.g., RG-1015)
    return await prisma.$transaction(
      async (tx) => {
        const allCases = await tx.caseRecord.findMany({
        where: { caseNumber: { startsWith: 'RG-' } },
        select: { caseNumber: true },
      });

      let maxNum = 1000;
      for (const c of allCases) {
        const match = c.caseNumber.match(/^RG-(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }

      const caseNumber = `RG-${maxNum + 1}`;

      let orgId = input.organizationId || null;
      if (!orgId) {
        const orgMember = await tx.organizationMember.findFirst({
          where: { userId: input.merchantId, isActive: true },
          select: { organizationId: true },
        });
        orgId = orgMember?.organizationId || null;
      }

      const newCase = await tx.caseRecord.create({
        data: {
          caseNumber,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          amountMinor: input.amountMinor,
          currency: input.currency,
          buyerId: input.buyerId || 'usr_alex_buyer',
          merchantId: input.merchantId,
          organizationId: orgId,
          assignedManagerId: input.assignedManagerId,
          stage: CaseStage.INTAKE,
          status: CaseStatus.SUBMITTED,
        },
        include: {
          buyer: true,
          merchant: true,
          assignedManager: true,
          organization: true,
          claims: { include: { author: true } },
          evidence: { include: { uploadedBy: true } },
          events: { include: { actor: true } },
        },
      });

      // Append immutable creation event
      await tx.caseEvent.create({
        data: {
          caseId: newCase.id,
          actorId: input.buyerId,
          eventType: EventType.CASE_CREATED,
          description: `Case ${caseNumber} opened: "${input.title}"`,
          metadataJson: JSON.stringify({
            amountMinor: input.amountMinor,
            currency: input.currency,
            category: input.category,
            priority: input.priority,
          }),
        },
      });

      return formatCaseResponse(newCase);
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Update case details, status transition, or priority with transaction and audit event
   */
  static async updateCase(caseIdOrNumber: string, input: z.infer<typeof updateCaseSchema>) {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.caseRecord.findFirst({
        where: {
          OR: [{ caseNumber: caseIdOrNumber }, { id: caseIdOrNumber }],
        },
      });

      if (!existing) {
        throw new Error(`Case ${caseIdOrNumber} not found`);
      }

      const updateData: Prisma.CaseRecordUpdateInput = {};
      const eventsToCreate: Prisma.CaseEventCreateManyInput[] = [];

      // Status transition validation
      if (input.status && input.status !== existing.status) {
        const validNextStates = ALLOWED_TRANSITIONS[existing.status];
        if (validNextStates && !validNextStates.includes(input.status)) {
          throw new Error(
            `Illegal status transition from ${existing.status} to ${input.status}. Allowed: ${validNextStates.join(', ')}`
          );
        }

        updateData.status = input.status;

        if (input.status === CaseStatus.RESOLVED && !existing.resolvedAt) {
          updateData.resolvedAt = new Date();
          updateData.stage = CaseStage.FINALIZED;
        } else if (input.status === CaseStatus.CLOSED && !existing.closedAt) {
          updateData.closedAt = new Date();
        } else if (input.status === CaseStatus.ARCHIVED && !existing.archivedAt) {
          updateData.archivedAt = new Date();
        }

        eventsToCreate.push({
          caseId: existing.id,
          actorId: input.actorId || null,
          eventType: input.status === CaseStatus.RESOLVED ? EventType.CASE_RESOLVED : EventType.STATUS_CHANGED,
          description: `Status changed from ${existing.status} to ${input.status}${
            input.note ? `: ${input.note}` : ''
          }`,
          metadataJson: JSON.stringify({
            previousStatus: existing.status,
            newStatus: input.status,
            note: input.note,
          }),
        });
      }

      // Priority change
      if (input.priority && input.priority !== existing.priority) {
        updateData.priority = input.priority;
        eventsToCreate.push({
          caseId: existing.id,
          actorId: input.actorId || null,
          eventType: EventType.PRIORITY_CHANGED,
          description: `Priority updated from ${existing.priority} to ${input.priority}`,
          metadataJson: JSON.stringify({
            previousPriority: existing.priority,
            newPriority: input.priority,
          }),
        });
      }

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.stage !== undefined) updateData.stage = input.stage;
      if (input.assignedManagerId !== undefined) updateData.assignedManager = input.assignedManagerId ? { connect: { id: input.assignedManagerId } } : { disconnect: true };
      if (input.recommendedRemedy !== undefined) updateData.recommendedRemedy = input.recommendedRemedy;
      if (input.resolutionSummary !== undefined) updateData.resolutionSummary = input.resolutionSummary;

      // Note event if note provided without status change
      if (input.note && (!input.status || input.status === existing.status)) {
        eventsToCreate.push({
          caseId: existing.id,
          actorId: input.actorId || null,
          eventType: EventType.NOTE_ADDED,
          description: input.note,
          metadataJson: JSON.stringify({ note: input.note }),
        });
      }

      const updated = await tx.caseRecord.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          buyer: true,
          merchant: true,
          assignedManager: true,
          claims: { include: { author: true } },
          evidence: { include: { uploadedBy: true } },
          events: { include: { actor: true }, orderBy: { createdAt: 'desc' } },
        },
      });

      if (eventsToCreate.length > 0) {
        await tx.caseEvent.createMany({
          data: eventsToCreate,
        });
      }

      if (input.status && input.status !== existing.status && existing.buyerId) {
        const linkUrl = `/cases?complaint=${encodeURIComponent(existing.caseNumber)}`;
        let notification: { title: string; body: string; type: string } | null = null;

        if (input.status === CaseStatus.EVIDENCE_REQUESTED) {
          notification = {
            title: `Additional Evidence Required — ${existing.caseNumber}`,
            body: 'Additional evidence is required from you to continue reviewing your complaint.',
            type: 'WARNING',
          };
        } else if (input.status === CaseStatus.UNDER_ANALYSIS || input.status === CaseStatus.IN_REVIEW) {
          const isReinvestigation =
            existing.status === CaseStatus.EVIDENCE_REQUESTED ||
            existing.status === CaseStatus.RESOLVED;
          notification = isReinvestigation
            ? {
                title: `Re-investigation In Progress — ${existing.caseNumber}`,
                body: 'Your complaint requires re-investigation. RESOLVEGRAPH is reviewing updated records.',
                type: 'INFO',
              }
            : {
                title: `Investigation Started — ${existing.caseNumber}`,
                body: 'RESOLVEGRAPH has started analyzing your complaint.',
                type: 'INFO',
              };
        } else if (input.status === CaseStatus.RESOLVED || input.status === CaseStatus.CLOSED) {
          notification = {
            title: `Complaint Resolved — ${existing.caseNumber}`,
            body: 'Your complaint has been successfully resolved.',
            type: 'SUCCESS',
          };
        }

        if (notification) {
          await tx.notificationMessage.create({
            data: {
              userId: existing.buyerId,
              title: notification.title,
              body: notification.body,
              linkUrl,
              type: notification.type,
            },
          });
        }
      }

      return formatCaseResponse(updated);
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Add a claim to a case in a transaction with audit event
   */
  static async addClaim(caseIdOrNumber: string, input: z.infer<typeof createClaimSchema>) {
    return await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.caseRecord.findFirst({
        where: { OR: [{ caseNumber: caseIdOrNumber }, { id: caseIdOrNumber }] },
      });
      if (!caseRecord) throw new Error(`Case ${caseIdOrNumber} not found`);

      const authorId = input.authorId || caseRecord.buyerId;
      const partyRole = input.partyRole || PartyRole.BUYER;

      const claim = await tx.claim.create({
        data: {
          caseId: caseRecord.id,
          authorId,
          partyRole,
          claimType: input.claimType,
          statement: input.statement,
          requestedRemedy: input.requestedRemedy,
        },
        include: { author: true },
      });

      await tx.caseEvent.create({
        data: {
          caseId: caseRecord.id,
          actorId: input.authorId,
          eventType: EventType.CLAIM_ADDED,
          description: `${input.partyRole} claim recorded: "${input.statement.substring(0, 100)}..."`,
          metadataJson: JSON.stringify({
            claimId: claim.id,
            claimType: input.claimType,
            requestedRemedy: input.requestedRemedy,
          }),
        },
      });

      if (caseRecord.buyerId && partyRole === PartyRole.MERCHANT) {
        await tx.notificationMessage.create({
          data: {
            userId: caseRecord.buyerId,
            title: `Seller Response Received — ${caseRecord.caseNumber}`,
            body: 'The seller submitted a response and supporting details for your complaint.',
            linkUrl: `/cases?complaint=${encodeURIComponent(caseRecord.caseNumber)}`,
            type: 'INFO',
          },
        });
      }

      return claim;
    });
  }

  /**
   * Add evidence metadata to a case with audit event
   */
  static async addEvidence(caseIdOrNumber: string, input: z.infer<typeof createEvidenceSchema>) {
    return await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.caseRecord.findFirst({
        where: { OR: [{ caseNumber: caseIdOrNumber }, { id: caseIdOrNumber }] },
      });
      if (!caseRecord) throw new Error(`Case ${caseIdOrNumber} not found`);

      const evidence = await tx.evidence.create({
        data: {
          caseId: caseRecord.id,
          uploadedById: input.uploadedById || 'usr_alex_buyer',
          claimId: input.claimId,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          storageKey: input.storageKey,
          sha256: input.sha256,
          description: input.description,
          evidenceType: input.evidenceType,
          sourceType: input.sourceType,
          verificationStatus: input.verificationStatus,
          visibility: input.visibility,
        },
        include: { uploadedBy: true },
      });

      await tx.caseEvent.create({
        data: {
          caseId: caseRecord.id,
          actorId: input.uploadedById,
          eventType: EventType.EVIDENCE_UPLOADED,
          description: `Evidence uploaded: "${input.filename}" (${Math.round(input.sizeBytes / 1024)} KB)`,
          metadataJson: JSON.stringify({
            evidenceId: evidence.id,
            filename: input.filename,
            sha256: input.sha256,
            evidenceType: input.evidenceType,
          }),
        },
      });

      if (
        caseRecord.buyerId &&
        input.visibility !== EvidenceVisibility.INTERNAL &&
        (input.sourceType === EvidenceSource.MERCHANT_PORTAL ||
          input.sourceType === EvidenceSource.CARRIER_API)
      ) {
        const isMerchant = input.sourceType === EvidenceSource.MERCHANT_PORTAL;
        await tx.notificationMessage.create({
          data: {
            userId: caseRecord.buyerId,
            title: isMerchant
              ? `Seller Evidence Received — ${caseRecord.caseNumber}`
              : `Verification Record Received — ${caseRecord.caseNumber}`,
            body: isMerchant
              ? 'Seller evidence has been received and added to your complaint investigation.'
              : 'Delivery verification records have been received for your complaint.',
            linkUrl: `/cases?complaint=${encodeURIComponent(caseRecord.caseNumber)}`,
            type: 'INFO',
          },
        });
      }

      return evidence;
    });
  }

  /**
   * Log an audit event for a dispute case
   */
  static async logEvent(
    caseId: string,
    eventType: EventType | string,
    actorId?: string | null,
    description?: string,
    metadata?: Record<string, unknown>
  ) {
    return await prisma.caseEvent.create({
      data: {
        caseId,
        actorId: actorId || null,
        eventType: eventType as EventType,
        description: description || "",
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}

