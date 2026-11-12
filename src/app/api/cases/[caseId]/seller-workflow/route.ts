/**
 * RESOLVEGRAPH — Case Seller Workflow API
 *
 * GET  /api/cases/[caseId]/seller-workflow   Fetch buyer screening, seller matches & outreach requests
 * POST /api/cases/[caseId]/seller-workflow   Trigger post-screening seller identification & gateway dispatch
 * PATCH /api/cases/[caseId]/seller-workflow  Resolve ambiguous/review seller match & execute gateway
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { canAccessCase } from '@/server/auth/permissions';
import { UserRole } from '@/generated/prisma/client';
import {
  BuyerScreeningService,
  SellerWorkflowOrchestrator,
} from '@/server/seller';

function isInvestigator(user: { isPlatformAdmin: boolean; role: string }) {
  return (
    user.isPlatformAdmin ||
    user.role === UserRole.ADMIN ||
    user.role === UserRole.RESOLUTION_MANAGER
  );
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ id: caseId }, { caseNumber: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case ${caseId} not found.` }, { status: 404 });
    }

    if (!canAccessCase(user, caseRecord)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const investigator = isInvestigator(user);

    const [screening, matches, requests, organizations] = await Promise.all([
      BuyerScreeningService.evaluateCaseScreening(caseRecord.id, {
        runGuardIfMissing: false,
      }),
      prisma.sellerIdentityMatch.findMany({
        where: { caseId: caseRecord.id },
        include: {
          matchedSeller: {
            select: {
              id: true,
              legalName: true,
              displayName: true,
              gstin: true,
              state: true,
              identityStatus: true,
              registrationStatus: true,
              verificationStatus: true,
              linkedOrganizationId: true,
              linkedOrganization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          reviewedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sellerEvidenceRequest.findMany({
        where: { caseId: caseRecord.id },
        include: {
          seller: {
            select: {
              id: true,
              legalName: true,
              displayName: true,
              gstin: true,
              registrationStatus: true,
              verificationStatus: true,
            },
          },
          organization: { select: { id: true, name: true } },
          communicationAttempts: { orderBy: { executedAt: 'asc' } },
          responses: {
            orderBy: { submittedAt: 'desc' },
            include: {
              responder: { select: { id: true, fullName: true } },
              evidenceItems: {
                include: {
                  evidence: {
                    select: {
                      id: true,
                      filename: true,
                      mimeType: true,
                      sizeBytes: true,
                      verificationStatus: true,
                      visibility: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      investigator
        ? prisma.sellerDirectoryEntry.findMany({
            select: {
              id: true,
              legalName: true,
              displayName: true,
              gstin: true,
              registrationStatus: true,
              verificationStatus: true,
              linkedOrganization: { select: { id: true, name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      screening,
      matches: matches.map((m) => ({
        id: m.id,
        sourceEvidenceId: m.sourceEvidenceId,
        sourcePageNumber: m.sourcePageNumber,
        sourceExcerpt: investigator ? m.sourceExcerpt : null,
        extractedLegalName: m.extractedLegalName,
        extractedDisplayName: m.extractedDisplayName,
        extractedGstin: m.extractedGstin,
        extractedPanMasked: investigator ? m.extractedPanMasked : null,
        extractedAddress: investigator ? m.extractedAddress : null,
        extractedState: m.extractedState,
        extractedMarketplace: m.extractedMarketplace,
        extractedMarketplaceSellerId: m.extractedMarketplaceSellerId,
        extractedOrderId: m.extractedOrderId,
        extractedInvoiceNumber: m.extractedInvoiceNumber,
        extractedProductName: m.extractedProductName,
        sellerRelationship: m.sellerRelationship,
        detectedEntities: investigator ? safeJsonParse(m.detectedEntitiesJson, []) : [],
        matchedSeller: m.matchedSeller,
        candidateSellerIds: investigator ? safeJsonParse(m.candidateSellerIdsJson, []) : [],
        matchOutcome: m.matchOutcome,
        matchConfidence: m.matchConfidence,
        matchSignals: safeJsonParse(m.matchSignalsJson, { signals: [], reviewReasons: [] }),
        requiresHumanReview: m.requiresHumanReview,
        reviewNotes: investigator ? m.reviewNotes : null,
        reviewedBy: m.reviewedBy?.fullName ?? null,
        reviewedAt: m.reviewedAt?.toISOString() ?? null,
        screeningGateStatus: m.screeningGateStatus,
        createdAt: m.createdAt.toISOString(),
      })),
      requests: requests.map((req) => ({
        id: req.id,
        requestNumber: req.requestNumber,
        sellerId: req.sellerId,
        sellerLegalName: req.seller?.legalName ?? null,
        sellerGstin: req.seller?.gstin ?? null,
        organizationId: req.organizationId,
        organizationName: req.organization?.name ?? null,
        marketplace: req.marketplace,
        orderId: req.orderId,
        productName: req.productName,
        complaintCategory: req.complaintCategory,
        requestDescription: req.requestDescription,
        requestedItems: safeJsonParse(req.requestedItemsJson, []),
        deliveryChannel: req.deliveryChannel,
        registrationStatus: req.registrationStatus,
        status: req.status,
        marketplaceSupportUrl: req.marketplaceSupportUrl,
        preparedMessageForBuyer:
          user.role === UserRole.BUYER || investigator ? req.preparedMessageForBuyer : null,
        customerReportedSubmissionAt: req.customerReportedSubmissionAt?.toISOString() ?? null,
        customerSubmissionNote: req.customerSubmissionNote,
        dispatchedAt: req.dispatchedAt?.toISOString() ?? null,
        deliveredAt: req.deliveredAt?.toISOString() ?? null,
        viewedAt: req.viewedAt?.toISOString() ?? null,
        respondedAt: req.respondedAt?.toISOString() ?? null,
        dueAt: req.dueAt?.toISOString() ?? null,
        followUpCount: req.followUpCount,
        communicationAttempts: req.communicationAttempts.map((a) => ({
          id: a.id,
          attemptNumber: a.attemptNumber,
          channel: a.channel,
          actionType: a.actionType,
          eligibility: a.eligibility,
          executionStatus: a.executionStatus,
          failureReason: a.failureReason,
          externalReferenceId: a.externalReferenceId,
          executedAt: a.executedAt.toISOString(),
        })),
        responses: req.responses.map((resp) => ({
          id: resp.id,
          stance: resp.stance,
          summary: resp.summary,
          additionalRemarks: resp.additionalRemarks,
          verificationStatus: resp.verificationStatus,
          verificationSummary: safeJsonParse(resp.verificationSummaryJson, null),
          itemResponses: safeJsonParse(resp.itemResponsesJson, []),
          responderName: investigator ? resp.responder.fullName : 'Seller Representative',
          submittedAt: resp.submittedAt.toISOString(),
          evidenceItems: resp.evidenceItems
            .filter((i) => investigator || i.evidence.visibility !== 'INTERNAL')
            .map((i) => ({
              id: i.id,
              evidenceId: i.evidenceId,
              requestedItemKey: i.requestedItemKey,
              filename: i.evidence.filename,
              verificationStatus: i.evidence.verificationStatus,
              humanReviewRequired: i.humanReviewRequired,
              fileUsability: safeJsonParse(i.fileUsabilityJson, null),
              documentExtraction: safeJsonParse(i.documentExtractionJson, null),
              evidenceRelevance: safeJsonParse(i.relevanceJson, null),
              informationConsistency: safeJsonParse(i.consistencyJson, null),
              suspiciousSignals: safeJsonParse(i.suspiciousSignalsJson, []),
            })),
        })),
      })),
      directoryCandidates: organizations,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('GET /api/cases/[caseId]/seller-workflow error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load seller workflow' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!isInvestigator(user)) {
      return NextResponse.json(
        { error: 'Only resolution managers or administrators can run seller identification manually.' },
        { status: 403 }
      );
    }

    const { caseId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const result = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: caseId,
      actorId: user.id,
      marketplaceHint: typeof body.marketplace === 'string' ? body.marketplace : undefined,
      orderIdHint: typeof body.orderId === 'string' ? body.orderId : undefined,
      productNameHint: typeof body.productName === 'string' ? body.productName : undefined,
      runGuardIfMissing: true,
      idempotencyKey:
        typeof body.idempotencyKey === 'string'
          ? body.idempotencyKey
          : `manual:${caseId}:${Date.now()}`,
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('POST /api/cases/[caseId]/seller-workflow error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to initiate seller workflow' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    if (!isInvestigator(user)) {
      return NextResponse.json(
        { error: 'Only investigators or administrators can resolve ambiguous seller matches.' },
        { status: 403 }
      );
    }

    const { caseId } = await context.params;
    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ id: caseId }, { caseNumber: caseId }] },
      select: { id: true },
    });
    if (!caseRecord) {
      return NextResponse.json({ error: `Case ${caseId} not found.` }, { status: 404 });
    }

    const body = await request.json();
    if (!body.sellerMatchId || !body.sellerId) {
      return NextResponse.json(
        { error: 'sellerMatchId and sellerId are required.' },
        { status: 400 }
      );
    }

    const outcome = await SellerWorkflowOrchestrator.resolveAmbiguousMatch({
      caseId: caseRecord.id,
      sellerMatchId: String(body.sellerMatchId),
      sellerId: String(body.sellerId),
      reviewerId: user.id,
      reviewNotes: typeof body.reviewNotes === 'string' ? body.reviewNotes : undefined,
    });

    return NextResponse.json({ success: true, outcome });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('PATCH /api/cases/[caseId]/seller-workflow error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to resolve seller match' },
      { status: 500 }
    );
  }
}
