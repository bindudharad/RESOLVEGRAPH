/**
 * RESOLVEGRAPH — Persisted BEG Storage, Incremental Sync & Investigator Actions Service
 *
 * Persists canonical BEG graphs into BegGraph / BegNode / BegEdge / BegEdgeAction /
 * BegGraphRevision tables with idempotent incremental syncing, hash integrity,
 * human-override preservation, and BERR stale-marking.
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { GraphBuilder } from "./graph-builder";
import type {
  BegNodeType,
  BegReviewAction,
  BegVerificationState,
  ConfidenceBand,
  DiscrepancyState,
  EvidenceSourceOrigin,
  GraphData,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphSummaryMetrics,
  ReviewStatus,
} from "./graph.types";
import { HashChainedAuditService } from "@/server/services/hash-chained-audit.service";

export interface PersistedBegBundle {
  begGraphId: string;
  version: number;
  revisionId: string | null;
  integrityHash: string | null;
  lastTriggerEvent: string | null;
  graph: GraphData;
  revisions: Array<{
    id: string;
    version: number;
    triggerEvent: string;
    nodeCount: number;
    edgeCount: number;
    contradictionCount: number;
    missingCount: number;
    createdAt: string;
  }>;
  edgeActions: Array<{
    id: string;
    edgeId: string;
    edgeKey: string;
    actorId: string;
    actorName: string;
    action: string;
    previousVerificationState: string | null;
    newVerificationState: string | null;
    explanation: string;
    createdAt: string;
  }>;
}

function computeGraphIntegrityHash(graph: GraphData): string {
  const canonical = {
    caseId: graph.caseId,
    nodes: [...graph.nodes]
      .map((n) => ({
        id: n.id,
        type: n.type,
        begType: n.begType,
        label: n.label,
        party: n.party,
        sourceOrigin: n.sourceOrigin,
        verificationState: n.verificationState,
        discrepancyState: n.discrepancyState,
        sha256: n.provenanceRecord?.sha256 || null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...graph.edges]
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        begType: e.begType,
        label: e.label,
        verificationState: e.verificationState,
        reviewStatus: e.reviewStatus,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function safeJsonParse<T>(raw?: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export class BegPersistenceService {
  /**
   * Synchronizes the persisted BEG tables for a case idempotently from current DB evidence & records.
   */
  public static async syncCaseGraph(
    caseIdOrNumber: string,
    triggerEvent = "MANUAL_REBUILD",
    triggeredById?: string | null,
    options?: {
      forceRevision?: boolean;
      markBerrStale?: boolean;
    }
  ): Promise<{
    begGraphId: string;
    version: number;
    revisionId: string;
    changed: boolean;
    graph: GraphData;
  }> {
    const built = await GraphBuilder.buildGraph(caseIdOrNumber);
    const actualCaseId = built.caseId;
    const integrityHash = computeGraphIntegrityHash(built);
    const summary = built.metadata.summary;

    const existingGraph = await prisma.begGraph.findUnique({
      where: { caseId: actualCaseId },
    });

    const changed =
      Boolean(options?.forceRevision) ||
      !existingGraph ||
      existingGraph.integrityHash !== integrityHash;
    const nextVersion = existingGraph
      ? changed
        ? existingGraph.version + 1
        : existingGraph.version
      : 1;

    if (!changed && existingGraph) {
      const latestRev = await prisma.begGraphRevision.findFirst({
        where: { graphId: existingGraph.id },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      if (latestRev) {
        built.metadata.graphId = existingGraph.id;
        built.metadata.revisionNumber = existingGraph.version;
        built.metadata.lastTriggerEvent = existingGraph.lastTriggerEvent || triggerEvent;
        built.metadata.integrityHash = integrityHash;
        return {
          begGraphId: existingGraph.id,
          version: existingGraph.version,
          revisionId: latestRev.id,
          changed: false,
          graph: built,
        };
      }
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const begGraph = await tx.begGraph.upsert({
        where: { caseId: actualCaseId },
        create: {
          caseId: actualCaseId,
          version: nextVersion,
          schemaVersion: "2.0",
          buildStatus: "BUILT",
          lastTriggerEvent: triggerEvent,
          lastEventAt: now,
          nodeCount: built.nodes.length,
          edgeCount: built.edges.length,
          verifiedCount: summary?.verifiedCount ?? 0,
          contestedCount: summary?.contestedCount ?? 0,
          missingCount: summary?.missingCount ?? 0,
          inferredCount: summary?.inferredCount ?? 0,
          integrityHash,
          summaryJson: summary ? JSON.stringify(summary) : null,
        },
        update: {
          version: nextVersion,
          buildStatus: "BUILT",
          lastTriggerEvent: triggerEvent,
          lastEventAt: now,
          nodeCount: built.nodes.length,
          edgeCount: built.edges.length,
          verifiedCount: summary?.verifiedCount ?? 0,
          contestedCount: summary?.contestedCount ?? 0,
          missingCount: summary?.missingCount ?? 0,
          inferredCount: summary?.inferredCount ?? 0,
          integrityHash,
          summaryJson: summary ? JSON.stringify(summary) : null,
        },
      });

      const currentNodeKeySet = new Set(built.nodes.map((n) => n.id));
      const existingNodeRows = await tx.begNode.findMany({
        where: { graphId: begGraph.id },
        select: {
          id: true,
          nodeKey: true,
          label: true,
          verificationState: true,
          discrepancyState: true,
          reviewStatus: true,
        },
      });
      const existingNodeMap = new Map(existingNodeRows.map((n) => [n.nodeKey, n]));
      const staleNodeIds = existingNodeRows
        .filter((n) => !currentNodeKeySet.has(n.nodeKey))
        .map((n) => n.id);
      for (let i = 0; i < staleNodeIds.length; i += 200) {
        await tx.begNode.deleteMany({
          where: { id: { in: staleNodeIds.slice(i, i + 200) } },
        });
      }

      const nodeKeyToDbId = new Map<string, string>();
      const newNodesToCreate = [];

      for (const node of built.nodes) {
        const prov = node.provenanceRecord;
        const existing = existingNodeMap.get(node.id);
        if (!existing) {
          newNodesToCreate.push({
            graphId: begGraph.id,
            caseId: actualCaseId,
            nodeKey: node.id,
            nodeType: node.begType || node.type,
            legacyType: node.type,
            sourceEntityType: node.sourceEntityType || node.type,
            sourceEntityId: node.sourceEntityId || null,
            label: node.label,
            sublabel: node.sublabel || null,
            party: node.party || "NEUTRAL",
            sourceOrigin: node.sourceOrigin || "SYSTEM_GENERATED",
            verificationState: node.verificationState || "UNVERIFIED",
            discrepancyState: node.discrepancyState || null,
            reviewStatus: node.reviewStatus || "UNREVIEWED",
            confidence: node.confidence ?? null,
            evidenceId: prov?.evidenceId || null,
            originalFileId: prov?.originalFileId || null,
            uploadedById: null,
            uploadingParty: prov?.uploadingParty || null,
            uploadTimestamp: prov?.uploadTimestamp ? new Date(prov.uploadTimestamp) : null,
            originalFilename: prov?.originalFilename || null,
            sha256: prov?.sha256 || null,
            storageKey: prov?.storageKey || null,
            extractedInfoRef: prov?.extractedInfoRef || null,
            ocrResultRef: prov?.ocrResultRef || null,
            verificationResultRef: prov?.verificationResultRef || null,
            accessPermissions: prov?.accessPermissions || null,
            sourceLocationJson: prov?.sourceLocator ? JSON.stringify(prov.sourceLocator) : null,
            metadataJson: JSON.stringify({
              ...node.metadata,
              swimlane: node.swimlane || null,
              uploadedBy: prov?.uploadedBy || null,
            }),
            isInternal: Boolean(node.isInternal),
            eventTimestamp: node.timestamp ? new Date(node.timestamp) : null,
          });
        } else {
          nodeKeyToDbId.set(node.id, existing.id);
          const nextVerif = node.verificationState || "UNVERIFIED";
          const nextDisc = node.discrepancyState || null;
          const nextRev = node.reviewStatus || "UNREVIEWED";
          if (
            existing.label !== node.label ||
            existing.verificationState !== nextVerif ||
            existing.discrepancyState !== nextDisc ||
            existing.reviewStatus !== nextRev
          ) {
            await tx.begNode.update({
              where: { id: existing.id },
              data: {
                nodeType: node.begType || node.type,
                legacyType: node.type,
                label: node.label,
                sublabel: node.sublabel || null,
                verificationState: nextVerif,
                discrepancyState: nextDisc,
                reviewStatus: nextRev,
                confidence: node.confidence ?? null,
                metadataJson: JSON.stringify({
                  ...node.metadata,
                  swimlane: node.swimlane || null,
                  uploadedBy: prov?.uploadedBy || null,
                }),
              },
            });
          }
        }
      }

      if (newNodesToCreate.length > 0) {
        for (let i = 0; i < newNodesToCreate.length; i += 100) {
          await tx.begNode.createMany({ data: newNodesToCreate.slice(i, i + 100) });
        }
        const insertedNodes = await tx.begNode.findMany({
          where: { graphId: begGraph.id },
          select: { id: true, nodeKey: true },
        });
        for (const row of insertedNodes) {
          nodeKeyToDbId.set(row.nodeKey, row.id);
        }
      }

      const currentEdgeKeySet = new Set(built.edges.map((e) => e.id));
      const existingEdgeRows = await tx.begEdge.findMany({
        where: { graphId: begGraph.id },
        select: {
          id: true,
          edgeKey: true,
          verificationState: true,
          reviewStatus: true,
          reviewedById: true,
          originalAiState: true,
          label: true,
        },
      });
      const existingEdgeMap = new Map(existingEdgeRows.map((e) => [e.edgeKey, e]));
      const staleEdgeIds = existingEdgeRows
        .filter((e) => !currentEdgeKeySet.has(e.edgeKey))
        .map((e) => e.id);
      for (let i = 0; i < staleEdgeIds.length; i += 200) {
        await tx.begEdge.deleteMany({
          where: { id: { in: staleEdgeIds.slice(i, i + 200) } },
        });
      }

      const newEdgesToCreate = [];
      for (const edge of built.edges) {
        const srcDbId = nodeKeyToDbId.get(edge.source);
        const tgtDbId = nodeKeyToDbId.get(edge.target);
        if (!srcDbId || !tgtDbId) continue;

        const existingEdge = existingEdgeMap.get(edge.id);
        if (!existingEdge) {
          newEdgesToCreate.push({
            graphId: begGraph.id,
            caseId: actualCaseId,
            edgeKey: edge.id,
            sourceNodeId: srcDbId,
            targetNodeId: tgtDbId,
            relationType: edge.begType || edge.type,
            legacyType: edge.type,
            label: edge.label,
            verificationState: edge.verificationState || "UNVERIFIED",
            sourceOrigin: edge.sourceOrigin || "SYSTEM_GENERATED",
            provenance: edge.provenance,
            confidence: edge.confidence ?? null,
            matchMethod: edge.matchMethod || null,
            explanation: edge.explanation || null,
            supportingEvidenceIdsJson: edge.supportingEvidenceIds
              ? JSON.stringify(edge.supportingEvidenceIds)
              : null,
            originalAiState: edge.verificationState || "UNVERIFIED",
            originalAiConfidence: edge.confidence ?? null,
            reviewStatus: edge.reviewStatus || "UNREVIEWED",
            isInternal: Boolean(edge.isInternal),
            metadataJson: edge.metadata ? JSON.stringify(edge.metadata) : null,
          });
        } else if (!existingEdge.reviewedById) {
          const nextVerif = edge.verificationState || "UNVERIFIED";
          const nextRev = edge.reviewStatus || "UNREVIEWED";
          if (
            existingEdge.verificationState !== nextVerif ||
            existingEdge.reviewStatus !== nextRev ||
            existingEdge.label !== edge.label
          ) {
            await tx.begEdge.update({
              where: { id: existingEdge.id },
              data: {
                verificationState: nextVerif,
                reviewStatus: nextRev,
                label: edge.label,
                confidence: edge.confidence ?? null,
                explanation: edge.explanation || null,
              },
            });
          }
        }
      }

      if (newEdgesToCreate.length > 0) {
        for (let i = 0; i < newEdgesToCreate.length; i += 100) {
          await tx.begEdge.createMany({ data: newEdgesToCreate.slice(i, i + 100) });
        }
      }

      let revision = await tx.begGraphRevision.findUnique({
        where: {
          graphId_version: {
            graphId: begGraph.id,
            version: nextVersion,
          },
        },
      });

      if (!revision || changed) {
        const revSnapshot = {
          nodeKeys: built.nodes.map((n) => n.id),
          edgeKeys: built.edges.map((e) => e.id),
          discrepancies: summary?.discrepancies || [],
          missingEvidenceGaps: summary?.missingEvidenceGaps || [],
        };
        revision = await tx.begGraphRevision.upsert({
          where: {
            graphId_version: {
              graphId: begGraph.id,
              version: nextVersion,
            },
          },
          create: {
            graphId: begGraph.id,
            caseId: actualCaseId,
            version: nextVersion,
            triggerEvent,
            triggeredById: triggeredById || null,
            nodeCount: built.nodes.length,
            edgeCount: built.edges.length,
            contradictionCount: summary?.contestedCount ?? 0,
            missingCount: summary?.missingCount ?? 0,
            integrityHash,
            deltaSummaryJson: JSON.stringify({
              triggerEvent,
              changed,
              nodeCount: built.nodes.length,
              edgeCount: built.edges.length,
            }),
            snapshotJson: JSON.stringify(revSnapshot),
          },
          update: {
            triggerEvent,
            triggeredById: triggeredById || null,
            nodeCount: built.nodes.length,
            edgeCount: built.edges.length,
            contradictionCount: summary?.contestedCount ?? 0,
            missingCount: summary?.missingCount ?? 0,
            integrityHash,
            snapshotJson: JSON.stringify(revSnapshot),
          },
        });
      }

      // Mark prior BERR assessments stale cleanly when graph state mutates due to new evidence/reviews
      if (changed && options?.markBerrStale !== false) {
        await tx.berrAssessmentRecord.updateMany({
          where: {
            caseId: actualCaseId,
            isStale: false,
          },
          data: {
            isStale: true,
            staleReason: `BEG Graph updated to v${nextVersion} (${triggerEvent})`,
          },
        });
      }

      return { begGraph, revision };
    }, { maxWait: 10000, timeout: 30000 });

    // Update GraphMetadata with persisted DB fields & snapshot for compatibility
    built.metadata.graphId = result.begGraph.id;
    built.metadata.revisionNumber = result.begGraph.version;
    built.metadata.lastTriggerEvent = triggerEvent;
    built.metadata.integrityHash = integrityHash;

    await GraphBuilder.saveSnapshot(built, `beg-v${result.begGraph.version}`);

    return {
      begGraphId: result.begGraph.id,
      version: result.begGraph.version,
      revisionId: result.revision.id,
      changed,
      graph: built,
    };
  }

  /**
   * Loads persisted BEG graph bundle directly from SQLite; auto-builds & persists if absent.
   */
  public static async getPersistedGraph(
    caseIdOrNumber: string,
    forceRebuild = false
  ): Promise<PersistedBegBundle> {
    const caseRow = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
      },
      select: { id: true, organizationId: true },
    });

    if (!caseRow) {
      throw new Error(`Dispute case not found: ${caseIdOrNumber}`);
    }

    let persisted = await prisma.begGraph.findUnique({
      where: { caseId: caseRow.id },
      include: {
        nodes: { orderBy: { createdAt: "asc" } },
        edges: { orderBy: { createdAt: "asc" } },
        revisions: { orderBy: { version: "desc" }, take: 20 },
      },
    });

    if (!persisted || forceRebuild || persisted.buildStatus === "OUTDATED") {
      await this.syncCaseGraph(caseRow.id, forceRebuild ? "FORCE_REBUILD" : "INITIAL_SYNC");
      persisted = await prisma.begGraph.findUnique({
        where: { caseId: caseRow.id },
        include: {
          nodes: { orderBy: { createdAt: "asc" } },
          edges: { orderBy: { createdAt: "asc" } },
          revisions: { orderBy: { version: "desc" }, take: 20 },
        },
      });
    }

    if (!persisted) {
      throw new Error(`Failed to load persisted BEG graph for case ${caseIdOrNumber}`);
    }

    const dbIdToNodeKey = new Map(persisted.nodes.map((n) => [n.id, n.nodeKey]));

    const nodes: GraphNode[] = persisted.nodes.map((n) => {
      const meta = safeJsonParse<Record<string, unknown>>(n.metadataJson) || {};
      const sourceLocator = safeJsonParse(n.sourceLocationJson);
      const party = n.party as GraphNode["party"];
      const swimlane =
        (meta.swimlane as GraphNode["swimlane"]) ||
        (party === "BUYER"
          ? "BUYER"
          : party === "SELLER" || party === "MERCHANT"
          ? "SELLER"
          : "SHARED");

      return {
        id: n.nodeKey,
        type: (n.legacyType as GraphNodeType) || (n.nodeType as GraphNodeType),
        begType: n.nodeType as BegNodeType,
        sourceEntityType: n.sourceEntityType,
        sourceEntityId: n.sourceEntityId || undefined,
        label: n.label,
        sublabel: n.sublabel || undefined,
        party,
        swimlane,
        sourceOrigin: n.sourceOrigin as EvidenceSourceOrigin,
        confidence: n.confidence ?? undefined,
        confidenceBand:
          n.confidence !== null && n.confidence !== undefined
            ? n.confidence >= 0.85
              ? "HIGH"
              : n.confidence >= 0.65
              ? "MEDIUM"
              : "LOW"
            : undefined,
        reviewStatus: n.reviewStatus as ReviewStatus,
        verificationState: n.verificationState as BegVerificationState,
        discrepancyState: (n.discrepancyState as DiscrepancyState) || undefined,
        timestamp: (n.eventTimestamp || n.createdAt).toISOString(),
        isInternal: n.isInternal,
        provenanceRecord: n.evidenceId || n.sha256 || n.ocrResultRef
          ? {
              evidenceId: n.evidenceId || undefined,
              complaintId: n.caseId,
              originalFileId: n.originalFileId || undefined,
              uploadedBy: typeof meta.uploadedBy === "string" ? meta.uploadedBy : undefined,
              uploadingParty: n.uploadingParty || undefined,
              uploadTimestamp: n.uploadTimestamp?.toISOString(),
              originalFilename: n.originalFilename || undefined,
              sha256: n.sha256 || undefined,
              extractedInfoRef: n.extractedInfoRef || undefined,
              ocrResultRef: n.ocrResultRef || undefined,
              verificationResultRef: n.verificationResultRef || undefined,
              storageKey: n.storageKey || undefined,
              accessPermissions: n.accessPermissions || undefined,
              sourceOrigin: n.sourceOrigin as EvidenceSourceOrigin,
              sourceLocator: sourceLocator as GraphNode["provenanceRecord"] extends infer P
                ? P extends { sourceLocator?: infer SL }
                  ? SL
                  : undefined
                : undefined,
            }
          : undefined,
        metadata: {
          ...meta,
          dbNodeId: n.id,
        },
      };
    });

    const edges: GraphEdge[] = [];
    for (const e of persisted.edges) {
      const srcKey = dbIdToNodeKey.get(e.sourceNodeId);
      const tgtKey = dbIdToNodeKey.get(e.targetNodeId);
      if (!srcKey || !tgtKey) continue;
      edges.push({
        id: e.edgeKey,
        source: srcKey,
        target: tgtKey,
        type: e.legacyType as GraphEdge["type"],
        begType: e.relationType as GraphEdge["begType"],
        label: e.label,
        confidence: e.confidence ?? undefined,
        confidenceBand: (e.confidence !== null && e.confidence !== undefined
          ? e.confidence >= 0.85
            ? "HIGH"
            : e.confidence >= 0.65
            ? "MEDIUM"
            : "LOW"
          : "MEDIUM") as ConfidenceBand,
        reviewStatus: e.reviewStatus as ReviewStatus,
        verificationState: e.verificationState as BegVerificationState,
        sourceOrigin: e.sourceOrigin as EvidenceSourceOrigin,
        provenance: e.provenance as GraphEdge["provenance"],
        matchMethod: e.matchMethod || undefined,
        supportingEvidenceIds: safeJsonParse<string[]>(e.supportingEvidenceIdsJson),
        originalAiState: (e.originalAiState as BegVerificationState) || undefined,
        reviewedById: e.reviewedById || undefined,
        reviewedAt: e.reviewedAt?.toISOString(),
        reviewNote: e.reviewNote || undefined,
        explanation: e.explanation || undefined,
        isInternal: e.isInternal,
        metadata: {
          ...(safeJsonParse<Record<string, unknown>>(e.metadataJson) || {}),
          dbEdgeId: e.id,
        },
      });
    }

    const edgeActions = await prisma.begEdgeAction.findMany({
      where: { caseId: caseRow.id },
      include: {
        actor: { select: { fullName: true, email: true } },
        edge: { select: { edgeKey: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const summary = safeJsonParse<GraphSummaryMetrics>(persisted.summaryJson);

    const graph: GraphData = {
      caseId: caseRow.id,
      nodes,
      edges,
      metadata: {
        graphId: persisted.id,
        graphVersion: persisted.schemaVersion,
        revisionNumber: persisted.version,
        generatedAt: persisted.updatedAt.toISOString(),
        lastTriggerEvent: persisted.lastTriggerEvent || undefined,
        integrityHash: persisted.integrityHash || undefined,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        tenantScope: caseRow.organizationId || "DEFAULT",
        summary,
      },
    };

    return {
      begGraphId: persisted.id,
      version: persisted.version,
      revisionId: persisted.revisions[0]?.id || null,
      integrityHash: persisted.integrityHash,
      lastTriggerEvent: persisted.lastTriggerEvent,
      graph,
      revisions: persisted.revisions.map((r) => ({
        id: r.id,
        version: r.version,
        triggerEvent: r.triggerEvent,
        nodeCount: r.nodeCount,
        edgeCount: r.edgeCount,
        contradictionCount: r.contradictionCount,
        missingCount: r.missingCount,
        createdAt: r.createdAt.toISOString(),
      })),
      edgeActions: edgeActions.map((a) => ({
        id: a.id,
        edgeId: a.edgeId,
        edgeKey: a.edge.edgeKey,
        actorId: a.actorId,
        actorName: a.actor.fullName || a.actor.email,
        action: a.action,
        previousVerificationState: a.previousVerificationState,
        newVerificationState: a.newVerificationState,
        explanation: a.explanation,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Returns a curated BEG context payload for BerrV2Service so BERR reasons over
   * verified/inferred/contested graph states rather than raw unstructured fields.
   */
  public static async getGraphForBerr(caseIdOrNumber: string): Promise<{
    begGraphId: string;
    begRevisionId: string | null;
    begGraphVersion: number;
    graph: GraphData;
    verifiedNodes: GraphNode[];
    contestedNodes: GraphNode[];
    inferredNodes: GraphNode[];
    missingNodes: GraphNode[];
    contradictionEdges: GraphEdge[];
  }> {
    const bundle = await this.getPersistedGraph(caseIdOrNumber, false);
    const { graph } = bundle;
    return {
      begGraphId: bundle.begGraphId,
      begRevisionId: bundle.revisionId,
      begGraphVersion: bundle.version,
      graph,
      verifiedNodes: graph.nodes.filter((n) => n.verificationState === "VERIFIED"),
      contestedNodes: graph.nodes.filter(
        (n) => n.verificationState === "CONTESTED" || n.begType === "CONTRADICTION_FINDING"
      ),
      inferredNodes: graph.nodes.filter((n) => n.verificationState === "INFERRED"),
      missingNodes: graph.nodes.filter((n) => n.begType === "MISSING_EVIDENCE"),
      contradictionEdges: graph.edges.filter(
        (e) => e.verificationState === "CONTESTED" || e.begType === "CONTRADICTS_CLAIM"
      ),
    };
  }

  /**
   * Executes a human investigator review action on a BEG edge while preserving original AI state
   * and appending immutable audit history.
   */
  public static async applyInvestigatorEdgeAction(params: {
    caseId: string;
    edgeIdOrKey: string;
    actorId: string;
    action: BegReviewAction;
    explanation: string;
  }) {
    const edge = await prisma.begEdge.findFirst({
      where: {
        caseId: params.caseId,
        OR: [{ id: params.edgeIdOrKey }, { edgeKey: params.edgeIdOrKey }],
      },
      include: { sourceNode: true, targetNode: true },
    });

    if (!edge) {
      throw new Error(`BEG relationship not found for case ${params.caseId}: ${params.edgeIdOrKey}`);
    }

    const previousVerificationState = edge.verificationState;
    const previousReviewStatus = edge.reviewStatus;

    let newVerificationState: BegVerificationState =
      (edge.verificationState as BegVerificationState) || "UNVERIFIED";
    let newReviewStatus: string = edge.reviewStatus;

    switch (params.action) {
      case "CONFIRM":
        newVerificationState = "VERIFIED";
        newReviewStatus = "CONFIRMED";
        break;
      case "REJECT":
        newVerificationState = "UNVERIFIED";
        newReviewStatus = "REJECTED";
        break;
      case "MARK_CONTESTED":
        newVerificationState = "CONTESTED";
        newReviewStatus = "CONTESTED";
        break;
      case "REQUEST_ADDITIONAL_INFO":
        newVerificationState =
          edge.verificationState === "VERIFIED"
            ? "INFERRED"
            : ((edge.verificationState as BegVerificationState) || "UNVERIFIED");
        newReviewStatus = "ADDITIONAL_INFO_REQUESTED";
        break;
      case "ESCALATE":
        newReviewStatus = "ESCALATED";
        break;
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const savedEdge = await tx.begEdge.update({
        where: { id: edge.id },
        data: {
          originalAiState: edge.originalAiState || previousVerificationState,
          verificationState: newVerificationState,
          reviewStatus: newReviewStatus,
          reviewedById: params.actorId,
          reviewedAt: now,
          reviewNote: params.explanation,
        },
      });

      const actionLog = await tx.begEdgeAction.create({
        data: {
          edgeId: edge.id,
          caseId: params.caseId,
          actorId: params.actorId,
          action: params.action,
          previousVerificationState,
          newVerificationState,
          previousReviewStatus,
          newReviewStatus,
          explanation: params.explanation,
        },
      });

      const allEdges = await tx.begEdge.findMany({
        where: { graphId: edge.graphId },
        select: { verificationState: true },
      });

      await tx.begGraph.update({
        where: { id: edge.graphId },
        data: {
          verifiedCount: allEdges.filter((e) => e.verificationState === "VERIFIED").length,
          contestedCount: allEdges.filter((e) => e.verificationState === "CONTESTED").length,
          inferredCount: allEdges.filter((e) => e.verificationState === "INFERRED").length,
          lastTriggerEvent: `INVESTIGATOR_ACTION_${params.action}`,
          lastEventAt: now,
        },
      });

      await tx.caseEvent.create({
        data: {
          caseId: params.caseId,
          actorId: params.actorId,
          eventType: "BEG_EDGE_REVIEWED",
          description: `Investigator ${params.action} on BEG edge ${edge.edgeKey} (${previousVerificationState} -> ${newVerificationState}): ${params.explanation}`,
          metadataJson: JSON.stringify({
            edgeId: edge.id,
            edgeKey: edge.edgeKey,
            action: params.action,
            previousVerificationState,
            newVerificationState,
            sourceNode: edge.sourceNode.label,
            targetNode: edge.targetNode.label,
          }),
        },
      });

      await tx.berrAssessmentRecord.updateMany({
        where: { caseId: params.caseId, isStale: false },
        data: {
          isStale: true,
          staleReason: `Investigator executed ${params.action} on BEG relationship ${edge.edgeKey}`,
        },
      });

      return { savedEdge, actionLog };
    });

    await HashChainedAuditService.recordEvent({
      action: `BEG_EDGE_${params.action}`,
      actorId: params.actorId,
      resourceType: "BegEdge",
      resourceId: edge.id,
      details: {
        caseId: params.caseId,
        edgeKey: edge.edgeKey,
        previousVerificationState,
        newVerificationState,
        explanation: params.explanation,
      },
    }).catch((err: unknown) => {
      console.warn("[BegPersistenceService] Audit logging failed non-fatally:", err);
    });

    return updated;
  }
}
