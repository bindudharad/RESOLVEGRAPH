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
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  FileText,
  Camera,
} from "lucide-react";

export type InvestigationStage = "intake" | "relationships" | "conflict" | "finding";

interface StageTab {
  id: InvestigationStage;
  number: string;
  label: string;
  shortLabel: string;
}

const STAGES: StageTab[] = [
  { id: "intake", number: "01", label: "Evidence Ingestion", shortLabel: "Evidence" },
  { id: "relationships", number: "02", label: "BEG Graph Links", shortLabel: "BEG Graph" },
  { id: "conflict", number: "03", label: "BERR Fact Matrix", shortLabel: "BERR Matrix" },
  { id: "finding", number: "04", label: "Authorized Remedy", shortLabel: "Remedy" },
];

export function HeroBilateralConvergence() {
  const [activeStage, setActiveStage] = useState<InvestigationStage>("intake");
  const [isPaused, setIsPaused] = useState(false);

  // Subtle auto-advance every 7.5s unless hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setActiveStage((prev) => {
        if (prev === "intake") return "relationships";
        if (prev === "relationships") return "conflict";
        if (prev === "conflict") return "finding";
        return "intake";
      });
    }, 7500);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div
      className="relative rounded-3xl border border-[var(--line-strong)] bg-[var(--surface)] p-5 sm:p-6 shadow-2xl backdrop-blur-md transition-all duration-300 rg-specular-edge"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 3D Ground Glow Backdrop */}
      <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 h-20 w-3/4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(67,80,229,0.2),transparent_70%)] blur-2xl" />

      {/* Visual Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--agreed)] animate-pulse" />
          <span className="font-mono text-xs font-semibold tracking-wide text-[var(--ink)]">
            THE 3D EVIDENCE CONVERGENCE INSTRUMENT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-2)]">
            Verified Case RG-1465 / Amazon
          </span>
          {isPaused && (
            <span className="rounded bg-[var(--line)]/60 px-1.5 py-0.5 font-mono text-[9px] text-[var(--ink-3)] uppercase">
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
                  ? "bg-[var(--accent)] text-white shadow-xs font-semibold scale-[1.02]"
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

      {/* Dynamic Visual Stage Content */}
      <div className="mt-4 min-h-[360px]">
        {activeStage === "intake" && <StageEvidenceCollected />}
        {activeStage === "relationships" && <StageRelationshipsIdentified />}
        {activeStage === "conflict" && <StageConflictDetected />}
        {activeStage === "finding" && <StageInvestigationFinding />}
      </div>

      {/* Evidence Integrity Footer & Sandbox Label */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--surface-2)]/50 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 rounded-b-3xl px-5 py-3 text-[11px] text-[var(--ink-2)]">
        <span className="flex items-center gap-1.5 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--agreed)] shrink-0" />
          <span>Bilateral Evidence Graph · SHA-256 Tamper-Sealed</span>
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--ink-3)]">
          <Info className="h-3 w-3 shrink-0" />
          <span>BlueDart Courier Sandbox & PayPal REST Mock Active</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Stage 1: Evidence Ingestion (Bilateral Sources)
 */
