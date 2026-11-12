"use client";

import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Split,
  FileQuestion,
  Layers,
  Database,
  Unlink,
} from "lucide-react";

export function ProblemStatementSection() {
  return (
    <section id="problem-statement" className="border-b border-[var(--line)] bg-[var(--surface)] py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-1 text-xs font-mono text-[var(--ink-2)]">
            <AlertTriangle className="h-3.5 w-3.5 text-[var(--amber)]" />
            <span>THE PAYMENT DISPUTE DEFECT</span>
          </div>

          <h2 className="mt-4 font-heading text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-[var(--ink)]">
            A payment dispute is rarely a{" "}
            <span className="font-display italic text-[var(--accent)] font-medium">
              single-record problem.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--ink-2)]">
            When a transaction breaks down, the truth is fragmented across closed
            silos. Each party holds a piece of the puzzle, but no one has the complete
            picture—leading to unfair chargebacks, delayed refunds, and millions lost in
            unverifiable claims.
          </p>
        </div>

        {/* Visual Scenario: Fragmented Silos vs Unified Bilateral Resolution */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 items-stretch">
          {/* Left Box: The Fragmented Reality (5 Disconnected Silos) */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl border border-[var(--danger)]/30 bg-[var(--bg)] p-6 sm:p-8">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <Unlink className="h-4 w-4 text-[var(--danger)]" />
                  <span className="font-mono text-xs font-semibold text-[var(--danger)] uppercase tracking-wider">
                    Today: 5 Disconnected Silos
                  </span>
                </div>
                <span className="font-mono text-xs text-[var(--ink-2)]">
                  Fragmented & Uncorrelated
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {/* Silo 1 */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                      1. Buyer&apos;s Bank App
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
                      &quot;Payment debited: $1,420.00&quot; · Buyer files unreceived claim
                    </p>
                  </div>
                  <XCircle className="h-4 w-4 text-[var(--danger)] shrink-0 mt-0.5 ml-2" />
                </div>

                {/* Silo 2 */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                      2. Merchant OMS &amp; ERP
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
                      &quot;Order status: Pending Payment Gateway&quot; · Fulfillment halted
                    </p>
                  </div>
                  <XCircle className="h-4 w-4 text-[var(--danger)] shrink-0 mt-0.5 ml-2" />
                </div>

                {/* Silo 3 */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                      3. Gateway Ledger
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
                      &quot;Capture AUTHORIZED&quot; · Webhook dropped by merchant firewall
                    </p>
                  </div>
                  <FileQuestion className="h-4 w-4 text-[var(--amber)] shrink-0 mt-0.5 ml-2" />
                </div>

                {/* Silo 4 */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                      4. Carrier Courier Tracking
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
                      &quot;Delivered to front porch&quot; · Weight dropped 828g at sorting hub
                    </p>
                  </div>
                  <AlertTriangle className="h-4 w-4 text-[var(--amber)] shrink-0 mt-0.5 ml-2" />
                </div>

                {/* Silo 5 */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                      5. Dispute Resolution Center
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--ink-2)] mt-0.5">
                      Agents guess based on conflicting unverified screenshots & receipts
                    </p>
                  </div>
                  <XCircle className="h-4 w-4 text-[var(--danger)] shrink-0 mt-0.5 ml-2" />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-2)] flex items-center justify-between">
              <span>Result: 14 to 30 days latency</span>
              <span className="text-[var(--danger)] font-semibold">
                Permanent Customer & Revenue Loss
              </span>
            </div>
          </div>

          {/* Right Box: The RESOLVEGRAPH Solution (Bilateral Convergence) */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl border border-[var(--accent)]/40 bg-[var(--surface-2)] p-6 sm:p-8 shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  <span className="font-mono text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                    With RESOLVEGRAPH 2.0
                  </span>
                </div>
                <span className="rounded-full bg-[var(--agreed)]/15 px-2.5 py-0.5 font-mono text-[10px] text-[var(--agreed)] font-semibold border border-[var(--agreed)]/25">
                  Source-Linked Intelligence
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {/* Advantage 1 */}
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <Database className="h-4 w-4 text-[var(--accent)]" />
                    <span>Cross-Provider Normalization</span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
                    Canonical Transaction Engine standardizes buyer, merchant, and
                    provider records into a single cryptographic timeline.
                  </p>
                </div>

                {/* Advantage 2 */}
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <Layers className="h-4 w-4 text-[var(--buyer)]" />
                    <span>Bilateral Evidence Graph (BEG)</span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
                    Maps fact relationships across entities. Discrepancies are
                    flagged objectively without prejudicing either party.
                  </p>
                </div>

                {/* Advantage 3 */}
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <Split className="h-4 w-4 text-[var(--agreed)]" />
                    <span>Explainable BERR v2 Classification</span>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-[var(--ink-2)] leading-relaxed">
                    Separates facts into AGREED, VERIFIED, CONTESTED, and MISSING.
                    Pinpoints the exact transit hub or network timeout where discrepancy occurred.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs">
              <span className="font-mono text-[var(--ink-2)]">
                Resolution latency: &lt; 2 minutes
              </span>
              <span className="font-semibold text-[var(--agreed)]">
                Cryptographically Auditable
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
