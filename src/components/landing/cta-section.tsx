"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Network, Layers, ShieldCheck } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative border-b border-[var(--line)] bg-[var(--surface-2)] py-24 sm:py-32 overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(ellipse_at_top,_var(--accent)_0%,_transparent_70%)]" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="relative rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-8 sm:p-14 lg:p-16 shadow-2xl overflow-hidden">
          {/* Subtle top indicator */}
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-3)] uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
            <span>Resolution Network · Ready for Ingestion</span>
          </div>

          <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <h2 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.06] tracking-tight text-[var(--ink)]">
                See the decision and every record
                <span className="block font-display italic text-[var(--accent)] font-medium">
                  that supports it.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
                Reconstruct disputes from the ground truth. Connect your payment gateways, carrier telemetry, and unboxing feeds into one accountable investigation workspace.
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
              <Link
                href="/dashboard"
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-[var(--accent)] px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-[var(--accent)]/30 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <span>Explore the platform</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <Link
                href="/investigation"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] px-6 py-3.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-3)] hover:bg-[var(--surface)] active:scale-[0.98]"
              >
                <Network className="h-4 w-4 text-[var(--buyer)]" />
                <span>See the evidence graph</span>
              </Link>

              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[var(--ink-3)] hover:text-[var(--ink)]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--amber)]" />
                <span>Open Alex Morgan demo case</span>
              </Link>
            </div>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="mt-12 pt-8 border-t border-[var(--line)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-[var(--ink-3)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" />
              <span>100% Cryptographic Audit Trail</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[var(--buyer)]" />
              <span>Multi-Tenant Data Isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--ai)]" />
              <span>Zero Black-Box AI Decisions</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
