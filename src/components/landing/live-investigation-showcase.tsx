"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

interface TimelineEvent {
  step: number;
  time: string;
  title: string;
  actor: "buyer" | "merchant" | "paypal" | "ai" | "safeguard";
  summary: string;
  details: string;
  badge: string;
  badgeColor: string;
  classification: "SOURCE_SUBMITTED" | "VERIFIED" | "INFERRED" | "CONTESTED";
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    step: 1,
    time: "2026-01-14 09:30 UTC",
    title: "Payment Initiated",
    actor: "buyer",
    summary: "Buyer Alex Morgan initiates checkout for 2TB NVMe SSD for $1,420.00 USD.",
    details: "Checkout authenticated via 3D Secure v2 card scheme verification. Order #ORD-2026-4412 session created.",
    badge: "Initiated",
    badgeColor: "var(--buyer)",
    classification: "SOURCE_SUBMITTED",
  },
  {
    step: 2,
    time: "2026-01-14 09:31 UTC",
    title: "PayPal Sandbox Capture Recorded",
    actor: "paypal",
    summary: "PayPal Developer Sandbox captures funds #TX-9812 ($1,420.00 USD).",
    details: "Capture confirmed via webhook payload. Funds placed in bilateral escrow protection pending delivery verification.",
    badge: "Captured",
    badgeColor: "#0070BA",
    classification: "VERIFIED",
  },
  {
    step: 3,
    time: "2026-01-14 11:20 UTC",
    title: "Merchant Dispatch Manifest",
    actor: "merchant",
    summary: "Apex Tech Labs warehouse records carton dispatch: 1,248g at loading dock.",
    details: "Cryptographic manifest signed with merchant key. Barcode #SN-881290-NVME verified in internal ERP.",
    badge: "Dispatched",
    badgeColor: "var(--merchant)",
    classification: "SOURCE_SUBMITTED",
  },
  {
    step: 4,
    time: "2026-01-16 14:35 UTC",
    title: "Buyer Evidence Uploaded",
    actor: "buyer",
    summary: "Buyer submits unboxing video & scale photo showing 420g delivered weight.",
    details: "Delivered package has clear secondary tape over original seal. Internal hardware SSD unit missing. Uploaded as Source-Submitted evidence.",
    badge: "Claim Filed",
    badgeColor: "var(--buyer)",
    classification: "SOURCE_SUBMITTED",
  },
  {
    step: 5,
    time: "2026-01-16 14:38 UTC",
    title: "Bilateral Relationships Established",
    actor: "paypal",
    summary: "Bilateral Evidence Graph connects buyer claim to merchant dispatch record.",
    details: "Graph indexes: Order #4412 ↔ Capture #TX-9812 ↔ Carrier Tracking #TRK-9801 ↔ Unboxing Video #EVD-0412.",
    badge: "BEG Assembled",
    badgeColor: "var(--ai)",
    classification: "INFERRED",
  },
  {
    step: 6,
    time: "2026-01-16 14:39 UTC",
    title: "Conflict Detected",
    actor: "ai",
    summary: "Weight contradiction detected: 1,248g dispatch vs 420g unboxed (-828g loss).",
    details: "BERR engine flags CONTESTED weight anomaly. Courier Hub #3 checkpoint recorded 422g.",
    badge: "Contradiction",
    badgeColor: "var(--danger)",
    classification: "CONTESTED",
  },
  {
    step: 7,
    time: "2026-01-16 14:40 UTC",
    title: "Missing Evidence Identified",
    actor: "ai",
    summary: "System identifies missing courier transfer scale receipt between Sorting Hubs #2 and #3.",
    details: "Evidentiary request automatically generated for intermediate carrier sorting bay handoff.",
    badge: "Missing Proof",
    badgeColor: "var(--missing)",
    classification: "INFERRED",
  },
  {
    step: 8,
    time: "2026-01-16 14:41 UTC",
    title: "AI Investigation Explanation",
    actor: "ai",
    summary: "Root cause localized: Discrepancy occurred inside carrier sorting network, not at merchant.",
    details: "Both buyer and merchant acted honestly. Tampering isolated to transit facility #3.",
    badge: "Explained",
    badgeColor: "var(--agreed)",
    classification: "VERIFIED",
  },
  {
    step: 9,
    time: "2026-01-16 14:42 UTC",
    title: "Recommended Remedy Displayed",
    actor: "ai",
    summary: "Remedy proposal: Release $1,420 escrow refund to buyer; file carrier indemnity claim.",
    details: "Merchant reputation and chargeback ratio protected from penalty due to verified origin weight.",
    badge: "Remedy Proposed",
    badgeColor: "var(--accent)",
    classification: "INFERRED",
  },
  {
    step: 10,
    time: "2026-01-16 14:43 UTC",
    title: "Human Approval Gate Enforced",
    actor: "safeguard",
    summary: "Financial Safeguard blocks autonomous refund: Requires authorized human operator sign-off.",
    details: "Cryptographic argument hash generated. Human operator signs off via WebAuthn/RBAC before any funds move.",
    badge: "Human Gate",
    badgeColor: "var(--agreed)",
    classification: "VERIFIED",
  },
];

