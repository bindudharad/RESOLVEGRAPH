"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
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
}

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    step: 1,
    time: "2026-01-14 09:30 UTC",
    title: "Payment Initiated",
    actor: "buyer",
    summary: "Buyer Alex Morgan checks out 2TB NVMe SSD for $1,420.00 USD.",
    details: "Checkout authenticated via 3D Secure v2 card scheme verification. Order #ORD-2026-4412 created.",
    badge: "Initiated",
    badgeColor: "var(--buyer)",
  },
  {
    step: 2,
    time: "2026-01-14 09:31 UTC",
    title: "PayPal Capture Recorded",
    actor: "paypal",
    summary: "PayPal Sandbox executes payment capture #TX-9812 ($1,420.00 USD).",
    details: "Capture confirmed via webhook. Funds placed in bilateral escrow protection pending delivery verification.",
    badge: "Captured",
    badgeColor: "#0070BA",
  },
  {
    step: 3,
    time: "2026-01-14 11:20 UTC",
    title: "Merchant Dispatch Manifest",
    actor: "merchant",
    summary: "Apex Tech Labs warehouse scans carton: 1,248g at loading dock.",
    details: "Cryptographic manifest signed with merchant private key. Barcode #SN-881290-NVME verified in ERP.",
    badge: "Dispatched",
    badgeColor: "var(--merchant)",
  },
  {
    step: 4,
    time: "2026-01-16 14:35 UTC",
    title: "Buyer Evidence Submitted",
    actor: "buyer",
    summary: "Buyer submits 4K unboxing video & scale photo showing 420g delivered.",
    details: "Delivered package has secondary clear tape over original seal. Internal hardware SSD missing.",
    badge: "Claim Filed",
    badgeColor: "var(--buyer)",
  },
  {
    step: 5,
    time: "2026-01-16 14:38 UTC",
    title: "Evidence Relationships Established",
    actor: "paypal",
    summary: "Bilateral Evidence Graph connects buyer claim to merchant dispatch record.",
    details: "Graph links: Order #4412 ↔ Capture #9812 ↔ Carrier Tracking #TRK-9801 ↔ Unboxing Video #EVD-0412.",
    badge: "BEG Assembled",
    badgeColor: "var(--ai)",
  },
  {
    step: 6,
    time: "2026-01-16 14:39 UTC",
    title: "Contradiction Detected",
    actor: "ai",
    summary: "Weight contradiction detected: 1,248g dispatch vs 420g unboxed (-828g).",
    details: "BERR engine flags CONTESTED weight anomaly. Courier Hub #3 checkpoint recorded 422g.",
    badge: "Contradiction",
    badgeColor: "var(--danger)",
  },
  {
    step: 7,
    time: "2026-01-16 14:40 UTC",
    title: "Missing Evidence Identified",
    actor: "ai",
    summary: "System identifies missing courier transfer scale receipt between Hubs #2 and #3.",
    details: "Evidence request automatically generated for DHL Express intermediate sorting bay.",
    badge: "Missing Proof",
    badgeColor: "var(--missing)",
  },
  {
    step: 8,
    time: "2026-01-16 14:41 UTC",
    title: "AI Investigation Explanation",
    actor: "ai",
    summary: "Root cause localized: Theft occurred inside carrier sorting network, not at merchant.",
    details: "Both buyer and merchant acted honestly. Tampering isolated to transit facility #3.",
    badge: "Explained",
    badgeColor: "var(--agreed)",
  },
  {
    step: 9,
    time: "2026-01-16 14:42 UTC",
    title: "Recommended Remedy Displayed",
    actor: "ai",
    summary: "Remedy: Release $1,420 escrow refund to buyer; file DHL carrier indemnity claim.",
    details: "Merchant reputation and chargeback ratio protected from penalty due to verified origin weight.",
    badge: "Remedy Proposed",
    badgeColor: "var(--accent)",
  },
  {
    step: 10,
    time: "2026-01-16 14:43 UTC",
    title: "Human Approval Gate Enforced",
    actor: "safeguard",
    summary: "Financial Safeguard blocks autonomous refund: Requires authorized manager sign-off.",
    details: "Cryptographic argument hash generated. Human operator signs off via WebAuthn/RBAC.",
    badge: "Human Gate",
    badgeColor: "var(--agreed)",
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
            <span>CANONICAL DEMO SCENARIO</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Inspect a live investigation{" "}
            <span className="font-display italic text-[var(--accent)] font-medium">
              from payment to resolution.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
            Walk through the 10 real stages of dispute case #RG-2026-0412. See how
            RESOLVEGRAPH detects transit theft without penalizing honest merchants
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
                      ? "bg-[var(--accent)] text-white shadow-md font-semibold"
                      : "bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? "bg-white" : "bg-[var(--line-strong)]"
                    }`}
                  />
                  <span>Step {event.step < 10 ? `0${event.step}` : event.step}</span>
                  <span className="opacity-80">· {event.title}</span>
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
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase"
                  style={{
                    backgroundColor: `${activeEvent.badgeColor}20`,
                    color: activeEvent.badgeColor,
                  }}
                >
                  Stage {activeEvent.step} · {activeEvent.badge}
                </span>
                <span className="font-mono text-xs text-[var(--ink-3)]">
                  {activeEvent.time}
                </span>
              </div>

              <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                {activeEvent.title}
              </h3>

              <p className="text-base text-[var(--ink)] leading-relaxed font-medium">
                {activeEvent.summary}
              </p>

              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 text-xs font-mono text-[var(--ink-2)] leading-relaxed">
                <p>{activeEvent.details}</p>
              </div>

              <div className="pt-2 flex items-center gap-4 text-xs">
                <span className="font-mono text-[var(--ink-3)]">
                  Simulated sandbox environment:
                </span>
                <span className="rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[11px] text-[var(--accent)] font-semibold">
                  PayPal REST v2 APIs
                </span>
              </div>
            </div>

            {/* Right: Technical Ledger Callout */}
            <div className="lg:col-span-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                <span className="font-mono text-[var(--ink-3)] uppercase tracking-wider">
                  Cryptographic Verification
                </span>
                <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" />
              </div>

              <div className="mt-4 space-y-3 text-xs font-mono">
                <div>
                  <span className="text-[var(--ink-3)] text-[10px] uppercase">
                    Case Number
                  </span>
                  <p className="text-[var(--ink)] font-semibold">RG-2026-0412</p>
                </div>

                <div>
                  <span className="text-[var(--ink-3)] text-[10px] uppercase">
                    Active Step Actor
                  </span>
                  <p className="text-[var(--accent)] capitalize">
                    {activeEvent.actor}
                  </p>
                </div>

                <div>
                  <span className="text-[var(--ink-3)] text-[10px] uppercase">
                    Status Gate
                  </span>
                  <p className="text-[var(--agreed)]">
                    {activeEvent.step === 10
                      ? "Awaiting Human Sign-Off (Protected)"
                      : "Verified in Bilateral Graph"}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--line)]">
                  <Link
                    href="/demo"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all"
                  >
                    <span>Run Full Investigation in Demo</span>
                    <ArrowRight className="h-3.5 w-3.5" />
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
