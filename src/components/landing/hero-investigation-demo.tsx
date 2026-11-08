"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  Layers,
  Sparkles,
} from "lucide-react";

export function HeroInvestigationDemo() {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2 | 3>(1);

  return (
    <div className="w-full max-w-xl rounded-lg border border-[var(--color-line-2)] bg-[var(--color-shell)] p-4 shadow-2xl">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">
            LIVE FORENSIC RECONSTRUCTION
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--color-subtle)]">
          <span>CASE: RG-HACK-8492</span>
          <span className="text-emerald-400 font-semibold">[VERIFIED]</span>
        </div>
      </div>

      {/* Interactive Step Switcher */}
      <div className="grid grid-cols-4 gap-1.5 py-3 border-b border-[var(--color-line)] text-[11px] font-mono">
        {[
          { label: "1. Intake", step: 0 },
          { label: "2. Conflict", step: 1 },
          { label: "3. Root Cause", step: 2 },
          { label: "4. Sign-Off", step: 3 },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveStep(item.step as 0 | 1 | 2 | 3)}
            className={`py-1.5 px-2 rounded text-center transition-all ${
              activeStep === item.step
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium"
                : "text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[280px] pt-4">
        <AnimatePresence mode="wait">
          {activeStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="text-xs text-[var(--color-muted)]">
                Four independent evidence records submitted with divergent transaction statuses:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded border border-[var(--color-line)] bg-[var(--color-surface)]">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 mb-1">
                    <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> UPI APP</span>
                    <span className="font-bold">DEBITED</span>
                  </div>
                  <div className="font-semibold text-[var(--color-fg)]">₹4,999.00</div>
                  <div className="text-[10px] text-[var(--color-subtle)] truncate">UTR: 9876543210</div>
                </div>

                <div className="p-2.5 rounded border border-[var(--color-line)] bg-[var(--color-surface)]">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 mb-1">
                    <span className="flex items-center gap-1"><Building className="h-3 w-3" /> BANK STATEMENT</span>
                    <span className="font-bold">DEBITED</span>
                  </div>
                  <div className="font-semibold text-[var(--color-fg)]">₹4,999.00</div>
                  <div className="text-[10px] text-[var(--color-subtle)] truncate">REF: HDFC987654</div>
                </div>

                <div className="p-2.5 rounded border border-rose-500/30 bg-rose-500/5">
                  <div className="flex items-center justify-between text-[10px] text-rose-400 mb-1">
                    <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> GATEWAY</span>
                    <span className="font-bold">TIMEOUT 504</span>
                  </div>
                  <div className="font-semibold text-[var(--color-fg)]">DROPPED</div>
                  <div className="text-[10px] text-[var(--color-subtle)] truncate">Callback incomplete</div>
                </div>

                <div className="p-2.5 rounded border border-amber-500/30 bg-amber-500/5">
                  <div className="flex items-center justify-between text-[10px] text-amber-400 mb-1">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> MERCHANT ERP</span>
                    <span className="font-bold">PENDING</span>
                  </div>
                  <div className="font-semibold text-[var(--color-fg)]">UNPAID</div>
                  <div className="text-[10px] text-[var(--color-subtle)] truncate">Order #ORD-7401</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 text-[11px] text-[var(--color-subtle)]">
                <span>Magic Bytes Verified: PNG, PDF, JSON</span>
                <span className="text-amber-400 cursor-pointer hover:underline" onClick={() => setActiveStep(1)}>
                  Evaluate Match Tier &rarr;
                </span>
              </div>
            </motion.div>
          )}

          {activeStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    Tier 2 UTR Match with Status Divergence
                  </span>
                  <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200">
                    STATUS: CONFLICT
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-fg-muted)] leading-relaxed">
                  Canonical transaction <span className="font-mono text-amber-300">#9876543210</span> matches buyer statement and UPI debit, but merchant ERP records order as unpaid due to webhook callback loss.
                </p>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between p-2 rounded bg-[var(--color-surface)] border border-[var(--color-line)]">
                  <span className="text-[var(--color-subtle)]">Matching Decision:</span>
                  <span className="text-amber-400 font-medium">CONFLICT (Confidence: 60.0%)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[var(--color-surface)] border border-[var(--color-line)]">
                  <span className="text-[var(--color-subtle)]">Discrepant Fields:</span>
                  <span className="text-rose-400">status: COMPLETED vs PENDING</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-[var(--color-surface)] border border-[var(--color-line)]">
                  <span className="text-[var(--color-subtle)]">Integer Minor Units:</span>
                  <span className="text-emerald-400">499900 PAISE (₹4,999.00 Exact)</span>
                </div>
              </div>

              <div className="text-right">
                <button
                  onClick={() => setActiveStep(2)}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  <span>Execute 12-Stage Diagnostic</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}

          {activeStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-fg)]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Root Cause Diagnosis
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    STAGE 10 / 12
                  </span>
                </div>
                <div className="text-xs text-amber-300 font-mono">
                  &ldquo;Merchant Webhook Callback Failure After Acquirer Settlement&rdquo;
                </div>
                <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                  Funds were successfully captured by the acquirer bank at 14:02 IST. The merchant delivery worker never received the HTTP 200 acknowledgment.
                </p>
              </div>

              {/* Statutory TAT Alert */}
              <div className="rounded border border-sky-500/30 bg-sky-500/10 p-2.5 flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <div className="font-semibold text-sky-300">RBI Circular DPSS.CO.PD No.629 TAT Rules</div>
                  <div className="text-[var(--color-muted)] mt-0.5">
                    Auto-reversal required within T+1 day. Statutory compensation: <span className="font-mono text-sky-200">₹100/day</span> if delayed beyond deadline.
                  </div>
                </div>
              </div>

              <div className="text-right">
                <button
                  onClick={() => setActiveStep(3)}
                  className="text-[11px] font-mono text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  <span>Review Cryptographic Sign-Off</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}

          {activeStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Human-in-the-Loop Safeguard Active
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
                    FROZEN
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-fg-muted)] leading-relaxed">
                  Autonomous fund disbursement is blocked. The proposal payload is cryptographically frozen and ready for authorized operator sign-off.
                </p>
              </div>

              <div className="p-2.5 rounded border border-[var(--color-line)] bg-[var(--color-surface)] space-y-1 font-mono text-[10px]">
                <div className="flex justify-between text-[var(--color-subtle)]">
                  <span>ARGUMENTS PAYLOAD HASH:</span>
                  <span className="text-[var(--color-muted)]">sha256:b4f2c9...e8a1</span>
                </div>
                <div className="flex justify-between text-[var(--color-subtle)]">
                  <span>RECOMMENDED REMEDY:</span>
                  <span className="text-amber-300">FULFILL_ORDER (Stock Verified)</span>
                </div>
                <div className="flex justify-between text-[var(--color-subtle)]">
                  <span>ESCROW / LEDGER LOCK:</span>
                  <span className="text-emerald-400">ACTIVE (Zero Penny Leakage)</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[var(--color-subtle)] flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-400" />
                  Sign-off requires Merchant Owner or Admin
                </span>
                <button
                  onClick={() => setActiveStep(0)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                >
                  Restart Demo Walkthrough
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Audit Bar */}
      <div className="mt-3 pt-2.5 border-t border-[var(--color-line)] flex items-center justify-between text-[10px] font-mono text-[var(--color-subtle)]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span>Hash-Chained Audit Ledger Active</span>
        </span>
        <span className="text-[var(--color-muted)]">TAT: T+1 Compliant</span>
      </div>
    </div>
  );
}
