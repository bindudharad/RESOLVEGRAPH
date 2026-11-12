"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  Expand,
  Eye,
  FileSearch,
  FileText,
  HelpCircle,
  History,
  Image as ImageIcon,
  Info,
  Maximize2,
  Minimize2,
  Network,
  Package,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  User,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  BegReviewAction,
  BegVerificationState,
  GraphData,
  GraphNode,
} from "@/server/graph/graph.types";
import type { VisualGraphLayout, VisualGraphNode } from "@/server/graph/graph-projection";
import { GraphProjectionService } from "@/server/graph/graph-projection";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/ui/slide-over";
import { BegLoadingState } from "@/components/cases/beg-loading-state";
import { cn } from "@/lib/utils";

interface RevisionItem {
  id: string;
  version: number;
  triggerEvent: string;
  nodeCount: number;
  edgeCount: number;
  contradictionCount: number;
  missingCount: number;
  createdAt: string;
}

interface EdgeActionLog {
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
}

interface BerrFindingSummary {
  assessmentId?: string;
  version?: number;
  isStale?: boolean;
  classifiedFacts: Array<{
    id: string;
    field: string;
    classification: "AGREED" | "VERIFIED" | "CONTESTED" | "MISSING";
    explanation: string;
    linkedBegNodeIds?: string[];
    linkedBegEdgeIds?: string[];
  }>;
  recommendedRemedy?: {
    type: string;
    title: string;
    description: string;
  };
}

interface EvidencePreviewPayload {
  evidence: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    evidenceType: string;
    visibility: string;
    verificationStatus: string;
    uploadedBy: string;
    uploadedParty: string;
    createdAt: string;
    downloadUrl: string;
  };
  previewMode: "image" | "pdf" | "video" | "text" | "metadata";
  textExcerpt: string | null;
  analysis: {
    assessmentState: string;
    confidence: number;
    findingsSummary: string;
    extractedFields: Array<{
      id: string;
      fieldKey: string;
      rawValue: string;
      normalizedValue: string;
      confidence: number;
    }>;
  } | null;
  extractedFacts: Array<{
    id: string;
    fieldKey: string;
    rawValue: string;
    normalizedValue: string | null;
    sourceExcerpt: string | null;
    pageNumber: number | null;
    reviewStatus: string;
  }>;
}

interface EvidenceGraphExplorerProps {
  caseId: string;
  externalHighlightedNodeIds?: string[];
  externalHighlightedEdgeIds?: string[];
  onSwitchToBerr?: () => void;
}

type CategoryFilter =
  | "ALL"
  | "BUYER"
  | "SELLER"
  | "MARKETPLACE"
  | "LOGISTICS"
  | "VERIFIED"
  | "INFERRED"
  | "CONTESTED"
  | "MISSING";

const VERIFICATION_STYLES: Record<
  BegVerificationState,
  { stroke: string; badgeBg: string; badgeText: string; label: string; dashed: boolean }
> = {
  VERIFIED: {
    stroke: "#378D70",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    label: "Verified",
    dashed: false,
  },
  SOURCE_SUPPORTED: {
    stroke: "#4C91C8",
    badgeBg: "bg-sky-500/10 border-sky-500/30",
    badgeText: "text-sky-700 dark:text-sky-300",
    label: "Source Supported",
    dashed: false,
  },
  INFERRED: {
    stroke: "#C18B45",
    badgeBg: "bg-amber-500/10 border-amber-500/30",
    badgeText: "text-amber-700 dark:text-amber-300",
    label: "Inferred (Needs Review)",
    dashed: true,
  },
  CONTESTED: {
    stroke: "#C8372D",
    badgeBg: "bg-rose-500/10 border-rose-500/30",
    badgeText: "text-rose-700 dark:text-rose-300",
    label: "Contested",
    dashed: true,
  },
  UNVERIFIED: {
    stroke: "#929A96",
    badgeBg: "bg-zinc-500/10 border-zinc-500/30",
    badgeText: "text-zinc-600 dark:text-zinc-300",
    label: "Unverified",
    dashed: true,
  },
};

function renderNodeIcon(node: GraphNode, className = "h-3.5 w-3.5") {
  const t = node.begType || node.type;
  if (t === "BUYER") return <User className={className} />;
  if (t === "SELLER" || t === "MERCHANT" || t === "MERCHANT_ORGANIZATION" || t === "SELLER_IDENTITY") {
    return <Store className={className} />;
  }
  if (t === "LOGISTICS_PROVIDER" || t === "SELLER_DISPATCH_RECORD" || t === "DELIVERY_EVENT") {
    return <Truck className={className} />;
  }
  if (t === "BUYER_IMAGE" || t === "SELLER_PACKING_PHOTO") return <ImageIcon className={className} />;
  if (t === "BUYER_VIDEO" || t === "SELLER_PACKING_VIDEO" || t === "CAMERA_SESSION") {
    return <Video className={className} />;
  }
  if (t === "ORDER" || t === "PRODUCT" || t === "PRODUCT_SPECIFICATION" || t === "PACKAGE_PASSPORT") {
    return <Package className={className} />;
  }
  if (t === "CONTRADICTION_FINDING" || t === "RECONCILIATION_MISMATCH") {
    return <ShieldAlert className={className} />;
  }
  if (t === "MISSING_EVIDENCE") return <HelpCircle className={className} />;
  if (t === "BERR_FINDING" || t === "VERIFICATION_FINDING" || t === "FINDING") {
    return <Sparkles className={className} />;
  }
  return <FileText className={className} />;
}

