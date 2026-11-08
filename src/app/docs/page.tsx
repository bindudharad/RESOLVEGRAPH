import type { Metadata } from "next";
import Link from "next/link";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ArrowLeft, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation & API Reference · RESOLVEGRAPH",
  description:
    "Technical documentation, 10-tier matching hierarchy, 12-stage root-cause pipeline, RBI DPSS.CO.PD statutory TAT compliance, and complete REST API endpoints.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-app)] text-[var(--color-fg)]">
      <LandingNavbar />

      <main className="pt-36 pb-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 space-y-16">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-subtle)]">
            <Link href="/" className="hover:text-amber-300 transition-colors inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Overview</span>
            </Link>
            <span>/</span>
            <span className="text-[var(--color-fg-muted)]">Documentation & Reference</span>
          </div>

          {/* Header */}
          <div className="space-y-4 border-b border-[var(--color-line)] pb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-mono text-sky-300">
              <span>SYSTEM ARCHITECTURE & API REFERENCE</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-normal tracking-tight leading-[1.1]">
              Technical Documentation <span className="font-editorial italic text-amber-300">&amp; Protocols</span>
            </h1>
            <p className="text-base text-[var(--color-muted)] max-w-3xl leading-relaxed font-normal">
              Reference guide covering the 10-tier deterministic matching algorithm, 12-stage root-cause diagnostic state machine, statutory banking turnaround guidelines, and core REST APIs.
            </p>
          </div>

          {/* Section 1: 10-Tier Matching Hierarchy */}
          <section id="matching" className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              01 · RECONCILIATION ENGINE
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              Deterministic 10-Tier Matching Hierarchy
            </h2>
            <p className="text-sm text-[var(--color-muted)] leading-relaxed font-normal">
              Cross-provider transactions are matched deterministically across ten cascading tiers. Decisions evaluate to <span className="font-mono text-emerald-400">MATCHED</span>, <span className="font-mono text-amber-400">REVIEW</span>, <span className="font-mono text-sky-400">UNMATCHED</span>, or <span className="font-mono text-rose-400">CONFLICT</span>.
            </p>

            <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] overflow-hidden font-mono text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-subtle)] text-[11px]">
                    <tr>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Evaluation Rule</th>
                      <th className="p-3">Composite Score</th>
                      <th className="p-3">Resulting Outcome</th>
                      <th className="p-3">Explanation Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)] text-[var(--color-fg-muted)]">
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 1</td>
                      <td className="p-3">Exact Global Provider Tx ID</td>
                      <td className="p-3 text-emerald-400">1.00</td>
                      <td className="p-3 text-emerald-400">MATCHED</td>
                      <td className="p-3 text-[var(--color-subtle)]">Direct gateway transaction identifier parity</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 2</td>
                      <td className="p-3">NPCI 12-Digit UTR / RRN</td>
                      <td className="p-3 text-emerald-400">0.98</td>
                      <td className="p-3 text-emerald-400">MATCHED</td>
                      <td className="p-3 text-[var(--color-subtle)]">Interbank UPI settlement reference match</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 3</td>
                      <td className="p-3">Commerce Order Reference</td>
                      <td className="p-3 text-sky-400">0.95</td>
                      <td className="p-3 text-emerald-400">MATCHED</td>
                      <td className="p-3 text-[var(--color-subtle)]">Merchant ERP order identifier linkage</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 4</td>
                      <td className="p-3">Amount + Currency + Time Window (≤ 120m)</td>
                      <td className="p-3 text-amber-400">0.85</td>
                      <td className="p-3 text-amber-400">REVIEW</td>
                      <td className="p-3 text-[var(--color-subtle)]">Temporal & monetary correlation with human check</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 5</td>
                      <td className="p-3">Amount Discrepancy on Matching Ref</td>
                      <td className="p-3 text-rose-400">0.60</td>
                      <td className="p-3 text-rose-400">CONFLICT</td>
                      <td className="p-3 text-[var(--color-subtle)]">Identifier matched but minor units differ</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 6</td>
                      <td className="p-3">Status Contradiction (Success vs Failed)</td>
                      <td className="p-3 text-rose-400">0.50</td>
                      <td className="p-3 text-rose-400">CONFLICT</td>
                      <td className="p-3 text-[var(--color-subtle)]">Bank debited but merchant records unpaid</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 7</td>
                      <td className="p-3">Duplicate Debit Window (&lt; 5m)</td>
                      <td className="p-3 text-amber-400">0.70</td>
                      <td className="p-3 text-amber-400">REVIEW</td>
                      <td className="p-3 text-[var(--color-subtle)]">Double debit detected for single order</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 8</td>
                      <td className="p-3">Orphan Gateway Capture</td>
                      <td className="p-3 text-sky-400">0.40</td>
                      <td className="p-3 text-sky-400">UNMATCHED</td>
                      <td className="p-3 text-[var(--color-subtle)]">Successful capture with no linked order</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 9</td>
                      <td className="p-3">Currency Mismatch</td>
                      <td className="p-3 text-rose-400">0.30</td>
                      <td className="p-3 text-rose-400">CONFLICT</td>
                      <td className="p-3 text-[var(--color-subtle)]">Foreign exchange / multi-currency conflict</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-amber-400">Tier 10</td>
                      <td className="p-3">Heuristic / Uncorrelated Record</td>
                      <td className="p-3 text-[var(--color-subtle)]">0.10</td>
                      <td className="p-3 text-sky-400">UNMATCHED</td>
                      <td className="p-3 text-[var(--color-subtle)]">No matching identifiers or timestamps found</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 2: Statutory Turnaround Compliance (RBI DPSS.CO.PD) */}
          <section id="rbi-tat" className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              02 · STATUTORY TURNAROUND COMPLIANCE
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              RBI Circular DPSS.CO.PD No.629/02.01.014/2019-20
            </h2>

            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-sky-300 font-mono">
                <Clock className="h-4 w-4 text-sky-400" />
                <span>Mandatory Auto-Reversal & Penalty Framework</span>
              </div>
              <p className="text-xs text-[var(--color-fg-muted)] leading-relaxed font-sans">
                For failed customer transactions where funds were debited from the bank account but not credited to the merchant beneficiary:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-3 rounded bg-[var(--color-surface)] border border-[var(--color-line)] space-y-1">
                  <div className="text-[var(--color-subtle)]">STATUTORY TURNAROUND (TAT):</div>
                  <div className="text-emerald-400 font-bold">T + 1 Working Days</div>
                  <div className="text-[10px] text-[var(--color-muted)]">Auto-reversal required to customer account</div>
                </div>
                <div className="p-3 rounded bg-[var(--color-surface)] border border-[var(--color-line)] space-y-1">
                  <div className="text-[var(--color-subtle)]">STATUTORY PENALTY:</div>
                  <div className="text-amber-400 font-bold">₹100 per day of delay</div>
                  <div className="text-[10px] text-[var(--color-muted)]">Automatically payable for delayed reversal</div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: REST API Catalog */}
          <section id="api" className="space-y-6">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
              03 · REST API SPECIFICATION
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-[var(--color-fg)]">
              Core Endpoints &amp; JSON Contracts
            </h2>

            <div className="space-y-4 font-mono text-xs">
              
              {/* Endpoint 1 */}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-shell)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">POST</span>
                    <span className="font-semibold text-[var(--color-fg)]">/api/evidence/intake</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-subtle)]">Multipart / Base64</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] font-sans">
                  Validates binary magic bytes (PDF, PNG, JPG, CSV), computes SHA-256 fingerprint, performs duplicate detection, and extracts calibrated transaction anchors.
                </p>
              </div>

              {/* Endpoint 2 */}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-shell)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">POST</span>
                    <span className="font-semibold text-[var(--color-fg)]">/api/transactions/canonical</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-subtle)]">JSON</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] font-sans">
                  Synthesizes raw provider records into normalized canonical transactions with integer minor units arithmetic (zero floating-point drift) and largest-remainder distribution.
                </p>
              </div>

              {/* Endpoint 3 */}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-shell)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">POST</span>
                    <span className="font-semibold text-[var(--color-fg)]">/api/transactions/reconcile</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-subtle)]">JSON</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] font-sans">
                  Executes the 10-tier deterministic matching algorithm across observed records, generating matching decisions and flagging reconciliation mismatches.
                </p>
              </div>

              {/* Endpoint 4 */}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-shell)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">GET</span>
                    <span className="font-semibold text-[var(--color-fg)]">/api/investigations/[caseId]/report</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-subtle)]">JSON / Markdown / CSV</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] font-sans">
                  Exports the complete forensic dossier with 4-dimensional evidentiary confidence scoring, statutory TAT status, and PII masking.
                </p>
              </div>

              {/* Endpoint 5 */}
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-shell)] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">GET</span>
                    <span className="font-semibold text-[var(--color-fg)]">/api/audit/chained</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-subtle)]">JSON Stream</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] font-sans">
                  Streams cryptographic SHA-256 hash-chained audit blocks with live one-click genesis integrity verification.
                </p>
              </div>

            </div>
          </section>

          {/* Bottom CTA */}
          <div className="pt-8 border-t border-[var(--color-line)] flex items-center justify-between">
            <Link
              href="/methodology"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Review BERR v2 Research Methodology &rarr;</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              Launch Workspace
            </Link>
          </div>

        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
