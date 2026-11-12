"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { HeroBilateralConvergence } from "./hero-bilateral-convergence";

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg)] pt-24 pb-16 sm:pt-32 sm:pb-24">
      {/* Subtle radial ambient highlight */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] rounded-full bg-radial from-[var(--accent)]/15 via-[var(--buyer)]/5 to-transparent blur-3xl opacity-60" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Core Positioning, Headline, and Dual CTAs */}
          <div className="lg:col-span-6 z-10">
            {/* Standard Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-mono text-[var(--ink-2)] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
              <span className="font-semibold text-[var(--ink)]">
                ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION.
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-normal leading-[1.08] tracking-tight text-[var(--ink)]">
              Investigate payment disputes with{" "}
              <span className="font-display italic text-[var(--accent)] font-medium">
                evidence from every side.
              </span>
            </h1>

            {/* Supporting Explanation */}
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[var(--ink-2)] max-w-xl">
              RESOLVEGRAPH connects buyer, merchant, payment provider, bank and delivery
              evidence into one explainable investigation.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/intake"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <span>Start an Investigation →</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <a
                href="#investigation-showcase"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-3.5 text-sm font-medium text-[var(--ink)] shadow-xs transition-all hover:border-[var(--ink-3)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
              >
                <span>Explore a Sample Case</span>
                <ChevronRight className="h-4 w-4 text-[var(--ink-3)]" />
              </a>

              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[var(--ink-2)] hover:text-[var(--accent)] transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Interactive Demo Studio →</span>
              </Link>
            </div>

            {/* Provenance Key Signals */}
            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-[var(--line)] pt-6 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
                  01 · Sources
                </span>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  Multi-Rail Ingestion
                </p>
                <p className="text-xs text-[var(--ink-2)] mt-0.5">
                  PayPal Sandbox, Cards & Bank Proof
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
                  02 · Reasoning
                </span>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  BERR v2 Matrix
                </p>
                <p className="text-xs text-[var(--ink-2)] mt-0.5">
                  AGREED vs CONTESTED facts
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
                  03 · Governance
                </span>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  Human Sign-Off
                </p>
                <p className="text-xs text-[var(--ink-2)] mt-0.5">
                  10-point safeguard gate
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Bilateral Evidence Convergence Visualization */}
          <div className="lg:col-span-6">
            <HeroBilateralConvergence />
          </div>
        </div>
      </div>
    </section>
  );
}
