/**
 * RESOLVEGRAPH — Seller Workflow Orchestrator
 *
 * Ties the full sequence together:
 *   Buyer Evidence Screening Gate
 *   -> Role-Aware Seller Identity Extraction (from buyer purchase docs)
 *   -> Seller Directory Lookup & Priority Matching
 *   -> Persistence of SellerIdentityMatch (including detectedEntities & candidate IDs)
 *   -> Seller Communication Gateway (Priority 1/2/3 or Scenario C Review)
 *   -> BEG Graph Rebuild
 */

import { prisma } from '@/lib/prisma';
import { EventType } from '@/generated/prisma/client';
import { BuyerScreeningService, type BuyerScreeningGateResult } from './buyer-screening.service';
import {
  SellerExtractionService,
  type SellerExtractionSourceDocument,
  type SellerOcrProvider,
} from './seller-extraction.service';
import {
  SellerDirectoryService,
  type SellerMatchResolution,
} from './seller-directory.service';
import {
  SellerCommunicationGatewayService,
  type SellerGatewayExecutionOutput,
} from './seller-communication-gateway.service';
import { BegSyncService } from '@/server/graph/beg-sync.service';
import type { ExtractedSellerIdentity } from './seller.types';

export interface InitiateSellerWorkflowResult {
  screening: BuyerScreeningGateResult;
  extracted: ExtractedSellerIdentity | null;
  sellerMatchId: string | null;
  matchResolution: SellerMatchResolution | null;
  gatewayResult: SellerGatewayExecutionOutput | null;
  blockedReason: string | null;
}

