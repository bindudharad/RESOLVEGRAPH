"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, ChevronRight } from "lucide-react";

export function MarketingCTA() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg)] py-20 sm:py-28">
      {/* Background ambient gradient */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-[var(--accent)]/15 via-transparent to-transparent opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-mono text-[var(--ink-2)] shadow-xs">
            <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
            <span>EXPLAINABLE DISPUTE ARBITRATION</span>
          </div>

          <h2 className="mt-6 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Every transaction has a story.{" "}
            <span className="block mt-2 font-display italic text-[var(--accent)] font-medium">
              Make the evidence tell it.
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg leading-relaxed text-[var(--ink-2)] max-w-2xl mx-auto">
            Bring scattered payment records together. Investigate discrepancies. Build explainable resolutions.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/intake"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
            >
              <span>Start an Investigation →</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <a
              href="#investigation-showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-6 py-3.5 text-sm font-medium text-[var(--ink)] shadow-xs transition-all hover:border-[var(--ink-3)] hover:bg-[var(--surface-2)] active:scale-[0.98] cursor-pointer"
            >
              <span>Explore a Sample Case</span>
              <ChevronRight className="h-4 w-4 text-[var(--ink-2)]" />
            </a>

            <Link
              href="/docs"
              className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>Read Documentation</span>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[var(--ink-2)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" />
              <span>SHA-256 Byte Verification</span>
            </div>
            <span>·</span>
            <div>10-Tier Canonical Matching</div>
            <span>·</span>
            <div>Zero Autonomous Financial Payouts</div>
          </div>
        </div>
      </div>
    </section>
  );
}
