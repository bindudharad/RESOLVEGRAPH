"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, FileText, Landmark, ReceiptText, ShieldCheck } from "lucide-react";

const STEPS = ["Intake", "Conflict", "Decision"] as const;
type Step = (typeof STEPS)[number];

export function HeroInvestigationDemo() {
  const [activeStep, setActiveStep] = useState<Step>("Conflict");

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-[0_18px_40px_-28px_rgba(14,18,32,0.34)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
        <div>
          <div className="font-mono text-[11px] text-[var(--ink-3)]">CASE RG-2026-0412</div>
          <div className="mt-1 text-sm font-medium text-[var(--ink)]">Payment reconstruction</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--agreed)]"><span className="h-2 w-2 rounded-full bg-[var(--agreed)]" /> Records received</div>
      </div>

      <div className="flex gap-1 border-b border-[var(--line)] px-3 pt-3" role="tablist" aria-label="Reconstruction stage">
        {STEPS.map((step, index) => (
          <button key={step} role="tab" aria-selected={activeStep === step} onClick={() => setActiveStep(step)} className={`border-b-2 px-3 py-2 text-xs transition-colors ${activeStep === step ? "border-[var(--accent)] text-[var(--ink)]" : "border-transparent text-[var(--ink-3)] hover:text-[var(--ink-2)]"}`}>
            <span className="font-mono text-[10px]">0{index + 1}</span> {step}
          </button>
        ))}
      </div>

      <div className="min-h-[340px] p-5">
        {activeStep === "Intake" && <Intake />}
        {activeStep === "Conflict" && <Conflict />}
        {activeStep === "Decision" && <Decision />}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface-2)]/45 px-5 py-3 text-[11px] text-[var(--ink-3)]">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" /> Hash-chained audit trail</span>
        <span className="font-mono">T+1 review window</span>
      </div>
    </div>
  );
}

function Intake() {
  const records = [
    [ReceiptText, "Buyer receipt", "₹4,999.00", "UTR 9876543210"],
    [Landmark, "Bank debit", "₹4,999.00", "14:02 IST"],
    [FileText, "Gateway event", "Timeout", "callback absent"],
    [ReceiptText, "Merchant order", "Pending", "ORD-7401"],
  ] as const;
  return <div><p className="text-sm leading-6 text-[var(--ink-2)]">Four records describe the same transaction. Their identifiers and timestamps are normalized before matching.</p><div className="mt-5 grid grid-cols-2 gap-3">{records.map(([Icon, label, value, meta]) => <div key={label} className="rounded-xl border border-[var(--line)] p-3"><div className="flex items-center gap-2 text-xs text-[var(--ink-3)]"><Icon className="h-3.5 w-3.5" /> {label}</div><div className="mt-3 font-mono text-sm font-medium text-[var(--ink)]">{value}</div><div className="mt-1 font-mono text-[10px] text-[var(--ink-3)]">{meta}</div></div>)}</div></div>;
}

function Conflict() {
  return <div className="space-y-5"><div className="border-l-2 border-[var(--contested)] pl-4"><div className="text-xs font-medium text-[var(--contested)]">Status divergence</div><p className="mt-1 text-sm leading-6 text-[var(--ink-2)]">The bank confirms a debit while the merchant order remains pending. The UTR links both sides to the same event.</p></div><div className="space-y-2">{[["Matching key", "UTR 9876543210"], ["Buyer and bank", "Exact amount + time match"], ["Merchant status", "Pending after gateway timeout"]].map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2.5 text-xs"><span className="text-[var(--ink-3)]">{label}</span><span className="font-mono text-[var(--ink)]">{value}</span></div>)}</div><button className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline" onClick={() => undefined}>Review root cause <ArrowRight className="h-3.5 w-3.5" /></button></div>;
}

function Decision() {
  return <div className="space-y-5"><div className="rounded-xl border border-[color-mix(in_srgb,var(--agreed)_35%,var(--line))] bg-[color-mix(in_srgb,var(--agreed)_8%,var(--surface))] p-4"><div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]"><CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" /> Settlement verified</div><p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">The gateway callback failed after settlement. The order should be fulfilled or the buyer refunded under review.</p></div><div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-lg border border-[var(--line)] p-3"><div className="text-[var(--ink-3)]">Confidence</div><div className="mt-2 font-mono text-lg text-[var(--ink)]">96.4%</div></div><div className="rounded-lg border border-[var(--line)] p-3"><div className="text-[var(--ink-3)]">Next control</div><div className="mt-2 font-medium text-[var(--ink)]">Authorized sign-off</div></div></div></div>;
}
