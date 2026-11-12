"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  CreditCard,
  Lock,
  Scale,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  GitMerge,
  FileQuestion,
  Cpu,
  User,
  Info,
} from "lucide-react";

export type InvestigationStage = "intake" | "relationships" | "conflict" | "finding";

interface StageTab {
  id: InvestigationStage;
  number: string;
  label: string;
  shortLabel: string;
}

const STAGES: StageTab[] = [
  { id: "intake", number: "01", label: "Evidence Collected", shortLabel: "Evidence" },
  { id: "relationships", number: "02", label: "Relationships Identified", shortLabel: "Relationships" },
  { id: "conflict", number: "03", label: "Conflict Detected", shortLabel: "Conflict" },
  { id: "finding", number: "04", label: "Investigation Finding", shortLabel: "Finding" },
];

export function HeroBilateralConvergence() {
  const [activeStage, setActiveStage] = useState<InvestigationStage>("intake");
  const [isPaused, setIsPaused] = useState(false);

  // Subtle auto-advance every 6.5s unless hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => {
        if (prev === "intake") return "relationships";
        if (prev === "relationships") return "conflict";
        if (prev === "conflict") return "finding";
        return "intake";
      });
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div
      className="relative rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-5 sm:p-6 shadow-2xl backdrop-blur-md transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Visual Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--agreed)] animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wide text-[var(--ink)]">
            BILATERAL EVIDENCE CONVERGENCE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-2)]">
            Illustrative Sandbox Case #RG-2026-0412
          </span>
          {isPaused && (
            <span className="rounded bg-[var(--line)]/50 px-1.5 py-0.5 font-mono text-[9px] text-[var(--ink-3)] uppercase">
              Paused
            </span>
          )}
        </div>
      </div>

      {/* 4-Stage Stepper Navigation */}
      <div
        className="mt-3 flex items-center gap-1 overflow-x-auto border-b border-[var(--line)] pb-3 text-xs"
        role="tablist"
        aria-label="Investigation Sequence"
      >
        {STAGES.map((s) => {
          const isActive = activeStage === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStage(s.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-[var(--accent)] text-white shadow-xs font-semibold"
                  : "text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              }`}
            >
              <span className={`text-[10px] ${isActive ? "text-white/80" : "text-[var(--ink-3)]"}`}>
                {s.number}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Area based on Selected Stage */}
      <div className="mt-4 min-h-[350px]">
        {activeStage === "intake" && <StageEvidenceCollected />}
        {activeStage === "relationships" && <StageRelationshipsIdentified />}
        {activeStage === "conflict" && <StageConflictDetected />}
        {activeStage === "finding" && <StageInvestigationFinding />}
      </div>

      {/* Evidence Integrity Footer & Sandbox Label */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--surface-2)]/40 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 rounded-b-3xl px-5 py-3 text-[11px] text-[var(--ink-2)]">
        <span className="flex items-center gap-1.5 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)] shrink-0" />
          <span>SHA-256 byte-sealed evidence trail</span>
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--ink-3)]">
          <Info className="h-3 w-3 shrink-0" />
          <span>Uploaded documents require gateway cross-verification</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Stage 1: Evidence Collected
 * Shows:
 * - Buyer payment record [SOURCE-SUBMITTED]
 * - Bank transaction record [VERIFIED]
 * - Payment provider record [SANDBOX MATCHED]
 * - Merchant order record [SOURCE-SUBMITTED / OMS]
 */
