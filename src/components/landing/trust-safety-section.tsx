"use client";

import {
  ShieldCheck,
  Lock,
  FileCheck2,
  KeyRound,
  Hash,
  Scale,
} from "lucide-react";

export function TrustSafetySection() {
  return (
    <section id="trust-safety" className="border-b border-[var(--line)] bg-[var(--surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
            <span>FINANCIAL INTEGRITY & GOVERNANCE</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Trust grounded in math,{" "}
            <span className="font-display italic text-[var(--accent)] font-medium">
              not unverified AI assumptions.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
            Financial operations require verifiable integrity and honest boundaries.
            RESOLVEGRAPH separates probabilistic AI reasoning from deterministic
            financial authorization.
          </p>
        </div>

        {/* 4 Pillars of Governance Grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pillar 1: SHA-256 Byte Integrity */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 flex flex-col justify-between">
            <div>
              <div className="rounded-lg bg-[var(--accent)]/15 p-2 w-fit text-[var(--accent)]">
                <Hash className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--ink)]">
                SHA-256 Byte Integrity
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                All submitted PDFs, images, and unboxing streams are hashed upon receipt.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[11px] font-mono text-[var(--ink-3)]">
                <span className="text-[var(--accent)] font-semibold">Honest Boundary:</span> A valid hash proves bytes have not changed since upload; it does not guarantee the document is truthful.
              </div>
            </div>
          </div>

          {/* Pillar 2: 10-Point Financial Safeguards */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 flex flex-col justify-between">
            <div>
              <div className="rounded-lg bg-[var(--agreed)]/15 p-2 w-fit text-[var(--agreed)]">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--ink)]">
                10-Point Safeguard Gate
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                AI agents are non-negotiably blocked from autonomously initiating refunds or payouts.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[11px] font-mono text-[var(--ink-3)]">
                <span className="text-[var(--agreed)] font-semibold">Human-in-the-Loop:</span> All financial actions require human operator sign-off with RBAC cryptographic hash verification.
              </div>
            </div>
          </div>

          {/* Pillar 3: Hash-Chained Audit Ledger */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 flex flex-col justify-between">
            <div>
              <div className="rounded-lg bg-[var(--buyer)]/15 p-2 w-fit text-[var(--buyer)]">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--ink)]">
                Chained Audit History
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                Every state transition, evidence review, and message is recorded sequentially with parent hash linkage.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[11px] font-mono text-[var(--ink-3)]">
                <span className="text-[var(--buyer)] font-semibold">Tamper-Evident:</span> Historical investigation records cannot be modified or reordered after the fact.
              </div>
            </div>
          </div>

          {/* Pillar 4: Multi-Tenant RBAC & Privacy */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 flex flex-col justify-between">
            <div>
              <div className="rounded-lg bg-[var(--amber)]/15 p-2 w-fit text-[var(--amber)]">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--ink)]">
                Tenant Isolation & RBAC
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[var(--ink-2)]">
                Multi-tenant database boundaries strictly isolate merchant cases from competing organizations.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[11px] font-mono text-[var(--ink-3)]">
                <span className="text-[var(--amber)] font-semibold">PII Redaction:</span> Automatic Luhn-check card token masking and customer data sanitization before AI ingestion.
              </div>
            </div>
          </div>
        </div>

        {/* PayPal Integration Transparency Notice */}
        <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                <Scale className="h-4 w-4 text-[var(--accent)]" />
                <span>PayPal Hackathon 2026 Integration Transparency</span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-2)] max-w-3xl">
                RESOLVEGRAPH integrates with PayPal Orders v2, Captures v2, and Disputes v1 via real REST APIs on the PayPal Sandbox environment. 19 specialized investigation tools allow the agent to query sandbox disputes, submit evidence, and recommend structured resolutions.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--ink-2)] whitespace-nowrap">
              Sandbox Live: Verified
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
