"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building2,
  Truck,
  User,
  Scale,
  Lock,
  ChevronRight,
  Cpu,
} from "lucide-react";

interface EvidenceSource {
  id: string;
  label: string;
  sublabel: string;
  category: "buyer" | "merchant" | "paypal" | "bank" | "delivery";
  color: string;
  icon: typeof User;
  sample: string;
  status: "verified" | "contested" | "matched";
}

const SOURCES: EvidenceSource[] = [
  {
    id: "buyer",
    label: "Buyer Evidence",
    sublabel: "4K Unboxing & Weigh-in",
    category: "buyer",
    color: "var(--buyer)",
    icon: User,
    sample: "Scale Photo: 420g internal weight (Box re-taped)",
    status: "contested",
  },
  {
    id: "merchant",
    label: "Merchant Record",
    sublabel: "Warehouse Dispatch Scan",
    category: "merchant",
    color: "var(--merchant)",
    icon: Building2,
    sample: "Barcode verified SN-881290-NVME · 1,248g at dock",
    status: "verified",
  },
  {
    id: "paypal",
    label: "PayPal Platform",
    sublabel: "Capture & Dispute Rail",
    category: "paypal",
    color: "#0070BA",
    icon: CreditCard,
    sample: "Capture $1,420.00 USD · Dispute PP-D-19402",
    status: "matched",
  },
  {
    id: "bank",
    label: "Issuing Bank",
    sublabel: "Settlement & 3DS v2",
    category: "bank",
    color: "var(--amber)",
    icon: Lock,
    sample: "Auth token verified · Escrow held pending audit",
    status: "verified",
  },
  {
    id: "delivery",
    label: "Carrier Telemetry",
    sublabel: "Checkpoint Weigh-Ins",
    category: "delivery",
    color: "#E65100",
    icon: Truck,
    sample: "Hub #3 handoff: -828g weight loss detected",
    status: "contested",
  },
];

export function MarketingHero() {
  const [activeSource, setActiveSource] = useState<string>("paypal");
  const currentSource = SOURCES.find((s) => s.id === activeSource) || SOURCES[2];

  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--bg)] pt-24 pb-16 sm:pt-32 sm:pb-24">
      {/* Subtle radial ambient highlight */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] rounded-full bg-radial from-[var(--accent)]/10 via-[var(--buyer)]/5 to-transparent blur-3xl opacity-50" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Core Positioning, Headline, and Dual CTAs */}
          <div className="lg:col-span-6 z-10">
            {/* Standard Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-mono text-[var(--ink-2)] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
              <span className="font-semibold text-[var(--ink)]">
                ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION.
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-normal leading-[1.08] tracking-tight text-[var(--ink)]">
              Resolve payment disputes with{" "}
              <span className="font-display italic text-[var(--accent)] font-medium">
                evidence from every side.
              </span>
            </h1>

            {/* Supporting Explanation */}
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[var(--ink-2)] max-w-xl">
              RESOLVEGRAPH connects buyer, merchant, PayPal, bank and delivery
              evidence into one explainable investigation. Discover what happened,
              identify missing evidence and understand the next best action.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/demo"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" />
                <span>Try Interactive Demo</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-3.5 text-sm font-medium text-[var(--ink)] shadow-xs transition-all hover:border-[var(--ink-3)] hover:bg-[var(--surface-2)] active:scale-[0.98]"
              >
                <span>Explore How It Works</span>
                <ChevronRight className="h-4 w-4 text-[var(--ink-3)]" />
              </a>

              <Link
                href="/overview"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[var(--ink-3)] hover:text-[var(--accent)] transition-colors"
              >
                <span>3D Evidence Graph Overview →</span>
              </Link>
            </div>

            {/* Provenance Key Signals */}
            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-[var(--line)] pt-6 text-xs">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  Sources
                </span>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  Multi-Rail Ingestion
                </p>
                <p className="text-[11px] text-[var(--ink-3)]">
                  PayPal, Card, Delivery & Buyer
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  Reasoning
                </span>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  BERR v2 Matrix
                </p>
                <p className="text-[11px] text-[var(--ink-3)]">
                  AGREED vs CONTESTED facts
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  Governance
                </span>
                <p className="mt-1 font-semibold text-[var(--ink)]">
                  Human Sign-Off
                </p>
                <p className="text-[11px] text-[var(--ink-3)]">
                  10-point safeguard gate
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Multi-Source Convergence Visual */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-2xl backdrop-blur-sm">
              {/* Convergence Visual Header */}
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--agreed)] animate-pulse" />
                  <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                    BILATERAL EVIDENCE CONVERGENCE
                  </span>
                </div>
                <span className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-3)]">
                  Case #RG-2026-0412
                </span>
              </div>

              {/* 5 Input Streams Flowing In */}
              <div className="mt-4 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                  Independent Evidence Streams (Select to inspect)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SOURCES.map((s) => {
                    const isSelected = activeSource === s.id;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSource(s.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-sm"
                            : "border-[var(--line)] bg-[var(--surface-2)]/40 hover:border-[var(--line-strong)] hover:bg-[var(--surface-2)]"
                        }`}
                      >
                        <div
                          className="mt-0.5 rounded-lg p-1.5"
                          style={{
                            backgroundColor: `${s.color}20`,
                            color: s.color,
                          }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--ink)] truncate">
                              {s.label}
                            </span>
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                                s.status === "verified"
                                  ? "bg-[var(--agreed)]/15 text-[var(--agreed)]"
                                  : s.status === "matched"
                                  ? "bg-[var(--buyer)]/15 text-[var(--buyer)]"
                                  : "bg-[var(--amber)]/15 text-[var(--amber)]"
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--ink-3)] truncate mt-0.5">
                            {s.sublabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Central Converged Intelligence Core */}
              <div className="mt-5 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface-2)] p-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[var(--accent)]" />
                    <span className="font-semibold text-[var(--ink)]">
                      Selected Provenance Record
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--ink-3)]">
                    SHA-256 Verified
                  </span>
                </div>
                <div className="mt-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs">
                  <p className="font-mono text-[11px] text-[var(--ink)]">
                    {currentSource.sample}
                  </p>
                  <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[10px] font-mono text-[var(--ink-3)]">
                    <span>Source: {currentSource.label}</span>
                    <span className="text-[var(--accent)]">
                      Linked to Case RG-2026-0412
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Agent Verdict & Human Sign-off Safeguard */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--agreed)]/30 bg-[var(--agreed)]/10 p-3.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-[var(--agreed)] p-1.5 text-white">
                    <Cpu className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--ink)]">
                      AI Root Cause Localized
                    </span>
                    <p className="text-[11px] text-[var(--ink-2)]">
                      Weight loss isolated to Carrier Hub #3. Escrow protected.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] text-[var(--ink)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
                  <span>Human Gate Locked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
