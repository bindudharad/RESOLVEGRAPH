"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { TiltCard3D } from "./tilt-card-3d";

interface DisputeCasePreview {
  caseNumber: string;
  claim: string;
  amount: string;
  divergence: string;
  buyerEvidence: string;
  merchantEvidence: string;
  status: "CONVERGED" | "ARBITRATING" | "VERIFIED";
  confidence: string;
}

const FEATURED_CASES: DisputeCasePreview[] = [
  {
    caseNumber: "RG-2026-0412",
    claim: "Wrong Capacity Delivered: 1TB vs 512GB NVMe SSD",
    amount: "₹18,499.00",
    divergence: "Merchant ERP SKU matches 1TB, Buyer unboxing OCR shows 512GB sticker",
    buyerEvidence: "CameraX Dual-Sight Video (Hash: 9e2f...4c1a)",
    merchantEvidence: "Warehouse Dispatch Barcode Scan (Hash: 77a0...8b1e)",
    status: "CONVERGED",
    confidence: "99.4%",
  },
  {
    caseNumber: "RG-2026-0413",
    claim: "UPI Debit Succeeded but Gateway Timeout 504",
    amount: "₹4,999.00",
    divergence: "Bank NPCI debited, payment provider callback incomplete",
    buyerEvidence: "Bank Statement with Valid 12-digit UTR",
    merchantEvidence: "Payment Gateway Webhook Timeout Log",
    status: "VERIFIED",
    confidence: "100%",
  },
  {
    caseNumber: "RG-2026-0414",
    claim: "Tampered Package Seal Reported at Doorstep",
    amount: "₹62,000.00",
    divergence: "Weight variance +420g at transit hub, intact OTP delivery",
    buyerEvidence: "Courier Receipt & Broken Hologram Photo",
    merchantEvidence: "Scales Telemetry at Fulfillment Station",
    status: "ARBITRATING",
    confidence: "91.8%",
  },
];

const MARQUEE_TICKERS = [
  { text: "RBI DPSS.CO.PD COMPLIANT", highlight: "T+1 AUTO-REVERSAL" },
  { text: "10-TIER DETERMINISTIC MATCH", highlight: "ZERO LEAKAGE" },
  { text: "PAISE-SAFE INTEGER MINOR UNITS", highlight: "₹0.00 FLOAT SAFE" },
  { text: "SHA-256 HASH-CHAINED AUDIT", highlight: "TAMPER-PROOF" },
  { text: "DUAL-SIGHT CAMERAX UNBOXING", highlight: "CROSS-PERSPECTIVE" },
  { text: "ZERO AUTONOMOUS DISBURSEMENT", highlight: "DUAL-KEY HUMAN SIGN-OFF" },
  { text: "BERR V2 PROBABILISTIC MATRIX", highlight: "EXPLAINABLE CONSENSUS" },
];

export function PerspectiveShowcase3D() {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);

  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--surface-2)]/30 py-24 sm:py-32">
      {/* Plumbline Topographic & Architectural Grid Overlay */}
      <div className="contours pointer-events-none absolute inset-0 opacity-40" />
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-50" />

      {/* Section Header with Sophisticated Typography */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-1 text-xs font-mono text-[var(--accent)] shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider">
              3D Interactive Evidence Matrix
            </span>
          </div>

          <h2 className="mt-4 text-3xl sm:text-5xl font-normal tracking-tight text-[var(--ink)]">
            Cinematic Forensic Depth.
            <br />
            <span className="font-display italic text-[var(--accent)]">
              Multi-Layered Bilateral Truth.
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-[var(--ink-2)] max-w-2xl mx-auto leading-relaxed">
            Move your cursor across any dispute card to inspect 3D perspective layers,
            tamper-evident SHA-256 hashes, and real-time reconciliation consensus.
          </p>
        </div>

        {/* 3D Perspective Cards Stage (Averlo perspective:1400px & preserve-3d) */}
        <div className="relative mt-16 [perspective:1400px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURED_CASES.map((item, idx) => {
              const isSelected = activeCaseIndex === idx;

              return (
                <TiltCard3D
                  key={item.caseNumber}
                  maxTilt={12}
                  depth={30}
                  onClick={() => setActiveCaseIndex(idx)}
                  className="cursor-pointer transition-all duration-300"
                >
                  <div
                    className={`relative flex h-full flex-col justify-between rounded-xl border p-6 transition-all duration-300 ${
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--surface)] shadow-[0_20px_50px_-15px_rgba(67,80,229,0.3)] ring-1 ring-[var(--accent)]"
                        : "border-[var(--line)] bg-[var(--surface)]/80 hover:border-[var(--line-strong)] hover:shadow-lg"
                    } paper-dark`}
                  >
                    {/* Laser Forensic Scan Line on Active Card */}
                    {isSelected && <div className="scan-y" />}

                    {/* Card Header */}
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-3">
                        <span className="font-mono text-xs font-bold text-[var(--ink)]">
                          {item.caseNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${
                            item.status === "CONVERGED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.status === "VERIFIED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          {item.status}
                        </span>
                      </div>

                      {/* Claim Title */}
                      <h3 className="mt-4 text-base font-semibold text-[var(--ink)] leading-snug">
                        {item.claim}
                      </h3>

                      {/* Amount & Divergence */}
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="font-mono text-lg font-bold text-[var(--ink)]">
                          {item.amount}
                        </span>
                        <span className="text-xs text-[var(--ink-3)] font-mono">
                          (Confidence: {item.confidence})
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-[var(--ink-2)] leading-relaxed">
                        {item.divergence}
                      </p>
                    </div>

                    {/* Bilateral Threads */}
                    <div className="mt-6 space-y-2.5 border-t border-[var(--line)]/60 pt-4 text-xs font-mono">
                      <div className="flex items-center gap-2 text-[var(--buyer)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--buyer)]" />
                        <span className="truncate">{item.buyerEvidence}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--merchant)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--merchant)]" />
                        <span className="truncate">{item.merchantEvidence}</span>
                      </div>
                    </div>

                    {/* Action link */}
                    <div className="mt-6 flex items-center justify-between border-t border-[var(--line)]/60 pt-3 text-xs">
                      <span className="text-[var(--ink-3)] font-mono">
                        Stage 06 &bull; BERR v2
                      </span>
                      <Link
                        href={`/cases/cmw0m6n310000fcvjzk8r347a`}
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Inspect Ledger <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </TiltCard3D>
              );
            })}
          </div>
        </div>

        {/* Averlo Continuous Marquee Ticker */}
        <div className="relative mt-20 overflow-hidden border-y border-[var(--line)] py-4 bg-[var(--surface)]/60 backdrop-blur-sm">
          <div className="flex w-max home-marquee-left">
            {[...MARQUEE_TICKERS, ...MARQUEE_TICKERS].map((t, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-6 text-xs font-mono uppercase tracking-wider text-[var(--ink-2)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>{t.text}</span>
                <span className="font-semibold text-[var(--accent)]">
                  [{t.highlight}]
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
