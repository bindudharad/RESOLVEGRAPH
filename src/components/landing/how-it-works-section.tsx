"use client";

import { UploadCloud, Layers, Cpu, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const stages = [
  {
    step: "01",
    icon: UploadCloud,
    title: "Multi-Source Intake",
    tag: "MAGIC BYTES & SHA-256",
    description:
      "Ingests buyer receipts, bank statement PDFs, gateway logs, and ERP orders. Computes bitwise SHA-256 digests and validates binary headers.",
  },
  {
    step: "02",
    icon: Layers,
    title: "Canonical Arithmetic",
    tag: "MINOR UNITS MATH",
    description:
      "Normalizes provider statuses into a canonical state machine. Enforces decimal-safe integer minor units (paise/cents) with zero floating-point leakage.",
  },
  {
    step: "03",
    icon: Cpu,
    title: "10-Tier Matching",
    tag: "DETERMINISTIC HIERARCHY",
    description:
      "Executes deterministic matching from exact provider transaction ID to 12-digit UTR/RRN, amount-timestamp windows, and mismatch flags.",
  },
  {
    step: "04",
    icon: ShieldCheck,
    title: "12-Stage Diagnostics",
    tag: "RBI STATUTORY TAT",
    description:
      "Isolates the root cause across 18 incident categories and calculates statutory auto-reversal deadlines (T+1 days, ₹100/day compensation penalty).",
  },
  {
    step: "05",
    icon: CheckCircle2,
    title: "Governed Resolution",
    tag: "FROZEN HASH SIGN-OFF",
    description:
      "Freezes the resolution proposal with a SHA-256 payload argument hash. Requires explicit human sign-off before any fund movement.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-28 border-b border-[var(--color-line)] bg-[var(--color-shell)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
            INVESTIGATION LIFECYCLE
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-[var(--color-fg)]">
            From Raw Evidence to <span className="font-editorial italic text-amber-300">Explainable Resolution.</span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-muted)] leading-relaxed font-normal">
            A transparent five-stage pipeline that guarantees mathematical rigor, cryptographic immutability, and human accountability at every step.
          </p>
        </div>

        {/* 5-Stage Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-app)] p-5 flex flex-col justify-between space-y-4 hover:border-[var(--color-line-highlight)] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {stage.step}
                    </span>
                    <span className="p-1.5 rounded border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-fg-muted)]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                      {stage.title}
                    </h3>
                    <div className="text-[10px] font-mono tracking-wider text-[var(--color-subtle)] mt-0.5">
                      {stage.tag}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--color-muted)] leading-relaxed font-normal">
                    {stage.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--color-line)] text-[10px] font-mono text-[var(--color-subtle)]">
                  Step {stage.step} of 05
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Explorer CTA */}
        <div className="mt-12 p-6 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--color-fg)]">
              Test with Sandbox Dispute Fixtures
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              Inject synthetic multi-source discrepancies across PayPal, PhonePe, and bank statements with one click.
            </div>
          </div>
          <Link
            href="/reconciliation"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors shrink-0"
          >
            <span>Open Reconciliation Matrix</span>
            <span>&rarr;</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