export class SellerWorkflowOrchestrator {
  /**
   * Executes the full post-screening seller identification & communication workflow for a case.
   */
  public static async initiateAfterScreening(params: {
    caseIdOrNumber: string;
    actorId: string;
    marketplaceHint?: string;
    orderIdHint?: string;
    productNameHint?: string;
    inMemoryDocuments?: Array<{
      evidenceId: string;
      filename: string;
      mimeType: string;
      rawText?: string;
      storageKey?: string | null;
    }>;
    ocrProvider?: SellerOcrProvider;
    runGuardIfMissing?: boolean;
    idempotencyKey?: string;
  }): Promise<InitiateSellerWorkflowResult> {
    // Stage 1: Buyer Evidence Verification Screening Gate
    const screening = await BuyerScreeningService.evaluateCaseScreening(params.caseIdOrNumber, {
      runGuardIfMissing: params.runGuardIfMissing ?? false,
    });

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { id: screening.caseId },
      include: {
        evidence: { orderBy: { createdAt: 'asc' } },
        timelineEvents: { orderBy: { recordedAt: 'asc' } },
      },
    });

    if (!caseRecord) {
      throw new Error(`Case ${screening.caseId} not found.`);
    }

    if (!screening.passed) {
      await prisma.sellerIdentityMatch.create({
        data: {
          caseId: caseRecord.id,
          matchOutcome: 'INSUFFICIENT_INFORMATION',
          matchConfidence: 0,
          requiresHumanReview: true,
          reviewNotes: screening.reason,
          screeningGateStatus: 'BLOCKED_BY_SCREENING',
        },
      });

      await prisma.caseEvent.create({
        data: {
          caseId: caseRecord.id,
          actorId: params.actorId,
          eventType: EventType.TIMELINE_EVENT_RECORDED,
          description: `Seller identification gated: ${screening.reason}`,
          metadataJson: JSON.stringify({
            stage: 'SELLER_IDENTIFICATION_BLOCKED_BY_SCREENING',
            screeningState: screening.screeningState,
          }),
        },
      });

      return {
        screening,
        extracted: null,
        sellerMatchId: null,
        matchResolution: null,
        gatewayResult: null,
        blockedReason: screening.reason,
      };
    }

    // Parse order / product hints from case description / metadata
    const metaMatchOrder = caseRecord.description.match(/Order(?:\s*ID)?[:\s#]*([A-Z0-9\-]{6,})/i);
    const resolvedOrderId =
      params.orderIdHint?.trim() || metaMatchOrder?.[1] || caseRecord.caseNumber;
    const resolvedProduct = params.productNameHint?.trim() || caseRecord.title;
    const resolvedMarketplace = params.marketplaceHint?.trim() || 'OTHER';

    // Gather eligible buyer documents for OCR & seller extraction
    const docs: SellerExtractionSourceDocument[] = [];
    const eligibleSet = new Set(screening.eligibleDocumentIds);
    const inMemMap = new Map(
      (params.inMemoryDocuments || []).map((d) => [d.evidenceId, d])
    );

    for (const ev of caseRecord.evidence) {
      if (!eligibleSet.has(ev.id)) continue;
      const inMem = inMemMap.get(ev.id);
      docs.push({
        evidenceId: ev.id,
        filename: ev.filename,
        mimeType: ev.mimeType,
        storageKey: inMem?.storageKey ?? ev.storageKey,
        rawText: inMem?.rawText,
      });
    }

    // Stage 2: Role-Aware Seller Identity Extraction
    const extracted = await SellerExtractionService.extractForCase({
      caseId: caseRecord.id,
      marketplaceHint: resolvedMarketplace,
      orderIdHint: resolvedOrderId,
      productNameHint: resolvedProduct,
      documents: docs,
      ocrProvider: params.ocrProvider,
    });

    await prisma.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        actorId: params.actorId,
        eventType: EventType.SELLER_IDENTITY_EXTRACTED,
        description: extracted.legalName
          ? `Extracted product seller "${extracted.legalName}"${
              extracted.gstin ? ` (GSTIN: ${extracted.gstin})` : ''
            } via ${extracted.extractionMethod}.`
          : 'Seller identity extraction completed with insufficient seller fields.',
        metadataJson: JSON.stringify({
          legalName: extracted.legalName,
          gstin: extracted.gstin,
          marketplace: extracted.marketplace,
          marketplaceSellerId: extracted.marketplaceSellerId,
          orderId: extracted.orderId,
          sourceDocumentId: extracted.sourceDocumentId,
          pageNumber: extracted.pageNumber,
          isAmbiguous: extracted.isAmbiguous,
          ambiguityReasons: extracted.ambiguityReasons,
        }),
      },
    });

    // Stage 3: Seller Directory Lookup & Matching
    const matchResolution = await SellerDirectoryService.matchAndResolveSeller(extracted, {
      autoCreateUnregistered: true,
    });

    const sellerMatch = await prisma.sellerIdentityMatch.create({
      data: {
        caseId: caseRecord.id,
        sourceEvidenceId: extracted.sourceDocumentId,
        sourcePageNumber: extracted.pageNumber,
        sourceExcerpt: extracted.sourceExcerpt,
        extractedLegalName: extracted.legalName,
        extractedDisplayName: extracted.displayName,
        extractedGstin: extracted.gstin,
        extractedPanMasked: extracted.panMasked,
        extractedAddress: extracted.businessAddress,
        extractedState: extracted.state,
        extractedMarketplace: extracted.marketplace,
        extractedMarketplaceSellerId: extracted.marketplaceSellerId,
        extractedOrderId: extracted.orderId || resolvedOrderId,
        extractedInvoiceNumber: extracted.invoiceNumber,
        extractedProductName: extracted.productName || resolvedProduct,
        sellerRelationship: extracted.sellerRelationship,
        detectedEntitiesJson: JSON.stringify(extracted.detectedEntities),
        matchedSellerId: matchResolution.sellerEntry?.id ?? null,
        candidateSellerIdsJson: JSON.stringify(matchResolution.candidateSellerIds),
        matchOutcome: matchResolution.matchOutcome,
        matchConfidence: matchResolution.confidence,
        matchSignalsJson: JSON.stringify({
          signals: matchResolution.signals,
          reviewReasons: matchResolution.reviewReasons,
        }),
        requiresHumanReview: matchResolution.requiresHumanReview,
        screeningGateStatus: 'PASSED',
      },
    });

    await prisma.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        actorId: params.actorId,
        eventType: EventType.SELLER_IDENTITY_MATCHED,
        description: `Seller directory match outcome: ${matchResolution.matchOutcome} (registration: ${matchResolution.registration.registrationStatus}).`,
        metadataJson: JSON.stringify({
          sellerMatchId: sellerMatch.id,
          matchedSellerId: matchResolution.sellerEntry?.id ?? null,
          matchOutcome: matchResolution.matchOutcome,
          confidence: matchResolution.confidence,
          registrationStatus: matchResolution.registration.registrationStatus,
          requiresHumanReview: matchResolution.requiresHumanReview,
        }),
      },
    });

    // Stage 4: Seller Communication Gateway Routing & Dispatch
    const gatewayResult = await SellerCommunicationGatewayService.routeAndDispatch({
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      buyerId: caseRecord.buyerId,
      orderId: extracted.orderId || resolvedOrderId,
      marketplace: extracted.marketplace,
      productName: extracted.productName || resolvedProduct,
      complaintCategory: caseRecord.category,
      buyerScreeningPassed: true,
      sellerMatchId: sellerMatch.id,
      matchResolution,
      actorId: params.actorId,
      idempotencyKey: params.idempotencyKey || `gateway:${caseRecord.id}`,
    });

    // Stage 5: Sync Persisted BEG Graph cleanly so Seller Identity & Request nodes connect immediately
    await BegSyncService.handleDomainEvent({
      caseId: caseRecord.id,
      triggerEvent: 'SELLER_IDENTIFIED',
      actorId: params.actorId,
      rerunBerr: false,
    }).catch((err) => console.warn('[SellerWorkflowOrchestrator] BEG sync skipped:', err));

    return {
      screening,
      extracted,
      sellerMatchId: sellerMatch.id,
      matchResolution,
      gatewayResult,
      blockedReason: null,
    };
  }

  /**
   * Allows an investigator / admin to manually confirm/assign a SellerDirectoryEntry
   * after Scenario C review (`POSSIBLE_MATCH`, `MULTIPLE_MATCHES`, or unreadable extraction),
   * and immediately execute the Communication Gateway with human approval.
   */
  public static async resolveAmbiguousMatch(params: {
    caseId: string;
    sellerMatchId: string;
    sellerId: string;
    reviewerId: string;
    reviewNotes?: string;
  }) {
    const [matchRecord, sellerEntry, caseRecord] = await Promise.all([
      prisma.sellerIdentityMatch.findUnique({ where: { id: params.sellerMatchId } }),
      prisma.sellerDirectoryEntry.findUnique({
        where: { id: params.sellerId },
        include: { linkedOrganization: true },
      }),
      prisma.caseRecord.findUnique({ where: { id: params.caseId } }),
    ]);

    if (!matchRecord || matchRecord.caseId !== params.caseId) {
      throw new Error('Seller identity match record not found for this case.');
    }
    if (!sellerEntry) {
      throw new Error(`Seller directory entry ${params.sellerId} not found.`);
    }
    if (!caseRecord) {
      throw new Error(`Case ${params.caseId} not found.`);
    }

    const previousSellerId = matchRecord.matchedSellerId;
    const staleWrongSellerRequests = await prisma.sellerEvidenceRequest.findMany({
      where: {
        caseId: caseRecord.id,
        status: { not: 'CANCELLED' },
        OR: [{ sellerId: { not: sellerEntry.id } }, { sellerId: null }],
      },
      select: { id: true, sellerId: true, requestNumber: true },
    });

    if (staleWrongSellerRequests.length > 0) {
      await prisma.sellerEvidenceRequest.updateMany({
        where: { id: { in: staleWrongSellerRequests.map((r) => r.id) } },
        data: { status: 'CANCELLED' },
      });
    }

    if (
      sellerEntry.linkedOrganizationId &&
      sellerEntry.linkedOrganizationId !== caseRecord.organizationId
    ) {
      await prisma.caseRecord.update({
        where: { id: caseRecord.id },
        data: { organizationId: sellerEntry.linkedOrganizationId },
      });
    }

    const updatedMatch = await prisma.sellerIdentityMatch.update({
      where: { id: matchRecord.id },
      data: {
        matchedSellerId: sellerEntry.id,
        matchOutcome:
          sellerEntry.verificationStatus === 'VERIFIED' ? 'VERIFIED_MATCH' : 'EXACT_MATCH',
        requiresHumanReview: false,
        reviewedById: params.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: params.reviewNotes?.trim() || 'Manually verified by investigator.',
      },
    });

    await prisma.caseEvent.create({
      data: {
        caseId: caseRecord.id,
        actorId: params.reviewerId,
        eventType: EventType.SELLER_REASSIGNED,
        description: `Seller association reassigned to ${sellerEntry.legalName} (${sellerEntry.id}); cancelled ${staleWrongSellerRequests.length} prior outreach request(s).`,
        metadataJson: JSON.stringify({
          previousSellerId,
          newSellerId: sellerEntry.id,
          newOrganizationId: sellerEntry.linkedOrganizationId || caseRecord.organizationId,
          cancelledRequestIds: staleWrongSellerRequests.map((r) => r.id),
          reviewNotes: params.reviewNotes || null,
        }),
      },
    });

    const registration = await SellerDirectoryService.checkRegistrationStatus(sellerEntry);
    const resolution: SellerMatchResolution = {
      sellerEntry,
      matchOutcome: updatedMatch.matchOutcome as SellerMatchResolution['matchOutcome'],
      confidence: 1,
      signals: ['HUMAN_INVESTIGATOR_VERIFIED'],
      candidateSellerIds: [sellerEntry.id],
      requiresHumanReview: false,
      reviewReasons: [],
      registration,
    };

    const gatewayResult = await SellerCommunicationGatewayService.routeAndDispatch({
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      buyerId: caseRecord.buyerId,
      orderId: matchRecord.extractedOrderId || caseRecord.caseNumber,
      marketplace: matchRecord.extractedMarketplace || 'OTHER',
      productName: matchRecord.extractedProductName || caseRecord.title,
      complaintCategory: caseRecord.category,
      buyerScreeningPassed: true,
      sellerMatchId: updatedMatch.id,
      matchResolution: resolution,
      actorId: params.reviewerId,
      idempotencyKey: `gateway:${caseRecord.id}:reviewed:${updatedMatch.id}:${sellerEntry.id}`,
    });

    await BegSyncService.handleDomainEvent({
      caseId: caseRecord.id,
      triggerEvent: 'SELLER_IDENTIFIED',
      actorId: params.reviewerId,
      rerunBerr: true,
    }).catch(() => {});

    return { updatedMatch, gatewayResult };
  }
}
