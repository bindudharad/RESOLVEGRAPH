"use client";

import Link from "next/link";
import {
  FileCheck2,
  ArrowRight,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function EvidenceIntelligencePanel() {
  const { summary } = useDashboard();

  const evidenceData = summary?.evidenceIntelligence || {
    total: 129,
    verified: 96,
    suspicious: 14,
    unverified: 19,
    recent: [],
  };

  const verifiedPercent = Math.round((evidenceData.verified / (evidenceData.total || 1)) * 100);
  const suspiciousPercent = Math.round((evidenceData.suspicious / (evidenceData.total || 1)) * 100);
  const unverifiedPercent = 100 - verifiedPercent - suspiciousPercent;

  return (
    <section
      aria-labelledby="evidence-intel-heading"
      className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4 paper-dark overflow-hidden"
    >
      {/* Plumbline Architectural Grid */}
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-20" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="evidence-intel-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-400" />
              <span>Evidence Intelligence</span>
            </h2>
            <Badge tone="neutral" className="text-[11px] font-mono bg-white/[0.04] text-[var(--ink)] border-[var(--line)]">
              {evidenceData.total} RECORDS INDEXED
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Universal vault of buyer receipts, packaging photos, dispatch manifests, and unboxing challenge recordings.
          </p>
        </div>

        <Link href="/evidence">
          <Button variant="outline" size="sm" className="text-xs h-8 px-3 font-mono shadow-xs">
            <span>Open Evidence Library</span>
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Visual Distribution Rail */}
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[var(--ink-2)]">Verification State Distribution</span>
          <span className="text-[var(--ink)] font-semibold">{evidenceData.total} Total Artifacts</span>
        </div>

        {/* 3-color breakdown bar */}
        <div className="h-2.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden flex border border-[var(--line)] shadow-inner">
          <div
            style={{ width: `${verifiedPercent}%` }}
            className="h-full bg-emerald-500 transition-all shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            title={`Verified: ${evidenceData.verified} (${verifiedPercent}%)`}
          />
          <div
            style={{ width: `${suspiciousPercent}%` }}
            className="h-full bg-rose-500 transition-all shadow-[0_0_8px_rgba(244,63,94,0.5)]"
            title={`Suspicious: ${evidenceData.suspicious} (${suspiciousPercent}%)`}
          />
          <div
            style={{ width: `${unverifiedPercent}%` }}
            className="h-full bg-amber-400 transition-all shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            title={`Awaiting Review / Unverified: ${evidenceData.unverified} (${unverifiedPercent}%)`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[var(--ink-2)]">
              Consistent: <strong className="text-emerald-400">{evidenceData.verified}</strong> ({verifiedPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="text-[var(--ink-2)]">
              Suspicious: <strong className="text-rose-400">{evidenceData.suspicious}</strong> ({suspiciousPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[var(--ink-2)]">
              Awaiting Review: <strong className="text-amber-400">{evidenceData.unverified}</strong> ({unverifiedPercent}%)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
