/**
 * RESOLVEGRAPH — Step 5: Graph Builder Service
 * Constructs, validates, and serializes the complete Bilateral Evidence Graph for a dispute case.
 */

import { prisma } from "@/lib/prisma";
import {
  BegNodeType,
  BegVerificationState,
  ConfidenceBand,
  EvidenceProvenanceRecord,
  EvidenceSourceOrigin,
  GraphData,
  GraphEdge,
  GraphNode,
  GraphSummaryMetrics,
  ReviewStatus,
} from "./graph.types";
import { GraphValidator } from "./graph-validator";
import {
  AttributeObservation,
  MatchableRecord,
  MissingEvidenceGap,
  evaluateAttributeDiscrepancies,
  extractAttributeTokens,
  matchEvidenceRecords,
  matchSellerCandidates,
} from "./beg-matcher.service";

function mapEvidenceToBegType(
  ev: {
    evidenceType: string;
    mimeType: string;
    filename: string;
    description?: string | null;
  },
  isBuyerEv: boolean,
  requestedItemKey?: string | null
): BegNodeType {
  const type = (ev.evidenceType || "").toUpperCase();
  const mime = (ev.mimeType || "").toLowerCase();
  const key = (requestedItemKey || "").toLowerCase();
  const nameDesc = `${ev.filename} ${ev.description || ""}`.toLowerCase();

  if (isBuyerEv) {
    if (type.includes("COMMUNICATION") || type.includes("CHAT")) return "BUYER_COMMUNICATION";
    if (mime.startsWith("video/") || type.includes("VIDEO")) return "BUYER_VIDEO";
    if (type === "INVOICE" || type === "RECEIPT" || nameDesc.includes("invoice")) return "INVOICE";
    if (type === "ORDER_SCREENSHOT" || nameDesc.includes("order summary")) return "PURCHASE_RECORD";
    if (mime.startsWith("image/") || type.includes("PHOTO")) return "BUYER_IMAGE";
    return "BUYER_DOCUMENT";
  }

  if (key.includes("packing_photo") || type.includes("PACKING_PHOTO")) return "SELLER_PACKING_PHOTO";
  if (key.includes("packing_video") || type.includes("PACKING_VIDEO") || mime.startsWith("video/")) {
    return "SELLER_PACKING_VIDEO";
  }
  if (key.includes("dispatch") || key.includes("tracking") || type.includes("SHIPPING") || nameDesc.includes("dispatch") || nameDesc.includes("tracking")) {
    return "SELLER_DISPATCH_RECORD";
  }
  if (key.includes("inspection") || key.includes("qc") || nameDesc.includes("inspection")) {
    return "SELLER_INSPECTION_RECORD";
  }
  if (key.includes("declaration") || nameDesc.includes("declaration")) {
    return "SELLER_DECLARATION";
  }
  if (type.includes("COMMUNICATION") || type.includes("CHAT")) return "SELLER_COMMUNICATION";
  if (type === "INVOICE") return "INVOICE";
  if (mime.startsWith("image/")) return "SELLER_PACKING_PHOTO";
  return "SELLER_DOCUMENT";
}

function deriveEvidenceVerificationState(
  ev: { verificationStatus: string; metadataJson?: string | null },
  analysis?: { assessmentState?: string | null } | null,
  sellerItem?: { humanReviewRequired?: boolean } | null
): { verificationState: BegVerificationState; provenanceSource: EvidenceSourceOrigin } {
  const status = (ev.verificationStatus || "").toUpperCase();
  const note = (ev.metadataJson || "").toLowerCase();
  const isHashOrAiOnly = note.includes("hash_only") || note.includes("ai_only") || note.includes("ocr_only");

  if (status === "VERIFIED" && !isHashOrAiOnly && (!sellerItem || !sellerItem.humanReviewRequired)) {
    return { verificationState: "VERIFIED", provenanceSource: "INDEPENDENTLY_VERIFIED" };
  }
  if (status === "SUSPICIOUS" || analysis?.assessmentState === "SUSPICIOUS") {
    return { verificationState: "CONTESTED", provenanceSource: "SYSTEM_GENERATED" };
  }
  if (status === "UNVERIFIED") {
    return { verificationState: "UNVERIFIED", provenanceSource: "SYSTEM_GENERATED" };
  }
  return { verificationState: "SOURCE_SUPPORTED", provenanceSource: "SYSTEM_GENERATED" };
}

function parseStructuredComplaintFields(description: string): {
  orderId?: string;
  marketplace?: string;
  productName?: string;
  sellerName?: string;
  sku?: string;
} {
  const pick = (patterns: RegExp[]) => {
    for (const p of patterns) {
      const m = description.match(p);
      if (m?.[1]?.trim()) return m[1].trim();
    }
    return undefined;
  };
  return {
    orderId: pick([/Order\s*ID\s*:\s*([A-Za-z0-9_-]{4,64})/i, /\b(ORD[-_][A-Za-z0-9-]+)\b/i]),
    marketplace: pick([/Marketplace\s*:\s*([A-Za-z0-9 &_-]{2,40})/i]),
    productName: pick([/Product\s*:\s*([^\n\r|]{3,120})/i]),
    sellerName: pick([/Seller\s*:\s*([^\n\r|]{2,80})/i]),
    sku: pick([/SKU\s*:\s*([A-Za-z0-9_-]{3,48})/i]),
  };
}

