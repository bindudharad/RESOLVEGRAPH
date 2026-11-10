"use client";

import Link from "next/link";
import {
  Brain,
  Cpu,
  FileSearch,
  Network,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  GitGraph,
} from "lucide-react";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";

export default function InvestigationPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              BERR Investigation & Reasoning
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Bilateral Evidence-to-Remedy Reasoning (BERR) engine, contradiction analysis, and knowledge graph intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/cases/RG-1001">
            <Button variant="primary" size="sm" icon={<Zap className="h-3.5 w-3.5" />}>
              Inspect Case RG-1001
            </Button>
          </Link>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11.5px] font-medium text-emerald-300">
            BERR Engine Operational
          </span>
        </div>
      </section>

      {/* Prominent Architectural Banner */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]">
            <Brain className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-[var(--ink)]">
              BERR Multimodal Reasoning & Discrepancy Scoring
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-2)] max-w-3xl">
              The Bilateral Evidence-to-Remedy Reasoning engine cross-examines buyer claims and merchant fulfillment records symmetrically. It extracts facts, normalizes commercial units, computes the multi-factor discrepancy score <code className="font-mono text-xs bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[var(--ink)] border border-[var(--line)]">D = α·D_exact + β·D_semantic + γ·D_temporal</code>, and isolates agreed, contested, and missing facts.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] font-mono text-faint">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-app px-2.5 py-1">
                <Cpu className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>RECOURSE-BENCH: 89.3% Accuracy</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-app px-2.5 py-1">
                <Sparkles className="h-3.5 w-3.5 text-[#34d399]" />
                <span>Multimodal Vision & unpdf OCR Active</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-app px-2.5 py-1">
                <GitGraph className="h-3.5 w-3.5 text-amber-400" />
                <span>Bilateral Directed Graph Generated</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Capabilities Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rg-card flex flex-col justify-between p-5">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-3 text-amber-400">
              <Network className="h-5 w-5" />
            </div>
            <h3 className="mt-3.5 text-[14px] font-semibold text-fg">
              Bilateral Evidence Graph
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Connects product SKU descriptions, invoice line items, carrier waybills, and unboxing images into a directed knowledge graph with cycle validation and source citations.
            </p>
          </div>
          <div className="mt-4 border-t border-line/60 pt-3 text-[11.5px] text-faint">
            Force-Directed SVG Visualization
          </div>
        </div>

        <div className="rg-card flex flex-col justify-between p-5">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-3 text-[#38bdf8]">
              <FileSearch className="h-5 w-5" />
            </div>
            <h3 className="mt-3.5 text-[14px] font-semibold text-fg">
              Factual Contradiction Audit
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Pinpoints exact divergence between buyer claims (&ldquo;Received 512 GB&rdquo;) and seller records (&ldquo;Invoiced 1 TB&rdquo;) to highlight where physical substitutions occur.
            </p>
          </div>
          <div className="mt-4 border-t border-line/60 pt-3 text-[11.5px] text-faint">
            Unit Normalization (GB, minor cents, ISO)
          </div>
        </div>

        <div className="rg-card flex flex-col justify-between p-5">
          <div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-3 text-[#34d399]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-3.5 text-[14px] font-semibold text-fg">
              Policy-Grounded Remedies
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Evaluates merchant dispute policies against verified findings to prepare eligible settlement options (Partial Refund, Full Refund, Replacement) under human sign-off.
            </p>
          </div>
          <div className="mt-4 border-t border-line/60 pt-3 text-[11.5px] text-faint">
            Human Approval Gate & PayPal Settlement
          </div>
        </div>
      </div>

      {/* Featured Demonstration Insight: Case RG-1001 preview */}
      <div className="rg-card p-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-fg">
              Active Benchmark Dossier: Case RG-1001
            </h3>
            <p className="mt-0.5 text-[12.5px] text-subtle">
              Inspect the live 10-tab dossier with real bilateral evidence, SVG graph, and BERR contradiction analysis.
            </p>
          </div>
          <Link
            href="/cases/RG-1001"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-amber-400 hover:underline"
          >
            <span>Open Case RG-1001 Dossier</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-400">
              <Zap className="h-4 w-4" />
              <span>Contradiction Detected: Capacity Mismatch (D = 0.88)</span>
            </div>
            <span className="font-mono text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              PROPOSED: PARTIAL REFUND $25.00
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-fg">
            Invoice indicates SKU <strong className="font-mono text-muted">SSD-1TB-BLK</strong> ($79.99 / ₹6,499), whereas attached device photograph exhibits drive metadata firmware reporting 512 GB usable storage.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono text-faint">
            <span className="rounded bg-surface-3 px-2 py-0.5">Model: OpenAI gpt-4o-mini + Vision</span>
            <span className="rounded bg-surface-3 px-2 py-0.5">Discrepancy Score: D = 0.88</span>
            <span className="rounded bg-surface-3 px-2 py-0.5">Policy: APEX-POL-HARDWARE</span>
            <span className="rounded bg-surface-3 px-2 py-0.5">Status: Human Approval Required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