function StageEvidenceCollected() {
  const records = [
    {
      id: "buyer",
      title: "Buyer Payment Record",
      subtitle: "UPI receipt & unboxing scale photo",
      value: "₹4,999.00 ($1,420.00 eq.)",
      keyId: "Ref: UPI-9876543210",
      status: "SOURCE-SUBMITTED",
      badgeColor: "text-[var(--buyer)] bg-[var(--buyer)]/15 border-[var(--buyer)]/30",
      icon: User,
      note: "Customer statement: debited, order not delivered",
    },
    {
      id: "bank",
      title: "Bank Transaction Record",
      subtitle: "Issuing bank settlement & 3DS v2 token",
      value: "Debit Settled · 14:02:18 IST",
      keyId: "Auth Token: 3DS-AUTH-882194",
      status: "VERIFIED",
      badgeColor: "text-[var(--agreed)] bg-[var(--agreed)]/15 border-[var(--agreed)]/30",
      icon: Lock,
      note: "Direct debit confirmed on core banking ledger",
    },
    {
      id: "provider",
      title: "Payment Provider Record",
      subtitle: "PayPal sandbox capture & gateway event",
      value: "Capture AUTHORIZED · Escrow Held",
      keyId: "Capture ID: PP-CAP-847291",
      status: "SANDBOX MATCHED",
      badgeColor: "text-[var(--accent)] bg-[var(--accent)]/15 border-[var(--accent)]/30",
      icon: CreditCard,
      note: "Funds secured in sandbox escrow; webhook callback timed out",
    },
    {
      id: "merchant",
      title: "Merchant Order Record",
      subtitle: "E-commerce ERP / OMS inventory dispatch",
      value: "Status: PENDING PAYMENT",
      keyId: "Order Ref: ORD-7401-2026",
      status: "SOURCE-SUBMITTED",
      badgeColor: "text-[var(--merchant)] bg-[var(--merchant)]/15 border-[var(--merchant)]/30",
      icon: Building2,
      note: "Warehouse awaiting gateway authorization webhook",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
          Step 1: Multi-Silo Evidence Ingestion
        </span>
        <span className="font-mono text-[10px] text-[var(--accent)]">
          4 Records Hashed & Indexed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {records.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3 text-left transition-all hover:border-[var(--line-strong)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-[var(--ink-2)]" />
                  <span className="text-xs font-semibold text-[var(--ink)] truncate">
                    {r.title}
                  </span>
                </div>
                <span
                  className={`rounded border px-1.5 py-0.2 font-mono text-[9px] font-semibold ${r.badgeColor}`}
                >
                  {r.status}
                </span>
              </div>

              <div className="mt-2 font-mono text-xs font-medium text-[var(--ink)]">
                {r.value}
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[var(--ink-2)]">
                <span className="truncate">{r.keyId}</span>
              </div>

              <p className="mt-1.5 text-[11px] text-[var(--ink-2)] leading-tight border-t border-[var(--line)]/60 pt-1.5">
                {r.note}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-2.5 text-[11px] text-[var(--ink-2)] flex items-center gap-2">
        <Info className="h-4 w-4 text-[var(--accent)] shrink-0" />
        <span>
          <strong className="text-[var(--ink)]">Evidentiary Boundary:</strong> Screenshots are ingested as Source-Submitted claims. They are never treated as verified until reconciled against bank tokens or provider API ledgers.
        </span>
      </div>
    </div>
  );
}

/**
 * Stage 2: Relationships Identified
 * Shows how related records connect across identifiers and timestamps
 */
function StageRelationshipsIdentified() {
  const connections = [
    {
      from: "Buyer UTR (9876543210)",
      to: "Bank Settlement Record",
      status: "VERIFIED PARITY",
      badgeColor: "text-[var(--agreed)] bg-[var(--agreed)]/15 border-[var(--agreed)]/30",
      detail: "Exact amount parity ($1,420.00 / ₹4,999.00) and ISO timestamp match (within 1.2s).",
    },
    {
      from: "Bank Settlement Auth Token",
      to: "PayPal Sandbox Capture (PP-CAP-847291)",
      status: "CROSS-RAIL MATCH",
      badgeColor: "text-[var(--accent)] bg-[var(--accent)]/15 border-[var(--accent)]/30",
      detail: "Payment capture payload corresponds to the 3DS authorization session identifier.",
    },
    {
      from: "Payment Provider Capture",
      to: "Merchant Order #ORD-7401",
      status: "DISRUPTED LINK",
      badgeColor: "text-[var(--amber)] bg-[var(--amber)]/15 border-[var(--amber)]/30",
      detail: "Gateway callback attempted 3 times; connection reset by merchant ingress firewall.",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
          Step 2: Bilateral Topology & Key Linking
        </span>
        <span className="font-mono text-[10px] text-[var(--buyer)]">
          Canonical Link Established
        </span>
      </div>

      {/* Visual Convergence Node Diagram */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3.5">
        <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-2)] mb-2">
          <span>SOURCE TOPOLOGY</span>
          <span className="text-[var(--accent)] font-semibold">10-Tier Match Matrix</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-[var(--buyer)]/30 bg-[var(--buyer)]/10 p-2">
            <span className="font-mono text-[10px] text-[var(--buyer)] block">BUYER SIDE</span>
            <span className="font-semibold text-[var(--ink)] text-[11px]">UTR 9876543210</span>
          </div>
          <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-2 flex flex-col justify-center items-center">
            <GitMerge className="h-4 w-4 text-[var(--accent)]" />
            <span className="font-mono text-[10px] text-[var(--accent)]">CANONICAL KEY</span>
          </div>
          <div className="rounded-lg border border-[var(--merchant)]/30 bg-[var(--merchant)]/10 p-2">
            <span className="font-mono text-[10px] text-[var(--merchant)] block">MERCHANT SIDE</span>
            <span className="font-semibold text-[var(--ink)] text-[11px]">ORD-7401</span>
          </div>
        </div>
      </div>

      {/* Relationship Edges */}
      <div className="space-y-2">
        {connections.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-medium text-[var(--ink)] truncate">
                {c.from} <ArrowRight className="inline h-3 w-3 text-[var(--ink-3)] mx-1" /> {c.to}
              </span>
              <span
                className={`rounded border px-1.5 py-0.2 font-mono text-[9px] font-semibold shrink-0 ml-2 ${c.badgeColor}`}
              >
                {c.status}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--ink-2)]">
              {c.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stage 3: Conflict Detected
 * Shows:
 * Bank indicates a debit, while merchant order remains pending.
 */
function StageConflictDetected() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--danger)] font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--danger)]" />
          Step 3: Status Divergence Detected
        </span>
        <span className="rounded bg-[var(--danger)]/15 border border-[var(--danger)]/30 px-2 py-0.5 font-mono text-[10px] text-[var(--danger)] font-semibold">
          CONTESTED FACT
        </span>
      </div>

      {/* Side-by-Side Contradiction Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Left: Financial Reality */}
        <div className="rounded-xl border border-[var(--agreed)]/40 bg-[var(--agreed)]/5 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] text-[var(--agreed)] uppercase font-semibold">
              Financial Rail Reality
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--agreed)]" />
          </div>
          <p className="mt-2 font-mono text-sm font-semibold text-[var(--ink)]">
            DEBIT CONFIRMED ($1,420.00)
          </p>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Bank ledger confirms money debited from buyer account. Gateway sandbox confirms funds secured in escrow account #ESC-9014.
          </p>
          <div className="mt-2 text-[10px] font-mono text-[var(--agreed)]">
            State: Settlement Success (T+0)
          </div>
        </div>

        {/* Right: Merchant OMS Reality */}
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] text-[var(--danger)] uppercase font-semibold">
              Merchant OMS Reality
            </span>
            <FileQuestion className="h-3.5 w-3.5 text-[var(--danger)]" />
          </div>
          <p className="mt-2 font-mono text-sm font-semibold text-[var(--ink)]">
            ORDER PENDING (UNFULFILLED)
          </p>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Merchant OMS never received payment callback. System automatically withheld order shipment to avoid inventory shrinkage.
          </p>
          <div className="mt-2 text-[10px] font-mono text-[var(--danger)]">
            State: Awaiting Gateway Signal
          </div>
        </div>
      </div>

      {/* Contradiction Diagnostic Summary */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[var(--ink)]">
          <span>BERR Root Cause Diagnostic</span>
          <span className="text-[var(--accent)]">Discrepancy Score D = 0.94</span>
        </div>
        <p className="mt-1.5 text-xs text-[var(--ink-2)] leading-relaxed">
          The discrepancy is an asynchronous communication failure between payment gateway and merchant ERP. Buyer legitimately paid; merchant acted according to security policy by not shipping unpaid items.
        </p>
      </div>
    </div>
  );
}

