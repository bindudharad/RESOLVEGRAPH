"use client";

import { useState } from "react";
import { FileText, Lock, Copy, Check } from "lucide-react";
import Link from "next/link";

export function TestimonialsSection() {
  const [copied, setCopied] = useState(false);

  const sampleDossierJson = `{
  "reportId": "DOSSIER-RG-8492-20261108",
  "incidentCategory": "DEBITED_NOT_CREDITED",
  "disputedAmount": "INR 4999.00",
  "overallConfidenceScore": 0.89,
  "statutoryTatGuidance": {
    "framework": "RBI DPSS.CO.PD No.629/02.01.014/2019-20",
    "turnaroundTarget": "T+1 working days",
    "penaltyPerDayDelay": "INR 100.00",
    "isAutoReversalMandatory": true
  },
  "verifiedFacts": [
    "Bank debit of ₹4,999.00 confirmed on HDFC statement ref #987654",
    "UPI acquirer settlement confirmed to merchant aggregator"
  ],
  "rootCauseHypothesis": "Merchant callback dropped due to gateway timeout 504 post-capture",
  "auditChainBlockHash": "sha256:ca65f5c811dabdf4baad923945bd5d159ffcae16..."
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleDossierJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative py-28 border-b border-[var(--color-line)] bg-[var(--color-app)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mb-16 space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
            AUDIT-READY EVIDENCE DOSSIERS
          </div>
          <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-[var(--color-fg)]">
            Court-Ready & Ombudsman-Compliant <span className="font-editorial italic text-amber-300">Forensic Reports.</span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--color-muted)] leading-relaxed font-normal">
            Every investigated incident exports into a cryptographically sealed dossier. Includes 4-dimensional evidentiary confidence scoring, statutory TAT penalties, and automated PII masking.
          </p>
        </div>

        {/* Dossier Terminal & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Real JSON Dossier Inspector */}
          <div className="lg:col-span-7 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3 bg-[var(--color-surface)]">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <span className="font-mono text-xs text-[var(--color-fg)]">
                  forensic_dossier_rg_8492.json
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--color-line)] bg-[var(--color-shell)] text-[11px] font-mono text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>

            <div className="p-4 font-mono text-[11.5px] leading-relaxed text-[var(--color-fg-muted)] overflow-x-auto bg-[var(--color-app)]">
              <pre className="text-[var(--color-fg-muted)]">
                <code>{sampleDossierJson}</code>
              </pre>
            </div>

            <div className="p-3 border-t border-[var(--color-line)] bg-[var(--color-surface)] flex items-center justify-between text-xs font-mono text-[var(--color-subtle)]">
              <span>Export Formats: JSON · Markdown / PDF · CSV Ledger</span>
              <span className="text-emerald-400 font-medium">PII MASKING: ACTIVE</span>
            </div>
          </div>

          {/* Right Column: 4D Confidence & Cryptographic Proof */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 4D Confidence Metric */}
            <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
                <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                  4-Dimensional Evidentiary Scoring
                </h3>
                <span className="font-mono text-xs text-amber-400 font-bold">
                  Composite: 89.0%
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[var(--color-muted)] mb-1">
                    <span>Source Authenticity (30% weight)</span>
                    <span className="text-[var(--color-fg)]">95.0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full w-[95%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[var(--color-muted)] mb-1">
                    <span>Cross-Source Consistency (30% weight)</span>
                    <span className="text-[var(--color-fg)]">90.0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full w-[90%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[var(--color-muted)] mb-1">
                    <span>Temporal Plausibility (20% weight)</span>
                    <span className="text-[var(--color-fg)]">85.0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full w-[85%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[var(--color-muted)] mb-1">
                    <span>Document Completeness (20% weight)</span>
                    <span className="text-[var(--color-fg)]">85.0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full w-[85%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger Verification */}
            <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-fg)]">
                <Lock className="h-4 w-4 text-emerald-400" />
                <span>Cryptographic SHA-256 Block Chain</span>
              </div>
              <p className="text-xs text-[var(--color-muted)] leading-relaxed font-normal">
                Every investigative finding and supervisor sign-off is hashed into an immutable block sequence. If any historical record is tampered with, the ledger breaks instantly.
              </p>
              <Link
                href="/admin/security"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors pt-1"
              >
                <span>Verify Live Ledger Integrity</span>
                <span>&rarr;</span>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
