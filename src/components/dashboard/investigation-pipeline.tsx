"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STAGES = [
  { index: 1, name: "Evidence Intake", status: "COMPLETED", href: "/intake", desc: "Raw statement & receipt uploads" },
  { index: 2, name: "AI Extraction", status: "COMPLETED", href: "/evidence", desc: "OCR & multimodal claim isolation" },
  { index: 3, name: "Transaction Matching", status: "COMPLETED", href: "/reconciliation", desc: "10-tier UTR deterministic match" },
  { index: 4, name: "Evidence Verification", status: "COMPLETED", href: "/evidence", desc: "SHA-256 seal & bilateral checks" },
  { index: 5, name: "Evidence Graph", status: "COMPLETED", href: "/cases/cmw0m6n310000fcvjzk8r347a", desc: "Entity correlation & contradiction mapping" },
  { index: 6, name: "Root-Cause Investigation", status: "ACTIVE", href: "/incidents", desc: "12-stage anomaly diagnosis" },
  { index: 7, name: "BERR Reasoning", status: "PENDING", href: "/cases/cmw0m6n310000fcvjzk8r347a", desc: "Bilateral evidence matrix weighting" },
  { index: 8, name: "Human Approval", status: "PENDING", href: "/resolution", desc: "Officer dual-key sign-off" },
  { index: 9, name: "Resolution", status: "PENDING", href: "/resolution-room", desc: "Automated refund or settlement" },
];

export function InvestigationPipeline() {
  const { summary } = useDashboard();
  const canonical = summary?.canonicalPipelineCase || {
    caseNumber: "RG-2026-0412",
    title: "Wrong Capacity Delivered — 1TB vs 512GB NVMe SSD",
  };

  return (
    <section
      aria-labelledby="pipeline-heading"
      className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4 paper-dark overflow-hidden"
    >
      {/* Plumbline Architectural Grid Accent */}
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-20" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="pipeline-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[var(--accent)]" />
              <span>9-Stage Investigation Lifecycle</span>
            </h2>
            <Badge tone="brand" className="text-[11px] font-mono">
              CANONICAL ACTIVE: {canonical.caseNumber}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Active tracking for case <strong className="text-[var(--ink)]">{canonical.caseNumber}</strong>: {canonical.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/incidents"
            className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1.5 font-mono"
          >
            <span>Launch Root-Cause Engine</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 9-step responsive horizontal pipeline with glowing track */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
        {STAGES.map((stg) => {
          const isCompleted = stg.status === "COMPLETED";
          const isActive = stg.status === "ACTIVE";
          const isPending = stg.status === "PENDING";

          return (
            <Link
              key={stg.index}
              href={stg.href}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl p-3 border transition-all duration-200 text-left hover:-translate-y-0.5",
                isCompleted && "bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/50 hover:bg-emerald-500/[0.08]",
                isActive && "bg-[var(--accent)]/[0.12] border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-[0_0_20px_rgba(67,80,229,0.25)]",
                isPending && "bg-[var(--surface-2)]/40 border-[var(--line)] hover:border-[var(--line-strong)] opacity-75 hover:opacity-100"
              )}
            >
              {/* Laser Scan Line on Active Step */}
              {isActive && <div className="scan-y" />}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "font-mono text-[11px] font-bold",
                      isCompleted && "text-emerald-400",
                      isActive && "text-[var(--accent)]",
                      isPending && "text-[var(--ink-3)]"
                    )}
                  >
                    0{stg.index}
                  </span>

                  {isCompleted && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  {isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                    </span>
                  )}
                  {isPending && (
                    <Clock className="h-3.5 w-3.5 text-[var(--ink-3)]" />
                  )}
                </div>

                <div
                  className={cn(
                    "text-[12px] font-semibold leading-tight",
                    isActive ? "text-[var(--ink)]" : "text-[var(--ink-2)] group-hover:text-[var(--ink)]"
                  )}
                >
                  {stg.name}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--line)]/50">
                <span
                  className={cn(
                    "text-[9.5px] font-mono uppercase tracking-wider font-semibold block truncate",
                    isCompleted && "text-emerald-400",
                    isActive && "text-[var(--accent)]",
                    isPending && "text-[var(--ink-3)]"
                  )}
                >
                  {stg.status}
                </span>
                <span className="text-[10px] text-[var(--ink-3)] line-clamp-1 mt-0.5">
                  {stg.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