/**
 * Stage 4: Investigation Finding
 * Displays:
 * - Supported finding
 * - Missing information identified
 * - Further verification required
 */
function StageInvestigationFinding() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--agreed)] font-semibold flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-[var(--agreed)]" />
          Step 4: Objective Finding & Governance
        </span>
        <span className="rounded bg-[var(--surface-2)] border border-[var(--line)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-2)]">
          BERR Matrix Resolution
        </span>
      </div>

      {/* Supported Finding Card */}
      <div className="rounded-xl border border-[var(--agreed)]/30 bg-[var(--agreed)]/10 p-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[var(--agreed)]" />
            Supported Finding
          </span>
          <span className="font-mono text-[10px] text-[var(--agreed)] font-semibold">
            Confidence 96.8%
          </span>
        </div>
        <p className="mt-1.5 text-xs text-[var(--ink-2)] leading-relaxed">
          Transaction verified as valid. Payment capture held safely in escrow. Gateway dropped webhook due to intermittent merchant server timeout. Neither party engaged in fraud.
        </p>
      </div>

      {/* Missing Information Identified */}
      <div className="rounded-xl border border-[var(--missing)]/40 bg-[var(--surface-2)]/60 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <FileQuestion className="h-3.5 w-3.5 text-[var(--amber)]" />
            Missing Information Identified
          </span>
          <span className="font-mono text-[10px] text-[var(--amber)]">
            Evidentiary Request Emitted
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          Merchant HTTP access log at <code className="text-[11px] font-mono text-[var(--ink)]">14:02:22 UTC</code> to confirm webhook delivery drop vs payload parsing fault.
        </p>
      </div>

      {/* Further Verification Required */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-[var(--accent)]" />
            Further Verification & Remedy
          </span>
          <span className="font-mono text-[10px] text-[var(--accent)]">
            Dual-Key Sign-Off
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--ink-2)]">
          Remedy: Merchant acknowledges escrow capture and initiates expedited dispatch; alternatively, buyer receives immediate escrow reversal.
        </p>
        <div className="mt-2.5 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[10px] font-mono text-[var(--ink-3)]">
          <span className="flex items-center gap-1 text-[var(--agreed)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)]" />
            Zero Autonomous Financial Action
          </span>
          <span className="text-[var(--ink-2)]">Operator signature required</span>
        </div>
      </div>
    </div>
  );
}