function StageEvidenceCollected() {
  const records = [
    {
      id: "buyer",
      title: "Buyer Purchase Invoice",
      subtitle: "Amazon tax invoice & defect capture",
      value: "₹7,999.00 · OD-AMZ-2026-994411",
      keyId: "Logitech MX Master 3S (Graphite)",
      status: "BUYER SUBMITTED",
      badgeColor: "text-[var(--buyer)] bg-[var(--buyer)]/15 border-[var(--buyer)]/30",
      icon: User,
      note: "Unboxing footage attached: hardware sensor dead on arrival",
    },
    {
      id: "screening",
      title: "EvidenceGuard Screening",
      subtitle: "Magic-byte verification & layout OCR",
      value: "GSTIN: 27AABCD2345F1Z2",
      keyId: "DigitalMart Commerce Private Ltd",
      status: "OCR EXTRACTED",
      badgeColor: "text-[var(--ai)] bg-[var(--ai)]/15 border-[var(--ai)]/30",
      icon: Cpu,
      note: "Matched to registered merchant account sel_digitalmart_verified",
    },
    {
      id: "outreach",
      title: "Seller Gateway Dispatch",
      subtitle: "SER-2026-1004 via internal seller portal",
      value: "Channel: SELLER_PORTAL",
      keyId: "Recipient: org_digitalmart",
      status: "DELIVERED",
      badgeColor: "text-[var(--merchant)] bg-[var(--merchant)]/15 border-[var(--merchant)]/30",
      icon: Building2,
      note: "Merchant notified to provide dispatch serial & inventory stance",
    },
    {
      id: "defense",
      title: "Seller Defense & Stock",
      subtitle: "Warehouse picking log & declaration",
      value: "Stance: AGREE (Stock Confirmed)",
      keyId: "SKU: LOGI-MXM3S-GRAPHITE",
      status: "MERCHANT AGREED",
      badgeColor: "text-[var(--agreed)] bg-[var(--agreed)]/15 border-[var(--agreed)]/30",
      icon: Package,
      note: "Merchant admits defect batch and commits immediate unit replacement",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
          Stage 01: Bilateral Ingestion & Verification
        </span>
        <span className="font-mono text-[10px] text-[var(--accent)] font-semibold">
          4 Verified Artifacts · 0 Tampering Flags
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {records.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="rg-card p-3 text-left transition-all hover:border-[var(--line-strong)]"
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

              <div className="mt-2 font-mono text-xs font-semibold text-[var(--ink)]">
                {r.value}
              </div>

              <div className="mt-1 flex items-center justify-between text-[10.5px] font-mono text-[var(--ink-2)]">
                <span className="truncate">{r.keyId}</span>
              </div>

              <p className="mt-1.5 text-[11px] text-[var(--ink-2)] leading-tight border-t border-[var(--line)]/60 pt-1.5">
                {r.note}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5 text-[11px] text-[var(--ink-2)] flex items-center gap-2">
        <Info className="h-4 w-4 text-[var(--accent)] shrink-0" />
        <span>
          <strong className="text-[var(--ink)]">Symmetric Evidence Model:</strong> Neither party is presumed right by default. Buyer claims and merchant declarations are held in escrow pending bilateral evaluation.
        </span>
      </div>
    </div>
  );
}

/**
 * Stage 2: BEG Graph Connections
 */
function StageRelationshipsIdentified() {
  const edges = [
    {
      source: "Buyer Order OD-AMZ-2026-994411",
      target: "Seller Invoice INV-DM-994411",
      relation: "CORROBORATES",
      badge: "AGREED",
      color: "text-[var(--agreed)] bg-[var(--agreed)]/10 border-[var(--agreed)]/30",
    },
    {
      source: "Unboxing Sensor Photo",
      target: "Product SKU LOGI-MXM3S",
      relation: "SUPPORTS_CLAIM",
      badge: "VERIFIED",
      color: "text-[var(--buyer)] bg-[var(--buyer)]/10 border-[var(--buyer)]/30",
    },
    {
      source: "Seller Warehouse Stock Slip",
      target: "Replacement Allocation",
      relation: "RESERVES_REMEDY",
      badge: "STOCK_CONFIRMED",
      color: "text-[var(--merchant)] bg-[var(--merchant)]/10 border-[var(--merchant)]/30",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
          Stage 02: Bilateral Evidence Graph (BEG v2)
        </span>
        <span className="font-mono text-[10px] text-[var(--accent)] font-semibold">
          12 Nodes · 15 Grounded Edges
        </span>
      </div>

      {/* Visual Bipartite Graph Mini-Model */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-3.5">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border border-[var(--buyer)]/30 bg-[var(--buyer)]/10 p-2 font-mono text-[11px] text-[var(--buyer)] font-semibold">
            BUYER EVIDENCE<br />
            <span className="text-[9.5px] text-[var(--ink-2)] font-normal">Invoice & Sensor Video</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="h-7 w-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">
              BEG
            </span>
            <span className="text-[9px] font-mono text-[var(--ink-3)] mt-1">Convergence Nexus</span>
          </div>
          <div className="rounded-lg border border-[var(--merchant)]/30 bg-[var(--merchant)]/10 p-2 font-mono text-[11px] text-[var(--merchant)] font-semibold">
            SELLER DEFENSE<br />
            <span className="text-[9.5px] text-[var(--ink-2)] font-normal">Stock Slip & Dispatch Log</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {edges.map((e, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-[10px] text-[var(--ink-3)] font-semibold">
                0{idx + 1}
              </span>
              <span className="font-medium text-[var(--ink)] truncate max-w-[130px] sm:max-w-[170px]">
                {e.source}
              </span>
              <ArrowRight className="h-3 w-3 text-[var(--ink-3)] shrink-0" />
              <span className="font-medium text-[var(--ink-2)] truncate max-w-[130px] sm:max-w-[170px]">
                {e.target}
              </span>
            </div>
            <span className={`rounded border px-1.5 py-0.2 font-mono text-[9px] font-semibold shrink-0 ${e.color}`}>
              {e.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stage 3: BERR Fact Matrix (Evidentiary Reasoning)
 */
function StageConflictDetected() {
  const facts = [
    {
      claim: "Genuine Purchase Transaction",
      detail: "Amazon order OD-AMZ-2026-994411 (₹7,999.00)",
      classification: "AGREED",
      confidence: "0.99",
      color: "text-[var(--agreed)] bg-[var(--agreed)]/10 border-[var(--agreed)]/30",
    },
    {
      claim: "Hardware Sensor Failure",
      detail: "Buyer defect footage corroborated by merchant stock bulletin",
      classification: "VERIFIED",
      confidence: "0.98",
      color: "text-[var(--buyer)] bg-[var(--buyer)]/10 border-[var(--buyer)]/30",
    },
    {
      claim: "Replacement Inventory Available",
      detail: "Warehouse SKU LOGI-MXM3S-GRAPHITE confirmed at BLR DC",
      classification: "VERIFIED",
      confidence: "0.97",
      color: "text-[var(--merchant)] bg-[var(--merchant)]/10 border-[var(--merchant)]/30",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
          Stage 03: BERR v2 Fact Classification
        </span>
        <span className="font-mono text-[10px] text-[var(--agreed)] font-semibold">
          0 Contested Conflicts · Certainty: 0.98
        </span>
      </div>

      <div className="space-y-2">
        {facts.map((f, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink)]">
                {f.claim}
              </span>
              <span className={`rounded border px-1.5 py-0.2 font-mono text-[9px] font-semibold ${f.color}`}>
                {f.classification}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-[var(--ink-2)]">
              {f.detail}
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--line)]/60 pt-1.5 text-[10px] font-mono text-[var(--ink-3)]">
              <span>Evidentiary Confidence: {f.confidence}</span>
              <span>Policy Status: REPLACEMENT_ELIGIBLE</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stage 4: Authorized Remedy & Resolution
 */
function StageInvestigationFinding() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-2)] font-semibold">
          Stage 04: Human Authorization & Fulfillment
        </span>
        <span className="font-mono text-[10px] text-[var(--agreed)] font-semibold">
          Status: RESOLVED
        </span>
      </div>

      {/* Authorized Remedy Card */}
      <div className="rounded-2xl border border-[var(--agreed)]/40 bg-[var(--agreed)]/5 p-4 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--agreed)]" />
            <div>
              <div className="text-xs font-bold text-[var(--ink)]">
                Proposal cmwdhbeak01v7m8vjg2z5qbit (REPLACEMENT)
              </div>
              <div className="text-[10.5px] font-mono text-[var(--ink-2)]">
                Authorized by Priya Raghavan (Resolution Manager)
              </div>
            </div>
          </div>
          <span className="rounded-full bg-[var(--agreed)] px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">
            AUTHORIZED
          </span>
        </div>

        {/* Courier Dispatch Snapshot */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs font-mono">
          <div>
            <span className="text-[9.5px] text-[var(--ink-3)] uppercase">Logistics Carrier</span>
            <div className="font-semibold text-[var(--ink)] mt-0.5">BlueDart Express</div>
          </div>
          <div>
            <span className="text-[9.5px] text-[var(--ink-3)] uppercase">Tracking Consignment</span>
            <div className="font-semibold text-[var(--accent)] mt-0.5">BD-DM-REP-8829104</div>
          </div>
          <div>
            <span className="text-[9.5px] text-[var(--ink-3)] uppercase">Security Seal Token</span>
            <div className="font-semibold text-[var(--ink)] mt-0.5">SEAL-DM-9941</div>
          </div>
          <div>
            <span className="text-[9.5px] text-[var(--ink-3)] uppercase">Delivery Proof</span>
            <div className="font-semibold text-[var(--agreed)] mt-0.5">Signed by Alex Morgan</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/60 p-2.5 text-[11px] text-[var(--ink-2)] flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--agreed)] shrink-0" />
        <span>
          <strong className="text-[var(--ink)]">Synchronized Resolution:</strong> All 3 workspaces (Customer, Platform, Seller) reflect the identical verified outcome with complete chained audit history.
        </span>
      </div>
    </div>
  );
}
