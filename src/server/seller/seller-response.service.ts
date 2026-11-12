/**
 * RESOLVEGRAPH — Seller Response, Workspace Portal, Follow-Up & Re-Verification Service
 *
 * Handles:
 * 1. Strictly org-scoped listing & viewing of SellerEvidenceRequests (with buyer PII stripping)
 * 2. Automatic VIEWED status transition & audit logging on first authorized seller open
 * 3. Idempotent submission of structured seller stances, non-coercive item responses,
 *    and encrypted/private local file uploads verified through SellerVerificationService
 * 4. Investigator follow-ups, NO_RESPONSE transitions, and targeted additional-evidence requests
 * 5. Automatic BEG graph snapshot rebuild & BERR v2 re-evaluation after seller response
 */

import { prisma } from '@/lib/prisma';
import type { AuthenticatedUser } from '@/server/auth/session';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { DataRedactor } from '@/server/ai/security/data-redactor';
import { BegSyncService } from '@/server/graph/beg-sync.service';
import { SellerVerificationService } from './seller-verification.service';
import { SellerCommunicationGatewayService } from './seller-communication-gateway.service';
import { SellerEvidenceRequirementsService } from './seller-evidence-requirements.service';
import {
  CaseCategory,
  CaseStatus,
  ClaimStatus,
  ClaimType,
  EventType,
  EvidenceSource,
  EvidenceType,
  EvidenceVisibility,
  MalwareScanStatus,
  OrganizationRole,
  PartyRole,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/client';
import type {
  RequestedEvidenceRequirement,
  RequestedItemResponseStatus,
  SellerDraftPayload,
  SellerResponseStance,
  SellerResponseVerificationDisplayStatus,
  SellerStructuredResponseDetails,
} from './seller.types';

export class SellerPortalAccessError extends Error {
  public readonly status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = 'SellerPortalAccessError';
    this.status = status;
  }
}

const RESPONDING_ORG_ROLES: OrganizationRole[] = [
  OrganizationRole.OWNER,
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.MERCHANT_AGENT,
  OrganizationRole.RESOLUTION_MANAGER,
];

function isPlatformInvestigator(user: AuthenticatedUser): boolean {
  return (
    user.isPlatformAdmin ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.RESOLUTION_MANAGER
  );
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function stripBuyerPii(text: string): string {
  if (!text) return '';
  const { redactedText } = DataRedactor.redact(text);
  return redactedText
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\+?91[\-\s]?)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{6}\b(?=\s*(?:india|pin|pincode|postal)?)/gi, '[REDACTED_PIN]');
}

function cleanComplaintNarrative(text: string): string {
  const withoutBanner = (text || '').replace(/^\[Platform:[^\]]+\]\s*/i, '').trim();
  return stripBuyerPii(withoutBanner);
}

export function mapVerificationStatusForSeller(
  rawStatus: string,
  requestStatus?: string
): SellerResponseVerificationDisplayStatus {
  if (requestStatus === 'ADDITIONAL_EVIDENCE_REQUIRED') {
    return 'Additional Information Required';
  }
  switch ((rawStatus || '').toUpperCase()) {
    case 'VERIFIED':
      return 'Verified for Investigation';
    case 'SUSPICIOUS':
      return 'Human Review Required';
    case 'NEEDS_REVIEW':
      return 'Under Verification';
    case 'INCONCLUSIVE':
      return 'Verification Inconclusive';
    case 'PENDING':
      return 'Under Verification';
    default:
      return 'Submitted';
  }
}

export type SellerRequestBucket =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ADDITIONAL_INFO_REQUIRED';

export function mapRequestStatusBucket(
  rawStatus: string,
  hasDraft: boolean,
  responseCount: number
): { bucket: SellerRequestBucket; label: string } {
  if (rawStatus === 'ADDITIONAL_EVIDENCE_REQUIRED') {
    return { bucket: 'ADDITIONAL_INFO_REQUIRED', label: 'Additional Information Required' };
  }
  if (rawStatus === 'SELLER_RESPONDED' || (responseCount > 0 && rawStatus !== 'IN_PROGRESS')) {
    return { bucket: 'SUBMITTED', label: 'Submitted' };
  }
  if (rawStatus === 'IN_PROGRESS' || hasDraft) {
    return { bucket: 'IN_PROGRESS', label: 'In Progress' };
  }
  if (rawStatus === 'NO_RESPONSE') {
    return { bucket: 'NEW', label: 'Action Overdue' };
  }
  return { bucket: 'NEW', label: 'New Request' };
}

function mapCategoryToClaimType(category: CaseCategory): ClaimType {
  switch (category) {
    case CaseCategory.NON_DELIVERY:
      return ClaimType.ITEM_NOT_RECEIVED;
    case CaseCategory.NOT_AS_DESCRIBED:
      return ClaimType.SIGNIFICANTLY_NOT_AS_DESCRIBED;
    case CaseCategory.DAMAGED_GOODS:
      return ClaimType.DEFECTIVE_OR_DAMAGED;
    case CaseCategory.UNAUTHORIZED_TRANSACTION:
      return ClaimType.UNAUTHORIZED_CHARGE;
    case CaseCategory.REFUND_DISPUTE:
      return ClaimType.RETURN_REJECTED;
    default:
      return ClaimType.OTHER;
  }
}

function mapEvidenceType(inputType: string | undefined, mimeType: string): EvidenceType {
  const validTypes = Object.values(EvidenceType) as string[];
  if (inputType && validTypes.includes(inputType)) {
    return inputType as EvidenceType;
  }
  if (mimeType.startsWith('image/')) return EvidenceType.PHOTO;
  if (mimeType === 'application/pdf') return EvidenceType.INVOICE;
  return EvidenceType.OTHER;
}

export interface SubmitSellerResponseInput {
  requestId: string;
  user: AuthenticatedUser;
  stance: SellerResponseStance;
  summary: string;
  additionalRemarks?: string;
  structuredDetails?: SellerStructuredResponseDetails;
  itemResponses: Array<{
    key: string;
    status: RequestedItemResponseStatus;
    note?: string;
  }>;
  files?: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    requestedItemKey?: string;
    evidenceType?: string;
    description?: string;
    visibility?: 'SHARED_WITH_PARTICIPANTS' | 'MERCHANT_ONLY';
  }>;
  declarationConfirmed: boolean;
  idempotencyKey?: string;
}

