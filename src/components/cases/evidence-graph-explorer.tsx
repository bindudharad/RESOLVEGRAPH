"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Network,
  Table as TableIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Info,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
import { VisualGraphLayout, VisualGraphNode } from "@/server/graph/graph-projection";

interface EvidenceGraphExplorerProps {
  caseId: string;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  CASE: { bg: "bg-amber-950/40", border: "border-amber-500", text: "text-amber-300", dot: "#f59e0b" },
  BUYER: { bg: "bg-blue-950/60", border: "border-blue-500", text: "text-blue-300", dot: "#3b82f6" },
  MERCHANT: { bg: "bg-emerald-950/60", border: "border-emerald-500", text: "text-emerald-300", dot: "#10b981" },
  CLAIM: { bg: "bg-amber-950/60", border: "border-amber-500", text: "text-amber-300", dot: "#f59e0b" },
  EVIDENCE: { bg: "bg-cyan-950/60", border: "border-cyan-500", text: "text-cyan-300", dot: "#06b6d4" },
  FACT: { bg: "bg-indigo-950/60", border: "border-indigo-500", text: "text-indigo-300", dot: "#6366f1" },
  FINDING: { bg: "bg-rose-950/60", border: "border-rose-500", text: "text-rose-300", dot: "#ef4444" },
  TIMELINE_EVENT: { bg: "bg-slate-900/60", border: "border-slate-500", text: "text-slate-300", dot: "#94a3b8" },
  RESOLUTION_PROPOSAL: { bg: "bg-teal-950/60", border: "border-teal-500", text: "text-teal-300", dot: "#14b8a6" },
};

