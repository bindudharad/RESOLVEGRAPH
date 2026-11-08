/**
 * RESOLVEGRAPH — Step 5: Graph Builder Service
 * Constructs, validates, and serializes the complete Bilateral Evidence Graph for a dispute case.
 */

import { prisma } from "@/lib/prisma";
import {
  GraphData,
  GraphNode,
  GraphEdge,
  ConfidenceBand,
  ReviewStatus,
} from "./graph.types";
import { GraphValidator } from "./graph-validator";

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
    ]);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // --- NODE: Case Root ---
    nodes.push({
      id: `case:${actualCaseId}`,
      type: "CASE",
      label: caseRecord.caseNumber,
      sublabel: caseRecord.title,
      status: caseRecord.status,
      timestamp: caseRecord.createdAt.toISOString(),
      metadata: {
        category: caseRecord.category,
        amountMinor: caseRecord.amountMinor,
        disputedAmount: caseRecord.amountMinor / 100,
        currency: caseRecord.currency,
        organizationId: caseRecord.organizationId,
      },
    });

    // --- NODE: Buyer ---
    const buyerId = `user:${caseRecord.buyerId}`;
    nodes.push({
      id: buyerId,
      type: "BUYER",
      label: caseRecord.buyer.fullName || caseRecord.buyer.email,
      sublabel: "Buyer",
      party: "BUYER",
      metadata: {
        email: caseRecord.buyer.email,
      },
    });

    // --- NODE: Merchant ---
    const merchantId = `user:${caseRecord.merchantId}`;
    nodes.push({
      id: merchantId,
      type: "MERCHANT",
      label: caseRecord.merchant.fullName || caseRecord.merchant.email,
      sublabel: caseRecord.merchant.organization || "Merchant",
      party: "MERCHANT",
      metadata: {
        email: caseRecord.merchant.email,
        organizationId: caseRecord.organizationId,
      },
    });

    // --- NODES: Claims ---
    for (const claim of caseRecord.claims) {
      const claimNodeId = `claim:${claim.id}`;
      const isBuyerClaim = claim.partyRole === "BUYER" || claim.authorId === caseRecord.buyerId;
      const claimParty = isBuyerClaim ? "BUYER" : "MERCHANT";

      nodes.push({
        id: claimNodeId,
        type: "CLAIM",
        label: claim.claimType,
        sublabel: (claim.statement || "").slice(0, 60) + ((claim.statement || "").length > 60 ? "..." : ""),
        party: claimParty,
        status: claim.status,
        timestamp: claim.createdAt.toISOString(),
        metadata: {
          category: claim.claimType,
          fullDescription: claim.statement || "",
          statedAmount: caseRecord.amountMinor / 100,
          authorId: claim.authorId,
        },
      });

      // Edge: Author -> Claim
      edges.push({
        id: `edge:author->${claim.id}`,
        source: isBuyerClaim ? buyerId : merchantId,
        target: claimNodeId,
        type: "ASSERTS_CLAIM",
        label: `ASSERTS_${claim.claimType}`,
        provenance: "HUMAN_ASSERTED",
      });
    }

    // --- NODES: Evidence ---
    for (const ev of caseRecord.evidence) {
      const evidenceNodeId = `evidence:${ev.id}`;
      const isBuyerEv = ev.uploadedById === caseRecord.buyerId;
      const evParty = isBuyerEv ? "BUYER" : "MERCHANT";

      nodes.push({
        id: evidenceNodeId,
        type: "EVIDENCE",
        label: ev.filename,
        sublabel: ev.evidenceType,
        party: evParty,
        status: ev.verificationStatus,
        confidence: ev.verificationStatus === "VERIFIED" ? 0.95 : 0.7,
        confidenceBand: ev.verificationStatus === "VERIFIED" ? "HIGH" : "MEDIUM",
        timestamp: ev.createdAt.toISOString(),
        metadata: {
          fileKey: ev.storageKey,
          mimeType: ev.mimeType,
          fileSize: ev.sizeBytes,
          isInternal: ev.visibility === "INTERNAL",
          organizationId: caseRecord.organizationId,
        },
      });

      // Edge: Uploader -> Evidence
      edges.push({
        id: `edge:uploader->${ev.id}`,
        source: isBuyerEv ? buyerId : merchantId,
        target: evidenceNodeId,
        type: "SUBMITS_EVIDENCE",
        label: `SUBMITS_${ev.evidenceType}`,
        provenance: "HUMAN_ASSERTED",
      });
    }

    // --- NODES: Extracted Facts ---
    for (const fact of facts) {
      const factNodeId = `fact:${fact.id}`;
      const evParty = fact.evidence.uploadedById === caseRecord.buyerId ? "BUYER" : "MERCHANT";

      nodes.push({
        id: factNodeId,
        type: "FACT",
        label: `${fact.fieldKey}: ${fact.normalizedValue || fact.rawValue}`,
        sublabel: fact.factType,
        party: evParty,
        confidence: fact.extractionConfidenceBand === "HIGH" ? 0.95 : fact.extractionConfidenceBand === "MEDIUM" ? 0.75 : 0.5,
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

      // Edge: Fact -> Evidence (EXTRACTED_FROM)
      edges.push({
        id: `edge:fact->evidence:${fact.id}`,
        source: factNodeId,
        target: `evidence:${fact.evidenceId}`,
        type: "EXTRACTED_FROM",
        label: "EXTRACTED_FROM",
        confidenceBand: (fact.extractionConfidenceBand as ConfidenceBand) || "HIGH",
        provenance: "AI_INFERRED",
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
      for (const finding of findings) {
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

    const graphData: GraphData = {
      caseId: actualCaseId,
      nodes,
      edges,
      metadata: {
        graphVersion: "1.0",
        generatedAt: new Date().toISOString(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        tenantScope: caseRecord.organizationId || "DEFAULT",
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
