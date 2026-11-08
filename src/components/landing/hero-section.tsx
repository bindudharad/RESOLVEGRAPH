"use client";

import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck, Layers, Sparkles } from "lucide-react";
import { HeroInvestigationDemo } from "./hero-investigation-demo";

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] pt-32 pb-20 overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-app)]">
      {/* Background Architectural Grid & Subtle Radial Glow */}
      <div className="absolute inset-0 rg-landing-grid pointer-events-none" />
      <div className="absolute inset-0 rg-mesh-bg pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial Headline & Value Narrative */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Architectural Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-shell)] px-3 py-1 text-xs font-mono text-[var(--color-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PAYMENT INVESTIGATION & COMMERCE RESOLUTION INFRASTRUCTURE</span>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[var(--color-fg)] leading-[1.08]">
              One Payment. <span className="font-editorial italic text-amber-300">Every Source.</span><br />
              One Explainable Resolution.
            </h1>

            {/* Concise Value Description */}
            <p className="text-base sm:text-lg text-[var(--color-fg-muted)] leading-relaxed max-w-xl font-normal">
              When buyer screenshots, bank debits, gateway webhooks, and merchant orders disagree, RESOLVEGRAPH reconstructs the truth. Reconcile cross-provider transactions with integer minor units precision and diagnose root causes under statutory turnaround timelines.
            </p>

            {/* Direct Action Controls */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition-all hover:bg-amber-500/25 hover:border-amber-500/60 shadow-lg shadow-amber-950/20"
              >
                <span>Launch Operational Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/incidents"
                className="inline-flex items-center gap-2 rounded border border-[var(--color-line-2)] bg-[var(--color-shell)] px-4 py-2.5 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-line-highlight)] transition-colors"
              >
                <FileSearch className="h-4 w-4 text-amber-400" />
                <span>12-Stage Investigation</span>
              </Link>

              <Link
                href="/methodology"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-mono text-[var(--color-subtle)] hover:text-amber-300 transition-colors"
              >
                <span>Read BERR v2 Methodology &rarr;</span>
              </Link>
            </div>

            {/* Architecture Standards Bar */}
            <div className="pt-6 border-t border-[var(--color-line)] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono text-[var(--color-subtle)]">
              <div className="space-y-1">
                <div className="text-[var(--color-fg-muted)] font-medium flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span>RBI DPSS.CO.PD</span>
                </div>
                <div>Statutory TAT T+1 Auto-Reversal</div>
              </div>
              <div className="space-y-1">
                <div className="text-[var(--color-fg-muted)] font-medium flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-sky-400" />
                  <span>10-Tier Matching</span>
                </div>
                <div>Deterministic Hierarchy</div>
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <div className="text-[var(--color-fg-muted)] font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Zero Leakage</span>
                </div>
                <div>Paise-Safe Minor Units</div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Interactive Investigation Walkthrough */}
          <div className="lg:col-span-5 flex justify-center">
            <HeroInvestigationDemo />
          </div>

        </div>
      </div>
    </section>
  );
}
