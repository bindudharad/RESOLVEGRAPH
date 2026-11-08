"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Layers,
  FileCheck2,
  Lock,
  ArrowRight,
  Clock,
} from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="capabilities" className="relative py-28 border-b border-[var(--color-line)] bg-[var(--color-app)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
            ENGINEERING FOUNDATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-[var(--color-fg)]">
            Built for Financial Truth, <span className="font-editorial italic text-amber-300">Not Generative Guesswork.</span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-muted)] leading-relaxed font-normal">
            Financial dispute resolution cannot rely on hallucinations or probabilistic math. RESOLVEGRAPH enforces mathematical integer invariants, binary signature verification, and human cryptographic sign-offs.
          </p>
        </div>

        {/* Asymmetrical Editorial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Pillar (Span 7): Universal Intake & 10-Tier Reconciliation */}
          <div className="lg:col-span-7 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-fg)]">
                    Canonical Transaction Arithmetic & 10-Tier Matching
                  </h3>
                  <div className="text-xs font-mono text-[var(--color-subtle)]">
                    Zero Floating-Point Drift · Largest-Remainder Allocation
                  </div>
                </div>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                100% Deterministic
              </span>
            </div>

            <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
              Every financial record is converted to integer minor units (paise/cents). Cross-provider reconciliation cascades through a deterministic 10-tier matching hierarchy—from exact gateway capture IDs down to sub-second temporal correlations—generating plain-language evidentiary audit trails for every decision.
            </p>

            {/* Technical Hierarchy Preview */}
            <div className="space-y-2 font-mono text-xs">
              <div className="p-2.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] flex items-center justify-between">
                <span className="text-[var(--color-fg-muted)]">Tier 1: Global Provider Tx ID</span>
                <span className="text-emerald-400">Score 1.0 · EXACT MATCH</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] flex items-center justify-between">
                <span className="text-[var(--color-fg-muted)]">Tier 2: NPCI 12-Digit UTR / RRN</span>
                <span className="text-emerald-400">Score 0.98 · BANK CONFIRMED</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] flex items-center justify-between">
                <span className="text-[var(--color-fg-muted)]">Tier 3: Commerce Order Reference</span>
                <span className="text-sky-400">Score 0.95 · ERP LINKED</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-surface)] border border-[var(--color-line)] flex items-center justify-between">
                <span className="text-[var(--color-fg-muted)]">Tier 4: Amount + Temporal Correlation</span>
                <span className="text-amber-400">Score 0.85 · REVIEW REQUIRED</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-[var(--color-subtle)] font-mono">
                Magic Bytes: PDF (%PDF-), PNG, JPG, CSV, JSON
              </div>
              <Link
                href="/reconciliation"
                className="text-xs font-mono text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-medium"
              >
                <span>Inspect Multi-Source Ledger</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Right Column (Span 5): 12-Stage Root Cause & Statutory TAT */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 sm:p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-[var(--color-line)] pb-4">
                <div className="p-2 rounded border border-sky-500/30 bg-sky-500/10 text-sky-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-fg)]">
                    12-Stage AI Root-Cause Diagnostics
                  </h3>
                  <div className="text-xs font-mono text-[var(--color-subtle)]">
                    18 Incident Types · RBI Statutory TAT DPSS.CO.PD
                  </div>
                </div>
              </div>

              <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
                When a customer is debited but an order is unfulfilled, the 12-stage pipeline isolates the exact point of drop—whether bank acquirer settlement, gateway callback timeout, or merchant ERP synchronization failure.
              </p>

              {/* Statutory Compliance Callout */}
              <div className="p-3.5 rounded border border-sky-500/30 bg-sky-500/10 space-y-1.5 text-xs">
                <div className="font-semibold text-sky-300 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                  Statutory Turnaround Timeline
                </div>
                <div className="text-[var(--color-muted)] text-[11px] leading-relaxed">
                  Under RBI DPSS.CO.PD No.629 guidelines, failed UPI/IMPS transactions mandate automatic reversal within <span className="text-sky-200 font-mono font-medium">T+1 working days</span>. Failure incurs a statutory penalty of <span className="text-amber-300 font-mono font-medium">₹100 per day</span> credited directly to the customer account.
                </div>
              </div>
            </div>

            <Link
              href="/incidents"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 font-medium pt-2"
            >
              <span>Explore 18 Incident Categories</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Bottom Card 1 (Span 6): Bilateral Evidence Graph & BERR v2 */}
          <div className="lg:col-span-6 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                Bilateral Evidence Graph (BEG) & BERR v2
              </h3>
            </div>
            <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
              Every fact extracted from invoices, tracking records, and unboxing videos is structured as an immutable graph node. The Bilateral Evidence-to-Remedy Reasoning (BERR v2) engine classifies every claim into <span className="font-mono text-emerald-400">AGREED</span>, <span className="font-mono text-amber-400">CONTESTED</span>, <span className="font-mono text-sky-400">VERIFIED</span>, or <span className="font-mono text-rose-400">MISSING</span>.
            </p>
            <div className="font-mono text-[11px] text-[var(--color-subtle)] flex items-center gap-3">
              <span>DAG Acyclic Checks</span>
              <span>·</span>
              <span>400 Benchmark Cases</span>
              <span>·</span>
              <span>0% Hallucination</span>
            </div>
          </div>

          {/* Bottom Card 2 (Span 6): Human-in-the-Loop & Audit Ledger */}
          <div className="lg:col-span-6 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                Cryptographic Payload Freeze & Hash-Chained Audit
              </h3>
            </div>
            <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
              Autonomous financial disbursement is strictly forbidden. Any resolution proposal freezes the payload with a SHA-256 argument hash, requiring human operator authorization. All actions are appended to an unbroken cryptographic block ledger.
            </p>
            <div className="font-mono text-[11px] text-[var(--color-subtle)] flex items-center gap-3">
              <span>SHA-256 Chained Blocks</span>
              <span>·</span>
              <span>Emergency Kill Switch</span>
              <span>·</span>
              <span>Zero Leakage</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