export function LiveInvestigationShowcase() {
  const [selectedStep, setSelectedStep] = useState<number>(6); // Default on contradiction
  const activeEvent = TIMELINE_EVENTS.find((e) => e.step === selectedStep) || TIMELINE_EVENTS[5];

  return (
    <section id="investigation-showcase" className="border-b border-[var(--line)] bg-[var(--bg)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>INTERACTIVE INVESTIGATION DEMONSTRATION</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Inspect a sample investigation{" "}
            <span className="font-display italic text-[var(--accent)] font-medium">
              from payment to resolution.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
            Step through the 10 verifiable stages of illustrative dispute case #RG-2026-0412.
            See how RESOLVEGRAPH detects transit loss without penalizing honest merchants
            or denying valid buyer claims.
          </p>
        </div>

        {/* 10-Step Interactive Stepper */}
        <div className="mt-12 overflow-x-auto pb-4">
          <div className="flex items-center gap-2 min-w-max">
            {TIMELINE_EVENTS.map((event) => {
              const isSelected = selectedStep === event.step;
              return (
                <button
                  key={event.step}
                  type="button"
                  onClick={() => setSelectedStep(event.step)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent)] text-white shadow-md font-semibold ring-1 ring-[var(--accent)]"
                      : "bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? "bg-white" : "bg-[var(--line-strong)]"
                    }`}
                  />
                  <span>Step {event.step < 10 ? `0${event.step}` : event.step}</span>
                  <span className="opacity-90">· {event.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Active Step Inspector */}
        <div className="mt-6 rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 sm:p-10 shadow-2xl">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {/* Left: Step Description */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase border"
                  style={{
                    backgroundColor: `${activeEvent.badgeColor}20`,
                    borderColor: `${activeEvent.badgeColor}40`,
                    color: activeEvent.badgeColor,
                  }}
                >
                  Stage {activeEvent.step} · {activeEvent.badge}
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase border ${
                    activeEvent.classification === "VERIFIED"
                      ? "bg-[var(--agreed)]/15 text-[var(--agreed)] border-[var(--agreed)]/30"
                      : activeEvent.classification === "CONTESTED"
                      ? "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30"
                      : activeEvent.classification === "SOURCE_SUBMITTED"
                      ? "bg-[var(--buyer)]/15 text-[var(--buyer)] border-[var(--buyer)]/30"
                      : "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30"
                  }`}
                >
                  {activeEvent.classification.replace("_", " ")}
                </span>

                <span className="font-mono text-xs text-[var(--ink-2)]">
                  {activeEvent.time}
                </span>
              </div>

              <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                {activeEvent.title}
              </h3>

              <p className="text-base text-[var(--ink)] leading-relaxed font-medium">
                {activeEvent.summary}
              </p>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs sm:text-sm font-mono text-[var(--ink-2)] leading-relaxed">
                <p>{activeEvent.details}</p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-mono text-[var(--ink-2)]">
                  Illustrative environment:
                </span>
                <span className="rounded bg-[var(--surface-2)] border border-[var(--line)] px-2.5 py-1 font-mono text-xs text-[var(--accent)] font-semibold">
                  PayPal Developer Sandbox REST APIs
                </span>
                <span className="text-[var(--ink-2)] text-[11px]">
                  (Simulated test data for demonstration)
                </span>
              </div>
            </div>

            {/* Right: Technical Ledger Callout & Action Card */}
            <div className="lg:col-span-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                <span className="font-mono text-[var(--ink-2)] uppercase tracking-wider font-semibold">
                  Cryptographic Verification
                </span>
                <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" />
              </div>

              <div className="mt-4 space-y-3.5 text-xs font-mono">
                <div>
                  <span className="text-[var(--ink-2)] text-[10px] uppercase font-semibold">
                    Case Identifier
                  </span>
                  <p className="text-[var(--ink)] font-semibold text-sm">Case #RG-2026-0412</p>
                </div>

                <div>
                  <span className="text-[var(--ink-2)] text-[10px] uppercase font-semibold">
                    Active Step Actor
                  </span>
                  <p className="text-[var(--accent)] capitalize font-medium">
                    {activeEvent.actor}
                  </p>
                </div>

                <div>
                  <span className="text-[var(--ink-2)] text-[10px] uppercase font-semibold">
                    Status Gate
                  </span>
                  <p className="text-[var(--agreed)] font-medium">
                    {activeEvent.step === 10
                      ? "Awaiting Human Sign-Off (Protected Gate)"
                      : "Verified in Bilateral Graph"}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--line)] space-y-2">
                  <Link
                    href="/demo"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all cursor-pointer"
                  >
                    <span>Launch Full Interactive Demo Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href="/cases/RG-1001"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                  >
                    <span>Inspect Sample Case RG-1001 in Workspace</span>
                    <ExternalLink className="h-3.5 w-3.5 text-[var(--ink-2)]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
