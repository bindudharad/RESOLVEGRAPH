"use client";

import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, FileSearch } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-28 border-b border-[var(--color-line)] bg-[var(--color-shell)] overflow-hidden">
      {/* Hairline Grid Accent */}
      <div className="absolute inset-0 rg-landing-grid pointer-events-none opacity-40" />

      <div className="relative mx-auto max-w-4xl px-6 text-center space-y-8">
        
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-mono text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>PRODUCTION-READY COMMERCE & PAYMENT FORENSICS</span>
        </div>

        {/* Editorial Heading */}
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--color-fg)] leading-[1.12]">
            Investigate Every Payment. <span className="font-editorial italic text-amber-300">Verify Every Delivery.</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-[var(--color-muted)] leading-relaxed font-normal">
            Equip your resolution managers and merchants with multi-source reconciliation, 12-stage root-cause diagnostics, and cryptographically frozen human sign-off gates.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/15 px-6 py-3 text-sm font-medium text-amber-300 hover:bg-amber-500/25 hover:border-amber-500/60 transition-all shadow-xl shadow-amber-950/20"
          >
            <span>Launch Operational Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded border border-[var(--color-line-2)] bg-[var(--color-app)] px-5 py-3 text-sm font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-line-highlight)] transition-colors"
          >
            <Play className="h-4 w-4 text-amber-400" />
            <span>Interactive Guided Demo</span>
          </Link>
        </div>

        {/* Platform Integrity Badges */}
        <div className="pt-8 border-t border-[var(--color-line)] flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[var(--color-subtle)]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>321 Automated Tests Passing</span>
          </div>
          <div>·</div>
          <div>10-Tier Deterministic Matching</div>
          <div>·</div>
          <div>12-Stage Diagnostic Pipeline</div>
          <div>·</div>
          <div className="flex items-center gap-1.5">
            <FileSearch className="h-3.5 w-3.5 text-sky-400" />
            <span>RBI Statutory TAT DPSS.CO.PD</span>
          </div>
        </div>

      </div>
    </section>
  );
}
