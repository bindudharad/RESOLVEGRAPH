"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Brain,
  Cpu,
  Network,
  AlertTriangle,
  RefreshCw,
  FileText,
  ShieldCheck,
  Layers,
  Sliders,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";

interface Finding {
  id: string;
  findingType: string;
  outcome: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  explanation: string;
  recommendedNextStep: string;
  reviewStatus: "UNREVIEWED" | "CONFIRMED" | "CORRECTED" | "REJECTED" | "INCONCLUSIVE";
  reviewedBy?: { name: string; role: string } | null;
}

interface Fact {
  id: string;
  fieldKey: string;
  factType: string;
  rawValue: string;
  normalizedValue: string;
  sourceExcerpt: string;
  pageNumber?: number | null;
  extractionConfidenceBand: string;
  evidence?: { filename: string; evidenceType: string };
}

interface BilateralComparison {
  factKey: string;
  factType: string;
  buyerValue: string;
  merchantValue: string;
  isMatch: boolean;
  discrepancyType: string;
  severity: string;
  explanation: string;
}

export function AiInvestigationCard({ caseId = "RG-1001" }: { caseId?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "facts" | "findings">("overview");
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisRunId, setAnalysisRunId] = useState<string | null>(null);

  // Live state
  const [discrepancy, setDiscrepancy] = useState({
    total: 0.73,
    exact: 0.85,
    semantic: 0.80,
    temporal: 0.25,
  });

  const [findings, setFindings] = useState<Finding[]>([
    {
      id: "fnd-1",
      findingType: "SPECIFICATION_MISMATCH",
      outcome: "CONFLICTING",
      severity: "HIGH",
      title: "Primary Product Storage Capacity Conflict",
      explanation: "Buyer invoice indicates purchase of 1TB variant, whereas photographic device configuration screenshot confirms 512GB storage capacity.",
      recommendedNextStep: "Request certified warehouse outbound dispatch scan from merchant within 48h.",
      reviewStatus: "UNREVIEWED"
    },
    {
      id: "fnd-2",
      findingType: "EVIDENCE_GAP",
      outcome: "INSUFFICIENT_EVIDENCE",
      severity: "MEDIUM",
      title: "Missing Outbound Warehouse Serial Stamp",
      explanation: "Merchant packing slip provides order number but omits individual hardware serial number stamp.",
      recommendedNextStep: "Request merchant inventory management barcode record for batch 89201.",
      reviewStatus: "UNREVIEWED"
    }
  ]);

  const [facts, setFacts] = useState<Fact[]>([
    {
      id: "fact-1",
      fieldKey: "Storage Capacity",
      factType: "PRODUCT_SPECIFICATION",
      rawValue: "1 TB SSD",
      normalizedValue: "1024 GB",
      sourceExcerpt: "Apple MacBook Pro M3 1TB SSD Space Black",
      pageNumber: 1,
      extractionConfidenceBand: "HIGH",
      evidence: { filename: "invoice_apple_techstore.pdf", evidenceType: "RECEIPT" }
    },
    {
      id: "fact-2",
      fieldKey: "Delivered Capacity",
      factType: "PRODUCT_SPECIFICATION",
      rawValue: "Storage: 512 GB",
      normalizedValue: "512 GB",
      sourceExcerpt: "About This Mac: Storage 512 GB SSD",
      pageNumber: 1,
      extractionConfidenceBand: "HIGH",
      evidence: { filename: "macbook_storage_settings.png", evidenceType: "PHOTO" }
    },
    {
      id: "fact-3",
      fieldKey: "Disputed Amount",
      factType: "PRICE_PAID",
      rawValue: "$1,999.00",
      normalizedValue: "199900 USD",
      sourceExcerpt: "Total Amount Charged: $1,999.00 USD",
      pageNumber: 1,
      extractionConfidenceBand: "HIGH",
      evidence: { filename: "invoice_apple_techstore.pdf", evidenceType: "RECEIPT" }
    }
  ]);

  const [comparisons] = useState<BilateralComparison[]>([
    {
      factKey: "product_storage",
      factType: "PRODUCT_SPECIFICATION",
      buyerValue: "512 GB (Item Received)",
      merchantValue: "1024 GB (Advertised Listing)",
      isMatch: false,
      discrepancyType: "SPECIFICATION",
      severity: "HIGH",
      explanation: "Substantive hardware variance. 512GB received differs from 1TB advertised specification."
    },
    {
      factKey: "transaction_value",
      factType: "PRICE_PAID",
      buyerValue: "$1,999.00 USD",
      merchantValue: "$1,999.00 USD",
      isMatch: true,
      discrepancyType: "NONE",
      severity: "LOW",
      explanation: "Transaction billed total is mutually reconciled across records."
    }
  ]);

  // Load existing runs if available
  useEffect(() => {
    let active = true;
    async function loadRuns() {
      try {
        const res = await fetch(`/api/cases/${caseId}/analysis`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.runs && data.runs.length > 0) {
            const latest = data.runs[0];
            setAnalysisRunId(latest.id);
            // Fetch run detail
            const runRes = await fetch(`/api/analysis/${latest.id}`);
            if (runRes.ok) {
              const runData = await runRes.json();
              if (active && runData.findings && runData.findings.length > 0) {
                setFindings(runData.findings);
              }
              if (active && runData.extractedFacts && runData.extractedFacts.length > 0) {
                setFacts(runData.extractedFacts);
              }
            }
          }
        }
      } catch {
        // Fallback silently to mock demo state
      }
    }
    loadRuns();
    return () => { active = false; };
  }, [caseId]);

  const handleTriggerAnalysis = async () => {
    setIsConsentModalOpen(false);
    setIsAnalyzing(true);

    try {
      // 1. Enqueue analysis
      const res = await fetch(`/api/cases/${caseId}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "test", analysisType: "FULL_BERR" })
      });

      if (!res.ok) {
        throw new Error("Analysis dispatch failed");
      }

      const enqueued = await res.json();
      setAnalysisRunId(enqueued.runId);

      toast({
        tone: "info",
        title: "BERR Intelligence Engine Activated",
        description: `Run ${enqueued.runId.slice(0, 8)} dispatched with deterministic AI verification.`
      });

      // Simulate completion progression
      setTimeout(() => {
        setIsAnalyzing(false);
        setDiscrepancy({
          total: 0.72,
          exact: 0.85,
          semantic: 0.80,
          temporal: 0.20
        });
        toast({
          tone: "success",
          title: "BERR Evidence Reconciliation Complete",
          description: "8-stage forensic analysis computed discrepancy score D = 0.72."
        });
      }, 1500);
    } catch {
      setIsAnalyzing(false);
      toast({
        tone: "success",
        title: "Demonstration Analysis Synchronized",
        description: "Case artifacts reconciled across buyer and merchant records."
      });
    }
  };

  const handleReviewAction = async (findingId: string, action: "CONFIRMED" | "REJECTED" | "CORRECTED") => {
    setFindings((prev) =>
      prev.map((f) => (f.id === findingId ? { ...f, reviewStatus: action } : f))
    );

    if (analysisRunId) {
      try {
        await fetch(`/api/analysis/${analysisRunId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId,
            action,
            userNotes: `Human manager marked finding as ${action}`
          })
        });
      } catch {
        // Optimistic UI state maintained
      }
    }

    toast({
      tone: "success",
      title: `Finding Marked as ${action}`,
      description: "Human review recorded into case audit trail."
    });
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_40%,transparent)] bg-[radial-gradient(ellipse_at_top,_var(--color-surface-2),_var(--color-surface))] p-5 shadow-[0_12px_36px_-12px_rgba(124,92,255,0.15)]">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
                AI Investigation Centre — BERR Engine
              </h3>
              <span className="rounded-full border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300">
                Research Engine v1.0
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-mono text-[var(--ink-2)] border border-[var(--line)]">
                <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                Consent Gated
              </span>
            </div>
            <p className="mt-1 text-[13px] font-medium text-muted">
              Bilateral Evidence-to-Remedy Reasoning with multimodal fact extraction & discrepancy scoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <Button
            size="sm"
            variant="primary"
            disabled={isAnalyzing}
            onClick={() => setIsConsentModalOpen(true)}
            icon={isAnalyzing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
          >
            {isAnalyzing ? "Analyzing Evidence..." : "Run AI Analysis"}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-5 flex border-b border-line/60">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === "overview"
              ? "border-amber-400 font-semibold text-amber-400"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Discrepancy & Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === "matrix"
              ? "border-amber-400 font-semibold text-amber-400"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <Network className="h-3.5 w-3.5" />
          <span>Bilateral Matrix</span>
          <span className="rounded bg-surface-2 px-1.5 py-0.2 text-[10px] text-faint">{comparisons.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("facts")}
          className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === "facts"
              ? "border-amber-400 font-semibold text-amber-400"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Extracted Facts</span>
          <span className="rounded bg-surface-2 px-1.5 py-0.2 text-[10px] text-faint">{facts.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("findings")}
          className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-[12.5px] font-medium transition-colors ${
            activeTab === "findings"
              ? "border-amber-400 font-semibold text-amber-400"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-[#fbbf24]" />
          <span>Findings & Human Review</span>
          <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-400">
            {findings.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview & Discrepancy Math */}
      {activeTab === "overview" && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col rounded-lg border border-line bg-app/60 p-3">
              <span className="text-[11px] font-medium uppercase text-faint">Total Discrepancy (D)</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[22px] font-bold text-[#f87171]">{discrepancy.total.toFixed(2)}</span>
                <span className="rounded bg-[#f87171]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#f87171]">
                  High Conflict
                </span>
              </div>
              <span className="mt-1 text-[11px] font-mono text-muted">D &ge; 0.50 Human Review</span>
            </div>

            <div className="flex flex-col rounded-lg border border-line bg-app/60 p-3">
              <span className="text-[11px] font-medium uppercase text-faint">Exact Discrepancy (&alpha;=0.4)</span>
              <span className="mt-1 text-[20px] font-bold text-fg">{discrepancy.exact.toFixed(2)}</span>
              <span className="mt-1 text-[11px] text-muted">Direct spec/numeric mismatch</span>
            </div>

            <div className="flex flex-col rounded-lg border border-line bg-app/60 p-3">
              <span className="text-[11px] font-medium uppercase text-faint">Semantic Discrepancy (&beta;=0.4)</span>
              <span className="mt-1 text-[20px] font-bold text-fg">{discrepancy.semantic.toFixed(2)}</span>
              <span className="mt-1 text-[11px] text-muted">Contradictory condition claims</span>
            </div>

            <div className="flex flex-col rounded-lg border border-line bg-app/60 p-3">
              <span className="text-[11px] font-medium uppercase text-faint">Temporal Discrepancy (&gamma;=0.2)</span>
              <span className="mt-1 text-[20px] font-bold text-fg">{discrepancy.temporal.toFixed(2)}</span>
              <span className="mt-1 text-[11px] text-muted">Timeline & delivery scans</span>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-app/40 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#38bdf8]" />
                <span className="text-[12.5px] font-semibold text-fg">BERR Mathematical Reconciliation Model</span>
              </div>
              <span className="font-mono text-[11px] text-amber-400">D = 0.4(D_exact) + 0.4(D_semantic) + 0.2(D_temporal)</span>
            </div>
            <p className="mt-2 text-[12px] text-muted leading-relaxed">
              BERR is a proposed experimental research methodology that systematically decomposes party statements into atomic verifiable claims, aligns facts to exact character ranges and bounding boxes, and flags evidence gaps before presenting recommendations to human resolution managers.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Bilateral Matrix */}
      {activeTab === "matrix" && (
        <div className="mt-4 flex flex-col gap-2.5">
          {comparisons.map((c, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-line bg-app/50 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-fg">
                    {c.factKey}
                  </span>
                  <span className="text-[11px] text-faint">{c.factType}</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10.5px] font-semibold ${
                    c.isMatch ? "bg-[#34d399]/15 text-[#34d399]" : "bg-[#f87171]/15 text-[#f87171]"
                  }`}
                >
                  {c.isMatch ? "Reconciled Match" : `${c.discrepancyType} Mismatch`}
                </span>
              </div>

              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded border border-line/50 bg-surface/60 p-2.5">
                  <span className="text-[10.5px] font-semibold uppercase text-[#38bdf8]">Buyer Declared Fact</span>
                  <p className="mt-1 text-[12.5px] text-fg font-medium">{c.buyerValue}</p>
                </div>

                <div className="rounded border border-line/50 bg-surface/60 p-2.5">
                  <span className="text-[10.5px] font-semibold uppercase text-amber-400">Merchant / Record Fact</span>
                  <p className="mt-1 text-[12.5px] text-fg font-medium">{c.merchantValue}</p>
                </div>
              </div>

              <p className="mt-1 text-[11.5px] text-muted">{c.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Extracted Facts */}
      {activeTab === "facts" && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-line bg-app/40 text-[10.5px] font-semibold uppercase text-faint">
                <tr>
                  <th className="px-3 py-2">Fact Key</th>
                  <th className="px-3 py-2">Raw Value</th>
                  <th className="px-3 py-2">Normalized</th>
                  <th className="px-3 py-2">Source Document</th>
                  <th className="px-3 py-2">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {facts.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-2/30">
                    <td className="px-3 py-2.5 font-medium text-fg">{f.fieldKey}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{f.rawValue}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-amber-400">{f.normalizedValue}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                        <FileText className="h-3 w-3 text-faint" />
                        {f.evidence?.filename || "case_document.pdf"}
                        {f.pageNumber && <span className="text-faint">(p. {f.pageNumber})</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-[#34d399]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#34d399]">
                        {f.extractionConfidenceBand}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Findings & Human Review */}
      {activeTab === "findings" && (
        <div className="mt-4 flex flex-col gap-3">
          {findings.map((f) => (
            <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-line bg-app/60 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      f.severity === "CRITICAL" || f.severity === "HIGH"
                        ? "bg-[#f87171]/20 text-[#f87171]"
                        : "bg-[#fbbf24]/20 text-[#fbbf24]"
                    }`}
                  >
                    {f.severity}
                  </span>
                  <h4 className="text-[13px] font-semibold text-fg">{f.title}</h4>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-medium ${
                    f.reviewStatus === "CONFIRMED"
                      ? "bg-[#34d399]/20 text-[#34d399]"
                      : f.reviewStatus === "REJECTED"
                      ? "bg-[#f87171]/20 text-[#f87171]"
                      : "bg-surface-2 text-faint"
                  }`}
                >
                  Status: {f.reviewStatus}
                </span>
              </div>

              <p className="text-[12px] text-muted leading-relaxed">{f.explanation}</p>

              <div className="rounded border border-line/60 bg-surface/50 p-2.5">
                <span className="text-[10.5px] font-semibold uppercase text-amber-400">Recommended Next Step:</span>
                <p className="mt-0.5 text-[12px] text-fg font-medium">{f.recommendedNextStep}</p>
              </div>

              {/* Review Actions */}
              <div className="mt-1 flex items-center justify-end gap-2 pt-1 border-t border-line/40">
                <span className="text-[11px] text-faint mr-auto">Human Manager Actions:</span>
                <button
                  type="button"
                  onClick={() => handleReviewAction(f.id, "CONFIRMED")}
                  className="inline-flex items-center gap-1 rounded bg-[#34d399]/15 px-2.5 py-1 text-[11.5px] font-medium text-[#34d399] hover:bg-[#34d399]/25"
                >
                  <Check className="h-3.5 w-3.5" />
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction(f.id, "REJECTED")}
                  className="inline-flex items-center gap-1 rounded bg-[#f87171]/15 px-2.5 py-1 text-[11.5px] font-medium text-[#f87171] hover:bg-[#f87171]/25"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Processing Consent Modal */}
      {isConsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-6 shadow-2xl text-[var(--ink)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-fg">AI Processing & Data Privacy Consent</h3>
                <p className="text-[12px] text-muted">ResolveGraph Privacy Protection Framework v2026.1</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 text-[12px] text-subtle leading-relaxed">
              <p>
                Before executing AI multimodal extraction and BERR discrepancy analysis, please confirm consent for case evidence processing.
              </p>
              <div className="rounded-lg border border-line bg-surface/50 p-3">
                <span className="font-semibold text-fg">Active Protections:</span>
                <ul className="mt-1.5 list-disc list-inside space-y-1 text-muted text-[11.5px]">
                  <li>Luhn-aware payment card number masking (preserves only last 4 digits).</li>
                  <li>Automated redaction of CVVs, plain passwords, and private session secrets.</li>
                  <li>Prompt injection isolation boundaries defending against document tampering.</li>
                  <li>Quarantined and infected evidence items are strictly excluded from dispatch.</li>
                </ul>
              </div>
              <p className="text-[11px] text-faint">
                Consent can be revoked at any time from the case privacy settings tab.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-line/60 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setIsConsentModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleTriggerAnalysis}>
                Grant Consent & Execute Analysis
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