export class GraphBuilder {
  /**
   * Builds the complete Bilateral Evidence Graph for a given case ID or case number.
   */
  public static async buildGraph(caseIdOrNumber: string): Promise<GraphData> {
    // 1. Resolve case record
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
      },
      include: {
        buyer: true,
        merchant: true,
        claims: {
          include: { author: true },
          orderBy: { createdAt: "asc" },
        },
        evidence: {
          include: { uploadedBy: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!caseRecord) {
      throw new Error(`Dispute case not found: ${caseIdOrNumber}`);
    }

    const actualCaseId = caseRecord.id;

    // 2. Fetch all related entities in parallel
    const [
      facts,
      factRelations,
      factClaimAssessments,
      findings,
      findingEvidence,
      timelineEvents,
      resolutionProposals,
      purchaseMemory,
      packagePassport,
      cameraSessions,
      canonicalTransactions,
      sourceRecords,
      mismatches,
      paymentIncident,
      paypalPayments,
    ] = await Promise.all([
      prisma.extractedFact.findMany({
        where: { caseId: actualCaseId },
        include: { evidence: true },
      }),
      prisma.factRelation.findMany({
        where: { caseId: actualCaseId },
        include: { sourceFact: true, targetFact: true },
      }),
      prisma.factClaimAssessment.findMany({
        where: { caseId: actualCaseId },
      }),
      prisma.berrFinding.findMany({
        where: { caseId: actualCaseId },
      }),
      prisma.berrFindingEvidence.findMany({
        where: {
          finding: { caseId: actualCaseId },
        },
      }),
      prisma.caseTimelineEvent.findMany({
        where: { caseId: actualCaseId },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.resolutionProposal.findMany({
        where: { caseId: actualCaseId },
        include: { responses: true },
      }),
      caseRecord.purchaseMemoryId
        ? prisma.purchaseMemory.findUnique({
            where: { id: caseRecord.purchaseMemoryId },
            include: { specifications: true },
          })
        : Promise.resolve(null),
      caseRecord.packagePassportId
        ? prisma.packagePassport.findUnique({
            where: { id: caseRecord.packagePassportId },
            include: { items: true, seals: true },
          })
        : Promise.resolve(null),
      prisma.cameraSession.findMany({
        where: { caseId: actualCaseId },
      }),
      prisma.canonicalTransaction.findMany({
        where: { caseId: actualCaseId },
        include: { sourceRecords: true, mismatches: true },
      }),
      prisma.transactionSourceRecord.findMany({
        where: { caseId: actualCaseId },
      }),
      prisma.reconciliationMismatch.findMany({
        where: { caseId: actualCaseId },
      }),
      prisma.paymentIncident.findUnique({
        where: { caseId: actualCaseId },
        include: { findings: true },
      }),
      prisma.payPalPayment.findMany({
        where: { commerceOrder: { caseId: actualCaseId } },
        include: { refunds: true, disputes: true, commerceOrder: true },
      }),
    ]);

    const [
      sellerMatches,
      sellerRequests,
      evidenceAnalyses,
      evidenceFieldExtractions,
      commerceOrders,
      organizationRecord,
      sellerDirectoryEntries,
      existingPersistedEdges,
      latestBerrAssessment,
    ] = await Promise.all([
      prisma.sellerIdentityMatch.findMany({
        where: { caseId: actualCaseId },
        include: { matchedSeller: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.sellerEvidenceRequest.findMany({
        where: {
          caseId: actualCaseId,
          status: { not: "CANCELLED" },
        },
        include: {
          seller: true,
          communicationAttempts: { orderBy: { executedAt: "asc" } },
          responses: {
            include: { evidenceItems: true },
            orderBy: { submittedAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.evidenceAnalysisResult.findMany({
        where: { evidence: { caseId: actualCaseId } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.evidenceFieldExtraction.findMany({
        where: { evidence: { caseId: actualCaseId } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.commerceOrder.findMany({
        where: { caseId: actualCaseId },
        include: { items: true, payments: true },
        orderBy: { createdAt: "asc" },
      }),
      caseRecord.organizationId
        ? prisma.organization.findUnique({ where: { id: caseRecord.organizationId } })
        : Promise.resolve(null),
      prisma.sellerDirectoryEntry.findMany({
        include: { marketplaceAccounts: true },
        take: 40,
      }),
      prisma.begEdge.findMany({
        where: { caseId: actualCaseId },
        select: {
          edgeKey: true,
          verificationState: true,
          reviewStatus: true,
          reviewedById: true,
          reviewedAt: true,
          reviewNote: true,
          originalAiState: true,
        },
      }),
      prisma.berrAssessmentRecord.findFirst({
        where: { caseId: actualCaseId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const analysisByEvidenceId = new Map<string, (typeof evidenceAnalyses)[number]>();
    for (const ar of evidenceAnalyses) {
      if (ar.evidenceId) analysisByEvidenceId.set(ar.evidenceId, ar);
    }

    const fieldsByEvidenceId = new Map<string, (typeof evidenceFieldExtractions)>();
    for (const ef of evidenceFieldExtractions) {
      const list = fieldsByEvidenceId.get(ef.evidenceId) || [];
      list.push(ef);
      fieldsByEvidenceId.set(ef.evidenceId, list);
    }

    const sellerItemByEvidenceId = new Map<
      string,
      { item: (typeof sellerRequests)[number]["responses"][number]["evidenceItems"][number]; resp: (typeof sellerRequests)[number]["responses"][number] }
    >();
    for (const req of sellerRequests) {
      for (const resp of req.responses) {
        for (const item of resp.evidenceItems) {
          sellerItemByEvidenceId.set(item.evidenceId, { item, resp });
        }
      }
    }

    const persistedOverrideByEdgeKey = new Map(
      existingPersistedEdges.map((e) => [e.edgeKey, e])
    );

    const parsedComplaint = parseStructuredComplaintFields(caseRecord.description || "");
    const matchableRecords: MatchableRecord[] = [];
    const attributeObservations: AttributeObservation[] = [];

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // --- NODE: Case Root ---
    nodes.push({
      id: `case:${actualCaseId}`,
      type: "CASE",
      begType: "COMPLAINT",
      sourceEntityType: "CaseRecord",
      sourceEntityId: actualCaseId,
      label: caseRecord.caseNumber,
      sublabel: caseRecord.title,
      party: "NEUTRAL",
      swimlane: "SHARED",
      sourceOrigin: "BUYER_SUBMITTED",
      verificationState: "SOURCE_SUPPORTED",
      status: caseRecord.status,
      timestamp: caseRecord.createdAt.toISOString(),
      metadata: {
        caseNumber: caseRecord.caseNumber,
        category: caseRecord.category,
        amountMinor: caseRecord.amountMinor,
        disputedAmount: caseRecord.amountMinor / 100,
        currency: caseRecord.currency,
        organizationId: caseRecord.organizationId,
        orderId: parsedComplaint.orderId || commerceOrders[0]?.orderNumber || null,
        productName: parsedComplaint.productName || null,
        marketplace: parsedComplaint.marketplace || null,
      },
    });

    // --- NODE: Buyer ---
    const buyerId = `user:${caseRecord.buyerId}`;
    nodes.push({
      id: buyerId,
      type: "BUYER",
      begType: "BUYER",
      sourceEntityType: "User",
      sourceEntityId: caseRecord.buyerId,
      label: caseRecord.buyer.fullName || caseRecord.buyer.email,
      sublabel: "Buyer / Customer",
      party: "BUYER",
      swimlane: "BUYER",
      sourceOrigin: "SYSTEM_GENERATED",
      verificationState: "VERIFIED",
      metadata: {
        email: caseRecord.buyer.email,
      },
    });

    // --- NODE: Merchant / Platform Intake Officer ---
    const isPlatformAdminMerchant =
      (caseRecord.merchant.isPlatformAdmin || caseRecord.merchant.role === "ADMIN") &&
      !caseRecord.organizationId;
    const merchantId = `user:${caseRecord.merchantId}`;

    if (!isPlatformAdminMerchant) {
      nodes.push({
        id: merchantId,
        type: "MERCHANT",
        begType: "SELLER",
        sourceEntityType: "User",
        sourceEntityId: caseRecord.merchantId,
        label: caseRecord.merchant.fullName || caseRecord.merchant.email,
        sublabel: caseRecord.merchant.organization || "Merchant",
        party: "MERCHANT",
        swimlane: "SELLER",
        sourceOrigin: "SYSTEM_GENERATED",
        verificationState: organizationRecord?.isActive ? "SOURCE_SUPPORTED" : "UNVERIFIED",
        metadata: {
          email: caseRecord.merchant.email,
          organizationId: caseRecord.organizationId,
        },
      });
    } else {
      nodes.push({
        id: merchantId,
        type: "INVESTIGATION_EVENT",
        begType: "INVESTIGATION_EVENT",
        sourceEntityType: "User",
        sourceEntityId: caseRecord.merchantId,
        label: `${caseRecord.merchant.fullName || caseRecord.merchant.email} (Intake Officer)`,
        sublabel: "Platform Administrator",
        party: "NEUTRAL",
        swimlane: "SHARED",
        sourceOrigin: "SYSTEM_GENERATED",
        verificationState: "VERIFIED",
        metadata: {
          email: caseRecord.merchant.email,
          isPlatformAdmin: true,
        },
      });
    }

    if (organizationRecord) {
      const orgNodeId = `org:${organizationRecord.id}`;
      const isOrgVerified = sellerMatches.some(
        (sm) => sm.matchedSeller?.verificationStatus === "VERIFIED"
      );
      nodes.push({
        id: orgNodeId,
        type: "MERCHANT_ORGANIZATION",
        begType: "MERCHANT_ORGANIZATION",
        sourceEntityType: "Organization",
        sourceEntityId: organizationRecord.id,
        label: organizationRecord.name,
        sublabel: `Organization ${organizationRecord.isActive ? "Active" : "Inactive"}`,
        party: "SELLER",
        swimlane: "SELLER",
        sourceOrigin: isOrgVerified ? "INDEPENDENTLY_VERIFIED" : "SYSTEM_GENERATED",
        verificationState: isOrgVerified ? "VERIFIED" : "SOURCE_SUPPORTED",
        metadata: {
          organizationId: organizationRecord.id,
          slug: organizationRecord.slug,
          isActive: organizationRecord.isActive,
        },
      });
      edges.push({
        id: `edge:merchant->org:${organizationRecord.id}`,
        source: merchantId,
        target: orgNodeId,
        type: "BELONGS_TO",
        begType: "BELONGS_TO",
        label: "MEMBER_OF",
        verificationState: isOrgVerified ? "VERIFIED" : "SOURCE_SUPPORTED",
        sourceOrigin: "SYSTEM_GENERATED",
        provenance: "RULE",
      });
    }

    // --- NODES: Claims ---
    for (const claim of caseRecord.claims) {
      const claimNodeId = `claim:${claim.id}`;
      const isBuyerClaim = claim.partyRole === "BUYER" || claim.authorId === caseRecord.buyerId;
      const claimParty = isBuyerClaim ? "BUYER" : "MERCHANT";
      const claimTokens = extractAttributeTokens(`${caseRecord.title} ${claim.statement || ""}`);

      nodes.push({
        id: claimNodeId,
        type: "CLAIM",
        begType: isBuyerClaim ? "BUYER_CLAIM" : "SELLER_CLAIM",
        sourceEntityType: "Claim",
        sourceEntityId: claim.id,
        label: claim.claimType,
        sublabel: (claim.statement || "").slice(0, 60) + ((claim.statement || "").length > 60 ? "..." : ""),
        party: claimParty,
        swimlane: isBuyerClaim ? "BUYER" : "SELLER",
        sourceOrigin: isBuyerClaim ? "BUYER_SUBMITTED" : "SELLER_SUBMITTED",
        verificationState: "SOURCE_SUPPORTED",
        status: claim.status,
        timestamp: claim.createdAt.toISOString(),
        metadata: {
          category: claim.claimType,
          fullDescription: claim.statement || "",
          statedAmount: caseRecord.amountMinor / 100,
          authorId: claim.authorId,
        },
      });

      attributeObservations.push({
        nodeId: claimNodeId,
        party: isBuyerClaim ? "BUYER" : "SELLER",
        role: isBuyerClaim ? "BUYER_CLAIM" : "SELLER_DECLARATION",
        sourceOrigin: isBuyerClaim ? "BUYER_SUBMITTED" : "SELLER_SUBMITTED",
        verificationState: "SOURCE_SUPPORTED",
        text: `${caseRecord.title} ${claim.statement || ""}`,
        attributes: {
          capacityToken: claimTokens.capacityToken,
          modelToken: claimTokens.modelToken,
          quantity: claimTokens.quantity,
          deliveryState: claimTokens.deliveryMention,
        },
      });

      // Edge: Author -> Claim
      edges.push({
        id: `edge:author->${claim.id}`,
        source: isBuyerClaim ? buyerId : merchantId,
        target: claimNodeId,
        type: "ASSERTS_CLAIM",
        begType: "SUBMITTED_BY",
        label: `ASSERTS_${claim.claimType}`,
        verificationState: "SOURCE_SUPPORTED",
        sourceOrigin: isBuyerClaim ? "BUYER_SUBMITTED" : "SELLER_SUBMITTED",
        provenance: "HUMAN_ASSERTED",
      });
    }

    // --- NODES: Evidence (Full Part 4 Provenance Preserved) ---
    for (const ev of caseRecord.evidence) {
      const evidenceNodeId = `evidence:${ev.id}`;
      const isBuyerEv = ev.uploadedById === caseRecord.buyerId;
      const sellerAssoc = sellerItemByEvidenceId.get(ev.id);
      const analysis = analysisByEvidenceId.get(ev.id);
      const evParty = isBuyerEv ? "BUYER" : "MERCHANT";
      const begType = mapEvidenceToBegType(ev, isBuyerEv, sellerAssoc?.item.requestedItemKey);
      const { verificationState } = deriveEvidenceVerificationState(
        ev,
        analysis,
        sellerAssoc?.item
      );
      const origin: EvidenceSourceOrigin = isBuyerEv
        ? "BUYER_SUBMITTED"
        : "SELLER_SUBMITTED";

      const provenanceRecord: EvidenceProvenanceRecord = {
        evidenceId: ev.id,
        complaintId: actualCaseId,
        originalFileId: ev.id,
        evidenceType: ev.evidenceType,
        uploadedBy: ev.uploadedBy.fullName || ev.uploadedBy.email,
        uploadingParty: isBuyerEv ? "BUYER" : "SELLER",
        uploadTimestamp: ev.createdAt.toISOString(),
        originalFilename: ev.filename,
        sha256: ev.sha256,
        extractedInfoRef: analysis?.id,
        ocrResultRef: analysis?.id,
        verificationResultRef: sellerAssoc?.item.id || analysis?.id,
        storageKey: ev.storageKey,
        accessPermissions: ev.visibility,
        sourceOrigin: origin,
      };

      const extractedFieldMap = new Map<string, string>();
      const evExtractions = fieldsByEvidenceId.get(ev.id) || [];
      for (const f of evExtractions) {
        const val = f.userCorrectedValue || f.extractedValue;
        if (val) {
          extractedFieldMap.set(f.fieldName, val);
        }
      }

      nodes.push({
        id: evidenceNodeId,
        type: "EVIDENCE",
        begType,
        sourceEntityType: "Evidence",
        sourceEntityId: ev.id,
        label: ev.filename,
        sublabel: `${begType} • ${ev.evidenceType}`,
        party: evParty,
        swimlane: isBuyerEv ? "BUYER" : "SELLER",
        sourceOrigin: origin,
        verificationState,
        provenanceRecord,
        status: ev.verificationStatus,
        confidence: verificationState === "VERIFIED" ? 0.95 : verificationState === "SOURCE_SUPPORTED" ? 0.78 : 0.55,
        confidenceBand: verificationState === "VERIFIED" ? "HIGH" : "MEDIUM",
        timestamp: ev.createdAt.toISOString(),
        isInternal: ev.visibility === "INTERNAL",
        metadata: {
          evidenceId: ev.id,
          begType,
          evidenceType: ev.evidenceType,
          fileKey: ev.storageKey,
          originalFilename: ev.filename,
          sha256: ev.sha256,
          mimeType: ev.mimeType,
          fileSize: ev.sizeBytes,
          visibility: ev.visibility,
          isInternal: ev.visibility === "INTERNAL",
          uploadedBy: provenanceRecord.uploadedBy,
          uploadingParty: provenanceRecord.uploadingParty,
          findingsSummary: analysis?.findingsSummary || null,
          extractedFields: Object.fromEntries(extractedFieldMap.entries()),
          organizationId: caseRecord.organizationId,
        },
      });

      const evTokens = extractAttributeTokens(
        `${ev.filename} ${ev.description || ""} ${analysis?.findingsSummary || ""} ${Array.from(extractedFieldMap.values()).join(" ")}`
      );

      matchableRecords.push({
        nodeId: evidenceNodeId,
        party: isBuyerEv ? "BUYER" : "SELLER",
        sourceOrigin: origin,
        label: ev.filename,
        complaintId: actualCaseId,
        caseNumber: caseRecord.caseNumber,
        orderId: extractedFieldMap.get("order_id") || extractedFieldMap.get("orderNumber") || extractedFieldMap.get("orderRef") || null,
        gstin: extractedFieldMap.get("gstin") || extractedFieldMap.get("seller_gstin") || null,
        marketplace: extractedFieldMap.get("marketplace") || null,
        marketplaceSellerId: extractedFieldMap.get("marketplace_seller_id") || null,
        sellerName: extractedFieldMap.get("seller_name") || extractedFieldMap.get("merchant") || null,
        sku: extractedFieldMap.get("sku") || evTokens.modelToken || null,
        modelNumber: extractedFieldMap.get("product_model") || evTokens.modelToken || null,
        invoiceNumber: extractedFieldMap.get("invoice_number") || extractedFieldMap.get("transactionId") || null,
        amountMinor: extractedFieldMap.get("amount") ? Math.round(Number(extractedFieldMap.get("amount")) * 100) : null,
        currency: extractedFieldMap.get("currency") || caseRecord.currency,
        timestampIso: ev.createdAt.toISOString(),
        productTitle: extractedFieldMap.get("product_name") || ev.description || null,
      });

      attributeObservations.push({
        nodeId: evidenceNodeId,
        party: isBuyerEv ? "BUYER" : "SELLER",
        role: isBuyerEv
          ? begType === "INVOICE" || begType === "PURCHASE_RECORD"
            ? "ORDER_SPEC"
            : "BUYER_OBSERVATION"
          : begType === "SELLER_DECLARATION"
          ? "SELLER_DECLARATION"
          : "SELLER_EVIDENCE",
        sourceOrigin: origin,
        verificationState,
        text: `${ev.filename} ${ev.description || ""} ${analysis?.findingsSummary || ""}`,
        attributes: {
          capacityToken: evTokens.capacityToken,
          modelToken: evTokens.modelToken,
          sku: extractedFieldMap.get("sku") || null,
          quantity: evTokens.quantity,
          deliveryState: evTokens.deliveryMention,
        },
      });

      // Edge: Uploader -> Evidence
      edges.push({
        id: `edge:uploader->${ev.id}`,
        source: isBuyerEv ? buyerId : merchantId,
        target: evidenceNodeId,
        type: "SUBMITS_EVIDENCE",
        begType: "SUBMITTED_BY",
        label: `SUBMITS_${ev.evidenceType}`,
        verificationState,
        sourceOrigin: origin,
        provenance: isBuyerEv ? "BUYER_SUBMITTED" : "SELLER_SUBMITTED",
      });

      // Verification Finding Node if EvidenceAnalysisResult exists (keep AI observation separate from verification!)
      if (analysis) {
        const verifNodeId = `finding:analysis_${analysis.id}`;
        nodes.push({
          id: verifNodeId,
          type: "FINDING",
          begType: "VERIFICATION_FINDING",
          sourceEntityType: "EvidenceAnalysisResult",
          sourceEntityId: analysis.id,
          label: `Evidence Screening (${analysis.assessmentState})`,
          sublabel: analysis.findingsSummary.slice(0, 65) || "AI & Technical Check",
          party: "SYSTEM",
          swimlane: "SHARED",
          sourceOrigin: "AI_EXTRACTED",
          verificationState: analysis.assessmentState === "SUSPICIOUS" ? "CONTESTED" : "INFERRED",
          status: analysis.assessmentState,
          timestamp: analysis.createdAt.toISOString(),
          metadata: {
            analysisId: analysis.id,
            evidenceId: ev.id,
            assessmentState: analysis.assessmentState,
            confidence: analysis.confidence,
            humanReviewRecommended: analysis.humanReviewRecommended,
            findingsSummary: analysis.findingsSummary,
          },
        });
        edges.push({
          id: `edge:verif->ev:${analysis.id}`,
          source: verifNodeId,
          target: evidenceNodeId,
          type: "CITES_EVIDENCE",
          begType: "EXTRACTED_FROM",
          label: "ANALYZED_FROM",
          verificationState: "INFERRED",
          sourceOrigin: "AI_EXTRACTED",
          provenance: "AI_INFERRED",
          supportingEvidenceIds: [ev.id],
        });
      }
    }

    // --- NODES: Extracted Facts ---
    for (const fact of facts) {
      const factNodeId = `fact:${fact.id}`;
      const evParty = fact.evidence.uploadedById === caseRecord.buyerId ? "BUYER" : "MERCHANT";
      const factTokens = extractAttributeTokens(`${fact.fieldKey} ${fact.normalizedValue || fact.rawValue}`);

      nodes.push({
        id: factNodeId,
        type: "FACT",
        begType: "EXTRACTED_FACT",
        sourceEntityType: "ExtractedFact",
        sourceEntityId: fact.id,
        label: `${fact.fieldKey}: ${fact.normalizedValue || fact.rawValue}`,
        sublabel: fact.factType,
        party: evParty,
        swimlane: evParty === "BUYER" ? "BUYER" : "SELLER",
        sourceOrigin: "AI_EXTRACTED",
        verificationState: fact.reviewStatus === "CONFIRMED" ? "VERIFIED" : "INFERRED",
        provenanceRecord: {
          evidenceId: fact.evidenceId,
          complaintId: actualCaseId,
          extractedInfoRef: fact.id,
          sourceOrigin: "AI_EXTRACTED",
          sourceLocator: fact.pageNumber ? { pageNumber: fact.pageNumber } : undefined,
        },
        confidence: fact.extractionConfidenceBand === "HIGH" ? 0.9 : fact.extractionConfidenceBand === "MEDIUM" ? 0.72 : 0.5,
        confidenceBand: (fact.extractionConfidenceBand as ConfidenceBand) || "HIGH",
        reviewStatus: fact.reviewStatus as ReviewStatus,
        metadata: {
          fieldKey: fact.fieldKey,
          rawValue: fact.rawValue,
          normalizedValue: fact.normalizedValue,
          sourceExcerpt: fact.sourceExcerpt,
          pageNumber: fact.pageNumber,
        },
      });

      attributeObservations.push({
        nodeId: factNodeId,
        party: evParty === "BUYER" ? "BUYER" : "SELLER",
        role:
          fact.fieldKey.toLowerCase().includes("order") || fact.fieldKey.toLowerCase().includes("invoice") || fact.fieldKey.toLowerCase().includes("spec")
            ? "ORDER_SPEC"
            : evParty === "BUYER"
            ? "BUYER_OBSERVATION"
            : "SELLER_EVIDENCE",
        sourceOrigin: "AI_EXTRACTED",
        verificationState: fact.reviewStatus === "CONFIRMED" ? "VERIFIED" : "INFERRED",
        text: `${fact.fieldKey} ${fact.normalizedValue || fact.rawValue} ${fact.sourceExcerpt || ""}`,
        attributes: {
          capacityToken: factTokens.capacityToken,
          modelToken: factTokens.modelToken,
          quantity: factTokens.quantity,
          deliveryState: factTokens.deliveryMention,
        },
      });

      // Edge: Fact -> Evidence (EXTRACTED_FROM)
      edges.push({
        id: `edge:fact->evidence:${fact.id}`,
        source: factNodeId,
        target: `evidence:${fact.evidenceId}`,
        type: "EXTRACTED_FROM",
        begType: "EXTRACTED_FROM",
        label: "EXTRACTED_FROM",
        verificationState: fact.reviewStatus === "CONFIRMED" ? "VERIFIED" : "INFERRED",
        sourceOrigin: "AI_EXTRACTED",
        confidenceBand: (fact.extractionConfidenceBand as ConfidenceBand) || "HIGH",
        provenance: "AI_INFERRED",
        supportingEvidenceIds: [fact.evidenceId],
      });
    }

    // --- EDGES: Fact Relations (RELATES_TO_FACT) ---
    for (const fr of factRelations) {
      edges.push({
        id: `edge:fact_rel:${fr.id}`,
        source: `fact:${fr.sourceFactId}`,
        target: `fact:${fr.targetFactId}`,
        type: "RELATES_TO_FACT",
        label: fr.relationType,
        explanation: fr.explanation,
        confidenceBand: fr.confidenceBand as ConfidenceBand,
        reviewStatus: fr.reviewStatus as ReviewStatus,
        provenance: fr.reviewedById ? "HUMAN_ASSERTED" : "AI_INFERRED",
      });
    }

    // --- EDGES: Fact-to-Claim Assessments (ASSESSES_CLAIM) ---
    for (const fca of factClaimAssessments) {
      edges.push({
        id: `edge:fca:${fca.id}`,
        source: `fact:${fca.extractedFactId}`,
        target: `claim:${fca.claimId}`,
        type: "ASSESSES_CLAIM",
        label: fca.relationshipType,
        explanation: fca.explanation,
        reviewStatus: fca.reviewStatus as ReviewStatus,
        provenance: "AI_INFERRED",
      });
    }

    // --- NODES: BERR Findings ---
    for (const finding of findings) {
      const findingNodeId = `finding:${finding.id}`;
      nodes.push({
        id: findingNodeId,
        type: "FINDING",
        label: finding.title,
        sublabel: `${finding.findingType} (${finding.outcome})`,
        party: "NEUTRAL",
        status: finding.reviewStatus,
        reviewStatus: finding.reviewStatus as ReviewStatus,
        timestamp: finding.createdAt.toISOString(),
        metadata: {
          findingType: finding.findingType,
          outcome: finding.outcome,
          severity: finding.severity,
          explanation: finding.explanation,
          recommendedNextStep: finding.recommendedNextStep,
        },
      });
    }

    // --- EDGES: Finding Evidence Links & Fact Links ---
    for (const fe of findingEvidence) {
      const findingNodeId = `finding:${fe.findingId}`;
      const evidenceNodeId = `evidence:${fe.evidenceId}`;
      edges.push({
        id: `edge:fe:${fe.id}`,
        source: findingNodeId,
        target: evidenceNodeId,
        type: "CITES_EVIDENCE",
        label: fe.relationRole,
        provenance: "AI_INFERRED",
      });

      // Link to facts from that evidence
      const evFacts = facts.filter((f) => f.evidenceId === fe.evidenceId);
      for (const ef of evFacts) {
        edges.push({
          id: `edge:finding_fact:${fe.findingId}_${ef.id}`,
          source: findingNodeId,
          target: `fact:${ef.id}`,
          type: "CITES_FACT",
          label: "CITES",
          provenance: "AI_INFERRED",
        });
      }
    }

    // --- NODES: Timeline Events ---
    for (const te of timelineEvents) {
      const timelineNodeId = `event:${te.id}`;
      nodes.push({
        id: timelineNodeId,
        type: "TIMELINE_EVENT",
        label: te.title,
        sublabel: te.eventType,
        party: "SYSTEM",
        timestamp: (te.occurredAt || te.recordedAt).toISOString(),
        metadata: {
          eventType: te.eventType,
          occurredAt: te.occurredAt?.toISOString() || null,
          recordedAt: te.recordedAt.toISOString(),
          sourceTimestamp: te.sourceTimestamp,
          timePrecision: te.timePrecision,
          timeBasis: te.timeBasis,
          description: te.description,
        },
      });

      // Edges: Link to Evidence or Claim if present, or to Case
      if (te.evidenceId) {
        edges.push({
          id: `edge:ev->event:${te.id}`,
          source: `evidence:${te.evidenceId}`,
          target: timelineNodeId,
          type: "CORRESPONDS_TO_EVENT",
          label: "RECORDED_IN",
          provenance: "SYSTEM_AUDIT",
        });
      }
      if (te.claimId) {
        edges.push({
          id: `edge:claim->event:${te.id}`,
          source: `claim:${te.claimId}`,
          target: timelineNodeId,
          type: "CORRESPONDS_TO_EVENT",
          label: "ASSERTED_IN",
          provenance: "SYSTEM_AUDIT",
        });
      }
      if (!te.evidenceId && !te.claimId) {
        edges.push({
          id: `edge:case->event:${te.id}`,
          source: `case:${actualCaseId}`,
          target: timelineNodeId,
          type: "CORRESPONDS_TO_EVENT",
          label: "OCCURRED_IN",
          provenance: "SYSTEM_AUDIT",
        });
      }
    }

    // --- NODES: Resolution Proposals ---
    for (const prop of resolutionProposals) {
      const proposalNodeId = `proposal:${prop.id}`;
      nodes.push({
        id: proposalNodeId,
        type: "RESOLUTION_PROPOSAL",
        label: `${prop.proposalType}: ${prop.title}`,
        sublabel: `Status: ${prop.status}`,
        party: "NEUTRAL",
        status: prop.status,
        timestamp: prop.createdAt.toISOString(),
        metadata: {
          proposalType: prop.proposalType,
          amountMinor: prop.amountMinor,
          currency: prop.currency,
          reason: prop.reason,
          policyVersion: prop.policyVersion,
          responses: prop.responses.map((r) => ({
            id: r.id,
            responderId: r.responderId,
            response: r.response,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      });

      // Grounding Edges to findings
      const relevantFindings = prop.basedOnAnalysisRunId
        ? findings.filter((f) => f.analysisRunId === prop.basedOnAnalysisRunId).slice(0, 8)
        : findings.slice(0, 8);
      for (const finding of relevantFindings) {
        edges.push({
          id: `edge:proposal->finding:${prop.id}_${finding.id}`,
          source: proposalNodeId,
          target: `finding:${finding.id}`,
          type: "GROUNDED_IN_FINDING",
          label: "GROUNDED_IN",
          provenance: "RULE",
        });
      }

      // Resolves claims
      for (const claim of caseRecord.claims) {
        edges.push({
          id: `edge:proposal->claim:${prop.id}_${claim.id}`,
          source: proposalNodeId,
          target: `claim:${claim.id}`,
          type: "RESOLVES_CLAIM",
          label: "RESOLVES",
          provenance: "RULE",
        });
      }
    }

    // --- Version 2.0 Nodes & Edges ---
    if (purchaseMemory) {
      const pmNodeId = `purchase:${purchaseMemory.id}`;
      nodes.push({
        id: pmNodeId,
        type: "PURCHASE_MEMORY",
        label: purchaseMemory.listingTitle,
        sublabel: `Order #${purchaseMemory.externalOrderId}`,
        party: "BUYER",
        timestamp: purchaseMemory.purchaseDate.toISOString(),
        metadata: {
          marketplace: purchaseMemory.marketplace,
          priceMinor: purchaseMemory.priceMinor,
          specs: purchaseMemory.specifications,
        },
      });
      edges.push({
        id: `edge:case->pm:${actualCaseId}`,
        source: `case:${actualCaseId}`,
        target: pmNodeId,
        type: "PROMISES_SPEC",
        label: "PROMISES_SPEC",
        provenance: "SYSTEM_AUDIT",
      });
    }

    if (packagePassport) {
      const pkgNodeId = `package:${packagePassport.id}`;
      nodes.push({
        id: pkgNodeId,
        type: "PACKAGE_PASSPORT",
        label: packagePassport.packageNumber,
        sublabel: `Status: ${packagePassport.status}`,
        party: "MERCHANT",
        status: packagePassport.status,
        timestamp: packagePassport.createdAt.toISOString(),
        metadata: {
          trackingNumber: packagePassport.trackingNumber,
          carrier: packagePassport.carrierName,
          items: packagePassport.items,
        },
      });
      edges.push({
        id: `edge:case->pkg:${actualCaseId}`,
        source: `case:${actualCaseId}`,
        target: pkgNodeId,
        type: "PACKED_IN",
        label: "PACKED_IN",
        provenance: "SYSTEM_AUDIT",
      });

      for (const seal of packagePassport.seals) {
        const sealNodeId = `seal:${seal.id}`;
        nodes.push({
          id: sealNodeId,
          type: "PACKAGE_SEAL",
          label: seal.sealNumber,
          sublabel: seal.sealType,
          party: "MERCHANT",
          status: seal.verificationStatus,
          timestamp: seal.appliedAt.toISOString(),
          metadata: { sealType: seal.sealType, status: seal.verificationStatus },
        });
        edges.push({
          id: `edge:pkg->seal:${packagePassport.id}_${seal.id}`,
          source: pkgNodeId,
          target: sealNodeId,
          type: "SEALED_WITH",
          label: "SEALED_WITH",
          provenance: "SYSTEM_AUDIT",
        });
      }
    }

    for (const session of cameraSessions) {
      const sessNodeId = `session:${session.id}`;
      nodes.push({
        id: sessNodeId,
        type: "CAMERA_SESSION",
        label: `Unboxing (${session.sessionToken.slice(0, 8)})`,
        sublabel: session.captureMode,
        party: "BUYER",
        status: session.status,
        timestamp: session.createdAt.toISOString(),
        metadata: { captureMode: session.captureMode, status: session.status },
      });
      edges.push({
        id: `edge:case->sess:${actualCaseId}_${session.id}`,
        source: `case:${actualCaseId}`,
        target: sessNodeId,
        type: "UNBOXED_IN_SESSION",
        label: "UNBOXED_IN_SESSION",
        provenance: "SYSTEM_AUDIT",
      });
    }

    // --- Hackathon Expansion: Payment & Reconciliation Graph Network ---
    for (const ctx of canonicalTransactions) {
      const txNodeId = `tx:${ctx.id}`;
      nodes.push({
        id: txNodeId,
        type: "CANONICAL_TRANSACTION",
        label: `${ctx.provider} Transaction`,
        sublabel: `${ctx.currency} ${(ctx.grossAmountMinor / 100).toFixed(2)} [${ctx.normalizedStatus}]`,
        party: "NEUTRAL",
        status: ctx.normalizedStatus,
        timestamp: ctx.transactionTimestamp.toISOString(),
        metadata: {
          provider: ctx.provider,
          externalReference: ctx.externalReference,
          providerTxId: ctx.providerTxId,
          grossAmountMinor: ctx.grossAmountMinor,
          reconciliationState: ctx.reconciliationState,
        },
      });

      edges.push({
        id: `edge:case->tx:${actualCaseId}_${ctx.id}`,
        source: `case:${actualCaseId}`,
        target: txNodeId,
        type: "PROCESSED_THROUGH",
        label: "PROCESSED_THROUGH",
        provenance: "SYSTEM_AUDIT",
      });
    }

    for (const src of sourceRecords) {
      const srcNodeId = `src:${src.id}`;
      nodes.push({
        id: srcNodeId,
        type: "TRANSACTION_SOURCE",
        label: `${src.sourceName} Record`,
        sublabel: `${src.currency} ${(src.amountMinor / 100).toFixed(2)} [${src.reportedStatus}]`,
        party: src.sourceType.includes("MERCHANT") ? "MERCHANT" : "BUYER",
        status: src.reportedStatus,
        timestamp: src.reportedAt.toISOString(),
        metadata: {
          referenceId: src.referenceId,
          sourceType: src.sourceType,
          confidence: src.confidence,
        },
      });

      if (src.canonicalTransactionId) {
        edges.push({
          id: `edge:tx->src:${src.canonicalTransactionId}_${src.id}`,
          source: `tx:${src.canonicalTransactionId}`,
          target: srcNodeId,
          type: "RECONCILED_FROM",
          label: "RECONCILED_FROM",
          provenance: "RULE",
        });
      }
    }

    for (const mis of mismatches) {
      const misNodeId = `mismatch:${mis.id}`;
      nodes.push({
        id: misNodeId,
        type: "RECONCILIATION_MISMATCH",
        label: mis.mismatchType.replace(/_/g, " "),
        sublabel: `Severity: ${mis.severity}`,
        party: "NEUTRAL",
        status: mis.status,
        timestamp: mis.createdAt.toISOString(),
        metadata: {
          severity: mis.severity,
          suggestedAction: mis.suggestedAction,
          description: mis.description,
        },
      });

      if (mis.canonicalTransactionId) {
        edges.push({
          id: `edge:mis->tx:${mis.id}_${mis.canonicalTransactionId}`,
          source: misNodeId,
          target: `tx:${mis.canonicalTransactionId}`,
          type: "CONTRADICTED_BY",
          label: "CONTRADICTS",
          provenance: "RULE",
        });
      }
    }

    if (paymentIncident && paymentIncident.findings) {
      for (const find of paymentIncident.findings) {
        const findNodeId = `finding:${find.id}`;
        nodes.push({
          id: findNodeId,
          type: "INCIDENT_FINDING",
          label: find.findingTitle,
          sublabel: `[${find.findingType}]`,
          party: "NEUTRAL",
          timestamp: find.createdAt.toISOString(),
          metadata: {
            confidence: find.confidence,
            findingType: find.findingType,
            description: find.description,
          },
        });

        edges.push({
          id: `edge:find->case:${find.id}_${actualCaseId}`,
          source: findNodeId,
          target: `case:${actualCaseId}`,
          type: "EXPLAINS_INCIDENT",
          label: "EXPLAINS_INCIDENT",
          provenance: "RULE",
        });
      }
    }

    // --- PayPal Payment Provider & Financial Operations Graph ---
    if (paypalPayments.length > 0) {
      const paypalProviderNodeId = "provider:paypal";
      nodes.push({
        id: paypalProviderNodeId,
        type: "PAYMENT_PROVIDER",
        label: "PayPal Gateway",
        sublabel: "PayPal Sandbox (REST APIs)",
        party: "SYSTEM",
        status: "ACTIVE",
        confidence: 1.0,
        verificationState: "VERIFIED",
        metadata: {
          environment: process.env.PAYPAL_ENV || "sandbox",
          network: "PayPal Commerce Platform",
        },
      });

      for (const pay of paypalPayments) {
        if (pay.captureId) {
          const captureNodeId = `capture:${pay.captureId}`;
          nodes.push({
            id: captureNodeId,
            type: "PAYPAL_CAPTURE",
            label: `Capture ${pay.captureId.slice(0, 14)}...`,
            sublabel: `${pay.currency} ${(pay.amountMinor / 100).toFixed(2)} [${pay.paymentStatus}]`,
            party: "NEUTRAL",
            status: pay.paymentStatus,
            confidence: 1.0,
            verificationState: "VERIFIED",
            timestamp: (pay.capturedAt || pay.createdAt).toISOString(),
            metadata: {
              captureId: pay.captureId,
              orderId: pay.providerOrderId,
              amountMinor: pay.amountMinor,
              currency: pay.currency,
              status: pay.paymentStatus,
            },
          });

          // Edge: Capture -> Provider (PROCESSED_THROUGH)
          edges.push({
            id: `edge:capture->provider:${pay.captureId}`,
            source: captureNodeId,
            target: paypalProviderNodeId,
            type: "PROCESSED_THROUGH",
            label: "PROCESSED_THROUGH",
            verificationState: "VERIFIED",
            provenance: "SYSTEM_AUDIT",
          });

          // Edge: Capture -> Case (BELONGS_TO_ORDER)
          edges.push({
            id: `edge:capture->case:${pay.captureId}_${actualCaseId}`,
            source: captureNodeId,
            target: `case:${actualCaseId}`,
            type: "BELONGS_TO_ORDER",
            label: "BELONGS_TO_ORDER",
            verificationState: "VERIFIED",
            provenance: "SYSTEM_AUDIT",
          });

          // Refunds
          for (const ref of pay.refunds) {
            const refundNodeId = `refund:${ref.id}`;
            nodes.push({
              id: refundNodeId,
              type: "PAYPAL_REFUND",
              label: `Refund ${ref.paypalRefundId ? ref.paypalRefundId.slice(0, 14) + '...' : ref.refundRequestId}`,
              sublabel: `${ref.currency} ${(ref.amountMinor / 100).toFixed(2)} [${ref.status}]`,
              party: "MERCHANT",
              status: ref.status,
              confidence: 1.0,
              verificationState: "VERIFIED",
              timestamp: (ref.completedAt || ref.createdAt).toISOString(),
              metadata: {
                refundId: ref.paypalRefundId,
                amountMinor: ref.amountMinor,
                reason: ref.reason,
                status: ref.status,
              },
            });

            // Edge: Refund -> Capture (REFUNDED_BY)
            edges.push({
              id: `edge:refund->capture:${ref.id}_${pay.captureId}`,
              source: refundNodeId,
              target: captureNodeId,
              type: "REFUNDED_BY",
              label: "REFUNDED_BY",
              verificationState: "VERIFIED",
              provenance: "SYSTEM_AUDIT",
            });
          }

          // Disputes
          for (const disp of pay.disputes) {
            const disputeNodeId = `dispute:${disp.id}`;
            nodes.push({
              id: disputeNodeId,
              type: "PAYPAL_DISPUTE",
              label: `Dispute ${disp.paypalDisputeId}`,
              sublabel: `${disp.currency} ${(disp.disputeAmountMinor / 100).toFixed(2)} [${disp.paypalStatus}]`,
              party: "BUYER",
              status: disp.paypalStatus,
              verificationState: "CONTESTED",
              timestamp: disp.createdAt.toISOString(),
              metadata: {
                disputeId: disp.paypalDisputeId,
                reason: disp.disputeReason,
                lifecycleStage: disp.lifecycleStage,
              },
            });

            // Edge: Dispute -> Capture (CONTRADICTED_BY)
            edges.push({
              id: `edge:dispute->capture:${disp.id}_${pay.captureId}`,
              source: disputeNodeId,
              target: captureNodeId,
              type: "CONTRADICTED_BY",
              label: "CONTESTED_BY",
              verificationState: "CONTESTED",
              provenance: "SYSTEM_AUDIT",
            });
          }
        }
      }
    }

    // --- NODES & EDGES: Orders, Products, Specifications & Payments (only from persisted data) ---
    const nodeIds = new Set(nodes.map((n) => n.id));
    const addedOrderNumbers = new Set<string>();
    const addedMarketplaces = new Set<string>();
    const addedLogistics = new Set<string>();

    // Helper for adding verified Order/Product/Spec nodes
    const ensureOrderAndProductNodes = (params: {
      orderKey: string;
      orderNumber: string;
      productName?: string | null;
      sku?: string | null;
      amountMinor?: number | null;
      currency?: string | null;
      sourceOrigin: EvidenceSourceOrigin;
      verificationState: BegVerificationState;
      sourceEntityType: string;
      sourceEntityId: string;
      marketplace?: string | null;
      timestamp?: string;
    }) => {
      const ordKeyNorm = params.orderKey.trim();
      if (!ordKeyNorm) return;
      const orderNodeId = `order:${ordKeyNorm}`;
      if (!nodeIds.has(orderNodeId)) {
        nodeIds.add(orderNodeId);
        addedOrderNumbers.add(params.orderNumber.toUpperCase());
        nodes.push({
          id: orderNodeId,
          type: "ORDER",
          begType: "ORDER",
          sourceEntityType: params.sourceEntityType,
          sourceEntityId: params.sourceEntityId,
          label: `Order ${params.orderNumber}`,
          sublabel: `${params.amountMinor ? `${params.currency || caseRecord.currency} ${(params.amountMinor / 100).toFixed(2)}` : "Order Reference"} • ${params.sourceOrigin}`,
          party: "NEUTRAL",
          swimlane: "SHARED",
          sourceOrigin: params.sourceOrigin,
          verificationState: params.verificationState,
          timestamp: params.timestamp || caseRecord.createdAt.toISOString(),
          metadata: {
            orderNumber: params.orderNumber,
            amountMinor: params.amountMinor ?? null,
            currency: params.currency || caseRecord.currency,
            marketplace: params.marketplace || null,
          },
        });
        edges.push({
          id: `edge:case->order:${ordKeyNorm}`,
          source: `case:${actualCaseId}`,
          target: orderNodeId,
          type: "RELATES_TO_ORDER",
          begType: "RELATES_TO_ORDER",
          label: "RELATES_TO_ORDER",
          verificationState: params.verificationState,
          sourceOrigin: params.sourceOrigin,
          provenance: params.verificationState === "VERIFIED" ? "SYSTEM_AUDIT" : "BUYER_SUBMITTED",
        });

        matchableRecords.push({
          nodeId: orderNodeId,
          party: "SYSTEM",
          sourceOrigin: params.sourceOrigin,
          label: `Order ${params.orderNumber}`,
          complaintId: actualCaseId,
          caseNumber: caseRecord.caseNumber,
          orderId: params.orderNumber,
          marketplace: params.marketplace || null,
          sku: params.sku || null,
          amountMinor: params.amountMinor ?? null,
          currency: params.currency || caseRecord.currency,
          timestampIso: params.timestamp || caseRecord.createdAt.toISOString(),
          productTitle: params.productName || null,
        });
      }

      if (params.productName) {
        const prodSlug = params.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48);
        const prodNodeId = `product:${ordKeyNorm}:${prodSlug}`;
        if (!nodeIds.has(prodNodeId)) {
          nodeIds.add(prodNodeId);
          nodes.push({
            id: prodNodeId,
            type: "PRODUCT",
            begType: "PRODUCT",
            sourceEntityType: params.sourceEntityType,
            sourceEntityId: params.sourceEntityId,
            label: params.productName,
            sublabel: params.sku ? `SKU: ${params.sku}` : "Ordered Product",
            party: "NEUTRAL",
            swimlane: "SHARED",
            sourceOrigin: params.sourceOrigin,
            verificationState: params.verificationState,
            metadata: {
              productName: params.productName,
              sku: params.sku || null,
              orderNumber: params.orderNumber,
            },
          });
          edges.push({
            id: `edge:order->prod:${ordKeyNorm}:${prodSlug}`,
            source: orderNodeId,
            target: prodNodeId,
            type: "DESCRIBES_PRODUCT",
            begType: "DESCRIBES_PRODUCT",
            label: "ORDERED_PRODUCT",
            verificationState: params.verificationState,
            sourceOrigin: params.sourceOrigin,
            provenance: params.verificationState === "VERIFIED" ? "SYSTEM_AUDIT" : "RULE",
          });
        }

        const specTokens = extractAttributeTokens(`${params.productName} ${params.sku || ""}`);
        if (specTokens.capacityToken || specTokens.modelToken || params.sku) {
          const specNodeId = `spec:${ordKeyNorm}:${prodSlug}`;
          if (!nodeIds.has(specNodeId)) {
            nodeIds.add(specNodeId);
            const specLabel = [specTokens.capacityToken, specTokens.modelToken || params.sku].filter(Boolean).join(" • ");
            nodes.push({
              id: specNodeId,
              type: "PRODUCT_SPECIFICATION",
              begType: "PRODUCT_SPECIFICATION",
              sourceEntityType: params.sourceEntityType,
              sourceEntityId: params.sourceEntityId,
              label: `Spec: ${specLabel || params.productName}`,
              sublabel: `Expected Order Specification (${params.sourceOrigin})`,
              party: "NEUTRAL",
              swimlane: "SHARED",
              sourceOrigin: params.sourceOrigin,
              verificationState: params.verificationState,
              metadata: {
                capacityToken: specTokens.capacityToken,
                modelToken: specTokens.modelToken,
                sku: params.sku || null,
              },
            });
            edges.push({
              id: `edge:order->spec:${ordKeyNorm}:${prodSlug}`,
              source: orderNodeId,
              target: specNodeId,
              type: "SPECIFIES",
              begType: "SPECIFIES",
              label: "PROMISED_SPEC",
              verificationState: params.verificationState,
              sourceOrigin: params.sourceOrigin,
              provenance: params.verificationState === "VERIFIED" ? "SYSTEM_AUDIT" : "RULE",
            });
            attributeObservations.push({
              nodeId: specNodeId,
              party: "SHARED",
              role: "ORDER_SPEC",
              sourceOrigin: params.sourceOrigin,
              verificationState: params.verificationState,
              text: `${params.productName} ${params.sku || ""}`,
              attributes: {
                capacityToken: specTokens.capacityToken,
                modelToken: specTokens.modelToken,
                sku: params.sku || null,
              },
            });
          }
        }
      }
    };

    for (const co of commerceOrders) {
      const firstItem = co.items[0];
      ensureOrderAndProductNodes({
        orderKey: co.id,
        orderNumber: co.orderNumber,
        productName: firstItem?.title || parsedComplaint.productName || null,
        sku: firstItem?.sku || null,
        amountMinor: co.totalAmountMinor,
        currency: co.currency,
        sourceOrigin: "SYSTEM_GENERATED",
        verificationState: "VERIFIED",
        sourceEntityType: "CommerceOrder",
        sourceEntityId: co.id,
        marketplace: parsedComplaint.marketplace || null,
        timestamp: co.createdAt.toISOString(),
      });
      for (const pay of co.payments) {
        const payNodeId = `payment:${pay.id}`;
        if (!nodeIds.has(payNodeId)) {
          nodeIds.add(payNodeId);
          nodes.push({
            id: payNodeId,
            type: "PAYMENT_RECORD",
            begType: "PAYMENT_RECORD",
            sourceEntityType: "PayPalPayment",
            sourceEntityId: pay.id,
            label: `Payment ${pay.currency} ${(pay.amountMinor / 100).toFixed(2)}`,
            sublabel: `${pay.paymentStatus} • PayPal`,
            party: "SYSTEM",
            swimlane: "SHARED",
            sourceOrigin: "INDEPENDENTLY_VERIFIED",
            verificationState: pay.paymentStatus === "COMPLETED" || pay.paymentStatus === "CAPTURED" ? "VERIFIED" : "SOURCE_SUPPORTED",
            timestamp: pay.createdAt.toISOString(),
            metadata: {
              paypalOrderId: pay.providerOrderId,
              captureId: pay.captureId,
              amountMinor: pay.amountMinor,
              currency: pay.currency,
              status: pay.paymentStatus,
            },
          });
          edges.push({
            id: `edge:pay->order:${pay.id}`,
            source: payNodeId,
            target: `order:${co.id}`,
            type: "RELATES_TO_ORDER",
            begType: "RELATES_TO_ORDER",
            label: "PAID_FOR_ORDER",
            verificationState: "VERIFIED",
            sourceOrigin: "INDEPENDENTLY_VERIFIED",
            provenance: "SYSTEM_AUDIT",
          });
          attributeObservations.push({
            nodeId: payNodeId,
            party: "SHARED",
            role: "PAYMENT",
            sourceOrigin: "INDEPENDENTLY_VERIFIED",
            verificationState: "VERIFIED",
            text: `Payment ${pay.amountMinor} ${pay.currency}`,
            attributes: { amountMinor: pay.amountMinor, currency: pay.currency },
          });
        }
      }
    }

    // If no CommerceOrder row exists yet, create ORDER node ONLY if explicit Order ID was recorded
    const extractedOrderId =
      parsedComplaint.orderId ||
      purchaseMemory?.externalOrderId ||
      matchableRecords.find((r) => r.orderId)?.orderId ||
      null;
    const extractedProductName =
      parsedComplaint.productName ||
      purchaseMemory?.listingTitle ||
      matchableRecords.find((r) => r.productTitle)?.productTitle ||
      null;
    if (commerceOrders.length === 0 && extractedOrderId) {
      ensureOrderAndProductNodes({
        orderKey: extractedOrderId.toUpperCase(),
        orderNumber: extractedOrderId,
        productName: extractedProductName,
        sku: parsedComplaint.sku || matchableRecords.find((r) => r.sku)?.sku || null,
        amountMinor: caseRecord.amountMinor,
        currency: caseRecord.currency,
        sourceOrigin: "BUYER_SUBMITTED",
        verificationState: "SOURCE_SUPPORTED",
        sourceEntityType: purchaseMemory ? "PurchaseMemory" : "CaseRecord",
        sourceEntityId: purchaseMemory?.id || actualCaseId,
        marketplace: parsedComplaint.marketplace || purchaseMemory?.marketplace || null,
      });
    }

    // Also add marketplace node if present on PurchaseMemory or structured complaint even before seller match
    const caseMarketplace =
      sellerMatches.find((s) => s.extractedMarketplace)?.extractedMarketplace ||
      parsedComplaint.marketplace ||
      purchaseMemory?.marketplace ||
      null;
    if (caseMarketplace && caseMarketplace.toUpperCase() !== "DIRECT") {
      const mktNorm = caseMarketplace.toUpperCase();
      const mktNodeId = `marketplace:${mktNorm}`;
      if (!addedMarketplaces.has(mktNodeId) && !nodeIds.has(mktNodeId)) {
        addedMarketplaces.add(mktNodeId);
        nodeIds.add(mktNodeId);
        nodes.push({
          id: mktNodeId,
          type: "MARKETPLACE",
          begType: "MARKETPLACE",
          sourceEntityType: "Marketplace",
          sourceEntityId: mktNorm,
          label: caseMarketplace,
          sublabel: "Marketplace Intermediary (Distinct from Actual Seller)",
          party: "MARKETPLACE",
          swimlane: "SHARED",
          sourceOrigin: "BUYER_SUBMITTED",
          verificationState: "SOURCE_SUPPORTED",
          metadata: { marketplace: mktNorm },
        });
        edges.push({
          id: `edge:case->mkt:root:${mktNorm}`,
          source: `case:${actualCaseId}`,
          target: mktNodeId,
          type: "PURCHASED_THROUGH",
          begType: "PURCHASED_THROUGH",
          label: "PURCHASED_THROUGH",
          verificationState: "SOURCE_SUPPORTED",
          sourceOrigin: "BUYER_SUBMITTED",
          provenance: "BUYER_SUBMITTED",
        });
      }
    }

    // --- NODES & EDGES: Seller Identity, Ambiguity Handling, Marketplace, Outreach & Responses ---
    for (const sm of sellerMatches) {
      const sellerLabel =
        sm.matchedSeller?.legalName ||
        sm.extractedLegalName ||
        sm.extractedDisplayName ||
        "Unidentified Seller";
      const sellerNodeId = `seller:${sm.id}`;
      const isVerifiedMatch =
        (sm.matchOutcome === "VERIFIED_MATCH" &&
          sm.matchedSeller?.verificationStatus === "VERIFIED") ||
        Boolean(sm.reviewedAt && sm.matchOutcome === "VERIFIED_MATCH");

      nodes.push({
        id: sellerNodeId,
        type: "SELLER_IDENTITY",
        begType: "SELLER",
        sourceEntityType: "SellerIdentityMatch",
        sourceEntityId: sm.id,
        label: sellerLabel,
        sublabel: `${sm.matchOutcome}${sm.extractedGstin ? ` • GSTIN ${sm.extractedGstin}` : ""}`,
        party: "SELLER",
        swimlane: "SELLER",
        sourceOrigin: isVerifiedMatch ? "INDEPENDENTLY_VERIFIED" : "AI_EXTRACTED",
        verificationState: isVerifiedMatch
          ? "VERIFIED"
          : sm.matchOutcome === "POSSIBLE_MATCH"
          ? "INFERRED"
          : "UNVERIFIED",
        reviewStatus: sm.reviewedAt ? "CONFIRMED" : "UNREVIEWED",
        timestamp: sm.createdAt.toISOString(),
        metadata: {
          matchedSellerId: sm.matchedSellerId,
          matchOutcome: sm.matchOutcome,
          confidence: sm.matchConfidence,
          gstin: sm.extractedGstin,
          marketplace: sm.extractedMarketplace,
          marketplaceSellerId: sm.extractedMarketplaceSellerId,
          requiresHumanReview: sm.requiresHumanReview,
          screeningGateStatus: sm.screeningGateStatus,
        },
      });
      nodeIds.add(sellerNodeId);

      // Source provenance edge: Purchase document (if present) or Case -> SellerIdentity
      const sourceTarget =
        sm.sourceEvidenceId && nodeIds.has(`evidence:${sm.sourceEvidenceId}`)
          ? `evidence:${sm.sourceEvidenceId}`
          : `case:${actualCaseId}`;

      edges.push({
        id: `edge:src->seller:${sm.id}`,
        source: sourceTarget,
        target: sellerNodeId,
        type: "IDENTIFIES_SELLER",
        begType: "SOLD_BY",
        label: isVerifiedMatch ? "MATCHED_VERIFIED_SELLER" : "EXTRACTED_SELLER_IDENTITY",
        verificationState: isVerifiedMatch ? "VERIFIED" : "INFERRED",
        sourceOrigin: isVerifiedMatch ? "INDEPENDENTLY_VERIFIED" : "AI_EXTRACTED",
        provenance: isVerifiedMatch ? "SYSTEM_AUDIT" : "AI_INFERRED",
        confidence: sm.matchConfidence,
        matchMethod: sm.extractedGstin ? "VERIFIED_GSTIN" : "AI_ENTITY_EXTRACTION",
        supportingEvidenceIds: sm.sourceEvidenceId ? [sm.sourceEvidenceId] : undefined,
      });

      // Preserve ambiguity ONLY if no seller is matched yet and fuzzy search yields multiple distinct sellers
      if (!isVerifiedMatch && !sm.matchedSellerId && (sm.extractedDisplayName || sm.extractedLegalName)) {
        const dirCandidates = matchSellerCandidates(
          {
            gstin: sm.extractedGstin,
            marketplace: sm.extractedMarketplace,
            marketplaceSellerId: sm.extractedMarketplaceSellerId,
            sellerName: sm.extractedLegalName || sm.extractedDisplayName,
          },
          sellerDirectoryEntries.map((s) => ({
            id: s.id,
            legalName: s.legalName,
            gstin: s.gstin,
            marketplaceAccounts: s.marketplaceAccounts
              .filter((acc) => Boolean(acc.marketplaceSellerId))
              .map((acc) => ({
                marketplace: acc.marketplace,
                marketplaceSellerId: acc.marketplaceSellerId as string,
              })),
          }))
        );
        if (dirCandidates.status === "AMBIGUOUS" && dirCandidates.matches.length > 1) {
          for (const cand of dirCandidates.matches) {
            const candNodeId = `seller_candidate:${sm.id}:${cand.seller.id}`;
            if (!nodeIds.has(candNodeId)) {
              nodeIds.add(candNodeId);
              nodes.push({
                id: candNodeId,
                type: "SELLER_IDENTITY",
                begType: "SELLER",
                sourceEntityType: "SellerDirectoryEntry",
                sourceEntityId: cand.seller.id,
                label: `${cand.seller.legalName} (Candidate)`,
                sublabel: `Ambiguous Match (${Math.round(cand.confidence * 100)}%)`,
                party: "SELLER",
                swimlane: "SELLER",
                sourceOrigin: "SYSTEM_GENERATED",
                verificationState: "INFERRED",
                discrepancyState: "REQUIRES_REVIEW",
                metadata: {
                  ambiguousCandidate: true,
                  sellerDirectoryId: cand.seller.id,
                  gstin: cand.seller.gstin,
                },
              });
              edges.push({
                id: `edge:seller_ambig:${sm.id}:${cand.seller.id}`,
                source: sellerNodeId,
                target: candNodeId,
                type: "MATCHED_WITH",
                begType: "MATCHED_WITH",
                label: "AMBIGUOUS_CANDIDATE",
                verificationState: "INFERRED",
                sourceOrigin: "SYSTEM_GENERATED",
                provenance: "RULE",
                matchMethod: "AMBIGUOUS_CANDIDATE",
                confidence: cand.confidence,
                explanation:
                  "Multiple candidate sellers share similar names; preserved as ambiguous until GSTIN/Seller ID confirmation.",
              });
            }
          }
        }
      }

      if (sm.extractedMarketplace && sm.extractedMarketplace !== "DIRECT") {
        const mktNorm = sm.extractedMarketplace.toUpperCase();
        const mktNodeId = `marketplace:${mktNorm}`;
        if (!addedMarketplaces.has(mktNodeId) && !nodeIds.has(mktNodeId)) {
          addedMarketplaces.add(mktNodeId);
          nodeIds.add(mktNodeId);
          nodes.push({
            id: mktNodeId,
            type: "MARKETPLACE",
            begType: "MARKETPLACE",
            label: sm.extractedMarketplace,
            sublabel: "Commerce Platform / Marketplace",
            party: "MARKETPLACE",
            swimlane: "SHARED",
            sourceOrigin: "MARKETPLACE_SOURCED",
            verificationState: "SOURCE_SUPPORTED",
            metadata: { marketplace: mktNorm },
          });
        }
        edges.push({
          id: `edge:case->mkt:${sm.id}`,
          source: `case:${actualCaseId}`,
          target: mktNodeId,
          type: "IDENTIFIES_SELLER",
          begType: "PURCHASED_THROUGH",
          label: "TRANSACTED_ON",
          verificationState: "SOURCE_SUPPORTED",
          sourceOrigin: "BUYER_SUBMITTED",
          provenance: "BUYER_SUBMITTED",
        });
      }
    }

    // Logistics Provider node from PackagePassport when real carrier data exists
    if (packagePassport?.carrierName) {
      const logKey = packagePassport.carrierName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
      const logNodeId = `logistics:${logKey}`;
      if (!addedLogistics.has(logNodeId) && !nodeIds.has(logNodeId)) {
        addedLogistics.add(logNodeId);
        nodeIds.add(logNodeId);
        nodes.push({
          id: logNodeId,
          type: "LOGISTICS_PROVIDER",
          begType: "LOGISTICS_PROVIDER",
          sourceEntityType: "PackagePassport",
          sourceEntityId: packagePassport.id,
          label: packagePassport.carrierName,
          sublabel: packagePassport.trackingNumber
            ? `Tracking: ${packagePassport.trackingNumber}`
            : "Logistics / Courier",
          party: "LOGISTICS",
          swimlane: "SHARED",
          sourceOrigin: "LOGISTICS_SOURCED",
          verificationState: packagePassport.trackingNumber ? "SOURCE_SUPPORTED" : "UNVERIFIED",
          metadata: {
            carrier: packagePassport.carrierName,
            trackingNumber: packagePassport.trackingNumber,
            courierEventStatus: packagePassport.status,
          },
        });
        if (nodeIds.has(`passport:${packagePassport.id}`)) {
          edges.push({
            id: `edge:passport->logistics:${packagePassport.id}`,
            source: `passport:${packagePassport.id}`,
            target: logNodeId,
            type: "DISPATCHED_THROUGH",
            begType: "DISPATCHED_THROUGH",
            label: "DISPATCHED_THROUGH",
            verificationState: "SOURCE_SUPPORTED",
            sourceOrigin: "LOGISTICS_SOURCED",
            provenance: "SYSTEM_AUDIT",
          });
        }
      }
    }

    for (const req of sellerRequests) {
      const reqNodeId = `seller_req:${req.id}`;
      nodes.push({
        id: reqNodeId,
        type: "SELLER_EVIDENCE_REQUEST",
        begType: "EVIDENCE_REQUEST",
        sourceEntityType: "SellerEvidenceRequest",
        sourceEntityId: req.id,
        label: `Request ${req.requestNumber}`,
        sublabel: `${req.deliveryChannel} • ${req.status}`,
        party: "NEUTRAL",
        swimlane: "SHARED",
        sourceOrigin: "SYSTEM_GENERATED",
        verificationState: "VERIFIED",
        status: req.status,
        timestamp: req.createdAt.toISOString(),
        metadata: {
          requestNumber: req.requestNumber,
          deliveryChannel: req.deliveryChannel,
          registrationStatus: req.registrationStatus,
          marketplace: req.marketplace,
          orderId: req.orderId,
          followUpCount: req.followUpCount,
          marketplaceSupportUrl: req.marketplaceSupportUrl,
          requestedItemsJson: req.requestedItemsJson,
        },
      });
      nodeIds.add(reqNodeId);

      edges.push({
        id: `edge:case->seller_req:${req.id}`,
        source: `case:${actualCaseId}`,
        target: reqNodeId,
        type: "SOLICITS_EVIDENCE",
        begType: "REQUESTED_FROM",
        label: "INITIATED_OUTREACH",
        verificationState: "VERIFIED",
        sourceOrigin: "SYSTEM_GENERATED",
        provenance: "SYSTEM_AUDIT",
      });

      if (req.sellerMatchId && nodeIds.has(`seller:${req.sellerMatchId}`)) {
        edges.push({
          id: `edge:req->seller:${req.id}`,
          source: reqNodeId,
          target: `seller:${req.sellerMatchId}`,
          type: "SOLICITS_EVIDENCE",
          begType: "REQUESTED_FROM",
          label: req.deliveryChannel === "SELLER_PORTAL" ? "PORTAL_TARGET" : "IDENTIFIED_RECIPIENT",
          verificationState: "SOURCE_SUPPORTED",
          sourceOrigin: "SYSTEM_GENERATED",
          provenance: "SYSTEM_AUDIT",
        });
      }

      for (const att of req.communicationAttempts) {
        const commNodeId = `comm:${att.id}`;
        nodes.push({
          id: commNodeId,
          type: "COMMUNICATION_EVENT",
          begType: att.executionStatus === "CUSTOMER_REPORTED_SUBMISSION" ? "BUYER_COMMUNICATION" : "INVESTIGATION_EVENT",
          sourceEntityType: "SellerCommunicationAttempt",
          sourceEntityId: att.id,
          label: `${att.actionType} (${att.executionStatus})`,
          sublabel: `Attempt #${att.attemptNumber} via ${att.channel}`,
          party: att.executionStatus === "CUSTOMER_REPORTED_SUBMISSION" ? "BUYER" : "SYSTEM",
          swimlane: att.executionStatus === "CUSTOMER_REPORTED_SUBMISSION" ? "BUYER" : "SHARED",
          sourceOrigin:
            att.executionStatus === "CUSTOMER_REPORTED_SUBMISSION"
              ? "BUYER_SUBMITTED"
              : "SYSTEM_GENERATED",
          verificationState:
            att.executionStatus === "SENT" || att.executionStatus === "DELIVERED"
              ? "VERIFIED"
              : "SOURCE_SUPPORTED",
          status: att.executionStatus,
          timestamp: att.executedAt.toISOString(),
          metadata: {
            channel: att.channel,
            eligibility: att.eligibility,
            executionStatus: att.executionStatus,
            failureReason: att.failureReason,
            externalReferenceId: att.externalReferenceId,
          },
        });
        nodeIds.add(commNodeId);

        edges.push({
          id: `edge:req->comm:${att.id}`,
          source: reqNodeId,
          target: commNodeId,
          type: "COMMUNICATES_VIA",
          begType: "INVESTIGATED_IN",
          label: att.executionStatus,
          verificationState: "SOURCE_SUPPORTED",
          sourceOrigin:
            att.executionStatus === "CUSTOMER_REPORTED_SUBMISSION"
              ? "BUYER_SUBMITTED"
              : "SYSTEM_GENERATED",
          provenance:
            att.executionStatus === "CUSTOMER_REPORTED_SUBMISSION"
              ? "BUYER_SUBMITTED"
              : "SYSTEM_AUDIT",
        });
      }

      for (const resp of req.responses) {
        const respNodeId = `seller_resp:${resp.id}`;
        const respVerifState: BegVerificationState =
          resp.verificationStatus === "VERIFIED"
            ? "SOURCE_SUPPORTED" // Declaration/response itself is source-supported unless corroborated independently
            : resp.verificationStatus === "SUSPICIOUS"
            ? "CONTESTED"
            : "UNVERIFIED";

        nodes.push({
          id: respNodeId,
          type: "SELLER_RESPONSE",
          begType: "EVIDENCE_RESPONSE",
          sourceEntityType: "SellerEvidenceResponse",
          sourceEntityId: resp.id,
          label: `Seller Response (${resp.stance})`,
          sublabel: `Verification: ${resp.verificationStatus} • ${resp.evidenceItems.length} file(s)`,
          party: "SELLER",
          swimlane: "SELLER",
          sourceOrigin: "SELLER_SUBMITTED",
          verificationState: respVerifState,
          status: resp.verificationStatus,
          timestamp: resp.submittedAt.toISOString(),
          metadata: {
            stance: resp.stance,
            summary: resp.summary,
            additionalRemarks: resp.additionalRemarks,
            verificationStatus: resp.verificationStatus,
            evidenceItemCount: resp.evidenceItems.length,
          },
        });
        nodeIds.add(respNodeId);

        // Explicit SELLER_DECLARATION node so seller assertions stay separate from independent verification
        const declNodeId = `seller_decl:${resp.id}`;
        const declText = `${resp.summary || ""} ${resp.additionalRemarks || ""}`.trim();
        if (declText) {
          nodeIds.add(declNodeId);
          const declTokens = extractAttributeTokens(declText);
          nodes.push({
            id: declNodeId,
            type: "SELLER_DECLARATION",
            begType: "SELLER_DECLARATION",
            sourceEntityType: "SellerEvidenceResponse",
            sourceEntityId: resp.id,
            label: `Seller Declaration: ${declText.slice(0, 52)}${declText.length > 52 ? "..." : ""}`,
            sublabel: `Stance: ${resp.stance} • Uncorroborated Assertion`,
            party: "SELLER",
            swimlane: "SELLER",
            sourceOrigin: "SELLER_SUBMITTED",
            verificationState: "SOURCE_SUPPORTED",
            timestamp: resp.submittedAt.toISOString(),
            metadata: {
              summary: resp.summary,
              additionalRemarks: resp.additionalRemarks,
              stance: resp.stance,
              responseId: resp.id,
            },
          });
          edges.push({
            id: `edge:decl->resp:${resp.id}`,
            source: declNodeId,
            target: respNodeId,
            type: "RESPONDED_TO",
            begType: "RESPONDED_TO",
            label: "STATES_DECLARATION",
            verificationState: "SOURCE_SUPPORTED",
            sourceOrigin: "SELLER_SUBMITTED",
            provenance: "SELLER_SUBMITTED",
          });
          attributeObservations.push({
            nodeId: declNodeId,
            party: "SELLER",
            role: "SELLER_DECLARATION",
            sourceOrigin: "SELLER_SUBMITTED",
            verificationState: "SOURCE_SUPPORTED",
            text: declText,
            attributes: {
              capacityToken: declTokens.capacityToken,
              modelToken: declTokens.modelToken,
              quantity: declTokens.quantity,
              deliveryState: declTokens.deliveryMention,
            },
          });
        }

        edges.push({
          id: `edge:resp->req:${resp.id}`,
          source: respNodeId,
          target: reqNodeId,
          type: "RESPONDS_TO_REQUEST",
          begType: "RESPONDED_TO",
          label: resp.stance,
          verificationState: respVerifState,
          sourceOrigin: "SELLER_SUBMITTED",
          provenance: "MERCHANT_SUBMITTED",
        });

        for (const item of resp.evidenceItems) {
          const evNodeId = `evidence:${item.evidenceId}`;
          if (nodeIds.has(evNodeId)) {
            edges.push({
              id: `edge:ev->resp:${item.id}`,
              source: evNodeId,
              target: respNodeId,
              type: "RESPONDS_TO_REQUEST",
              begType: "BELONGS_TO",
              label: item.requestedItemKey ? `ITEM_${item.requestedItemKey.toUpperCase()}` : "SELLER_ARTIFACT",
              verificationState: "SOURCE_SUPPORTED",
              sourceOrigin: "SELLER_SUBMITTED",
              provenance: "MERCHANT_SUBMITTED",
              supportingEvidenceIds: [item.evidenceId],
            });
          }
        }
      }
    }

    // --- DETERMINISTIC CROSS-PARTY EVIDENCE MATCHING (Part 5 Step 5) ---
    const boundedMatchables = matchableRecords.slice(0, 60);
    const matchedPairKeys = new Set<string>();
    for (let i = 0; i < boundedMatchables.length; i++) {
      for (let j = i + 1; j < boundedMatchables.length; j++) {
        const a = boundedMatchables[i];
        const b = boundedMatchables[j];
        if (a.party === b.party) continue; // Cross-party or system-to-party linking
        if (!nodeIds.has(a.nodeId) || !nodeIds.has(b.nodeId)) continue;
        const pairKey = a.nodeId < b.nodeId ? `${a.nodeId}::${b.nodeId}` : `${b.nodeId}::${a.nodeId}`;
        if (matchedPairKeys.has(pairKey)) continue;

        const matchRes = matchEvidenceRecords(a, b);
        if (matchRes.matched && matchRes.method !== "EXACT_COMPLAINT_ID") {
          const allowedSrcOk =
            a.nodeId.startsWith("evidence:") ||
            a.nodeId.startsWith("order:") ||
            a.nodeId.startsWith("seller:");
          const allowedTgtOk =
            b.nodeId.startsWith("evidence:") ||
            b.nodeId.startsWith("order:") ||
            b.nodeId.startsWith("seller:");
          if (allowedSrcOk && allowedTgtOk) {
            matchedPairKeys.add(pairKey);
            edges.push({
              id: `edge:match:${a.nodeId}->${b.nodeId}:${matchRes.method}`,
              source: a.nodeId,
              target: b.nodeId,
              type: "MATCHED_WITH",
              begType: "MATCHED_WITH",
              label: matchRes.method,
              verificationState: matchRes.verificationState,
              sourceOrigin: "SYSTEM_GENERATED",
              provenance: matchRes.verificationState === "INFERRED" ? "AI_INFERRED" : "RULE",
              confidence: matchRes.confidence,
              matchMethod: matchRes.method,
              explanation: matchRes.explanation,
            });
          }
        }
      }
    }

    // --- CONTRADICTION & DISCREPANCY ENGINE (Part 8) ---
    const discrepancies = evaluateAttributeDiscrepancies(attributeObservations);
    for (const d of discrepancies) {
      if (d.state !== "CONSISTENT") {
        const discNodeId = `contradiction:${d.key}`;
        if (!nodeIds.has(discNodeId)) {
          nodeIds.add(discNodeId);
          nodes.push({
            id: discNodeId,
            type: "CONTRADICTION_FINDING",
            begType: "CONTRADICTION_FINDING",
            sourceEntityType: "DiscrepancyDetector",
            sourceEntityId: d.key,
            label: `${d.state}: ${d.attribute}`,
            sublabel: d.summary.slice(0, 95),
            party: "SYSTEM",
            swimlane: "SHARED",
            sourceOrigin: "SYSTEM_GENERATED",
            verificationState: "CONTESTED",
            discrepancyState: d.state,
            metadata: {
              attribute: d.attribute,
              state: d.state,
              orderValue: d.orderValue,
              buyerValue: d.buyerValue,
              sellerValue: d.sellerValue,
              summary: d.summary,
              involvedNodeIds: d.involvedNodeIds,
            },
          });

          for (const invId of d.involvedNodeIds) {
            if (nodeIds.has(invId) && invId !== discNodeId) {
              const targetIsValid =
                invId.startsWith("claim:") ||
                invId.startsWith("fact:") ||
                invId.startsWith("spec:") ||
                invId.startsWith("evidence:") ||
                invId.startsWith("seller_decl:");
              if (targetIsValid) {
                edges.push({
                  id: `edge:disc:${d.key}->${invId}`,
                  source: discNodeId,
                  target: invId,
                  type: "CONTRADICTED_BY",
                  begType: "CONTRADICTS_CLAIM",
                  label: d.state === "CONTESTED" ? "CONTESTED_ATTRIBUTE" : "INCONSISTENT_ATTRIBUTE",
                  verificationState: "CONTESTED",
                  sourceOrigin: "SYSTEM_GENERATED",
                  provenance: "RULE",
                  explanation: d.summary,
                });
              }
            }
          }
        }
      }
    }

    // --- MISSING EVIDENCE GAP SYNTHESIS (Part 8) ---
    const missingGaps: MissingEvidenceGap[] = [];
    const hasBuyerInvoice = caseRecord.evidence.some(
      (e) =>
        e.uploadedById === caseRecord.buyerId &&
        (String(e.evidenceType) === "INVOICE" ||
          String(e.evidenceType) === "RECEIPT" ||
          e.filename.toLowerCase().includes("invoice") ||
          e.filename.toLowerCase().includes("order"))
    );
    if (!hasBuyerInvoice) {
      missingGaps.push({
        key: "missing_buyer_invoice",
        label: "Missing: Order Invoice / Purchase Record",
        party: "BUYER",
        reason: "No buyer invoice or verified purchase confirmation uploaded yet.",
        relatedNodeId: `case:${actualCaseId}`,
        severity: "HIGH",
      });
    }

    const sellerDeliveredPhoto = caseRecord.evidence.some(
      (e) =>
        e.uploadedById !== caseRecord.buyerId &&
        (e.evidenceType.includes("PACKING") || e.mimeType.startsWith("image/"))
    );
    if (sellerRequests.length > 0 && !sellerDeliveredPhoto) {
      missingGaps.push({
        key: "missing_seller_packing_photo",
        label: "Missing: Seller Packing Photo / Pre-Dispatch Image",
        party: "SELLER",
        reason: "Seller packing photo requested or expected for physical item/specification disputes has not been submitted.",
        relatedNodeId: `case:${actualCaseId}`,
        severity: "HIGH",
      });
    }

    const sellerDeliveredDispatch =
      Boolean(packagePassport?.trackingNumber) ||
      caseRecord.evidence.some(
        (e) =>
          e.uploadedById !== caseRecord.buyerId &&
          (String(e.evidenceType) === "TRACKING_INFO" ||
            e.filename.toLowerCase().includes("dispatch") ||
            e.filename.toLowerCase().includes("tracking"))
      );
    if (sellerRequests.length > 0 && !sellerDeliveredDispatch) {
      missingGaps.push({
        key: "missing_dispatch_record",
        label: "Missing: Courier Dispatch / PoD Record",
        party: "SELLER",
        reason: "Independent courier dispatch or signed Proof-of-Delivery record is not yet available.",
        relatedNodeId: `case:${actualCaseId}`,
        severity: "MEDIUM",
      });
    }

    for (const gap of missingGaps) {
      const gapNodeId = `missing:${gap.key}`;
      if (!nodeIds.has(gapNodeId)) {
        nodeIds.add(gapNodeId);
        nodes.push({
          id: gapNodeId,
          type: "MISSING_EVIDENCE",
          begType: "MISSING_EVIDENCE",
          sourceEntityType: "GapDetector",
          sourceEntityId: gap.key,
          label: gap.label,
          sublabel: `Severity: ${gap.severity} • Expected from ${gap.party}`,
          party: gap.party === "BUYER" ? "BUYER" : gap.party === "SELLER" ? "SELLER" : "NEUTRAL",
          swimlane: gap.party === "BUYER" ? "BUYER" : gap.party === "SELLER" ? "SELLER" : "SHARED",
          sourceOrigin: "SYSTEM_GENERATED",
          verificationState: "UNVERIFIED",
          discrepancyState: "MISSING",
          metadata: {
            gapKey: gap.key,
            expectedParty: gap.party,
            severity: gap.severity,
            reason: gap.reason,
          },
        });
        edges.push({
          id: `edge:case->missing:${gap.key}`,
          source: `case:${actualCaseId}`,
          target: gapNodeId,
          type: "MISSING_EVIDENCE",
          begType: "MISSING_EVIDENCE",
          label: "GAP_DETECTED",
          verificationState: "UNVERIFIED",
          sourceOrigin: "SYSTEM_GENERATED",
          provenance: "RULE",
          explanation: gap.reason,
        });
      }
    }

    // --- MERGE PERSISTED HUMAN INVESTIGATOR OVERRIDES (preserve originalAiState!) ---
    for (const edge of edges) {
      const override = persistedOverrideByEdgeKey.get(edge.id);
      if (override && override.reviewedById) {
        edge.originalAiState =
          (override.originalAiState as BegVerificationState) || edge.verificationState || "UNVERIFIED";
        edge.verificationState = override.verificationState as BegVerificationState;
        edge.reviewStatus = override.reviewStatus as ReviewStatus;
        edge.reviewedById = override.reviewedById;
        edge.reviewedAt = override.reviewedAt?.toISOString();
        edge.reviewNote = override.reviewNote || undefined;
      }
    }

    // Compute GraphSummaryMetrics cleanly
    const summary: GraphSummaryMetrics = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      verifiedCount: edges.filter((e) => e.verificationState === "VERIFIED").length,
      sourceSupportedCount: edges.filter((e) => e.verificationState === "SOURCE_SUPPORTED").length,
      inferredCount: edges.filter((e) => e.verificationState === "INFERRED").length,
      contestedCount:
        edges.filter((e) => e.verificationState === "CONTESTED").length +
        discrepancies.filter((d) => d.state === "CONTESTED" || d.state === "INCONSISTENT").length,
      unverifiedCount: edges.filter((e) => !e.verificationState || e.verificationState === "UNVERIFIED").length,
      missingCount: missingGaps.length,
      buyerNodeCount: nodes.filter((n) => n.swimlane === "BUYER" || n.party === "BUYER").length,
      sellerNodeCount: nodes.filter((n) => n.swimlane === "SELLER" || n.party === "MERCHANT" || n.party === "SELLER").length,
      sharedNodeCount: nodes.filter((n) => n.swimlane === "SHARED" || (!n.swimlane && (n.party === "SYSTEM" || n.party === "NEUTRAL"))).length,
      discrepancies: discrepancies.map((d) => ({
        key: d.key,
        attribute: d.attribute,
        state: d.state,
        summary: d.summary,
        buyerValue: d.buyerValue,
        sellerValue: d.sellerValue,
        orderValue: d.orderValue,
        involvedNodeIds: d.involvedNodeIds,
      })),
      missingEvidenceGaps: missingGaps.map((g) => ({
        key: g.key,
        nodeId: `missing:${g.key}`,
        label: g.label,
        party: g.party,
        reason: g.reason,
      })),
      ambiguousMatches: nodes
        .filter((n) => Boolean(n.metadata?.ambiguousCandidate))
        .map((n) => ({
          key: n.id,
          description: `Ambiguous seller candidate: ${n.label}`,
          candidateNames: [n.label],
          nodeIds: [n.id],
        })),
    };

    const graphData: GraphData = {
      caseId: actualCaseId,
      nodes,
      edges,
      metadata: {
        graphVersion: "2.0",
        revisionNumber: latestBerrAssessment ? latestBerrAssessment.begGraphVersion : 1,
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        tenantScope: caseRecord.organizationId || "DEFAULT",
        summary,
      },
    };

    // Validate graph
    const validation = GraphValidator.validate(graphData);
    if (!validation.isValid) {
      console.warn(`[GraphBuilder] Validation warnings/errors for case ${actualCaseId}:`, validation.issues);
    }

    return graphData;
  }

  /**
   * Persists a graph snapshot in SQLite for fast historical retrieval.
   */
  public static async saveSnapshot(graph: GraphData, analysisVersion = "berr-1.0"): Promise<string> {
    const snapshot = await prisma.graphSnapshot.create({
      data: {
        caseId: graph.caseId,
        graphVersion: graph.metadata.graphVersion,
        sourceAnalysisVersion: analysisVersion,
        nodeCount: graph.metadata.nodeCount,
        edgeCount: graph.metadata.edgeCount,
        buildStatus: "BUILT",
        snapshotDataJson: JSON.stringify(graph),
      },
    });

    return snapshot.id;
  }

  /**
   * Retrieves the most recent graph snapshot or rebuilds on the fly.
   */
  public static async getOrBuild(caseIdOrNumber: string, forceRebuild = false): Promise<GraphData> {
    if (!forceRebuild) {
      const snapshot = await prisma.graphSnapshot.findFirst({
        where: {
          case: {
            OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (snapshot && snapshot.snapshotDataJson) {
        try {
          return JSON.parse(snapshot.snapshotDataJson) as GraphData;
        } catch {
          // If JSON parse fails, fallback to build
        }
      }
    }

    const graph = await this.buildGraph(caseIdOrNumber);
    await this.saveSnapshot(graph);
    return graph;
  }
}
