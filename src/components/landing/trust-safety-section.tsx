"use client";

import {
  ShieldCheck,
  Lock,
  FileCheck2,
  KeyRound,
  Hash,
  Scale,
  Info,
} from "lucide-react";

interface IntegrationItem {
  provider: string;
  category: "SANDBOX INTEGRATION" | "IMPORTED EVIDENCE" | "SIMULATED DATA" | "PLANNED INTEGRATION" | "LIVE INTEGRATION";
  badgeColor: string;
  capabilities: string;
  currentStatus: string;
}

const INTEGRATION_MATRIX: IntegrationItem[] = [
  {
    provider: "PayPal Developer Sandbox",
    category: "SANDBOX INTEGRATION",
    badgeColor: "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
    capabilities: "Orders v2, Captures v2, Disputes v1, Webhook verification, and 19 specialized dispute investigation agent tools.",
    currentStatus: "Verified against api-m.sandbox.paypal.com. Not presented as a live production integration.",
  },
  {
    provider: "Card Schemes (Visa / Mastercard / 3DS2)",
    category: "IMPORTED EVIDENCE",
    badgeColor: "bg-[var(--buyer)]/15 text-[var(--buyer)] border-[var(--buyer)]/30",
    capabilities: "3D Secure v2 authentication tokens, card settlement manifests, Luhn masking, and authorization code matching.",
    currentStatus: "Ingested via customer statement uploads and merchant batch manifests. No direct network switch access claimed.",
  },
  {
    provider: "India UPI (PhonePe / Google Pay / Paytm)",
    category: "IMPORTED EVIDENCE",
    badgeColor: "bg-[var(--buyer)]/15 text-[var(--buyer)] border-[var(--buyer)]/30",
    capabilities: "UTR reference extraction, VPA handle parsing, and receipt image OCR forensics via EvidenceGuard.",
    currentStatus: "Ingested as Source-Submitted Evidence. No direct NPCI or bank switch API connectivity implied.",
  },
  {
    provider: "PhonePe Gateway Simulator",
    category: "SIMULATED DATA",
    badgeColor: "bg-[var(--amber)]/15 text-[var(--amber)] border-[var(--amber)]/30",
    capabilities: "X-VERIFY SHA-256 checksum calculation and sandbox redirect simulator for local workflow testing.",
    currentStatus: "Developer testing fixture used to simulate checkout handoffs without real monetary movement.",
  },
  {
    provider: "Issuing & Acquiring Banks (Open Banking / AA)",
    category: "PLANNED INTEGRATION",
    badgeColor: "bg-[var(--missing)]/20 text-[var(--ink-2)] border-[var(--missing)]/40",
    capabilities: "Direct API settlement verification and automated dispute chargeback status callbacks.",
    currentStatus: "Architected for Account Aggregator (AA) and certified banking gateways; requires regulatory licensing.",
  },
  {
    provider: "Direct Production Banking Switches",
    category: "LIVE INTEGRATION",
    badgeColor: "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--line)]",
    capabilities: "None active in public evaluation environment.",
    currentStatus: "Truthfully disclosed: Zero live financial switch connections in sandbox mode. All funds remain in test environments.",
  },
];

export function TrustSafetySection() {
  return (
    <section id="trust-safety" className="border-b border-[var(--line)] bg-[var(--surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
            <span>SECURITY, TRUST & INTEGRATION TRANSPARENCY</span>
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
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--ink-2)]">
                All submitted PDFs, images, and unboxing streams are hashed upon receipt into an immutable ledger.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs font-mono text-[var(--ink-2)]">
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
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--ink-2)]">
                AI agents are non-negotiably blocked from autonomously initiating refunds or releasing escrow payouts.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs font-mono text-[var(--ink-2)]">
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
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--ink-2)]">
                Every state transition, evidence review, and message is recorded sequentially with parent hash linkage.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs font-mono text-[var(--ink-2)]">
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
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--ink-2)]">
                Multi-tenant database boundaries strictly isolate merchant cases from competing organizations.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs font-mono text-[var(--ink-2)]">
                <span className="text-[var(--amber)] font-semibold">PII Redaction:</span> Automatic Luhn-check card token masking and customer data sanitization before AI ingestion.
              </div>
            </div>
          </div>
        </div>

        {/* Integration Transparency Section */}
        <div className="mt-14 rounded-3xl border border-[var(--line-strong)] bg-[var(--bg)] p-6 sm:p-10 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-2)]">
                <Scale className="h-4 w-4 text-[var(--accent)]" />
                <span className="font-semibold uppercase tracking-wider text-[var(--ink)]">
                  Integration Transparency & Provider Status Matrix
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)]">
                Honest accounting of live integrations, developer sandboxes, imported evidence, and planned features.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--agreed)]/30 bg-[var(--agreed)]/10 px-3 py-1 font-mono text-xs text-[var(--agreed)] font-semibold">
              Sandbox Live: Verified
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATION_MATRIX.map((item) => (
              <div
                key={item.provider}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm text-[var(--ink)]">
                      {item.provider}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wide shrink-0 ${item.badgeColor}`}
                    >
                      {item.category}
                    </span>
                  </div>

                  <p className="mt-2.5 text-xs text-[var(--ink-2)] leading-relaxed">
                    {item.capabilities}
                  </p>
                </div>

                <div className="border-t border-[var(--line)] pt-3 text-[11px] font-mono text-[var(--ink-2)] leading-tight">
                  <span className="text-[var(--ink-3)] uppercase text-[9px] block mb-0.5">Integration Reality:</span>
                  {item.currentStatus}
                </div>
              </div>
            ))}
          </div>

          {/* Honest Boundary Banner */}
          <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-4 text-xs text-[var(--ink-2)] flex items-start gap-3">
            <Info className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-[var(--ink)]">
                Regulatory & Production Invariant:
              </span>
              <p className="leading-relaxed">
                PayPal Developer Sandbox is connected via live REST v2 endpoints for testing dispute workflows. We do not claim or imply direct switch access to live bank networks, UPI switches (NPCI), or production payment acquirers. Uploaded screenshots and PDFs are classified strictly as <strong>Source-Submitted Evidence</strong> until reconciled with sandbox or gateway records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