export class SellerResponseService {
  /**
   * Lists evidence requests visible to the signed-in seller user or platform investigator.
   * Strictly enforces organization membership for non-admin users.
   */
  public static async listRequestsForUser(
    user: AuthenticatedUser,
    filters?: { status?: string; channel?: string; q?: string }
  ) {
    const isInvestigator = isPlatformInvestigator(user);

    if (!isInvestigator && user.role === UserRole.BUYER) {
      throw new SellerPortalAccessError(
        'Buyers cannot access the Seller Evidence Requests workspace.',
        403
      );
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, isActive: true, organization: { isActive: true } },
      select: { organizationId: true, role: true },
    });

    const orgIds = memberships.map((m) => m.organizationId);
    const responderOrgIds = new Set(
      memberships.filter((m) => RESPONDING_ORG_ROLES.includes(m.role)).map((m) => m.organizationId)
    );

    if (!isInvestigator && orgIds.length === 0) {
      return [];
    }

    const where: Record<string, unknown> = {};
    if (!isInvestigator) {
      // Strictly never return requests without an organizationId or belonging to other orgs
      where.organizationId = { in: orgIds };
      where.deliveryChannel = { in: ['SELLER_PORTAL', 'MARKETPLACE_API'] };
    }
    const rawFilter = filters?.status;
    const isBucketFilter =
      rawFilter &&
      ['NEW', 'IN_PROGRESS', 'SUBMITTED', 'ADDITIONAL_INFO_REQUIRED'].includes(rawFilter);

    if (rawFilter && rawFilter !== 'ALL' && !isBucketFilter) {
      where.status = rawFilter;
    }
    if (filters?.channel && filters.channel !== 'ALL') {
      where.deliveryChannel = filters.channel;
    }

    const requests = await prisma.sellerEvidenceRequest.findMany({
      where,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            category: true,
            amountMinor: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        },
        seller: {
          select: {
            id: true,
            legalName: true,
            displayName: true,
            gstin: true,
            state: true,
            verificationStatus: true,
          },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
        responses: {
          select: { id: true, verificationStatus: true, submittedAt: true },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { responses: true, communicationAttempts: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const mapped = requests.map((req) => {
      const requestedItems = safeParseJson<RequestedEvidenceRequirement[]>(
        req.requestedItemsJson,
        []
      );
      const hasDraft = Boolean(req.draftResponseJson && req.draftResponseJson.trim().length > 2);
      const bucketInfo = mapRequestStatusBucket(req.status, hasDraft, req._count.responses);
      const latestResp = req.responses[0] ?? null;

      return {
        id: req.id,
        requestNumber: req.requestNumber,
        caseId: req.caseId,
        caseNumber: req.case.caseNumber,
        caseStatus: req.case.status,
        customerComplaintTitle: stripBuyerPii(req.case.title),
        orderId: req.orderId,
        marketplace: req.marketplace,
        productName: req.productName,
        amountMinor: req.case.amountMinor,
        currency: req.case.currency,
        complaintCategory: req.complaintCategory,
        requestDescription: cleanComplaintNarrative(req.requestDescription),
        requestedItems,
        requestedItemsSummary: requestedItems.map((i) => i.label).slice(0, 3),
        deliveryChannel: req.deliveryChannel,
        registrationStatus: req.registrationStatus,
        status: req.status,
        statusBucket: bucketInfo.bucket,
        statusLabel: bucketInfo.label,
        hasDraft,
        latestResponseId: latestResp?.id ?? null,
        latestVerificationLabel: latestResp
          ? mapVerificationStatusForSeller(latestResp.verificationStatus, req.status)
          : null,
        dispatchedAt: req.dispatchedAt?.toISOString() ?? null,
        deliveredAt: req.deliveredAt?.toISOString() ?? null,
        viewedAt: req.viewedAt?.toISOString() ?? null,
        respondedAt: req.respondedAt?.toISOString() ?? null,
        dueAt: req.dueAt?.toISOString() ?? null,
        followUpCount: req.followUpCount,
        organizationId: req.organizationId,
        organizationName: req.organization?.name ?? null,
        sellerLegalName: req.seller?.legalName ?? req.organization?.name ?? 'Unregistered Seller',
        sellerGstin: req.seller?.gstin ?? null,
        responseCount: req._count.responses,
        attemptCount: req._count.communicationAttempts,
        canRespond:
          Boolean(req.organizationId && responderOrgIds.has(req.organizationId)) || isInvestigator,
        createdAt: req.createdAt.toISOString(),
      };
    });

    const queryLower = filters?.q?.trim().toLowerCase() || '';

    return mapped.filter((item) => {
      if (isBucketFilter && item.statusBucket !== rawFilter) {
        return false;
      }
      if (queryLower) {
        const haystack = [
          item.caseNumber,
          item.orderId,
          item.productName,
          item.customerComplaintTitle,
          item.requestNumber,
          item.marketplace,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(queryLower)) return false;
      }
      return true;
    });
  }

  /**
   * Computes Seller Dashboard counts & recent evidence requests dynamically from database rows.
   */
  public static async getDashboardDataForUser(user: AuthenticatedUser) {
    const allRequests = await this.listRequestsForUser(user);
    const summary = {
      newRequests: allRequests.filter(
        (r) => r.statusBucket === 'NEW' || r.statusBucket === 'ADDITIONAL_INFO_REQUIRED'
      ).length,
      inProgress: allRequests.filter((r) => r.statusBucket === 'IN_PROGRESS').length,
      submitted: allRequests.filter((r) => r.statusBucket === 'SUBMITTED').length,
      additionalInfoRequired: allRequests.filter(
        (r) => r.statusBucket === 'ADDITIONAL_INFO_REQUIRED'
      ).length,
      total: allRequests.length,
    };

    const recentRequests = allRequests.slice(0, 6);
    return {
      summary,
      recentRequests,
    };
  }

  /**
   * Saves an in-progress seller response draft non-destructively so Back/Continue
   * and navigation retain entered product, packing, dispatch, and stance inputs.
   */
  public static async saveDraftResponse(params: {
    requestId: string;
    user: AuthenticatedUser;
    draft: SellerDraftPayload;
  }) {
    const isInvestigator = isPlatformInvestigator(params.user);
    if (!isInvestigator && params.user.role === UserRole.BUYER) {
      throw new SellerPortalAccessError('Buyers cannot save seller drafts.', 403);
    }

    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: params.requestId },
    });
    if (!request) {
      throw new SellerPortalAccessError(`Request ${params.requestId} not found.`, 404);
    }
    if (!isInvestigator) {
      if (!request.organizationId) {
        throw new SellerPortalAccessError('Forbidden', 403);
      }
      const mem = await prisma.organizationMember.findFirst({
        where: {
          organizationId: request.organizationId,
          userId: params.user.id,
          isActive: true,
          organization: { isActive: true },
          role: { in: RESPONDING_ORG_ROLES },
        },
      });
      if (!mem) {
        throw new SellerPortalAccessError('Forbidden: active responder role required.', 403);
      }
    }

    const draftToStore: SellerDraftPayload = {
      ...params.draft,
      updatedAt: new Date().toISOString(),
    };

    const canPromoteToInProgress = [
      'DELIVERED',
      'SENT_TO_SELLER_PORTAL',
      'DELIVERY_PENDING',
      'VIEWED',
      'WAITING_FOR_SELLER',
    ].includes(request.status);

    const updated = await prisma.sellerEvidenceRequest.update({
      where: { id: request.id },
      data: {
        draftResponseJson: JSON.stringify(draftToStore),
        ...(canPromoteToInProgress ? { status: 'IN_PROGRESS' } : {}),
      },
    });

    return {
      requestId: updated.id,
      status: updated.status,
      draft: draftToStore,
    };
  }

  /**
   * Returns a single evidence request scoped to authorized seller organization members
   * or platform investigators. Strips buyer PII and private BUYER_ONLY/INTERNAL files,
   * and marks VIEWED on first authorized seller open.
   */
  public static async getRequestDetailForUser(requestId: string, user: AuthenticatedUser) {
    const isInvestigator = isPlatformInvestigator(user);
    if (!isInvestigator && user.role === UserRole.BUYER) {
      throw new SellerPortalAccessError('Forbidden: buyers cannot access seller evidence requests.', 403);
    }

    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: requestId },
      include: {
        case: {
          include: {
            claims: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                partyRole: true,
                claimType: true,
                statement: true,
                requestedRemedy: true,
                status: true,
                createdAt: true,
              },
            },
            evidence: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                filename: true,
                mimeType: true,
                sizeBytes: true,
                evidenceType: true,
                sourceType: true,
                verificationStatus: true,
                visibility: true,
                description: true,
                createdAt: true,
              },
            },
          },
        },
        seller: true,
        sellerMatch: true,
        organization: { select: { id: true, name: true, slug: true, isActive: true } },
        communicationAttempts: {
          orderBy: { executedAt: 'asc' },
        },
        responses: {
          orderBy: { submittedAt: 'desc' },
          include: {
            responder: { select: { id: true, fullName: true, role: true } },
            evidenceItems: {
              include: {
                evidence: {
                  select: {
                    id: true,
                    filename: true,
                    mimeType: true,
                    sizeBytes: true,
                    evidenceType: true,
                    verificationStatus: true,
                    visibility: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new SellerPortalAccessError(`Seller evidence request ${requestId} not found.`, 404);
    }

    let membershipRole: OrganizationRole | null = null;
    if (request.organizationId) {
      const mem = await prisma.organizationMember.findFirst({
        where: {
          organizationId: request.organizationId,
          userId: user.id,
          isActive: true,
          organization: { isActive: true },
        },
        select: { role: true },
      });
      membershipRole = mem?.role ?? null;
    }

    if (!isInvestigator && (!request.organizationId || !membershipRole)) {
      throw new SellerPortalAccessError(
        'Forbidden: this evidence request does not belong to your verified seller organization.',
        403
      );
    }

    // Mark VIEWED on first authorized seller open
    let effectiveStatus = request.status;
    let effectiveViewedAt = request.viewedAt;

    if (membershipRole && !request.viewedAt) {
      const now = new Date();
      const shouldPromoteStatus = ['SENT_TO_SELLER_PORTAL', 'DELIVERED', 'DELIVERY_PENDING', 'WAITING_FOR_SELLER'].includes(
        request.status
      );
      const updated = await prisma.sellerEvidenceRequest.update({
        where: { id: request.id },
        data: {
          viewedAt: now,
          ...(shouldPromoteStatus ? { status: 'VIEWED' } : {}),
        },
      });
      effectiveStatus = updated.status;
      effectiveViewedAt = updated.viewedAt;

      await prisma.caseEvent.create({
        data: {
          caseId: request.caseId,
          actorId: user.id,
          eventType: EventType.SELLER_EVIDENCE_VIEWED,
          description: `Seller organization representative (${user.fullName}) viewed evidence request ${request.requestNumber}.`,
          metadataJson: JSON.stringify({
            requestId: request.id,
            requestNumber: request.requestNumber,
            organizationId: request.organizationId,
            previousStatus: request.status,
            newStatus: effectiveStatus,
          }),
        },
      });

      await prisma.caseTimelineEvent.create({
        data: {
          caseId: request.caseId,
          actorId: user.id,
          eventType: 'SELLER_EVIDENCE_VIEWED',
          title: `Seller viewed evidence request ${request.requestNumber}`,
          description: `Authorized member of ${request.organization?.name || 'seller organization'} opened the evidence request portal.`,
          occurredAt: now,
          timePrecision: 'EXACT_TIMESTAMP',
          timeBasis: 'SYSTEM_OBSERVED',
          metadataJson: JSON.stringify({ requestId: request.id }),
        },
      });
    }

    // Filter evidence strictly to prevent exposing private BUYER_ONLY or INTERNAL docs to sellers
    const visibleEvidence = request.case.evidence.filter((ev) => {
      if (isInvestigator) return true;
      return (
        ev.visibility === EvidenceVisibility.SHARED_WITH_PARTICIPANTS ||
        ev.visibility === EvidenceVisibility.MERCHANT_ONLY
      );
    });

    const canRespond =
      !['CANCELLED'].includes(effectiveStatus) &&
      (isInvestigator || Boolean(membershipRole && RESPONDING_ORG_ROLES.includes(membershipRole)));

    const dynamicFormConfig = SellerEvidenceRequirementsService.getDynamicFormConfig({
      category: request.case.category,
      originalCategory: request.complaintCategory,
      productName: request.productName,
      orderId: request.orderId,
    });
    const draftResponse = safeParseJson<SellerDraftPayload | null>(
      request.draftResponseJson,
      null
    );
    const bucketInfo = mapRequestStatusBucket(
      effectiveStatus,
      Boolean(draftResponse),
      request.responses.length
    );

    return {
      id: request.id,
      requestNumber: request.requestNumber,
      status: effectiveStatus,
      statusBucket: bucketInfo.bucket,
      statusLabel: bucketInfo.label,
      deliveryChannel: request.deliveryChannel,
      registrationStatus: request.registrationStatus,
      marketplaceSupportUrl: request.marketplaceSupportUrl,
      preparedMessageForBuyer: isInvestigator ? request.preparedMessageForBuyer : null,
      canRespond,
      permissions: {
        isInvestigator,
        membershipRole,
        canRespond,
      },
      // Section A: Case & Order Details (buyer PII intentionally excluded)
      orderDetails: {
        caseId: request.case.id,
        caseNumber: request.case.caseNumber,
        caseCategory: request.case.category,
        caseStatus: request.case.status,
        orderId: request.orderId,
        marketplace: request.marketplace,
        productName: request.productName,
        amountMinor: request.case.amountMinor,
        currency: request.case.currency,
        complaintCategory: request.complaintCategory,
        caseCreatedAt: request.case.createdAt.toISOString(),
        requestedAt: request.createdAt.toISOString(),
        dispatchedAt: request.dispatchedAt?.toISOString() ?? null,
        deliveredAt: request.deliveredAt?.toISOString() ?? null,
        viewedAt: effectiveViewedAt?.toISOString() ?? null,
        respondedAt: request.respondedAt?.toISOString() ?? null,
        dueAt: request.dueAt?.toISOString() ?? null,
        sellerLegalName: request.seller?.legalName ?? request.organization?.name ?? null,
        sellerGstin: request.seller?.gstin ?? null,
        organizationName: request.organization?.name ?? null,
      },
      // Section B: Customer Complaint & Shared Evidence (sanitized/redacted)
      customerComplaint: {
        title: stripBuyerPii(request.case.title),
        issueSummary: cleanComplaintNarrative(request.case.description),
        requestDescription: cleanComplaintNarrative(request.requestDescription),
        claims: request.case.claims
          .filter((c) => c.partyRole === PartyRole.BUYER)
          .map((c) => ({
            id: c.id,
            claimType: c.claimType,
            statement: cleanComplaintNarrative(c.statement),
            requestedRemedy: c.requestedRemedy,
            status: c.status,
            createdAt: c.createdAt.toISOString(),
          })),
        sharedBuyerEvidence: visibleEvidence
          .filter((ev) => ev.sourceType === EvidenceSource.BUYER_UPLOAD)
          .map((ev) => ({
            id: ev.id,
            filename: ev.filename,
            mimeType: ev.mimeType,
            sizeBytes: ev.sizeBytes,
            evidenceType: ev.evidenceType,
            verificationStatus: ev.verificationStatus,
            description: ev.description ? cleanComplaintNarrative(ev.description) : null,
            previewUrl: `/api/evidence/${encodeURIComponent(ev.id)}/download?inline=1`,
            createdAt: ev.createdAt.toISOString(),
          })),
      },
      // Section C: Requested Evidence & Information + Dynamic Form Config
      requestedItems: safeParseJson<RequestedEvidenceRequirement[]>(request.requestedItemsJson, []),
      dynamicFormConfig,
      draftResponse,
      // Communication Attempts & Historical Responses
      communicationAttempts: request.communicationAttempts.map((att) => ({
        id: att.id,
        attemptNumber: att.attemptNumber,
        channel: att.channel,
        actionType: att.actionType,
        eligibility: att.eligibility,
        executionStatus: att.executionStatus,
        failureReason: att.failureReason,
        externalReferenceId: att.externalReferenceId,
        executedAt: att.executedAt.toISOString(),
      })),
      responses: request.responses.map((resp) => ({
        id: resp.id,
        stance: resp.stance,
        summary: resp.summary,
        additionalRemarks: resp.additionalRemarks,
        verificationStatus: resp.verificationStatus,
        sellerStatusLabel: mapVerificationStatusForSeller(resp.verificationStatus, effectiveStatus),
        structuredDetails: safeParseJson<SellerStructuredResponseDetails | null>(
          resp.structuredDetailsJson,
          null
        ),
        itemResponses: safeParseJson<Array<{ key: string; status: string; note?: string }>>(
          resp.itemResponsesJson,
          []
        ),
        verificationSummary: safeParseJson<Record<string, unknown> | null>(
          resp.verificationSummaryJson,
          null
        ),
        responderName: resp.responder.fullName,
        submittedAt: resp.submittedAt.toISOString(),
        verifiedAt: resp.verifiedAt?.toISOString() ?? null,
        evidenceItems: resp.evidenceItems.map((item) => ({
          id: item.id,
          evidenceId: item.evidenceId,
          requestedItemKey: item.requestedItemKey,
          filename: item.evidence.filename,
          mimeType: item.evidence.mimeType,
          sizeBytes: item.evidence.sizeBytes,
          previewUrl: `/api/evidence/${encodeURIComponent(item.evidenceId)}/download?inline=1`,
          verificationStatus: item.evidence.verificationStatus,
          humanReviewRequired: item.humanReviewRequired,
          fileUsability: safeParseJson(item.fileUsabilityJson, null),
          documentExtraction: safeParseJson(item.documentExtractionJson, null),
          evidenceRelevance: safeParseJson(item.relevanceJson, null),
          informationConsistency: safeParseJson(item.consistencyJson, null),
          suspiciousSignals: safeParseJson(item.suspiciousSignalsJson, []),
        })),
      })),
    };
  }

  /**
   * Submits a seller's response + evidence artifacts, runs SellerVerificationService
   * across every uploaded artifact, logs Claim + CaseEvents, notifies investigators & buyer,
   * and triggers BEG graph snapshot & BERR v2 re-evaluation.
   */
  public static async submitSellerResponse(input: SubmitSellerResponseInput) {
    const isInvestigator = isPlatformInvestigator(input.user);

    if (!isInvestigator && input.user.role === UserRole.BUYER) {
      throw new SellerPortalAccessError('Buyers cannot submit seller responses.', 403);
    }

    if (!input.declarationConfirmed) {
      throw new SellerPortalAccessError(
        'Seller confirmation declaration must be checked before submission.',
        400
      );
    }

    if (!input.summary || input.summary.trim().length < 5) {
      throw new SellerPortalAccessError(
        'Please provide a factual summary explaining your position on the complaint.',
        400
      );
    }

    // Idempotency replay protection
    if (input.idempotencyKey) {
      const existingResp = await prisma.sellerEvidenceResponse.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { evidenceItems: true },
      });
      if (existingResp) {
        return {
          responseId: existingResp.id,
          requestId: existingResp.requestId,
          verificationStatus: existingResp.verificationStatus,
          idempotentReplay: true,
          uploadedEvidenceIds: existingResp.evidenceItems.map((i) => i.evidenceId),
        };
      }
    }

    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: input.requestId },
      include: { case: true, organization: true },
    });

    if (!request) {
      throw new SellerPortalAccessError(`Seller evidence request ${input.requestId} not found.`, 404);
    }

    if (request.status === 'CANCELLED') {
      throw new SellerPortalAccessError('Cancelled evidence requests cannot accept responses.', 400);
    }

    // Verify organization authorization for non-admin submitters
    if (!isInvestigator) {
      if (!request.organizationId) {
        throw new SellerPortalAccessError(
          'This request is not assigned to a verified Seller Portal organization.',
          403
        );
      }
      const mem = await prisma.organizationMember.findFirst({
        where: {
          organizationId: request.organizationId,
          userId: input.user.id,
          isActive: true,
          organization: { isActive: true },
          role: { in: RESPONDING_ORG_ROLES },
        },
      });
      if (!mem) {
        throw new SellerPortalAccessError(
          'Forbidden: you do not have active responder permissions in the assigned seller organization.',
          403
        );
      }
    }

    const requestedItems = safeParseJson<RequestedEvidenceRequirement[]>(
      request.requestedItemsJson,
      []
    );
    const files = input.files || [];

    // Validate item responses non-coercively
    const responseMap = new Map(input.itemResponses.map((r) => [r.key, r]));
    for (const item of requestedItems) {
      const resp = responseMap.get(item.key);
      if (resp && resp.status === 'EXPLANATION_REQUIRED' && !resp.note?.trim()) {
        throw new SellerPortalAccessError(
          `Please provide an explanation note for "${item.label}".`,
          400
        );
      }
      if (
        resp &&
        resp.status === 'PROVIDED' &&
        !resp.note?.trim() &&
        !files.some((f) => f.requestedItemKey === item.key) &&
        files.length === 0
      ) {
        throw new SellerPortalAccessError(
          `Item "${item.label}" is marked PROVIDED; please attach supporting evidence or include a reference note.`,
          400
        );
      }
    }

    // Store and validate uploaded files upfront so malformed/forbidden files fail before DB mutation
    const storedFiles: Array<{
      buffer: Buffer;
      filename: string;
      detectedMimeType: string;
      sizeBytes: number;
      storageKey: string;
      sha256: string;
      requestedItemKey?: string;
      evidenceType: EvidenceType;
      description?: string;
      visibility: EvidenceVisibility;
    }> = [];

    for (const file of files) {
      const saved = await evidenceStorage.saveFile(file.buffer, file.filename, file.mimeType);
      storedFiles.push({
        buffer: file.buffer,
        filename: saved.sanitizedFilename,
        detectedMimeType: saved.detectedMimeType,
        sizeBytes: saved.sizeBytes,
        storageKey: saved.storageKey,
        sha256: saved.sha256,
        requestedItemKey: file.requestedItemKey,
        evidenceType: mapEvidenceType(file.evidenceType, saved.detectedMimeType),
        description: file.description,
        visibility:
          file.visibility === 'MERCHANT_ONLY'
            ? EvidenceVisibility.MERCHANT_ONLY
            : EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      });
    }

    const now = new Date();
    const claimStatus =
      input.stance === 'AGREE'
        ? ClaimStatus.ACCEPTED
        : input.stance === 'DISAGREE'
        ? ClaimStatus.CONTESTED
        : ClaimStatus.ACTIVE;

    const previousRequestState = {
      status: request.status,
      respondedAt: request.respondedAt,
      draftResponseJson: request.draftResponseJson,
      requestedItemsJson: request.requestedItemsJson,
      verifiedAt: request.verifiedAt,
    };
    const previousCaseStatus = request.case.status;

    let createdClaimId: string | null = null;
    let createdResponseId: string | null = null;
    const createdEvidenceIds: string[] = [];
    const verificationBreakdowns = [];
    let responseRecord!: Awaited<ReturnType<typeof prisma.sellerEvidenceResponse.create>>;
    let responseVerificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'SUSPICIOUS' = 'NEEDS_REVIEW';
    let verificationSummary!: {
      artifactCount: number;
      suspiciousCount: number;
      humanReviewRequired: boolean;
      verifiedOrderMatchCount: number;
      assessedAt: string;
      disclaimer: string;
    };

    try {
      const claim = await prisma.claim.create({
        data: {
          caseId: request.caseId,
          authorId: input.user.id,
          partyRole: PartyRole.MERCHANT,
          claimType: mapCategoryToClaimType(request.case.category),
          statement: `[Seller ${input.stance}] ${input.summary.trim()}${
            input.additionalRemarks?.trim() ? ` — Remarks: ${input.additionalRemarks.trim()}` : ''
          }`,
          status: claimStatus,
        },
      });
      createdClaimId = claim.id;

      // Persist SellerEvidenceResponse first (PENDING verification until all artifacts checked)
      responseRecord = await prisma.sellerEvidenceResponse.create({
        data: {
          requestId: request.id,
          caseId: request.caseId,
          organizationId: request.organizationId,
          responderId: input.user.id,
          stance: input.stance,
          summary: input.summary.trim(),
          itemResponsesJson: JSON.stringify(input.itemResponses),
          additionalRemarks: input.additionalRemarks?.trim() || null,
          structuredDetailsJson: input.structuredDetails
            ? JSON.stringify(input.structuredDetails)
            : null,
          verificationStatus: 'PENDING',
          idempotencyKey: input.idempotencyKey || null,
          submittedAt: now,
        },
      });
      createdResponseId = responseRecord.id;

      // Persist Evidence rows and execute 10-check SellerVerificationService on each
      for (const sf of storedFiles) {
        const ev = await prisma.evidence.create({
          data: {
            caseId: request.caseId,
            uploadedById: input.user.id,
            claimId: claim.id,
            filename: sf.filename,
            mimeType: sf.detectedMimeType,
            sizeBytes: sf.sizeBytes,
            storageKey: sf.storageKey,
            sha256: sf.sha256,
            description:
              sf.description ||
              `Seller evidence submitted for request ${request.requestNumber}${
                sf.requestedItemKey ? ` (${sf.requestedItemKey})` : ''
              }`,
            evidenceType: sf.evidenceType,
            sourceType: EvidenceSource.MERCHANT_PORTAL,
            verificationStatus: VerificationStatus.UNVERIFIED,
            visibility: sf.visibility,
            scanStatus: MalwareScanStatus.NOT_CONFIGURED,
            metadataJson: JSON.stringify({
              sellerRequestId: request.id,
              sellerResponseId: responseRecord.id,
              requestedItemKey: sf.requestedItemKey || null,
            }),
          },
        });
        createdEvidenceIds.push(ev.id);

        const breakdown = await SellerVerificationService.verifySellerEvidenceItem({
          evidenceId: ev.id,
          caseId: request.caseId,
          buffer: sf.buffer,
          filename: sf.filename,
          declaredMimeType: sf.detectedMimeType,
          sha256: sf.sha256,
          orderId: request.orderId,
          productName: request.productName,
          amountMinor: request.case.amountMinor,
          caseCreatedAt: request.case.createdAt,
          scanStatus: MalwareScanStatus.NOT_CONFIGURED,
        });

        await prisma.sellerEvidenceItem.create({
          data: {
            requestId: request.id,
            responseId: responseRecord.id,
            evidenceId: ev.id,
            requestedItemKey: sf.requestedItemKey || null,
            fileUsabilityJson: JSON.stringify(breakdown.fileUsability),
            documentExtractionJson: JSON.stringify(breakdown.documentExtraction),
            relevanceJson: JSON.stringify(breakdown.evidenceRelevance),
            consistencyJson: JSON.stringify(breakdown.informationConsistency),
            suspiciousSignalsJson: JSON.stringify(breakdown.suspiciousSignals),
            humanReviewRequired: breakdown.humanReviewRequired,
          },
        });

        verificationBreakdowns.push(breakdown);
      }

      // Determine aggregate response verification status (never auto-trust unverified files)
      const hasSuspicious = verificationBreakdowns.some(
        (b) => b.recommendedVerificationStatus === VerificationStatus.SUSPICIOUS
      );
      const anyHumanReview =
        verificationBreakdowns.length === 0 ||
        verificationBreakdowns.some((b) => b.humanReviewRequired);

      responseVerificationStatus = hasSuspicious
        ? 'SUSPICIOUS'
        : anyHumanReview
        ? 'NEEDS_REVIEW'
        : 'VERIFIED';

      verificationSummary = {
        artifactCount: verificationBreakdowns.length,
        suspiciousCount: verificationBreakdowns.filter(
          (b) => b.recommendedVerificationStatus === VerificationStatus.SUSPICIOUS
        ).length,
        humanReviewRequired: anyHumanReview,
        verifiedOrderMatchCount: verificationBreakdowns.filter(
          (b) => b.informationConsistency.orderIdMatched
        ).length,
        assessedAt: now.toISOString(),
        disclaimer:
          'Seller uploads undergo automated usability, consistency, and tampering screening; investigator review determines evidentiary weight.',
      };

      const updatedRequestedItems = requestedItems.map((item) => {
        const resp = responseMap.get(item.key);
        if (!resp) return item;
        return {
          ...item,
          status: resp.status,
          sellerNote: resp.note?.trim() || item.sellerNote,
        };
      });

      const promotableStatuses: CaseStatus[] = [
        CaseStatus.SUBMITTED,
        CaseStatus.IN_REVIEW,
        CaseStatus.EVIDENCE_REQUESTED,
      ];

      await prisma.$transaction(async (tx) => {
        await tx.sellerEvidenceResponse.update({
          where: { id: responseRecord.id },
          data: {
            verificationStatus: responseVerificationStatus,
            verificationSummaryJson: JSON.stringify(verificationSummary),
            verifiedAt: responseVerificationStatus === 'VERIFIED' ? now : null,
          },
        });

        await tx.sellerEvidenceRequest.update({
          where: { id: request.id },
          data: {
            status: 'SELLER_RESPONDED',
            respondedAt: now,
            draftResponseJson: null,
            requestedItemsJson: JSON.stringify(updatedRequestedItems),
            ...(responseVerificationStatus === 'VERIFIED' ? { verifiedAt: now } : {}),
          },
        });

        if (promotableStatuses.includes(request.case.status)) {
          await tx.caseRecord.update({
            where: { id: request.caseId },
            data: { status: CaseStatus.EVIDENCE_SUBMITTED },
          });
        }

        await tx.caseEvent.createMany({
          data: [
            {
              caseId: request.caseId,
              actorId: input.user.id,
              eventType: EventType.SELLER_RESPONSE_SUBMITTED,
              description: `Seller submitted response (${input.stance}) for request ${request.requestNumber} with ${createdEvidenceIds.length} artifact(s).`,
              metadataJson: JSON.stringify({
                requestId: request.id,
                responseId: responseRecord.id,
                stance: input.stance,
                evidenceIds: createdEvidenceIds,
              }),
            },
            {
              caseId: request.caseId,
              actorId: input.user.id,
              eventType: EventType.SELLER_RESPONSE_VERIFIED,
              description: `Seller evidence verification completed (${responseVerificationStatus}) across ${verificationBreakdowns.length} file(s).`,
              metadataJson: JSON.stringify({
                requestId: request.id,
                responseId: responseRecord.id,
                verificationStatus: responseVerificationStatus,
                humanReviewRequired: anyHumanReview,
              }),
            },
          ],
        });

        await tx.caseTimelineEvent.create({
          data: {
            caseId: request.caseId,
            actorId: input.user.id,
            eventType: 'SELLER_RESPONSE_SUBMITTED',
            title: `Seller responded (${input.stance.replace(/_/g, ' ')})`,
            description: `${request.organization?.name || 'Seller'} responded to ${request.requestNumber} with ${createdEvidenceIds.length} evidence item(s). Screening state: ${responseVerificationStatus}.`,
            occurredAt: now,
            timePrecision: 'EXACT_TIMESTAMP',
            timeBasis: 'SYSTEM_OBSERVED',
            metadataJson: JSON.stringify({
              requestId: request.id,
              responseId: responseRecord.id,
              stance: input.stance,
              verificationStatus: responseVerificationStatus,
            }),
          },
        });
      });
    } catch (persistErr) {
      // Roll back partial DB rows and unlink saved binary files cleanly so retries leave zero orphans
      for (const sf of storedFiles) {
        await evidenceStorage.deleteFile(sf.storageKey).catch(() => {});
      }
      if (createdResponseId) {
        await prisma.sellerEvidenceItem
          .deleteMany({ where: { responseId: createdResponseId } })
          .catch(() => {});
        await prisma.sellerEvidenceResponse
          .deleteMany({ where: { id: createdResponseId } })
          .catch(() => {});
      }
      if (createdEvidenceIds.length > 0) {
        await prisma.evidenceAnalysisResult
          .deleteMany({ where: { evidenceId: { in: createdEvidenceIds } } })
          .catch(() => {});
        await prisma.evidence
          .deleteMany({ where: { id: { in: createdEvidenceIds } } })
          .catch(() => {});
      }
      if (createdClaimId) {
        await prisma.claim.deleteMany({ where: { id: createdClaimId } }).catch(() => {});
      }
      await prisma.sellerEvidenceRequest
        .update({
          where: { id: request.id },
          data: previousRequestState,
        })
        .catch(() => {});
      await prisma.caseRecord
        .update({
          where: { id: request.caseId },
          data: { status: previousCaseStatus },
        })
        .catch(() => {});
      throw persistErr;
    }

    // Notify buyer and platform investigators
    await prisma.notificationMessage.create({
      data: {
        userId: request.case.buyerId,
        title: `Seller Responded — ${request.case.caseNumber}`,
        body: `The seller has submitted a response (${input.stance.replace(/_/g, ' ')}) and ${createdEvidenceIds.length} supporting file(s) for review by our investigation team.`,
        linkUrl: `/cases?complaint=${encodeURIComponent(request.case.caseNumber)}`,
        type: 'INFO',
      },
    });

    const investigators = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { isPlatformAdmin: true },
          { role: UserRole.ADMIN },
          { role: UserRole.RESOLUTION_MANAGER },
        ],
      },
      select: { id: true },
    });

    if (investigators.length > 0) {
      await prisma.notificationMessage.createMany({
        data: investigators.map((inv) => ({
          userId: inv.id,
          title: `Seller Response Ready for Review — ${request.case.caseNumber}`,
          body: `Request ${request.requestNumber} received a ${input.stance} response (verification: ${responseVerificationStatus}).`,
          linkUrl: `/cases/${encodeURIComponent(request.case.caseNumber)}`,
          type: responseVerificationStatus === 'SUSPICIOUS' ? 'WARNING' : 'INFO',
        })),
      });
    }

    // Notify seller organization members that submission & automated verification screening completed
    if (request.organizationId) {
      const sellerRecipients = await SellerCommunicationGatewayService.getActiveEligibleMembersForOrg(
        request.organizationId
      );
      const uniqueSellerIds = Array.from(new Set([input.user.id, ...sellerRecipients]));
      const statusLabel = mapVerificationStatusForSeller(responseVerificationStatus);
      await prisma.notificationMessage.createMany({
        data: uniqueSellerIds.map((uid) => ({
          userId: uid,
          title: `Seller Response Submitted — ${request.case.caseNumber}`,
          body: `Your response for ${request.productName} (${request.orderId}) has been saved. Verification status: ${statusLabel}.`,
          linkUrl: `/seller/responses/${encodeURIComponent(responseRecord.id)}`,
          type: responseVerificationStatus === 'SUSPICIOUS' ? 'WARNING' : 'SUCCESS',
        })),
      });
    }

    // Reconstruct persisted BEG Graph & Re-run BERR v2 non-destructively while preserving BERR history
    await BegSyncService.handleDomainEvent({
      caseId: request.caseId,
      triggerEvent: 'SELLER_RESPONSE_SUBMITTED',
      actorId: input.user.id,
      rerunBerr: true,
    }).catch((err) => console.warn('[SellerResponseService] BEG/BERR sync skipped:', err));

    return {
      responseId: responseRecord.id,
      requestId: request.id,
      requestNumber: request.requestNumber,
      claimId: createdClaimId,
      stance: input.stance,
      verificationStatus: responseVerificationStatus,
      verificationSummary,
      uploadedEvidenceIds: createdEvidenceIds,
      breakdowns: verificationBreakdowns,
      idempotentReplay: false,
    };
  }

  /**
   * Sends a follow-up reminder to an unresponsive seller organization or buyer Help Centre step.
   */
  public static async issueFollowUp(params: {
    requestId: string;
    actor: AuthenticatedUser;
    message?: string;
    extendHours?: number;
  }) {
    if (!isPlatformInvestigator(params.actor)) {
      throw new SellerPortalAccessError('Only investigators or admins may issue follow-ups.', 403);
    }

    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: params.requestId },
      include: { case: true, communicationAttempts: true },
    });
    if (!request) {
      throw new SellerPortalAccessError(`Request ${params.requestId} not found.`, 404);
    }

    const now = new Date();
    const newDueAt = params.extendHours
      ? new Date(now.getTime() + params.extendHours * 3600 * 1000)
      : request.dueAt;

    let executionStatus: string = 'SENT';
    if (request.deliveryChannel === 'SELLER_PORTAL' && request.organizationId) {
      const members = await SellerCommunicationGatewayService.getActiveEligibleMembersForOrg(
        request.organizationId
      );
      if (members.length > 0) {
        executionStatus = 'DELIVERED';
        await prisma.notificationMessage.createMany({
          data: members.map((uid) => ({
            userId: uid,
            title: `Follow-up Reminder: Evidence Request ${request.requestNumber}`,
            body:
              params.message?.trim() ||
              `Please submit your response and available fulfillment evidence for complaint ${request.case.caseNumber} (Order ${request.orderId}).`,
            linkUrl: `/seller/requests/${encodeURIComponent(request.id)}`,
            type: 'WARNING',
          })),
        });
      }
    } else if (request.deliveryChannel === 'CUSTOMER_ASSISTED_HELP_CENTRE') {
      executionStatus = 'CUSTOMER_ACTION_REQUIRED';
      await prisma.notificationMessage.create({
        data: {
          userId: request.case.buyerId,
          title: `Follow-up on ${request.marketplace} Support — ${request.case.caseNumber}`,
          body:
            params.message?.trim() ||
            `Investigators requested an update on your ${request.marketplace} Help Centre support submission for ${request.orderId}.`,
          linkUrl: `/cases?complaint=${encodeURIComponent(request.case.caseNumber)}`,
          type: 'INFO',
        },
      });
    }

    const updated = await prisma.sellerEvidenceRequest.update({
      where: { id: request.id },
      data: {
        followUpCount: request.followUpCount + 1,
        lastFollowUpAt: now,
        dueAt: newDueAt,
        status:
          request.deliveryChannel === 'SELLER_PORTAL' ? 'WAITING_FOR_SELLER' : request.status,
      },
    });

    await prisma.sellerCommunicationAttempt.create({
      data: {
        requestId: request.id,
        attemptNumber: request.communicationAttempts.length + 1,
        channel: request.deliveryChannel,
        actionType: 'FOLLOW_UP',
        eligibility: 'ELIGIBLE',
        executionStatus,
        actorId: params.actor.id,
        metadataJson: JSON.stringify({
          followUpNumber: updated.followUpCount,
          message: params.message?.trim() || null,
        }),
        executedAt: now,
      },
    });

    await prisma.caseEvent.create({
      data: {
        caseId: request.caseId,
        actorId: params.actor.id,
        eventType: EventType.SELLER_FOLLOW_UP_SENT,
        description: `Follow-up #${updated.followUpCount} issued on ${request.requestNumber} (${request.deliveryChannel}).`,
        metadataJson: JSON.stringify({ requestId: request.id, followUpCount: updated.followUpCount }),
      },
    });

    return updated;
  }

  /**
   * Marks an overdue request as NO_RESPONSE and updates BEG/BERR transparently.
   */
  public static async markNoResponse(params: {
    requestId: string;
    actor: AuthenticatedUser;
    reason?: string;
  }) {
    if (!isPlatformInvestigator(params.actor)) {
      throw new SellerPortalAccessError('Only investigators or admins may mark NO_RESPONSE.', 403);
    }

    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: params.requestId },
    });
    if (!request) {
      throw new SellerPortalAccessError(`Request ${params.requestId} not found.`, 404);
    }

    const now = new Date();
    const updated = await prisma.sellerEvidenceRequest.update({
      where: { id: request.id },
      data: { status: 'NO_RESPONSE' },
    });

    await prisma.caseEvent.create({
      data: {
        caseId: request.caseId,
        actorId: params.actor.id,
        eventType: EventType.TIMELINE_EVENT_RECORDED,
        description: `Seller evidence request ${request.requestNumber} marked NO_RESPONSE.${
          params.reason ? ` Reason: ${params.reason}` : ''
        }`,
        metadataJson: JSON.stringify({
          stage: 'SELLER_NO_RESPONSE',
          requestId: request.id,
          reason: params.reason || null,
        }),
      },
    });

    await prisma.caseTimelineEvent.create({
      data: {
        caseId: request.caseId,
        actorId: params.actor.id,
        eventType: 'SELLER_NO_RESPONSE',
        title: `No response received from seller (${request.requestNumber})`,
        description:
          params.reason?.trim() ||
          `Seller response window elapsed for request ${request.requestNumber} without a submitted seller rebuttal.`,
        occurredAt: now,
        timePrecision: 'EXACT_TIMESTAMP',
        timeBasis: 'SYSTEM_OBSERVED',
        metadataJson: JSON.stringify({ requestId: request.id }),
      },
    });

    await BegSyncService.handleDomainEvent({
      caseId: request.caseId,
      triggerEvent: 'INVESTIGATION_UPDATED',
      actorId: params.actor.id,
      rerunBerr: true,
    }).catch(() => {});

    return updated;
  }

  /**
   * Transitions an existing SellerEvidenceRequest to ADDITIONAL_EVIDENCE_REQUIRED with targeted items.
   */
  public static async requestAdditionalSellerEvidence(params: {
    requestId: string;
    actor: AuthenticatedUser;
    prompt: string;
    additionalItems: Array<{ label: string; description: string }>;
  }) {
    if (!isPlatformInvestigator(params.actor)) {
      throw new SellerPortalAccessError(
        'Only investigators or admins may request additional seller evidence.',
        403
      );
    }

    const request = await prisma.sellerEvidenceRequest.findUnique({
      where: { id: params.requestId },
      include: { case: true, communicationAttempts: true },
    });
    if (!request) {
      throw new SellerPortalAccessError(`Request ${params.requestId} not found.`, 404);
    }

    const existingItems = safeParseJson<RequestedEvidenceRequirement[]>(
      request.requestedItemsJson,
      []
    );
    const now = new Date();
    const added: RequestedEvidenceRequirement[] = params.additionalItems.map((item, idx) => ({
      key: `followup_${now.getTime()}_${idx + 1}`,
      label: item.label.trim(),
      description: item.description.trim(),
      mandatory: false,
      status: 'PENDING',
    }));

    const mergedItems = [...existingItems, ...added];

    const updated = await prisma.sellerEvidenceRequest.update({
      where: { id: request.id },
      data: {
        status: 'ADDITIONAL_EVIDENCE_REQUIRED',
        requestedItemsJson: JSON.stringify(mergedItems),
        requestDescription: `${request.requestDescription}\n\n[Investigator Additional Request]: ${params.prompt.trim()}`,
      },
    });

    await prisma.sellerCommunicationAttempt.create({
      data: {
        requestId: request.id,
        attemptNumber: request.communicationAttempts.length + 1,
        channel: request.deliveryChannel,
        actionType: 'ADDITIONAL_EVIDENCE_REQUEST',
        eligibility: 'ELIGIBLE',
        executionStatus: request.deliveryChannel === 'SELLER_PORTAL' ? 'DELIVERED' : 'SENT',
        actorId: params.actor.id,
        metadataJson: JSON.stringify({
          prompt: params.prompt.trim(),
          addedItemKeys: added.map((a) => a.key),
        }),
        executedAt: now,
      },
    });

    if (request.deliveryChannel === 'SELLER_PORTAL' && request.organizationId) {
      const members = await SellerCommunicationGatewayService.getActiveEligibleMembersForOrg(
        request.organizationId
      );
      if (members.length > 0) {
        await prisma.notificationMessage.createMany({
          data: members.map((uid) => ({
            userId: uid,
            title: `Additional Evidence Requested — ${request.requestNumber}`,
            body: params.prompt.trim(),
            linkUrl: `/seller/requests/${encodeURIComponent(request.id)}`,
            type: 'WARNING',
          })),
        });
      }
    }

    await prisma.caseEvent.create({
      data: {
        caseId: request.caseId,
        actorId: params.actor.id,
        eventType: EventType.SELLER_EVIDENCE_REQUESTED,
        description: `Investigator requested additional seller evidence on ${request.requestNumber}: ${params.prompt.trim()}`,
        metadataJson: JSON.stringify({
          requestId: request.id,
          addedItemKeys: added.map((a) => a.key),
        }),
      },
    });

    return updated;
  }

  /**
   * Lists submitted seller evidence responses strictly scoped to authenticated seller organization
   * (or platform investigators), preserving every individual response chronologically.
   */
  public static async listSubmittedResponsesForUser(
    user: AuthenticatedUser,
    filters?: { q?: string; verificationStatus?: string }
  ) {
    const isInvestigator = isPlatformInvestigator(user);
    if (!isInvestigator && user.role === UserRole.BUYER) {
      throw new SellerPortalAccessError('Buyers cannot access seller responses.', 403);
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id, isActive: true, organization: { isActive: true } },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);

    if (!isInvestigator && orgIds.length === 0) {
      return [];
    }

    const where: Record<string, unknown> = {};
    if (!isInvestigator) {
      where.organizationId = { in: orgIds };
    }

    const rows = await prisma.sellerEvidenceResponse.findMany({
      where,
      include: {
        request: {
          select: {
            id: true,
            requestNumber: true,
            orderId: true,
            marketplace: true,
            productName: true,
            complaintCategory: true,
            status: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
          },
        },
        responder: {
          select: { id: true, fullName: true },
        },
        organization: {
          select: { id: true, name: true },
        },
        _count: {
          select: { evidenceItems: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const mapped = rows.map((resp) => {
      const sellerStatusLabel = mapVerificationStatusForSeller(
        resp.verificationStatus,
        resp.request.status
      );
      return {
        id: resp.id,
        requestId: resp.requestId,
        requestNumber: resp.request.requestNumber,
        caseId: resp.caseId,
        caseNumber: resp.case.caseNumber,
        caseStatus: resp.case.status,
        customerComplaintTitle: stripBuyerPii(resp.case.title),
        marketplace: resp.request.marketplace,
        orderId: resp.request.orderId,
        productName: resp.request.productName,
        complaintCategory: resp.request.complaintCategory,
        stance: resp.stance,
        summary: resp.summary,
        verificationStatus: resp.verificationStatus,
        sellerStatusLabel,
        filesCount: resp._count.evidenceItems,
        responderName: resp.responder.fullName,
        organizationName: resp.organization?.name ?? null,
        submittedAt: resp.submittedAt.toISOString(),
        verifiedAt: resp.verifiedAt?.toISOString() ?? null,
      };
    });

    const statusFilter = filters?.verificationStatus;
    const queryLower = filters?.q?.trim().toLowerCase() || '';

    return mapped.filter((item) => {
      if (statusFilter && statusFilter !== 'ALL') {
        if (
          item.verificationStatus !== statusFilter &&
          item.sellerStatusLabel !== statusFilter
        ) {
          return false;
        }
      }
      if (queryLower) {
        const hay = [
          item.caseNumber,
          item.orderId,
          item.productName,
          item.requestNumber,
          item.customerComplaintTitle,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(queryLower)) return false;
      }
      return true;
    });
  }

  /**
   * Loads one historical submitted seller response with original fields, uploaded evidence
   * previews, actual verification results, and thread context.
   */
  public static async getSubmittedResponseDetailForUser(
    responseId: string,
    user: AuthenticatedUser
  ) {
    const isInvestigator = isPlatformInvestigator(user);
    if (!isInvestigator && user.role === UserRole.BUYER) {
      throw new SellerPortalAccessError('Buyers cannot access seller responses.', 403);
    }

    const resp = await prisma.sellerEvidenceResponse.findUnique({
      where: { id: responseId },
      include: {
        request: {
          include: {
            responses: {
              orderBy: { submittedAt: 'asc' },
              select: {
                id: true,
                stance: true,
                summary: true,
                verificationStatus: true,
                submittedAt: true,
                responder: { select: { fullName: true } },
              },
            },
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            amountMinor: true,
            currency: true,
          },
        },
        organization: { select: { id: true, name: true } },
        responder: { select: { id: true, fullName: true } },
        evidenceItems: {
          include: {
            evidence: {
              select: {
                id: true,
                filename: true,
                mimeType: true,
                sizeBytes: true,
                evidenceType: true,
                verificationStatus: true,
                sha256: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!resp) {
      throw new SellerPortalAccessError(`Submitted response ${responseId} not found.`, 404);
    }

    if (!isInvestigator) {
      if (!resp.organizationId) {
        throw new SellerPortalAccessError('Forbidden', 403);
      }
      const mem = await prisma.organizationMember.findFirst({
        where: {
          organizationId: resp.organizationId,
          userId: user.id,
          isActive: true,
          organization: { isActive: true },
        },
      });
      if (!mem) {
        throw new SellerPortalAccessError(
          'Forbidden: response belongs to another organization.',
          403
        );
      }
    }

    const requestedItems = safeParseJson<RequestedEvidenceRequirement[]>(
      resp.request.requestedItemsJson,
      []
    );

    return {
      id: resp.id,
      requestId: resp.requestId,
      requestNumber: resp.request.requestNumber,
      requestStatus: resp.request.status,
      caseId: resp.caseId,
      caseNumber: resp.case.caseNumber,
      caseStatus: resp.case.status,
      customerComplaintTitle: stripBuyerPii(resp.case.title),
      marketplace: resp.request.marketplace,
      orderId: resp.request.orderId,
      productName: resp.request.productName,
      complaintCategory: resp.request.complaintCategory,
      amountMinor: resp.case.amountMinor,
      currency: resp.case.currency,
      organizationName: resp.organization?.name ?? null,
      responderName: resp.responder.fullName,
      stance: resp.stance,
      summary: resp.summary,
      additionalRemarks: resp.additionalRemarks,
      structuredDetails: safeParseJson<SellerStructuredResponseDetails | null>(
        resp.structuredDetailsJson,
        null
      ),
      itemResponses: safeParseJson<Array<{ key: string; status: string; note?: string }>>(
        resp.itemResponsesJson,
        []
      ),
      verificationStatus: resp.verificationStatus,
      sellerStatusLabel: mapVerificationStatusForSeller(
        resp.verificationStatus,
        resp.request.status
      ),
      verificationSummary: safeParseJson<Record<string, unknown> | null>(
        resp.verificationSummaryJson,
        null
      ),
      submittedAt: resp.submittedAt.toISOString(),
      verifiedAt: resp.verifiedAt?.toISOString() ?? null,
      requestedItems,
      evidenceItems: resp.evidenceItems.map((item) => ({
        id: item.id,
        evidenceId: item.evidenceId,
        requestedItemKey: item.requestedItemKey,
        filename: item.evidence.filename,
        mimeType: item.evidence.mimeType,
        sizeBytes: item.evidence.sizeBytes,
        sha256: item.evidence.sha256,
        previewUrl: `/api/evidence/${encodeURIComponent(item.evidenceId)}/download?inline=1`,
        verificationStatus: item.evidence.verificationStatus,
        humanReviewRequired: item.humanReviewRequired,
        fileUsability: safeParseJson(item.fileUsabilityJson, null),
        documentExtraction: safeParseJson(item.documentExtractionJson, null),
        evidenceRelevance: safeParseJson(item.relevanceJson, null),
        informationConsistency: safeParseJson(item.consistencyJson, null),
        suspiciousSignals: safeParseJson(item.suspiciousSignalsJson, []),
      })),
      threadResponses: resp.request.responses.map((tr) => ({
        id: tr.id,
        stance: tr.stance,
        summary: tr.summary,
        verificationStatus: tr.verificationStatus,
        sellerStatusLabel: mapVerificationStatusForSeller(
          tr.verificationStatus,
          resp.request.status
        ),
        responderName: tr.responder.fullName,
        submittedAt: tr.submittedAt.toISOString(),
      })),
    };
  }
}
