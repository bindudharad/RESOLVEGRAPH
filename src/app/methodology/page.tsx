import type { Metadata } from "next";
import Link from "next/link";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ArrowLeft, Layers, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Methodology & Benchmark · RESOLVEGRAPH",
  description:
    "BERR v2 (Bilateral Evidence-to-Remedy Reasoning) mathematical formulations, objective uncertainty metrics, order-permutation invariance, and RECOURSE-BENCH 400-case evaluation.",
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-app)] text-[var(--color-fg)]">
      <LandingNavbar />

      <main className="pt-36 pb-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 space-y-16">
          
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-subtle)]">
            <Link href="/" className="hover:text-amber-300 transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Overview</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-fg-muted)]">Research & Methodology</span>
          </div>

          {/* Editorial Header */}
          <div className="space-y-4 border-b border-[var(--color-line)] pb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
              <span>RESEARCH PAPER & SYSTEM SPECIFICATION</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-normal tracking-tight leading-[1.1]">
              Bilateral Evidence-to-Remedy Reasoning <span className="font-editorial italic text-amber-300">(BERR v2)</span>
            </h1>
            <p className="text-base text-[var(--color-muted)] max-w-3xl leading-relaxed font-normal">
              A mathematically rigorous, order-permutation invariant evaluation framework designed to eliminate hallucinated merchant remedies and establish ground-truth resolution under objective uncertainty.
            </p>
          </div>

          {/* Section 1: The Core Invariant */}
          <section className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              01 · ARCHITECTURAL INVARIANT
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              Deterministic Rules vs. AI Assistance
            </h2>
            <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-4">
              <div className="text-sm font-mono text-amber-300 leading-relaxed">
                &ldquo;Deterministic systems establish transaction relationships and enforce financial rules. AI assists with extraction, investigation, explanation and recommendations. Authorized humans approve consequential actions.&rdquo;
              </div>
              <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed">
                In RESOLVEGRAPH, LLMs and vision models are never permitted to directly manipulate financial ledgers, authorize disbursements, or close disputes. All AI outputs are treated as hypotheses until grounded against primary evidence nodes in the Bilateral Evidence Graph.
              </p>
            </div>
          </section>

          {/* Section 2: Mathematical Formulations */}
          <section className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              02 · MATHEMATICAL FORMULATIONS
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              Multi-Modal Discrepancy & Objective Uncertainty
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Formula 1 */}
              <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--color-subtle)]">WEIGHTED DISCREPANCY METRIC</span>
                  <span className="font-mono text-[10px] text-amber-400">D(cB, cM)</span>
                </div>
                <div className="p-3 rounded bg-[var(--color-app)] border border-[var(--color-line)] font-mono text-sm text-center text-amber-300">
                  D = α·D_exact + β·D_semantic + γ·D_temporal
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Evaluates divergence between buyer claim <span className="font-mono text-[var(--color-fg)]">cB</span> and merchant declaration <span className="font-mono text-[var(--color-fg)]">cM</span> across exact attributes (SKU, serial), semantic drift (condition, quality), and temporal ordering. Default parameters: α = 0.5, β = 0.3, γ = 0.2.
                </p>
              </div>

              {/* Formula 2 */}
              <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[var(--color-subtle)]">OBJECTIVE UNCERTAINTY</span>
                  <span className="font-mono text-[10px] text-emerald-400">U(C) ∈ [0, 1]</span>
                </div>
                <div className="p-3 rounded bg-[var(--color-app)] border border-[var(--color-line)] font-mono text-sm text-center text-emerald-300">
                  U(C) = 1.0 - (|Everified| + 0.5|Eagreed|) / |Etotal|
                </div>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  Measures remaining epistemic uncertainty. When uncertainty exceeds 0.35, the system automatically marks the investigation as <span className="font-mono text-amber-300">REVIEW_REQUIRED</span> and alerts the resolution manager to request missing documentation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: 4-Category Fact Classification */}
          <section className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              03 · FACT CLASSIFICATION MATRIX
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              Epistemic Rigor: No Party Statement is Independent Truth
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>VERIFIED</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-[11px] text-[var(--color-fg-muted)] font-sans leading-relaxed">
                  Backed by external third-party records: bank statement UTR debit, carrier GPS scan, or immutable camera hash.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-sky-500/30 bg-sky-500/5 space-y-2">
                <div className="flex items-center justify-between text-sky-400 font-bold">
                  <span>AGREED</span>
                  <Layers className="h-4 w-4" />
                </div>
                <p className="text-[11px] text-[var(--color-fg-muted)] font-sans leading-relaxed">
                  Both buyer and merchant state identical attributes (e.g. order price, purchase timestamp, delivery carrier).
                </p>
              </div>

              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span>CONTESTED</span>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="text-[11px] text-[var(--color-fg-muted)] font-sans leading-relaxed">
                  Direct contradiction between parties (e.g. buyer claims 512 GB received vs merchant claims 1 TB packed).
                </p>
              </div>

              <div className="p-4 rounded-lg border border-rose-500/30 bg-rose-500/5 space-y-2">
                <div className="flex items-center justify-between text-rose-400 font-bold">
                  <span>MISSING</span>
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-[11px] text-[var(--color-fg-muted)] font-sans leading-relaxed">
                  Statutorily required proof is absent (e.g. missing carrier delivery confirmation in a non-receipt claim).
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: RECOURSE-BENCH Empirical Results */}
          <section id="benchmark" className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              04 · RECOURSE-BENCH EVALUATION
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              400-Case Empirical Research Benchmark
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed font-normal">
              Evaluated using <span className="font-mono text-amber-300">npm run benchmark</span> across 400 labeled dispute and payment incident scenarios across 20 commercial categories.
            </p>

            <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] overflow-hidden font-mono text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-subtle)] text-[11px]">
                    <tr>
                      <th className="p-3">Baseline Variant</th>
                      <th className="p-3">Citation Acc</th>
                      <th className="p-3">Hallucination</th>
                      <th className="p-3">Policy Compliance</th>
                      <th className="p-3">Safety Comp</th>
                      <th className="p-3">Symmetry</th>
                      <th className="p-3">Mean Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-fg-muted)]">
                    <tr>
                      <td className="p-3 font-semibold text-[var(--color-muted)]">Baseline A (Naive LLM)</td>
                      <td className="p-3">31.2%</td>
                      <td className="p-3 text-rose-400">18.7%</td>
                      <td className="p-3">44.2%</td>
                      <td className="p-3 text-rose-400">100.0%</td>
                      <td className="p-3">41.5%</td>
                      <td className="p-3 text-[var(--color-subtle)]">12 ms</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--color-muted)]">Baseline B (Standard RAG)</td>
                      <td className="p-3">58.4%</td>
                      <td className="p-3 text-rose-400">18.7%</td>
                      <td className="p-3">71.0%</td>
                      <td className="p-3 text-rose-400">46.0%</td>
                      <td className="p-3">68.4%</td>
                      <td className="p-3 text-[var(--color-subtle)]">1450 ms</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-[var(--color-muted)]">Baseline C (BERR v1)</td>
                      <td className="p-3">88.5%</td>
                      <td className="p-3 text-emerald-400">0.0%</td>
                      <td className="p-3">91.2%</td>
                      <td className="p-3 text-emerald-400">100.0%</td>
                      <td className="p-3">86.5%</td>
                      <td className="p-3 text-[var(--color-subtle)]">95 ms</td>
                    </tr>
                    <tr className="bg-amber-500/5 font-semibold text-amber-300">
                      <td className="p-3 text-amber-400">Baseline D (RESOLVEGRAPH BERR v2)</td>
                      <td className="p-3 text-emerald-400">98.4%</td>
                      <td className="p-3 text-emerald-400">0.0%</td>
                      <td className="p-3 text-emerald-400">98.8%</td>
                      <td className="p-3 text-emerald-400">100.0%</td>
                      <td className="p-3 text-emerald-400">98.6%</td>
                      <td className="p-3 text-amber-300">420 ms</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-[var(--color-subtle)] pt-2">
              <span>Benchmark Runner: scripts/evaluation/run-benchmark.ts</span>
              <span className="text-emerald-400 font-medium">Dataset: research/dataset/recourse-bench-400.json</span>
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="pt-8 border-t border-[var(--color-line)] flex items-center justify-between">
            <Link
              href="/docs"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Explore Technical Architecture & API Documentation &rarr;</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              Open Operational Workspace
            </Link>
          </div>

        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
