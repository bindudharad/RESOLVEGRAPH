"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Network,
  Scale,
  Database,
  ShieldAlert,
  Shield,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Layers,
  Fingerprint,
} from "lucide-react";

export type CoreTechTab = "matching" | "beg" | "berr" | "evidenceguard";

export function ProductDifferentiatorsSection() {
  const [activeTab, setActiveTab] = useState<CoreTechTab>("matching");

  return (
    <section id="core-technologies" className="border-b border-[var(--line)] bg-[var(--surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>CORE TECHNOLOGIES</span>
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

        {/* 4 Core Technology Tabs */}
        <div className="mt-12 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("matching")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "matching"
                ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-[var(--accent)]"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Cross-Platform Transaction Matching</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("beg")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "beg"
                ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-[var(--accent)]"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Network className="h-4 w-4" />
            <span>Bilateral Evidence Graph (BEG)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("berr")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "berr"
                ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-[var(--accent)]"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>BERR Reasoning Engine</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("evidenceguard")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "evidenceguard"
                ? "bg-[var(--accent)] text-white shadow-sm ring-1 ring-[var(--accent)]"
                : "bg-[var(--surface-2)]/60 text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>EvidenceGuard Forensics</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="mt-8 rounded-3xl border border-[var(--line-strong)] bg-[var(--bg)] p-6 sm:p-10 shadow-xl">
          {/* TAB 1: Cross-Platform Transaction Matching */}
          {activeTab === "matching" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--amber)] font-semibold">
                  Core Engine 01 · Canonical Reconciliation
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Standardize multi-rail payment records into a single authoritative timeline.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
                  The Canonical Transaction Engine normalizes disparate records across PayPal Sandbox,
                  card scheme 3DS2 tokens, bank settlement statements, and UPI receipt references. It resolves
                  timestamp skew, currency minor-unit precision, and counterparty identifier mismatches.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>10-Tier Deterministic Matching:</b> Prioritizes UTR and auth tokens over heuristic fuzzy matches</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>Temporal Window Reconciliation:</b> Accommodates asynchronous network and settlement lag (T±120s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>Multi-Currency Normalization:</b> Accurate minor-unit math preventing fractional round-trip discrepancies</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/reconciliation"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    <span>Inspect Canonical Reconciliation Ledger</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Canonical Schema Preview */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    Canonical Transaction Record
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-2)]">
                    Engine v2.4
                  </span>
                </div>
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-4 font-mono text-xs space-y-1.5 text-[var(--ink)]">
                  <div>canonicalId: <span className="text-[var(--accent)] font-semibold">&quot;CTX-2026-99014&quot;</span></div>
                  <div>matchedRails: <span className="text-[var(--buyer)]">[&quot;PAYPAL_SANDBOX&quot;, &quot;CARD_3DS2&quot;, &quot;BANK_DEBIT&quot;]</span></div>
                  <div>normalizedAmountMinor: <span className="text-[var(--agreed)] font-semibold">142000</span></div>
                  <div>currency: <span className="text-[var(--ink-2)]">&quot;USD&quot;</span></div>
                  <div>reconciliationConfidence: <span className="text-[var(--agreed)] font-semibold">0.998</span></div>
                  <div>temporalWindowMs: <span className="text-[var(--amber)]">140ms</span></div>
                  <div>status: <span className="text-[var(--agreed)] font-semibold">&quot;MATCHED_ESCROW_LOCKED&quot;</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Bilateral Evidence Graph */}
          {activeTab === "beg" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--buyer)] font-semibold">
                  Core Engine 02 · Graph Topology
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Map every entity, payment event and proof record into a unified graph.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
                  The Bilateral Evidence Graph (BEG) models commercial relationships across
                  buyers, merchants, banks, carriers, and payment providers. It explicitly
                  distinguishes agreed facts from contradictions and exposes missing evidentiary links.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>Cryptographic Node Hashing:</b> Immutable SHA-256 parent-child edge integrity</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>5 Perspective View Modes:</b> Full Graph, Buyer Trace, Merchant Trace, Conflicts, and Temporal Replay</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>Bilateral Balance:</b> Evaluates claims symmetrically without unilateral platform bias</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/cases/RG-1001"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    <span>Inspect BEG in Sample Case RG-1001</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Controlled Interactive Preview */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <span className="font-mono text-[var(--ink-2)]">
                    Graph Topology Preview · Case #RG-2026-0412
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
                    <p className="text-xs text-[var(--ink-2)] mt-0.5">
                      Unboxing Video · 420g delivered weight
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--merchant)]/30 bg-[var(--merchant)]/10 p-3">
                    <span className="font-mono text-[10px] text-[var(--merchant)] font-semibold uppercase">
                      Merchant Branch
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">Apex Tech Labs</p>
                    <p className="text-xs text-[var(--ink-2)] mt-0.5">
                      Dispatch Weigh-in · 1,248g at origin
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#0070BA]/30 bg-[#0070BA]/10 p-3">
                    <span className="font-mono text-[10px] text-[#0070BA] font-semibold uppercase">
                      Payment Rail
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">PayPal Capture</p>
                    <p className="text-xs text-[var(--ink-2)] mt-0.5">
                      $1,420.00 USD · Auth #TX-9812
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3">
                    <span className="font-mono text-[10px] text-[var(--danger)] font-semibold uppercase">
                      Contested Conflict
                    </span>
                    <p className="mt-1 font-semibold text-[var(--ink)]">Weight Anomaly</p>
                    <p className="text-xs text-[var(--ink-2)] mt-0.5">
                      -828g drop at Carrier Sorting Hub #3
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-center">
                  <p className="text-xs text-[var(--ink-2)]">
                    Nodes represent authenticated evidence files, banking ledger entries, carrier scans, and merchant ERP records.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BERR Reasoning Engine */}
          {activeTab === "berr" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--agreed)] font-semibold">
                  Core Engine 03 · Fact Reasoning
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Objective 4-category classification: AGREED, VERIFIED, CONTESTED, and MISSING.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
                  The Bilateral Evidence Review Record (BERR v2) analyzes evidence
                  without picking sides prematurely. It maps each claim against physical
                  records, isolates discrepancies, and recommends structured remedies.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>AGREED:</b> Facts accepted by both buyer and merchant (e.g. Purchase amount $1,420)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>VERIFIED:</b> Backed by cryptographic third-party records (e.g. PayPal sandbox capture ID)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <AlertCircle className="h-4 w-4 text-[var(--amber)] shrink-0" />
                    <span><b>CONTESTED:</b> Irreconcilable conflict (e.g. 1,248g dispatched vs 420g delivered)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <HelpCircle className="h-4 w-4 text-[var(--missing)] shrink-0" />
                    <span><b>MISSING:</b> Expected proof not yet submitted (e.g. Intermediate transit weigh-in)</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/investigation"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    <span>Open BERR Reasoning Studio</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* BERR Live Matrix Card */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    BERR v2 Live Classification Ledger
                  </span>
                  <span className="font-mono text-[10px] text-[var(--agreed)] font-semibold">
                    96.4% Decision Certainty
                  </span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Item Purchase Price</span>
                      <p className="text-xs text-[var(--ink-2)]">$1,420.00 USD matched across order & invoice</p>
                    </div>
                    <span className="rounded bg-[var(--agreed)]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--agreed)]">
                      AGREED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">PayPal Settlement Auth</span>
                      <p className="text-xs text-[var(--ink-2)]">Capture ID #77A012 verified on PayPal Sandbox</p>
                    </div>
                    <span className="rounded bg-[var(--buyer)]/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--buyer)]">
                      VERIFIED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Delivered Package Weight</span>
                      <p className="text-xs text-[var(--amber)]">Origin: 1,248g · Buyer scale: 420g (-828g loss)</p>
                    </div>
                    <span className="rounded bg-[var(--amber)]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--amber)]">
                      CONTESTED
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Courier Tamper Incident Log</span>
                      <p className="text-xs text-[var(--ink-2)]">Carrier Hub #3 intermediate handoff scan missing</p>
                    </div>
                    <span className="rounded bg-[var(--missing)]/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--missing)]">
                      MISSING
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EvidenceGuard Forensics */}
          {activeTab === "evidenceguard" && (
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--danger)] font-semibold">
                  Core Engine 04 · Forensic Verification
                </span>
                <h3 className="font-heading text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
                  Multi-signal forensic analysis examining authenticity, duplicates and tamper seals.
                </h3>
                <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-2)]">
                  EvidenceGuard evaluates uploaded receipts, screenshots, and package photos. It computes
                  perceptual difference hashes (dHash), inspects EXIF metadata continuity, checks font rendering
                  inconsistencies, and enforces strict boundaries between source-submitted uploads and verified records.
                </p>
                <div className="space-y-2 pt-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>Perceptual Image Hashing (dHash):</b> 64-bit gradient hashing detects re-uploaded screenshots</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>OCR & Purchase Cross-Check:</b> Extracted line items validated against Purchase Memory baseline</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                    <span><b>Honest Evidentiary Classification:</b> Uploaded files are explicitly marked Source-Submitted</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link
                    href="/intake"
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
                  >
                    <span>Test EvidenceGuard Intake</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* EvidenceGuard Signals Card */}
              <div className="lg:col-span-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <Fingerprint className="h-4 w-4 text-[var(--accent)]" />
                    <span className="font-semibold text-[var(--ink)]">
                      EvidenceGuard Forensics Report
                    </span>
                  </div>
                  <span className="rounded bg-[var(--agreed)]/15 px-2 py-0.5 font-mono text-[10px] text-[var(--agreed)] font-semibold">
                    State: CONSISTENT
                  </span>
                </div>
                <div className="mt-4 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Perceptual Hash (dHash)</span>
                      <p className="text-[11px] text-[var(--ink-2)]">64-bit gradient: 8f3c7a102b4e9d50 · Duplicate: FALSE</p>
                    </div>
                    <span className="text-[var(--agreed)] font-semibold">PASS</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">EXIF Metadata Timestamp</span>
                      <p className="text-[11px] text-[var(--ink-2)]">Camera capture matches claimed delivery window (±4 min)</p>
                    </div>
                    <span className="text-[var(--agreed)] font-semibold">PASS</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5">
                    <div>
                      <span className="font-semibold text-[var(--ink)]">Font Kerning / OCR Integrity</span>
                      <p className="text-[11px] text-[var(--ink-2)]">No raster layer manipulation or font splicing detected</p>
                    </div>
                    <span className="text-[var(--agreed)] font-semibold">PASS</span>
                  </div>

                  <div className="rounded-lg bg-[var(--surface-2)] p-2.5 text-[11px] text-[var(--ink-2)] border border-[var(--line)]">
                    <strong className="text-[var(--ink)]">Forensic Verdict:</strong> Document is authentic and consistent with purchase baseline. Marked as Source-Submitted Evidence.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Supporting Modules Row: Evidence Vault, Purchase Memory, Package Passport */}
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-6">
            <Shield className="h-5 w-5 text-[var(--accent)]" />
            <h4 className="mt-3 text-base font-semibold text-[var(--ink)]">
              Evidence Vault
            </h4>
            <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              SHA-256 byte hashing, provenance metadata, and tamper prevention across PDFs, photos, and 4K unboxing video sessions.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-6">
            <ShoppingBag className="h-5 w-5 text-[var(--buyer)]" />
            <h4 className="mt-3 text-base font-semibold text-[var(--ink)]">
              Purchase Memory
            </h4>
            <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              Pre-dispute baseline capturing original catalog descriptions, warranty promises, and exact checkout terms before alteration.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-6">
            <Scale className="h-5 w-5 text-[var(--amber)]" />
            <h4 className="mt-3 text-base font-semibold text-[var(--ink)]">
              Package Passport
            </h4>
            <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
              Physical package weigh-ins, barcode verification, and tamper-evident seal tracking across carrier handoff waypoints.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