export function EvidenceGraphExplorer({
  caseId,
  externalHighlightedNodeIds,
  externalHighlightedEdgeIds,
  onSwitchToBerr,
}: EvidenceGraphExplorerProps) {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [edgeActions, setEdgeActions] = useState<EdgeActionLog[]>([]);
  const [berrSummary, setBerrSummary] = useState<BerrFindingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Canvas interactions
  const [zoom, setZoom] = useState(0.88);
  const [pan, setPan] = useState({ x: 18, y: 12 });
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragOriginRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const svgContainerRef = useRef<HTMLDivElement | null>(null);

  // Filters & Highlights
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [highlightMode, setHighlightMode] = useState<
    "NONE" | "BUYER" | "SELLER" | "SHARED" | "CONTRADICTIONS" | "MISSING" | "UNVERIFIED"
  >("NONE");
  const [expandedNeighborhoodIds, setExpandedNeighborhoodIds] = useState<Set<string> | null>(null);

  // Selection & Side Panel
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<"INSPECT" | "DISCREPANCIES" | "HISTORY">("INSPECT");
  const [activeBerrFactId, setActiveBerrFactId] = useState<string | null>(null);

  // Investigator edge review form
  const [reviewExplanation, setReviewExplanation] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Evidence preview drawer
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<EvidencePreviewPayload | null>(null);

  const loadGraphData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [gRes, bRes] = await Promise.all([
        fetch(`/api/cases/${encodeURIComponent(caseId)}/graph`),
        fetch(`/api/cases/${encodeURIComponent(caseId)}/berr-v2`),
      ]);
      const gJson = await gRes.json();
      if (!gRes.ok) {
        throw new Error(gJson.error || `Failed to load BEG graph (${gRes.status})`);
      }
      setGraph(gJson.graph);
      setRevisions(gJson.revisions || []);
      setEdgeActions(gJson.edgeActions || []);

      if (bRes.ok) {
        const bJson = await bRes.json();
        setBerrSummary(bJson.berrV2 || null);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load Bilateral Evidence Graph");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Apply external highlight sync (e.g. from BERR tab)
  useEffect(() => {
    if (externalHighlightedNodeIds && externalHighlightedNodeIds.length > 0) {
      setSelectedNodeId(externalHighlightedNodeIds[0]);
      setSelectedEdgeId(null);
    }
  }, [externalHighlightedNodeIds]);

  const handleRebuild = async () => {
    setRebuilding(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/graph/rebuild`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to rebuild graph");
      }
      await loadGraphData();
      setActionFeedback("BEG graph rebuilt and persisted cleanly.");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Rebuild error");
    } finally {
      setRebuilding(false);
    }
  };

  // Filtered nodes & edges
  const filteredGraph = useMemo<GraphData | null>(() => {
    if (!graph) return null;
    const q = searchQuery.trim().toLowerCase();

    const matchingNodes = graph.nodes.filter((node) => {
      if (expandedNeighborhoodIds && !expandedNeighborhoodIds.has(node.id)) {
        return false;
      }

      if (q) {
        const haystack = [
          node.label,
          node.sublabel || "",
          node.begType || node.type,
          node.provenanceRecord?.evidenceId || "",
          node.provenanceRecord?.originalFilename || "",
          node.provenanceRecord?.sha256 || "",
          JSON.stringify(node.metadata),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      switch (categoryFilter) {
        case "BUYER":
          return node.swimlane === "BUYER" || node.party === "BUYER";
        case "SELLER":
          return node.swimlane === "SELLER" || node.party === "SELLER" || node.party === "MERCHANT";
        case "MARKETPLACE":
          return node.begType === "MARKETPLACE" || node.type === "MARKETPLACE";
        case "LOGISTICS":
          return node.begType === "LOGISTICS_PROVIDER" || node.type === "LOGISTICS_PROVIDER" || node.begType === "SELLER_DISPATCH_RECORD";
        case "VERIFIED":
          return node.verificationState === "VERIFIED";
        case "INFERRED":
          return node.verificationState === "INFERRED";
        case "CONTESTED":
          return node.verificationState === "CONTESTED" || node.begType === "CONTRADICTION_FINDING";
        case "MISSING":
          return node.begType === "MISSING_EVIDENCE" || node.discrepancyState === "MISSING";
        default:
          return true;
      }
    });

    const visibleIds = new Set(matchingNodes.map((n) => n.id));
    const allMatchingEdges = graph.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );

    // Dynamic Edge Culling to prevent main-thread canvas/SVG freezes on high-density graphs
    const MAX_EDGES = 300;
    let matchingEdges = allMatchingEdges;

    if (allMatchingEdges.length > MAX_EDGES) {
      const selectedConnected: typeof allMatchingEdges = [];
      const contestedOrContradicting: typeof allMatchingEdges = [];
      const verifiedOrSupported: typeof allMatchingEdges = [];
      const others: typeof allMatchingEdges = [];

      for (const edge of allMatchingEdges) {
        if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
          selectedConnected.push(edge);
        } else if (edge.verificationState === "CONTESTED" || edge.type === "CONTRADICTS_CLAIM") {
          contestedOrContradicting.push(edge);
        } else if (edge.verificationState === "VERIFIED" || edge.verificationState === "SOURCE_SUPPORTED") {
          verifiedOrSupported.push(edge);
        } else {
          others.push(edge);
        }
      }

      matchingEdges = [
        ...selectedConnected,
        ...contestedOrContradicting,
        ...verifiedOrSupported,
        ...others,
      ].slice(0, MAX_EDGES);
    }

    return {
      ...graph,
      nodes: matchingNodes,
      edges: matchingEdges,
    };
  }, [graph, searchQuery, categoryFilter, expandedNeighborhoodIds, selectedNodeId]);

  const layout = useMemo<VisualGraphLayout | null>(() => {
    if (!filteredGraph) return null;
    const projected = GraphProjectionService.projectToVisualLayout(filteredGraph, 1320, 620);
    return {
      ...projected,
      nodes: projected.nodes.map((n) => {
        const override = dragPositions[n.id];
        return override ? { ...n, x: override.x, y: override.y } : n;
      }),
    };
  }, [filteredGraph, dragPositions]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, VisualGraphNode>();
    layout?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [layout]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodeMap.get(selectedNodeId) || graph?.nodes.find((n) => n.id === selectedNodeId) || null : null),
    [selectedNodeId, nodeMap, graph]
  );

  const selectedEdge = useMemo(
    () => (selectedEdgeId ? graph?.edges.find((e) => e.id === selectedEdgeId) || null : null),
    [selectedEdgeId, graph]
  );

  // Connected highlight sets
  const highlightedSets = useMemo(() => {
    const activeFact = berrSummary?.classifiedFacts.find((f) => f.id === activeBerrFactId);
    const nodeIds = new Set<string>([
      ...(externalHighlightedNodeIds || []),
      ...(activeFact?.linkedBegNodeIds || []),
    ]);
    const edgeIds = new Set<string>([
      ...(externalHighlightedEdgeIds || []),
      ...(activeFact?.linkedBegEdgeIds || []),
    ]);

    if (selectedNodeId) {
      nodeIds.add(selectedNodeId);
      for (const e of graph?.edges || []) {
        if (e.source === selectedNodeId || e.target === selectedNodeId) {
          edgeIds.add(e.id);
          nodeIds.add(e.source);
          nodeIds.add(e.target);
        }
      }
    }
    if (selectedEdgeId && selectedEdge) {
      edgeIds.add(selectedEdgeId);
      nodeIds.add(selectedEdge.source);
      nodeIds.add(selectedEdge.target);
    }

    if (highlightMode !== "NONE" && graph) {
      for (const n of graph.nodes) {
        if (highlightMode === "BUYER" && (n.swimlane === "BUYER" || n.party === "BUYER")) nodeIds.add(n.id);
        if (highlightMode === "SELLER" && (n.swimlane === "SELLER" || n.party === "SELLER" || n.party === "MERCHANT")) nodeIds.add(n.id);
        if (highlightMode === "SHARED" && n.swimlane === "SHARED") nodeIds.add(n.id);
        if (highlightMode === "CONTRADICTIONS" && (n.verificationState === "CONTESTED" || n.begType === "CONTRADICTION_FINDING")) {
          nodeIds.add(n.id);
        }
        if (highlightMode === "MISSING" && (n.begType === "MISSING_EVIDENCE" || n.discrepancyState === "MISSING")) {
          nodeIds.add(n.id);
        }
        if (highlightMode === "UNVERIFIED" && (n.verificationState === "INFERRED" || n.verificationState === "UNVERIFIED")) {
          nodeIds.add(n.id);
        }
      }
      if (highlightMode === "CONTRADICTIONS") {
        for (const e of graph.edges) {
          if (e.verificationState === "CONTESTED" || e.begType === "CONTRADICTS_CLAIM") {
            edgeIds.add(e.id);
          }
        }
      }
    }

    return { nodeIds, edgeIds, hasAny: nodeIds.size > 0 || edgeIds.size > 0 };
  }, [
    graph,
    berrSummary,
    activeBerrFactId,
    externalHighlightedNodeIds,
    externalHighlightedEdgeIds,
    selectedNodeId,
    selectedEdgeId,
    selectedEdge,
    highlightMode,
  ]);

  const handleFitToScreen = () => {
    if (!layout || !svgContainerRef.current) {
      setZoom(0.88);
      setPan({ x: 18, y: 12 });
      return;
    }
    const rect = svgContainerRef.current.getBoundingClientRect();
    const fitScale = Math.min(rect.width / layout.width, rect.height / layout.height, 1.05);
    setZoom(Math.max(0.45, Number(fitScale.toFixed(2))));
    setPan({ x: 10, y: 10 });
  };

  const handleResetLayout = () => {
    setDragPositions({});
    setExpandedNeighborhoodIds(null);
    setActiveBerrFactId(null);
    setHighlightMode("NONE");
    setCategoryFilter("ALL");
    setSearchQuery("");
    setZoom(0.88);
    setPan({ x: 18, y: 12 });
  };

  const handleExpandNeighborhood = async (nodeId: string) => {
    try {
      const res = await fetch(
        `/api/cases/${encodeURIComponent(caseId)}/graph/expand?nodeId=${encodeURIComponent(nodeId)}&depth=1`
      );
      if (!res.ok) return;
      const data = await res.json();
      const nb = data.neighborhood;
      if (!nb) return;
      const ids = new Set<string>([
        nb.rootNode.id,
        ...nb.directNeighbors.map((n: GraphNode) => n.id),
      ]);
      setExpandedNeighborhoodIds(ids);
    } catch {
      // Fallback local neighborhood filter
      if (!graph) return;
      const ids = new Set<string>([nodeId]);
      for (const e of graph.edges) {
        if (e.source === nodeId) ids.add(e.target);
        if (e.target === nodeId) ids.add(e.source);
      }
      setExpandedNeighborhoodIds(ids);
    }
  };

  const handleEdgeAction = async (action: BegReviewAction) => {
    if (!selectedEdge) return;
    const explanation =
      reviewExplanation.trim() ||
      `Investigator marked relationship as ${action.toLowerCase().replace(/_/g, " ")}.`;
    setSubmittingAction(true);
    setActionFeedback(null);
    try {
      const res = await fetch(
        `/api/cases/${encodeURIComponent(caseId)}/beg/edges/${encodeURIComponent(selectedEdge.id)}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, explanation }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }
      setGraph(data.graph);
      setEdgeActions(data.edgeActions || []);
      setReviewExplanation("");
      setActionFeedback(`Recorded ${action} decision and updated BEG state.`);
    } catch (err: unknown) {
      setActionFeedback(err instanceof Error ? err.message : "Failed to submit decision");
    } finally {
      setSubmittingAction(false);
    }
  };

  const openEvidencePreview = async (evidenceId: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    try {
      const res = await fetch(
        `/api/cases/${encodeURIComponent(caseId)}/beg/evidence/${encodeURIComponent(evidenceId)}/preview`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Preview access denied or unavailable");
      }
      setPreviewData(data);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "Failed to load evidence preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Mouse handlers for drag & pan
  const onMouseMoveCanvas = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      const dx = (e.clientX - dragOriginRef.current.mouseX) / zoom;
      const dy = (e.clientY - dragOriginRef.current.mouseY) / zoom;
      setDragPositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: Math.max(90, dragOriginRef.current.startX + dx),
          y: Math.max(60, dragOriginRef.current.startY + dy),
        },
      }));
    } else if (isPanning) {
      setPan({
        x: dragOriginRef.current.startX + (e.clientX - dragOriginRef.current.mouseX),
        y: dragOriginRef.current.startY + (e.clientY - dragOriginRef.current.mouseY),
      });
    }
  };

  const onMouseUpCanvas = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  if (loading) {
    return <BegLoadingState />;
  }

  if (errorMsg || !graph || !layout) {
    return (
      <div className="rg-card border-rose-500/30 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-fg">Bilateral Evidence Graph Unavailable</h3>
            <p className="mt-1 text-xs text-muted">{errorMsg || "Unable to construct BEG graph for this case."}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={loadGraphData}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const summary = graph.metadata.summary;

  return (
    <div className="space-y-4">
      {/* Compact Header & KPI Strip */}
      <div className="rg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Network className="h-4 w-4 text-[var(--ai)]" />
              <h2 className="text-[16px] font-bold text-fg">Bilateral Evidence Graph (BEG)</h2>
              <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-subtle">
                Rev v{graph.metadata.revisionNumber || 1}
              </span>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                {graph.nodes.length} nodes • {graph.edges.length > 300 ? `Showing top ${filteredGraph?.edges.length} of ${graph.edges.length.toLocaleString()} links` : `${graph.edges.length} links`}
              </span>
              {(summary?.contestedCount || 0) > 0 && (
                <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  {summary?.contestedCount} Contested / Discrepancy
                </span>
              )}
              {(summary?.missingCount || 0) > 0 && (
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {summary?.missingCount} Missing Evidence Gap(s)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted">
              Left: Buyer submissions • Center: Shared order, product specs & findings • Right: Seller identity & fulfillment evidence
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSwitchToBerr && (
              <Button variant="secondary" size="sm" onClick={onSwitchToBerr}>
                <Scale className="mr-1.5 h-3.5 w-3.5" />
                Open BERR Matrix
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleResetLayout}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Layout
            </Button>
            <Button variant="primary" size="sm" onClick={handleRebuild} disabled={rebuilding}>
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", rebuilding && "animate-spin")} />
              {rebuilding ? "Syncing BEG..." : "Rebuild BEG"}
            </Button>
          </div>
        </div>

        {/* Search + Filter Pills + Highlight Toggles */}
        <div className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["ALL", "All"],
                ["BUYER", "Buyer"],
                ["SELLER", "Seller"],
                ["MARKETPLACE", "Marketplace"],
                ["LOGISTICS", "Logistics"],
                ["VERIFIED", "Verified"],
                ["INFERRED", "Inferred"],
                ["CONTESTED", "Contested"],
                ["MISSING", "Missing"],
              ] as Array<[CategoryFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  categoryFilter === key
                    ? "border-fg bg-fg text-bg font-semibold"
                    : "border-line bg-surface-2 text-subtle hover:text-fg"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order ID, SKU, filename, seller..."
                className="h-7.5 w-60 rounded-md border border-line bg-surface-2 pl-8 pr-7 text-xs text-fg placeholder:text-muted focus:border-fg focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-muted hover:text-fg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-md border border-line bg-surface-2 p-0.5 text-[11px]">
              {(
                [
                  ["CONTRADICTIONS", "Contradictions"],
                  ["MISSING", "Missing"],
                  ["UNVERIFIED", "Unverified"],
                ] as const
              ).map(([mode, text]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setHighlightMode((prev) => (prev === mode ? "NONE" : mode))}
                  className={cn(
                    "rounded px-2 py-0.5 font-medium transition-colors",
                    highlightMode === mode
                      ? "bg-rose-600 text-white"
                      : "text-subtle hover:text-fg"
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Workspace: Interactive 2D Canvas + Contextual Investigator Panel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_390px]">
        {/* Interactive Canvas Column */}
        <div className="rg-card relative flex flex-col overflow-hidden">
          {/* Canvas Floating Toolbar */}
          <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              {expandedNeighborhoodIds ? (
                <button
                  type="button"
                  onClick={() => setExpandedNeighborhoodIds(null)}
                  className="inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 font-medium text-fg border border-line hover:bg-surface-2"
                >
                  <Minimize2 className="h-3 w-3" />
                  Exit Focused Neighborhood
                </button>
              ) : (
                <span>Drag nodes to arrange • Click edge line to review relationship</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.12).toFixed(2))))}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="w-12 text-center font-mono text-[11px] text-subtle">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.12).toFixed(2))))}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="secondary" size="sm" onClick={handleFitToScreen}>
                <Maximize2 className="mr-1 h-3 w-3" />
                Fit
              </Button>
            </div>
          </div>

          {/* 2D Interactive SVG Viewport */}
          <div
            ref={svgContainerRef}
            onMouseMove={onMouseMoveCanvas}
            onMouseUp={onMouseUpCanvas}
            onMouseLeave={onMouseUpCanvas}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).dataset.canvasBg === "true") {
                setIsPanning(true);
                dragOriginRef.current = {
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  startX: pan.x,
                  startY: pan.y,
                };
              }
            }}
            className="relative h-[540px] w-full cursor-grab overflow-hidden bg-[var(--bg)] active:cursor-grabbing lg:h-[620px]"
          >
            <svg
              width="100%"
              height="100%"
              data-canvas-bg="true"
              className="select-none"
            >
              <defs>
                <marker id="arrow-verified" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#378D70" />
                </marker>
                <marker id="arrow-source" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#4C91C8" />
                </marker>
                <marker id="arrow-inferred" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#C18B45" />
                </marker>
                <marker id="arrow-contested" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#C8372D" />
                </marker>
                <marker id="arrow-unverified" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#929A96" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Bilateral Swimlane Zones */}
                <rect x={12} y={12} width={410} height={layout.height - 24} rx={12} fill="#4C91C8" fillOpacity={0.04} stroke="#4C91C8" strokeOpacity={0.18} />
                <text x={28} y={36} fontSize={11} fontWeight={700} fill="#4C91C8">
                  BUYER & BUYER EVIDENCE
                </text>

                <rect x={436} y={12} width={448} height={layout.height - 24} rx={12} fill="#8875B5" fillOpacity={0.04} stroke="#8875B5" strokeOpacity={0.18} />
                <text x={452} y={36} fontSize={11} fontWeight={700} fill="#8875B5">
                  SHARED ORDER, PRODUCT SPEC & INVESTIGATION
                </text>

                <rect x={898} y={12} width={410} height={layout.height - 24} rx={12} fill="#388F7D" fillOpacity={0.04} stroke="#388F7D" strokeOpacity={0.18} />
                <text x={914} y={36} fontSize={11} fontWeight={700} fill="#388F7D">
                  SELLER & SELLER FULFILLMENT EVIDENCE
                </text>

                {/* Edges */}
                {layout.edges.map((edge) => {
                  const sNode = nodeMap.get(edge.source);
                  const tNode = nodeMap.get(edge.target);
                  if (!sNode || !tNode) return null;

                  const vState = (edge.verificationState || "UNVERIFIED") as BegVerificationState;
                  const style = VERIFICATION_STYLES[vState] || VERIFICATION_STYLES.UNVERIFIED;
                  const isSelected = selectedEdgeId === edge.id;
                  const isHovered = hoveredEdgeId === edge.id;
                  const isHighlighted = highlightedSets.edgeIds.has(edge.id);
                  const isDimmed = highlightedSets.hasAny && !isHighlighted && !isSelected;

                  const midX = (sNode.x + tNode.x) / 2;
                  const midY = (sNode.y + tNode.y) / 2 - (sNode.y === tNode.y ? 18 : 0);
                  const pathD = `M ${sNode.x} ${sNode.y} Q ${midX} ${midY} ${tNode.x} ${tNode.y}`;
                  const markerId =
                    vState === "VERIFIED"
                      ? "url(#arrow-verified)"
                      : vState === "SOURCE_SUPPORTED"
                      ? "url(#arrow-source)"
                      : vState === "INFERRED"
                      ? "url(#arrow-inferred)"
                      : vState === "CONTESTED"
                      ? "url(#arrow-contested)"
                      : "url(#arrow-unverified)";

                  return (
                    <g
                      key={edge.id}
                      style={{ opacity: isDimmed ? 0.2 : 1, cursor: "pointer" }}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                        setSideTab("INSPECT");
                        setActionFeedback(null);
                      }}
                    >
                      {/* Invisible wide hit path */}
                      <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
                      <path
                        d={pathD}
                        fill="none"
                        stroke={style.stroke}
                        strokeWidth={isSelected || isHovered || isHighlighted ? 2.6 : 1.6}
                        strokeDasharray={style.dashed ? "6 4" : undefined}
                        markerEnd={markerId}
                      />
                      {(isSelected || isHovered || isHighlighted) && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-68}
                            y={-11}
                            width={136}
                            height={20}
                            rx={5}
                            fill="var(--surface)"
                            stroke={style.stroke}
                            strokeWidth={1}
                          />
                          <text
                            x={0}
                            y={2}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight={600}
                            fill="var(--ink)"
                          >
                            {(edge.begType || edge.type).slice(0, 22)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {layout.nodes.map((node) => {
                  const vState = (node.verificationState || "UNVERIFIED") as BegVerificationState;
                  const style = VERIFICATION_STYLES[vState] || VERIFICATION_STYLES.UNVERIFIED;
                  const isSelected = selectedNodeId === node.id;
                  const isHighlighted = highlightedSets.nodeIds.has(node.id);
                  const isDimmed = highlightedSets.hasAny && !isHighlighted && !isSelected;

                  const cardW = 176;
                  const cardH = 58;
                  const shortTitle =
                    node.label.length > 22 ? `${node.label.slice(0, 20)}..` : node.label;
                  const badgeLabel = node.begType || node.type;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x - cardW / 2}, ${node.y - cardH / 2})`}
                      style={{ opacity: isDimmed ? 0.25 : 1, cursor: "pointer" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingNodeId(node.id);
                        dragOriginRef.current = {
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                          startX: node.x,
                          startY: node.y,
                        };
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                        setSideTab("INSPECT");
                        setActionFeedback(null);
                      }}
                    >
                      <title>{`${node.label} (${badgeLabel}) — ${vState}`}</title>
                      <rect
                        width={cardW}
                        height={cardH}
                        rx={8}
                        fill="var(--surface)"
                        stroke={isSelected || isHighlighted ? "#111827" : style.stroke}
                        strokeWidth={isSelected || isHighlighted ? 2.4 : 1.5}
                        strokeDasharray={style.dashed ? "5 3" : undefined}
                      />
                      {/* Left semantic color stripe */}
                      <rect width={5} height={cardH} rx={2} fill={node.color} />

                      {/* Node Type Badge + Icon via foreignObject */}
                      <foreignObject x={10} y={7} width={cardW - 16} height={cardH - 12}>
                        <div className="flex h-full flex-col justify-between overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded"
                              style={{ backgroundColor: `${node.color}1F`, color: node.color }}
                            >
                              {renderNodeIcon(node, "h-3 w-3")}
                            </span>
                            <span className="truncate text-[11px] font-semibold text-fg leading-tight">
                              {shortTitle}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
                            <span className="truncate text-muted">{badgeLabel}</span>
                            <span
                              className={cn(
                                "shrink-0 rounded border px-1 py-0.2",
                                style.badgeBg,
                                style.badgeText
                              )}
                            >
                              {vState === "SOURCE_SUPPORTED" ? "SRC" : vState}
                            </span>
                          </div>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Graph Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/60 px-3 py-2 text-[11px] text-subtle">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-[#378D70]" /> Verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-[#4C91C8]" /> Source Supported
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-b-2 border-dashed border-[#C18B45]" /> Inferred (Review)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-b-2 border-dashed border-[#C8372D]" /> Contested
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-b-2 border-dashed border-[#929A96]" /> Missing / Unverified
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted">
              Integrity: {(graph.metadata.integrityHash || "").slice(0, 12)}
            </span>
          </div>
        </div>

        {/* Contextual Investigator Side Panel */}
        <div className="rg-card flex flex-col overflow-hidden">
          <div className="flex border-b border-line bg-surface-2/60 text-xs">
            <button
              type="button"
              onClick={() => setSideTab("INSPECT")}
              className={cn(
                "flex-1 px-3 py-2.5 font-medium border-b-2 transition-colors",
                sideTab === "INSPECT"
                  ? "border-fg text-fg font-semibold"
                  : "border-transparent text-subtle hover:text-fg"
              )}
            >
              Inspect Details
            </button>
            <button
              type="button"
              onClick={() => setSideTab("DISCREPANCIES")}
              className={cn(
                "flex-1 px-3 py-2.5 font-medium border-b-2 transition-colors",
                sideTab === "DISCREPANCIES"
                  ? "border-fg text-fg font-semibold"
                  : "border-transparent text-subtle hover:text-fg"
              )}
            >
              Gaps ({(summary?.discrepancies.length || 0) + (summary?.missingEvidenceGaps.length || 0)})
            </button>
            <button
              type="button"
              onClick={() => setSideTab("HISTORY")}
              className={cn(
                "flex-1 px-3 py-2.5 font-medium border-b-2 transition-colors",
                sideTab === "HISTORY"
                  ? "border-fg text-fg font-semibold"
                  : "border-transparent text-subtle hover:text-fg"
              )}
            >
              History ({revisions.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 max-h-[620px]">
            {sideTab === "INSPECT" && (
              <>
                {selectedNode ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                          {selectedNode.begType || selectedNode.type} • {selectedNode.sourceOrigin || "SYSTEM_GENERATED"}
                        </span>
                        <h3 className="mt-0.5 text-sm font-bold text-fg">{selectedNode.label}</h3>
                        {selectedNode.sublabel && (
                          <p className="mt-0.5 text-xs text-subtle">{selectedNode.sublabel}</p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleExpandNeighborhood(selectedNode.id)}
                        title="Isolate 1-hop neighborhood"
                      >
                        <Expand className="mr-1 h-3 w-3" />
                        Isolate
                      </Button>
                    </div>

                    {/* Verification & Provenance Badges */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-2 p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-muted">Verification State</span>
                        <p className="font-semibold text-fg">{selectedNode.verificationState || "UNVERIFIED"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted">Party / Swimlane</span>
                        <p className="font-semibold text-fg">{selectedNode.party || selectedNode.swimlane || "SHARED"}</p>
                      </div>
                      {selectedNode.timestamp && (
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase text-muted">Recorded Timestamp</span>
                          <p className="font-mono text-[11px] text-subtle">
                            {new Date(selectedNode.timestamp).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Evidence Provenance & Preview CTA */}
                    {selectedNode.provenanceRecord && (
                      <div className="space-y-2 rounded-lg border border-line p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-fg flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
                            Evidence Provenance
                          </span>
                          {selectedNode.provenanceRecord.evidenceId && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openEvidencePreview(selectedNode.provenanceRecord!.evidenceId!)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              Preview File
                            </Button>
                          )}
                        </div>
                        <dl className="space-y-1 text-[11px]">
                          {selectedNode.provenanceRecord.originalFilename && (
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted">Filename:</dt>
                              <dd className="font-mono text-fg truncate">{selectedNode.provenanceRecord.originalFilename}</dd>
                            </div>
                          )}
                          {selectedNode.provenanceRecord.uploadingParty && (
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted">Uploaded Party:</dt>
                              <dd className="font-medium text-fg">
                                {selectedNode.provenanceRecord.uploadingParty} ({selectedNode.provenanceRecord.uploadedBy || "User"})
                              </dd>
                            </div>
                          )}
                          {selectedNode.provenanceRecord.sha256 && (
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted">SHA-256:</dt>
                              <dd className="font-mono text-subtle truncate">{selectedNode.provenanceRecord.sha256.slice(0, 20)}...</dd>
                            </div>
                          )}
                          {selectedNode.provenanceRecord.accessPermissions && (
                            <div className="flex justify-between gap-2">
                              <dt className="text-muted">Visibility:</dt>
                              <dd className="font-mono text-subtle">{selectedNode.provenanceRecord.accessPermissions}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}

                    {/* Node Metadata Summary */}
                    <div className="rounded-lg border border-line p-3">
                      <h4 className="text-xs font-semibold text-fg mb-2">Structured Entity Attributes</h4>
                      <div className="space-y-1.5 text-[11px]">
                        {Object.entries(selectedNode.metadata)
                          .filter(([k, v]) => k !== "dbNodeId" && v !== null && v !== undefined && v !== "")
                          .slice(0, 10)
                          .map(([k, v]) => (
                            <div key={k} className="flex flex-col border-b border-line/60 pb-1 last:border-b-0">
                              <span className="font-mono text-[10px] text-muted">{k}</span>
                              <span className="text-fg break-words">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Connected Relationships */}
                    <div>
                      <h4 className="text-xs font-semibold text-fg mb-2">Connected Relationships</h4>
                      <div className="space-y-1.5">
                        {graph.edges
                          .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                          .map((edge) => {
                            const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                            const otherNode = graph.nodes.find((n) => n.id === otherId);
                            return (
                              <button
                                key={edge.id}
                                type="button"
                                onClick={() => {
                                  setSelectedEdgeId(edge.id);
                                  setSelectedNodeId(null);
                                }}
                                className="flex w-full items-center justify-between rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-left text-[11px] hover:border-fg"
                              >
                                <div className="min-w-0">
                                  <span className="font-mono text-[10px] text-muted">
                                    {edge.begType || edge.type} • {edge.verificationState || "UNVERIFIED"}
                                  </span>
                                  <p className="truncate font-medium text-fg">
                                    {otherNode?.label || otherId}
                                  </p>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : selectedEdge ? (
                  <div className="space-y-4">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        Relationship Review ({selectedEdge.begType || selectedEdge.type})
                      </span>
                      <h3 className="mt-0.5 text-sm font-bold text-fg">{selectedEdge.label}</h3>
                      <p className="mt-1 text-xs text-subtle">
                        {graph.nodes.find((n) => n.id === selectedEdge.source)?.label || selectedEdge.source}{" "}
                        {"->"} {graph.nodes.find((n) => n.id === selectedEdge.target)?.label || selectedEdge.target}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface-2 p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-muted">Current State</span>
                        <p className="font-semibold text-fg">{selectedEdge.verificationState || "UNVERIFIED"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted">Original AI State</span>
                        <p className="font-semibold text-subtle">{selectedEdge.originalAiState || selectedEdge.verificationState || "UNVERIFIED"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted">Provenance</span>
                        <p className="font-mono text-[11px] text-fg">{selectedEdge.provenance}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted">Match Method</span>
                        <p className="font-mono text-[11px] text-fg">{selectedEdge.matchMethod || "RULE"}</p>
                      </div>
                    </div>

                    {selectedEdge.explanation && (
                      <div className="rounded-lg border border-line p-2.5 text-xs text-subtle">
                        <span className="font-semibold text-fg">Basis: </span>
                        {selectedEdge.explanation}
                      </div>
                    )}

                    {/* Investigator Actions */}
                    <div className="space-y-2 rounded-lg border border-line p-3">
                      <h4 className="text-xs font-semibold text-fg">Investigator Action</h4>
                      <textarea
                        rows={2}
                        value={reviewExplanation}
                        onChange={(e) => setReviewExplanation(e.target.value)}
                        placeholder="Record reason for confirming, rejecting, contesting, or requesting info..."
                        className="w-full rounded-md border border-line bg-surface-2 p-2 text-xs text-fg placeholder:text-muted focus:border-fg focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={submittingAction}
                          onClick={() => handleEdgeAction("CONFIRM")}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={submittingAction}
                          onClick={() => handleEdgeAction("MARK_CONTESTED")}
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Contest
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={submittingAction}
                          onClick={() => handleEdgeAction("REJECT")}
                        >
                          Reject Link
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={submittingAction}
                          onClick={() => handleEdgeAction("REQUEST_ADDITIONAL_INFO")}
                        >
                          Request Info
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="col-span-2"
                          disabled={submittingAction}
                          onClick={() => handleEdgeAction("ESCALATE")}
                        >
                          Escalate to Senior Review
                        </Button>
                      </div>
                      {actionFeedback && (
                        <p className="text-[11px] font-medium text-[var(--agreed)]">{actionFeedback}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Info className="h-7 w-7 text-muted mb-2" />
                    <p className="text-xs font-semibold text-fg">Select a Node or Relationship</p>
                    <p className="mt-1 text-[11px] text-muted max-w-[260px]">
                      Click any evidence artifact, entity, discrepancy, or relationship edge on the canvas to inspect provenance and apply investigator actions.
                    </p>
                  </div>
                )}
              </>
            )}

            {sideTab === "DISCREPANCIES" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-fg">Cross-Party Discrepancies & Gaps</h4>
                {(summary?.discrepancies || []).map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      if (d.involvedNodeIds.length > 0) {
                        setSelectedNodeId(d.involvedNodeIds[0]);
                        setHighlightMode("CONTRADICTIONS");
                      }
                    }}
                    className="w-full rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-left text-xs hover:border-rose-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg">{d.attribute}</span>
                      <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] text-rose-700 dark:text-rose-300">
                        {d.state}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-subtle">{d.summary}</p>
                  </button>
                ))}
                {(summary?.missingEvidenceGaps || []).map((gap) => (
                  <button
                    key={gap.key}
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(gap.nodeId);
                      setHighlightMode("MISSING");
                    }}
                    className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left text-xs hover:border-amber-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg">{gap.label}</span>
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-300">
                        MISSING ({gap.party})
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-subtle">{gap.reason}</p>
                  </button>
                ))}
                {(summary?.discrepancies.length || 0) === 0 && (summary?.missingEvidenceGaps.length || 0) === 0 && (
                  <p className="text-xs text-muted">No open discrepancies or missing evidence gaps detected.</p>
                )}
              </div>
            )}

            {sideTab === "HISTORY" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-fg flex items-center gap-1.5 mb-2">
                    <History className="h-3.5 w-3.5" />
                    Persisted Graph Revisions
                  </h4>
                  <div className="space-y-2">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="rounded-lg border border-line bg-surface-2 p-2.5 text-[11px]">
                        <div className="flex items-center justify-between font-semibold text-fg">
                          <span>v{rev.version} • {rev.triggerEvent}</span>
                          <span className="font-mono text-[10px] text-muted">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 text-subtle">
                          {rev.nodeCount} nodes, {rev.edgeCount} edges, {rev.contradictionCount} contested, {rev.missingCount} missing
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-fg mb-2">Investigator Edge Decisions</h4>
                  {edgeActions.length === 0 ? (
                    <p className="text-[11px] text-muted">No investigator edge overrides recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {edgeActions.slice(0, 12).map((act) => (
                        <div key={act.id} className="rounded-lg border border-line p-2.5 text-[11px]">
                          <div className="flex items-center justify-between font-semibold text-fg">
                            <span>{act.action}</span>
                            <span className="font-mono text-[10px] text-muted">{act.actorName}</span>
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-subtle">
                            {act.previousVerificationState} {"->"} {act.newVerificationState}
                          </p>
                          <p className="mt-1 text-subtle">{act.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connected BERR Findings Interactive Strip */}
      {berrSummary && berrSummary.classifiedFacts.length > 0 && (
        <div className="rg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-[var(--ai)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg">
                Linked BERR Findings ({berrSummary.classifiedFacts.length})
              </h3>
              {berrSummary.isStale && (
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  Stale — Re-run BERR after recent BEG update
                </span>
              )}
            </div>
            {berrSummary.recommendedRemedy && (
              <span className="text-xs font-medium text-subtle">
                Proposed Remedy: <strong className="text-fg">{berrSummary.recommendedRemedy.type}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {berrSummary.classifiedFacts.map((fact) => {
              const isActive = activeBerrFactId === fact.id;
              return (
                <button
                  key={fact.id}
                  type="button"
                  onClick={() => {
                    setActiveBerrFactId((prev) => (prev === fact.id ? null : fact.id));
                    if (fact.linkedBegNodeIds && fact.linkedBegNodeIds[0]) {
                      setSelectedNodeId(fact.linkedBegNodeIds[0]);
                      setSelectedEdgeId(null);
                    }
                  }}
                  className={cn(
                    "rounded-lg border p-2.5 text-left text-xs transition-colors",
                    isActive
                      ? "border-fg bg-surface-2"
                      : "border-line bg-surface hover:border-line-strong"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold text-fg truncate">
                      {fact.field}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        fact.classification === "CONTESTED"
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : fact.classification === "MISSING"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {fact.classification}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-subtle">{fact.explanation}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Authorized Evidence Preview Slide-Over */}
      <SlideOver
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Evidence Artifact Preview"
      >
        {previewLoading ? (
          <div className="py-12 text-center text-xs text-muted">Loading authorized evidence preview...</div>
        ) : previewError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
            {previewError}
          </div>
        ) : previewData ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-fg truncate">{previewData.evidence.filename}</strong>
                <a
                  href={previewData.evidence.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 text-[11px] font-medium text-fg hover:bg-surface-2"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
              <p className="font-mono text-[10px] text-muted">
                {previewData.evidence.mimeType} • {previewData.evidence.uploadedParty} • SHA-256{" "}
                {previewData.evidence.sha256.slice(0, 16)}...
              </p>
            </div>

            {previewData.previewMode === "image" && (
              <div className="overflow-hidden rounded-lg border border-line bg-surface-2 p-2 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewData.evidence.downloadUrl}
                  alt={previewData.evidence.filename}
                  className="mx-auto max-h-[340px] rounded object-contain"
                />
              </div>
            )}

            {previewData.previewMode === "video" && (
              <video
                src={previewData.evidence.downloadUrl}
                controls
                className="w-full max-h-[340px] rounded-lg border border-line bg-black"
              />
            )}

            {previewData.previewMode === "pdf" && (
              <iframe
                src={previewData.evidence.downloadUrl}
                title={previewData.evidence.filename}
                className="h-[340px] w-full rounded-lg border border-line"
              />
            )}

            {previewData.textExcerpt && (
              <pre className="max-h-[260px] overflow-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-[11px] text-fg whitespace-pre-wrap">
                {previewData.textExcerpt}
              </pre>
            )}

            {previewData.analysis && (
              <div className="rounded-lg border border-line p-3 text-xs space-y-2">
                <h4 className="font-semibold text-fg">
                  Verification Screening ({previewData.analysis.assessmentState})
                </h4>
                <p className="text-[11px] text-subtle">{previewData.analysis.findingsSummary}</p>
                {previewData.analysis.extractedFields.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-line">
                    <span className="font-mono text-[10px] uppercase text-muted">Extracted Fields</span>
                    {previewData.analysis.extractedFields.map((f) => (
                      <div key={f.id} className="flex justify-between text-[11px]">
                        <span className="font-mono text-muted">{f.fieldKey}</span>
                        <span className="font-medium text-fg">{f.normalizedValue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </SlideOver>
    </div>
  );
}