export function EvidenceGraphExplorer({ caseId }: EvidenceGraphExplorerProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"canvas" | "table">("canvas");
  const [layout, setLayout] = useState<VisualGraphLayout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<VisualGraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(["CASE", "BUYER", "MERCHANT", "CLAIM", "EVIDENCE", "FACT", "FINDING", "TIMELINE_EVENT", "RESOLUTION_PROPOSAL"])
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Load layout data from API
  const fetchGraph = async (rebuild = false) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/graph?format=layout${rebuild ? "&rebuild=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        setLayout(data.layout);
        if (data.layout?.nodes?.length > 0 && !selectedNode) {
          setSelectedNode(data.layout.nodes[0]);
        }
      }
    } catch {
      // Fallback placeholder if API fails
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/graph?format=layout`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setLayout(data.layout);
          if (data.layout?.nodes?.length > 0) {
            setSelectedNode(data.layout.nodes[0]);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [caseId]);

  const handleRebuild = async () => {
    setIsRebuilding(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/graph/rebuild`, { method: "POST" });
      if (res.ok) {
        toast({
          tone: "success",
          title: "Graph Rebuilt",
          description: "Bilateral Evidence Graph and snapshot refreshed with newest findings.",
        });
        await fetchGraph(true);
      }
    } catch {
      toast({
        tone: "error",
        title: "Rebuild Failed",
        description: "Unable to rebuild evidence graph snapshot.",
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  // Filter nodes according to type and search query
  const visibleNodes = useMemo(() => {
    if (!layout?.nodes) return [];
    return layout.nodes.filter((node) => {
      if (!selectedTypes.has(node.type)) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        return (
          node.label.toLowerCase().includes(q) ||
          (node.sublabel && node.sublabel.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [layout, selectedTypes, searchQuery]);

  const visibleNodeIdSet = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => {
    if (!layout?.edges) return [];
    return layout.edges.filter(
      (e) => visibleNodeIdSet.has(e.source) && visibleNodeIdSet.has(e.target)
    );
  }, [layout, visibleNodeIdSet]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="rg-card flex flex-col overflow-hidden border border-line bg-surface">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-fg">Bilateral Evidence Graph Explorer</h2>
            <p className="text-[12px] text-subtle">
              Interactive multi-relational knowledge graph connecting claims, evidence, facts, and remedies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-line bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                viewMode === "canvas" ? "bg-surface text-fg shadow-sm" : "text-subtle hover:text-fg"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                viewMode === "table" ? "bg-surface text-fg shadow-sm" : "text-subtle hover:text-fg"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Accessible Table</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRebuild}
            disabled={isRebuilding}
            icon={<RefreshCw className={`h-3.5 w-3.5 ${isRebuilding ? "animate-spin" : ""}`} />}
          >
            Rebuild Snapshot
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-faint mr-1">
            Filter Tiers:
          </span>
          {Object.keys(TYPE_COLORS).map((t) => {
            const isSelected = selectedTypes.has(t);
            const style = TYPE_COLORS[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                  isSelected
                    ? `${style.bg} ${style.border} ${style.text}`
                    : "border-line bg-surface text-faint hover:text-muted"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: isSelected ? style.dot : "#64748b" }}
                />
                <span>{t.replace("_", " ")}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search graph nodes..."
            className="w-full rounded-md border border-line bg-surface py-1 pl-8 pr-3 text-[12px] text-fg placeholder:text-faint focus:border-[var(--color-brand)] focus:outline-none"
          />
        </div>
      </div>

      {/* Main Graph Content */}
      {viewMode === "canvas" ? (
        <div className="relative flex min-h-[500px] flex-col xl:flex-row">
          {/* SVG Canvas Area */}
          <div className="relative flex-1 overflow-auto bg-[#080d1a] p-4">
            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-line bg-surface/90 p-1 backdrop-blur shadow-md">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
                className="rounded p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="px-1 text-[11px] font-mono text-faint">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                className="rounded p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="rounded p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"
                title="Reset Zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-brand)] border-t-transparent" />
                  <p className="text-[13px] text-subtle">Generating bilateral evidence projection...</p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  transition: "transform 0.15s ease-out",
                  minWidth: layout?.width || 1000,
                  minHeight: layout?.height || 650,
                }}
                className="relative"
              >
                <svg
                  width={layout?.width || 1000}
                  height={layout?.height || 650}
                  className="pointer-events-auto"
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                    </marker>
                    <marker
                      id="arrow-active"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                    </marker>
                  </defs>

                  {/* Edges */}
                  {visibleEdges.map((edge) => {
                    const sourceNode = visibleNodes.find((n) => n.id === edge.source);
                    const targetNode = visibleNodes.find((n) => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    const isConnectedToSelected =
                      selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

                    return (
                      <g key={edge.id} className="transition-opacity">
                        <line
                          x1={sourceNode.x}
                          y1={sourceNode.y}
                          x2={targetNode.x}
                          y2={targetNode.y}
                          stroke={isConnectedToSelected ? "#a78bfa" : "#334155"}
                          strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                          strokeDasharray={edge.type === "ASSESSES_CLAIM" ? "4,4" : undefined}
                          markerEnd={isConnectedToSelected ? "url(#arrow-active)" : "url(#arrow)"}
                        />
                      </g>
                    );
                  })}

                  {/* Nodes */}
                  {visibleNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    const style = TYPE_COLORS[node.type] || { dot: "#94a3b8" };

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer"
                      >
                        <circle
                          r={isSelected ? 16 : 12}
                          fill={style.dot}
                          fillOpacity={0.25}
                          stroke={style.dot}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="transition-all hover:scale-125"
                        />
                        <circle r={isSelected ? 6 : 4} fill={style.dot} />

                        {/* Label text */}
                        <text
                          y={24}
                          textAnchor="middle"
                          className="select-none fill-slate-300 text-[10.5px] font-medium"
                        >
                          {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                        </text>
                        <text
                          y={36}
                          textAnchor="middle"
                          className="select-none fill-slate-500 text-[9px]"
                        >
                          {node.type}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Node Inspector Drawer */}
          <div className="w-full border-t border-line bg-surface p-4 xl:w-80 xl:border-l xl:border-t-0">
            {selectedNode ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold"
                    style={{
                      backgroundColor: `${TYPE_COLORS[selectedNode.type]?.dot || "#94a3b8"}20`,
                      color: TYPE_COLORS[selectedNode.type]?.dot || "#cbd5e1",
                    }}
                  >
                    {selectedNode.type}
                  </span>
                  {selectedNode.party && (
                    <span className="text-[11px] font-medium text-muted">
                      Party: <strong className="text-fg">{selectedNode.party}</strong>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-[15px] font-bold text-fg break-words">{selectedNode.label}</h3>
                  {selectedNode.sublabel && (
                    <p className="mt-1 text-[12px] text-subtle">{selectedNode.sublabel}</p>
                  )}
                </div>

                {/* Node Metadata Tags */}
                <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-faint">ID:</span>
                    <span className="font-mono text-[10px] text-muted">{selectedNode.id}</span>
                  </div>
                  {selectedNode.confidenceBand && (
                    <div className="flex items-center justify-between">
                      <span className="text-faint">Confidence:</span>
                      <span className="font-semibold text-emerald-400">
                        {selectedNode.confidenceBand}
                      </span>
                    </div>
                  )}
                  {selectedNode.reviewStatus && (
                    <div className="flex items-center justify-between">
                      <span className="text-faint">Review Status:</span>
                      <span className="font-medium text-fg">{selectedNode.reviewStatus}</span>
                    </div>
                  )}
                  {selectedNode.timestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-faint">Timestamp:</span>
                      <span className="font-mono text-[10.5px] text-muted">
                        {new Date(selectedNode.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Extended Details */}
                {Object.keys(selectedNode.metadata || {}).length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-1.5">
                      Extracted Attributes
                    </h4>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-line bg-surface-2 p-2.5 text-[11.5px] font-mono text-muted space-y-1">
                      {Object.entries(selectedNode.metadata).map(([k, v]) => (
                        <div key={k} className="flex flex-col">
                          <span className="text-faint">{k}:</span>
                          <span className="text-fg break-words">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center">
                <Info className="h-6 w-6 text-faint mb-2" />
                <p className="text-[13px] text-subtle">Select any node on the canvas to inspect its relational provenance.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Accessible Table View */
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-faint">
                <th className="pb-2">Node Type</th>
                <th className="pb-2">Identifier / Label</th>
                <th className="pb-2">Party</th>
                <th className="pb-2">Confidence</th>
                <th className="pb-2">Review Status</th>
                <th className="pb-2">Connections</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {visibleNodes.map((n) => {
                const conns = visibleEdges.filter((e) => e.source === n.id || e.target === n.id).length;
                return (
                  <tr key={n.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="py-2.5 font-mono text-[11px] font-semibold">
                      <span
                        className="rounded px-2 py-0.5"
                        style={{
                          backgroundColor: `${TYPE_COLORS[n.type]?.dot || "#94a3b8"}20`,
                          color: TYPE_COLORS[n.type]?.dot || "#cbd5e1",
                        }}
                      >
                        {n.type}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium text-fg">
                      <div>{n.label}</div>
                      {n.sublabel && <div className="text-[11px] text-subtle">{n.sublabel}</div>}
                    </td>
                    <td className="py-2.5 text-muted">{n.party || "NEUTRAL"}</td>
                    <td className="py-2.5 text-muted">{n.confidenceBand || "HIGH"}</td>
                    <td className="py-2.5 text-muted">{n.reviewStatus || "UNREVIEWED"}</td>
                    <td className="py-2.5 font-mono text-muted">{conns} link(s)</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
