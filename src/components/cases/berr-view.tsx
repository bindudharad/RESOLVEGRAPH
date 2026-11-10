"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Check,
  ArrowLeftRight,
  HelpCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Camera,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { CANONICAL_BERR_ROWS, type BerrComparisonRow } from "@/lib/demo-fixture";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/ui/slide-over";
import { cn } from "@/lib/utils";

interface BerrViewProps {
  caseId?: string;
  customerName?: string;
  merchantName?: string;
}

export function BerrView({
  caseId = "RG-2026-0412",
  customerName = "Alex Morgan (Buyer)",
  merchantName = "Apex Tech Labs Ltd (Merchant)",
}: BerrViewProps) {
  const [filterState, setFilterState] = useState<string>("ALL");
  const [selectedRow, setSelectedRow] = useState<BerrComparisonRow | null>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const filteredRows = CANONICAL_BERR_ROWS.filter((row) => {
    if (filterState === "ALL") return true;
    return row.state === filterState;
  });

  const countAgreed = CANONICAL_BERR_ROWS.filter((r) => r.state === "AGREED").length;
  const countContested = CANONICAL_BERR_ROWS.filter((r) => r.state === "CONTESTED").length;
  const countMissing = CANONICAL_BERR_ROWS.filter((r) => r.state === "MISSING").length;

  return (
    <div className="space-y-4">
      {/* Header and Filter Toolbar */}
      <div className="rg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-fg">
                Bilateral Evidence Reconciliation (BERR)
              </h2>
              <span className="rounded bg-[var(--ai)]/10 px-2 py-0.5 text-[11px] font-mono text-[var(--ai)] border border-[var(--ai)]/30">
                Convergence Spine
              </span>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Equal-weight bilateral evaluation comparing buyer submissions against merchant dispatch telemetry.
            </p>
          </div>

          {/* Segmented Filter Bar */}
          <div className="flex items-center rounded-lg border border-line bg-surface-2 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setFilterState("ALL")}
              className={cn(
                "rounded-md px-3 py-1 font-medium transition-colors",
                filterState === "ALL"
                  ? "bg-surface text-fg shadow-xs font-semibold"
                  : "text-subtle hover:text-fg",
              )}
            >
              All ({CANONICAL_BERR_ROWS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("AGREED")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "AGREED"
                  ? "bg-surface text-[var(--agreed)] shadow-xs font-semibold"
                  : "text-subtle hover:text-fg",
              )}
            >
              <Check className="h-3 w-3 text-[var(--agreed)]" />
              Agreed ({countAgreed})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("CONTESTED")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "CONTESTED"
                  ? "bg-surface text-[var(--contested)] shadow-xs font-semibold"
                  : "text-subtle hover:text-fg",
              )}
            >
              <ArrowLeftRight className="h-3 w-3 text-[var(--contested)]" />
              Contested ({countContested})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("MISSING")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "MISSING"
                  ? "bg-surface text-[var(--ink-2)] shadow-xs font-semibold"
                  : "text-subtle hover:text-fg",
              )}
            >
              <HelpCircle className="h-3 w-3 text-subtle" />
              Missing ({countMissing})
            </button>
          </div>
        </div>

        {/* Bilateral Party Header Track */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_180px_1fr] items-center gap-4 border-t border-line pt-4">
          <div className="rounded-md border-t-2 border-t-[var(--buyer)] bg-surface-2/60 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--buyer)]">
              Buyer Evidence Thread
            </span>
            <p className="mt-0.5 text-[13px] font-medium text-fg">{customerName}</p>
          </div>

          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
              Comparison Axis
            </span>
            <div className="mx-auto mt-1 h-[2px] w-12 bg-line-strong" />
          </div>

          <div className="rounded-md border-t-2 border-t-[var(--merchant)] bg-surface-2/60 p-3 text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--merchant)]">
              Merchant Evidence Thread
            </span>
            <p className="mt-0.5 text-[13px] font-medium text-fg">{merchantName}</p>
          </div>
        </div>
      </div>

      {/* Comparison Rows */}
      <div className="space-y-3">
        {filteredRows.map((row) => {
          const isSelected = selectedRow?.id === row.id;
          const isBuyerHovered = hoveredSource === row.buyerSourceId;
          const isMerchantHovered = hoveredSource === row.merchantSourceId;

          return (
            <div
              key={row.id}
              onClick={() => setSelectedRow(row)}
              className={cn(
                "group cursor-pointer rounded-lg border border-line bg-surface p-4 transition-all hover:border-line-strong hover:shadow-sm",
                isSelected && "ring-2 ring-[var(--accent)]",
                row.state === "CONTESTED" && "border-l-4 border-l-[var(--contested)]",
                row.state === "AGREED" && "border-l-4 border-l-[var(--agreed)]",
                row.state === "MISSING" && "border-l-4 border-l-line-strong",
              )}
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr] gap-4 items-center">
                {/* Buyer Column */}
                <div
                  className={cn(
                    "rounded-md p-3 transition-colors",
                    isBuyerHovered ? "bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)]" : "bg-surface-2/40",
                  )}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-subtle font-mono">{row.buyerSourceId || "NO SOURCE"}</span>
                    {row.buyerSourceId && (
                      <span
                        onMouseEnter={() => setHoveredSource(row.buyerSourceId!)}
                        onMouseLeave={() => setHoveredSource(null)}
                        className="cursor-pointer rounded bg-surface px-1.5 py-0.2 font-mono text-[10px] text-[var(--buyer)] border border-[var(--buyer)]/30 hover:underline"
                      >
                        Ref {row.buyerSourceId}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-fg leading-snug">
                    {row.buyerEvidence}
                  </p>
                </div>

                {/* Central Spine */}
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[12px] font-bold text-fg">
                    {row.attribute}
                  </span>
                  <div className="mt-1.5">
                    {row.state === "AGREED" && (
                      <Chip variant="agreed">Agreed</Chip>
                    )}
                    {row.state === "CONTESTED" && (
                      <Chip variant="contested">Contested</Chip>
                    )}
                    {row.state === "MISSING" && (
                      <Chip variant="missing">Not provided</Chip>
                    )}
                    {row.state === "VERIFIED" && (
                      <Chip variant="verified">Verified</Chip>
                    )}
                  </div>
                  <span className="mt-1.5 font-mono text-[10.5px] text-subtle">
                    Confidence: {(row.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Merchant Column */}
                <div
                  className={cn(
                    "rounded-md p-3 transition-colors text-right",
                    isMerchantHovered ? "bg-[color-mix(in_srgb,var(--merchant)_12%,transparent)]" : "bg-surface-2/40",
                  )}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    {row.merchantSourceId ? (
                      <span
                        onMouseEnter={() => setHoveredSource(row.merchantSourceId!)}
                        onMouseLeave={() => setHoveredSource(null)}
                        className="cursor-pointer rounded bg-surface px-1.5 py-0.2 font-mono text-[10px] text-[var(--merchant)] border border-[var(--merchant)]/30 hover:underline"
                      >
                        Ref {row.merchantSourceId}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-subtle font-mono">{row.merchantSourceId || "NO SOURCE"}</span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[13px] leading-snug",
                      row.state === "MISSING"
                        ? "italic text-subtle rg-hatched-missing py-1 px-2 rounded"
                        : "text-fg",
                    )}
                  >
                    {row.merchantEvidence}
                  </p>
                </div>
              </div>

              {/* Finding explanation drawer trigger */}
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11.5px] text-subtle">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span className="text-muted">{row.explanation}</span>
                </span>
                <span className="font-medium text-[var(--accent)] group-hover:underline flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Compare Evidence
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-side Evidence Preview SlideOver */}
      <SlideOver
        open={selectedRow !== null}
        onClose={() => {
          setSelectedRow(null);
          setZoomLevel(1);
        }}
        title={selectedRow ? `Comparison: ${selectedRow.attribute}` : "Evidence Comparison"}
        description="Side-by-side verification with extracted fact coordinates."
        width="wide"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                icon={<ZoomOut className="h-3.5 w-3.5" />}
              >
                Zoom Out
              </Button>
              <span className="font-mono text-xs text-muted">
                {(zoomLevel * 100).toFixed(0)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                icon={<ZoomIn className="h-3.5 w-3.5" />}
              >
                Zoom In
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(1)}
              >
                Reset
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedRow(null)}
            >
              Done Viewing
            </Button>
          </div>
        }
      >
        {selectedRow && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-subtle">Attribute Under Review</span>
                <p className="font-bold text-fg text-sm">{selectedRow.attribute}</p>
              </div>
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-subtle">Arbitration State</span>
                <div className="mt-0.5">
                  <Chip variant={selectedRow.state === "AGREED" ? "agreed" : selectedRow.state === "CONTESTED" ? "contested" : "missing"}>
                    {selectedRow.state}
                  </Chip>
                </div>
              </div>
            </div>

            {/* Side-by-side Visual Viewport */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buyer Artifact */}
              <div className="rounded-lg border border-line p-3 bg-surface-2/40">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-[12px] text-[var(--buyer)]">
                    Buyer Proof ({selectedRow.buyerSourceId || "E-0101"})
                  </span>
                  <span className="text-[11px] font-mono text-subtle">Unboxing Photo</span>
                </div>
                <div
                  className="mt-3 relative h-[260px] rounded border border-dashed border-line bg-surface flex items-center justify-center overflow-hidden"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                >
                  <div className="text-center p-4">
                    <Camera className="h-8 w-8 mx-auto text-[var(--buyer)] mb-2" />
                    <p className="text-xs font-mono font-medium text-fg">{selectedRow.buyerEvidence}</p>
                    <div className="mt-3 inline-block rounded border-2 border-dashed border-rose-500 bg-rose-500/10 px-2 py-1 text-[11px] font-mono text-rose-500">
                      Detected Serial: APX-512-V2
                    </div>
                  </div>
                </div>
              </div>

              {/* Merchant Artifact */}
              <div className="rounded-lg border border-line p-3 bg-surface-2/40">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-[12px] text-[var(--merchant)]">
                    Merchant Record ({selectedRow.merchantSourceId || "E-0201"})
                  </span>
                  <span className="text-[11px] font-mono text-subtle">Warehouse Manifest</span>
                </div>
                <div
                  className="mt-3 relative h-[260px] rounded border border-dashed border-line bg-surface flex items-center justify-center overflow-hidden"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                >
                  <div className="text-center p-4">
                    <FileText className="h-8 w-8 mx-auto text-[var(--merchant)] mb-2" />
                    <p className="text-xs font-mono font-medium text-fg">{selectedRow.merchantEvidence}</p>
                    {selectedRow.state === "MISSING" ? (
                      <div className="mt-3 inline-block rounded border border-dashed border-[var(--missing)] bg-[var(--surface-2)] px-2 py-1 text-[11px] font-mono text-subtle rg-hatched-missing">
                        Barcode scan record absent
                      </div>
                    ) : (
                      <div className="mt-3 inline-block rounded border-2 border-dashed border-[var(--agreed)] bg-[var(--agreed)]/10 px-2 py-1 text-[11px] font-mono text-[var(--agreed)]">
                        Dispatch Sku: APX-1000-NVME
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Forensic Finding Explanation */}
            <div className="rounded-lg border border-dashed border-[var(--ai)] bg-[var(--ai)]/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--ai)]">
                <Sparkles className="h-4 w-4" />
                <span>Forensic Finding Annotation</span>
              </div>
              <p className="mt-2 text-xs text-fg leading-relaxed">
                {selectedRow.explanation}
              </p>
              <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-subtle">
                <span>Model: ResolveGraph Multimodal Vision 4.2</span>
                <span>•</span>
                <span>IoU Score: 0.94</span>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
