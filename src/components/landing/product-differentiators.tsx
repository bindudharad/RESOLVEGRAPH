"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Network,
  Scale,
  Bot,
  Database,
  Shield,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Layers,
} from "lucide-react";

export function ProductDifferentiatorsSection() {
  const [activeTab, setActiveTab] = useState<"beg" | "berr" | "agent" | "canonical">("beg");

  return (
    <section id="differentiators" className="border-b border-[var(--line)] bg-[var(--surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>CORE ARCHITECTURAL DIFFERENTIATORS</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Technology built for{" "}
            <span className="font-display italic text-[var(--accent)] font-medium">
              cross-provider truth.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
            RESOLVEGRAPH is not a generic dispute ticketing tool. It is an
            evidence-grounded intelligence platform designed to reconcile multi-party
            commercial transactions with mathematical provenance.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mt-12 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("beg")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "beg"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Network className="h-4 w-4" />
            <span>Bilateral Evidence Graph (BEG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("berr")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "berr"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>BERR Reasoning Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("agent")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "agent"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>AI Payment Investigation Agent</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("canonical")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "canonical"
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Canonical Transaction Engine</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="mt-8 rounded-3xl border border-[var(--line-strong)] bg-[var(--bg)] p-6 sm:p-10 shadow-xl">
          {/* TAB 1: Bilateral Evidence Graph */}
          {activeTab === "beg" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--buyer)] font-semibold">
                  Module A · Graph Intelligence
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Map every entity, payment event and proof record into a unified graph.
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ink-2)]">
                  The Bilateral Evidence Graph models commercial relationships across
                  buyers, merchants, banks, and payment providers. It explicitly
                  distinguishes agreed facts from contradictions and highlights evidentiary gaps.
                </p>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span>Cryptographic node hashing (SHA-256 for all edges)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span>5 view modes: Full Graph, Buyer Trace, Merchant Trace, Conflicts, and Replay</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span>3D spatial projection with accessible 2D table fallback</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/overview"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-xs font-semibold text-white shadow-md hover:brightness-110 transition-all"
                  >
                    <span>Launch 3D Evidence Graph Laboratory</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Controlled Interactive Preview */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <span className="font-mono text-[var(--ink-3)]">
                    Graph Preview · Case #RG-2026-0412
                  </span>
                  <span className="rounded bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[10px] text-[var(--accent)] font-semibold">
                    13 Forensic Nodes Active
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-[var(--buyer)]/30 bg-[var(--buyer)]/10 p-3">
                    <span className="font-mono text-[10px] text-[var(--buyer)] font-semibold uppercase">
                      Buyer Branch
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">Alex Morgan</p>
                    <p className="text-[11px] text-[var(--ink-2)] mt-0.5">
                      Unboxing Video · 420g delivered weight
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--merchant)]/30 bg-[var(--merchant)]/10 p-3">
                    <span className="font-mono text-[10px] text-[var(--merchant)] font-semibold uppercase">
                      Merchant Branch
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">Apex Tech Labs</p>
                    <p className="text-[11px] text-[var(--ink-2)] mt-0.5">
                      Dispatch Weigh-in · 1,248g at origin
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#0070BA]/30 bg-[#0070BA]/10 p-3">
                    <span className="font-mono text-[10px] text-[#0070BA] font-semibold uppercase">
                      Payment Rail
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">PayPal Capture</p>
                    <p className="text-[11px] text-[var(--ink-2)] mt-0.5">
                      $1,420.00 USD · Auth #TX-9812
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3">
                    <span className="font-mono text-[10px] text-[var(--danger)] font-semibold uppercase">
                      BERR Contradiction
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">Weight Anomaly</p>
                    <p className="text-[11px] text-[var(--ink-2)] mt-0.5">
                      -828g drop at Carrier Sorting Hub #3
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-center">
                  <p className="text-xs text-[var(--ink-2)]">
                    Explore full 3D node orbits, depth-filtered clustering, and camera controls in the Overview.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BERR Reasoning Matrix */}
          {activeTab === "berr" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--agreed)] font-semibold">
                  Module B · Fact Classification
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Objective 4-category classification: AGREED, VERIFIED, CONTESTED, and MISSING.
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ink-2)]">
                  The Bilateral Evidence Review Record (BERR v2) analyzes evidence
                  without picking sides prematurely. It maps each claim against physical
                  records and calculates honest confidence bounds.
                </p>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span><b>AGREED:</b> Facts accepted by both buyer and merchant (e.g. Purchase amount $1,420)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span><b>VERIFIED:</b> Backed by cryptographic third-party records (e.g. PayPal capture ID)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <AlertCircle className="h-4 w-4 text-[var(--amber)]" />
                    <span><b>CONTESTED:</b> Irreconcilable conflict (e.g. 1,248g dispatched vs 420g delivered)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <HelpCircle className="h-4 w-4 text-[var(--missing)]" />
                    <span><b>MISSING:</b> Expected proof not yet submitted (e.g. Intermediate transit weigh-in)</span>
                  </div>
                </div>
              </div>

              {/* BERR Live Matrix Card */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    BERR v2 Live Classification Ledger
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-3)]">
                    96.4% Decision Certainty
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Item Purchase Price</span>
                      <p className="text-[11px] text-[var(--ink-3)]">$1,420.00 USD matched across order & invoice</p>
                    </div>
                    <span className="rounded bg-[var(--agreed)]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--agreed)]">
                      AGREED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">PayPal Settlement Auth</span>
                      <p className="text-[11px] text-[var(--ink-3)]">Capture ID #77A012 verified on PayPal Sandbox</p>
                    </div>
                    <span className="rounded bg-[var(--buyer)]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--buyer)]">
                      VERIFIED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Delivered Package Weight</span>
                      <p className="text-[11px] text-[var(--amber)]">Origin: 1,248g · Buyer scale: 420g (-828g)</p>
                    </div>
                    <span className="rounded bg-[var(--amber)]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--amber)]">
                      CONTESTED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Courier Tamper Incident Log</span>
                      <p className="text-[11px] text-[var(--ink-3)]">Carrier Hub #3 internal CCTV & incident report</p>
                    </div>
                    <span className="rounded bg-[var(--missing)]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--missing)]">
                      MISSING
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI Investigation Agent */}
          {activeTab === "agent" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--ai)] font-semibold">
                  Module C · Agentic Investigation
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Autonomous evidence synthesis with strict human-governed execution.
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ink-2)]">
                  The AI Payment Investigation Agent utilizes 19 specialized PayPal
                  investigation tools to inspect disputes, verify captures, and trace
                  invariants. Financial payouts are strictly gated by human authorization.
                </p>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span><b>19 PayPal Tools:</b> Dissect transactions, captures, refunds & dispute cases</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span><b>Structured Citations:</b> Every AI finding references real cryptographic evidence IDs</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span><b>10-Point Safeguard Gate:</b> Zero autonomous payouts — human approval required</span>
                  </div>
                </div>
              </div>

              {/* Agent Investigation Tool Terminal Preview */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
                    <span className="font-semibold text-[var(--ink)]">
                      agent:payment-investigation
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--ink-3)]">
                    Tool Execution Log
                  </span>
                </div>
                <div className="mt-4 space-y-2 font-mono text-[11px]">
                  <div className="rounded-lg bg-[var(--surface-2)] p-2 text-[var(--ink-2)]">
                    <span className="text-[var(--accent)] font-semibold">&gt; TOOL:</span> paypal_get_dispute(&quot;PP-D-19402&quot;)
                    <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Status: UNDER_REVIEW · Reason: MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-2)] p-2 text-[var(--ink-2)]">
                    <span className="text-[var(--accent)] font-semibold">&gt; TOOL:</span> verify_evidence_hash(&quot;EVD-0412-VID&quot;)
                    <div className="text-[10px] text-[var(--ink-3)] mt-0.5">Hash SHA-256 match: e3b0c442... · Tamper: FALSE</div>
                  </div>
                  <div className="rounded-lg bg-[var(--agreed)]/10 border border-[var(--agreed)]/30 p-2.5 text-[var(--ink)]">
                    <span className="text-[var(--agreed)] font-bold">✓ RECOMMENDED REMEDY:</span>
                    <div className="text-[11px] mt-1 text-[var(--ink-2)]">
                      &quot;Issue carrier indemnity claim to DHL Express; release $1,420.00 from escrow to buyer; preserve merchant reputation score.&quot;
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Canonical Transaction Engine */}
          {activeTab === "canonical" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--amber)] font-semibold">
                  Module D · Transaction Normalization
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Standardize multi-rail payment records into a single authoritative ledger.
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ink-2)]">
                  The Canonical Transaction Engine normalizes differences across PayPal,
                  Stripe, Visa/Mastercard networks, and India UPI rails. It resolves
                  timestamp jitters, currency micro-conversions, and mismatched identifiers.
                </p>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span>Deterministic 10-tier matching hierarchy</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span>Statutory TAT alignment for cross-border and India UPI complaints</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
                    <span>Purchase Memory snapshots preserving pre-dispute item conditions</span>
                  </div>
                </div>
              </div>

              {/* Canonical Rails Schema Preview */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    Canonical Transaction Record
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-3)]">
                    Schema v2.4
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-3 font-mono text-[11px] space-y-1 text-[var(--ink)]">
                  <div>canonicalId: <span className="text-[var(--accent)]">&quot;CTX-2026-99014&quot;</span></div>
                  <div>networkRails: <span className="text-[var(--buyer)]">[&quot;PAYPAL_SANDBOX&quot;, &quot;CARD_3DS2&quot;]</span></div>
                  <div>authorizedAmountMinor: <span className="text-[var(--agreed)]">142000</span></div>
                  <div>currency: <span className="text-[var(--ink-2)]">&quot;USD&quot;</span></div>
                  <div>temporalSkewWindowMs: <span className="text-[var(--amber)]">140</span></div>
                  <div>status: <span className="text-[var(--agreed)]">&quot;SETTLED_ESCROW_LOCKED&quot;</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Modules Row: Evidence Vault, Purchase Memory, Package Passport */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-6">
            <Shield className="h-5 w-5 text-[var(--accent)]" />
            <h4 className="mt-3 text-sm font-semibold text-[var(--ink)]">
              Evidence Vault
            </h4>
            <p className="mt-1 text-xs text-[var(--ink-2)] leading-relaxed">
              SHA-256 byte hashing, provenance metadata, and tamper prevention across PDFs, photos, and 4K unboxing video sessions.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-6">
            <ShoppingBag className="h-5 w-5 text-[var(--buyer)]" />
            <h4 className="mt-3 text-sm font-semibold text-[var(--ink)]">
              Purchase Memory
            </h4>
            <p className="mt-1 text-xs text-[var(--ink-2)] leading-relaxed">
              Pre-dispute baseline capturing original catalog descriptions, warranty promises, and exact checkout terms before alteration.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-6">
            <Scale className="h-5 w-5 text-[var(--amber)]" />
            <h4 className="mt-3 text-sm font-semibold text-[var(--ink)]">
              Package Passport
            </h4>
            <p className="mt-1 text-xs text-[var(--ink-2)] leading-relaxed">
              Physical package weigh-ins, barcode verification, and tamper-evident seal tracking across carrier handoff waypoints.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
