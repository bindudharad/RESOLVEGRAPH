"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, ChevronRight, Sparkles } from "lucide-react";

export function MarketingCTA() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line,#D9DED7)] bg-[var(--bg,#F4F2EC)] py-20 sm:py-28">
      {/* Background ambient gradient */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-[var(--accent,#4350E5)]/12 via-transparent to-transparent opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--line-strong,#B5BEB6)] bg-gradient-to-br from-[#182223] via-[#11191A] to-[#151F20] p-10 sm:p-16 text-white shadow-2xl">
          {/* Animated Ambient Rotating Halo Ring */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10 opacity-60 shadow-[0_0_80px_rgba(67,80,229,0.25)] animate-[spin_60s_linear_infinite]" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-mono text-[#A1DFC5] backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#278B79] animate-pulse" />
              <span>THE EVIDENCE ATELIER · BILATERAL ARBITRATION</span>
            </div>

            <h2 className="mt-6 font-heading text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white leading-[1.08]">
              Every transaction has a story.{" "}
              <span className="block mt-2 font-display italic text-[#A1DFC5] font-normal">
                Make the evidence tell it.
              </span>
            </h2>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#A6B0AC] max-w-2xl mx-auto">
              Bring scattered customer documentation, seller telemetry, and payment events into one source-linked investigation record.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/intake"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--accent,#4350E5)] px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[var(--accent,#4350E5)]/30 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                <span>Lodge a Dispute →</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <Link
                href="/cases/RG-1465"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-[0.98] cursor-pointer"
              >
                <span>Explore Case RG-1465</span>
                <ChevronRight className="h-4 w-4 text-[#A1DFC5]" />
              </Link>

              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-[#A6B0AC] hover:text-white transition-colors cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>Read Documentation</span>
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[#747D79] border-t border-white/10 pt-8">
              <div className="flex items-center gap-2 text-[#A6B0AC]">
                <ShieldCheck className="h-4 w-4 text-[#278B79]" />
                <span>SHA-256 Byte Verification</span>
              </div>
              <span>·</span>
              <div>10-Tier Canonical Matching</div>
              <span>·</span>
              <div>Zero Autonomous Financial Payouts</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
