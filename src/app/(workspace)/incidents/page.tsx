"use client";

import { useEffect, useState } from "react";
import {
  FileSearch,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Finding {
  id: string;
  findingType: "VERIFIED_FACT" | "PARTY_CLAIM" | "WORKING_HYPOTHESIS" | "CONTRADICTION" | "MISSING_INFORMATION";
  category: string;
  summary: string;
  confidenceScore: number;
  evidenceAnchor: string | null;
}

interface Incident {
  id: string;
  caseId: string;
  category: string;
  severity: string;
  status: string;
  pipelineStage: string;
  rootCauseHypothesis: string | null;
  confidenceScore: number;
  evidentiaryUncertainty: string | null;
  tatStatutoryGuidance: string | null;
  compensationEligible: boolean;
  compensationAmountMinor: number;
  findings: Finding[];
}

interface CaseItem {
  id: string;
  caseNumber: string;
  title: string;
}

const PIPELINE_STAGES = [
  "INTAKE_VALIDATION",
  "EXTRACTION_CALIBRATION",
  "CANONICAL_NORMALIZATION",
  "CROSS_PLATFORM_MATCHING",
  "GRAPH_CONSTRUCTION",
  "CONTRADICTION_DETECTION",
  "HYPOTHESIS_GENERATION",
  "STATUTORY_TAT_EVALUATION",
  "COPILOT_ORCHESTRATION",
  "DOSSIER_COMPILATION",
  "HUMAN_APPROVAL_GATE",
  "AUDIT_CHAIN_FINALIZATION",
];

export default function IncidentsPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);
  const [investigating, setInvestigating] = useState(false);
  const [category, setCategory] = useState("DEBITED_NOT_CREDITED_UPI");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cases?limit=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.cases?.length > 0) {
          setCases(data.cases);
          setSelectedCaseId(data.cases[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/investigations/${selectedCaseId}`);
        if (res.ok && mounted) {
          const data = await res.json();
          setIncident(data.incident);
          if (data.incident?.category) {
            setCategory(data.incident.category);
          }
        } else if (mounted) {
          setIncident(null);
        }
      } catch (err) {
        console.error("Failed to load incident investigation:", err);
        if (mounted) setIncident(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [selectedCaseId]);

  const handleRunInvestigation = async () => {
    if (!selectedCaseId) return;
    setInvestigating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/investigations/${selectedCaseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Investigation failed");

      setIncident(data.incident);
      setMessage("12-Stage Investigation Pipeline successfully completed.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Investigation error";
      setMessage(msg);
    } finally {
      setInvestigating(false);
    }
  };

  const handleDownloadReport = (format: "markdown" | "json" | "csv") => {
    if (!selectedCaseId) return;
    window.open(`/api/investigations/${selectedCaseId}/report?format=${format}`, "_blank");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              AI Root-Cause Payment Investigation
            </h1>
            <Badge tone="brand">12-Stage Forensic Pipeline</Badge>
          </div>
          <p className="text-sm text-muted">
            Investigate complex multi-party payment failures, debited-not-credited disputes, and chargeback anomalies with statutory TAT audit tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRunInvestigation}
            disabled={investigating || !selectedCaseId}
            className="text-xs"
          >
            {investigating ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Run 12-Stage Investigation
          </Button>
        </div>
      </div>

      {/* Case & Incident Category Selector */}
      <div className="rounded-xl border border-border bg-surface-1 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">
              Case:
            </span>
            <select
              aria-label="Target Case"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">
              Category:
            </span>
            <select
              aria-label="Incident Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="DEBITED_NOT_CREDITED_UPI">Debited Not Credited (UPI)</option>
              <option value="PAYPAL_CAPTURE_WITHOUT_ORDER">PayPal Capture Without Order</option>
              <option value="DUPLICATE_DEBIT_SAME_ORDER">Duplicate Debit for Same Order</option>
              <option value="CROSS_CURRENCY_CONVERSION_DISCREPANCY">Cross-Currency Discrepancy</option>
              <option value="REFUND_INITIATED_NOT_SETTLED">Refund Initiated but Not Settled</option>
              <option value="BANK_DEBIT_MERCHANT_DROP">Bank Debit but Merchant Cart Dropped</option>
              <option value="SPLIT_PAYMENT_PARTIAL_FAILURE">Split Payment Partial Failure</option>
              <option value="STATUTORY_TAT_EXCEEDED">Statutory TAT Exceeded (Auto-Compensation)</option>
              <option value="CHARGEBACK_EVIDENCE_CONTRADICTION">Chargeback Evidence Contradiction</option>
            </select>
          </div>
        </div>

        {/* Dossier Exports */}
        {incident && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium mr-1">Export Dossier:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadReport("markdown")}
              className="text-xs h-7 px-2.5"
            >
              <Download className="mr-1 h-3 w-3" />
              MD/PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadReport("json")}
              className="text-xs h-7 px-2.5"
            >
              <Download className="mr-1 h-3 w-3" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadReport("csv")}
              className="text-xs h-7 px-2.5"
            >
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : !incident ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 p-8 text-center">
          <FileSearch className="h-12 w-12 text-muted mb-3 opacity-40" />
          <h3 className="text-sm font-semibold text-fg">No Active Incident Investigation</h3>
          <p className="text-xs text-muted max-w-sm mt-1">
            Click &quot;Run 12-Stage Investigation&quot; to execute multi-party root cause analysis on this case.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statutory TAT Banner */}
          {incident.tatStatutoryGuidance && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Statutory Turnaround Time (TAT) & Compliance Guidance
                </span>
                {incident.compensationEligible && (
                  <Badge tone="danger">
                    Auto-Compensation Due: ₹{(incident.compensationAmountMinor / 100).toFixed(0)}
                  </Badge>
                )}
              </div>
              <p className="text-amber-200/90 leading-relaxed">
                {incident.tatStatutoryGuidance}
              </p>
            </div>
          )}

          {/* Root Cause & Uncertainty Overview Card */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <span className="text-xs uppercase font-semibold text-muted tracking-wider">
                  Incident Classification
                </span>
                <h3 className="text-lg font-bold text-fg mt-0.5">{incident.category}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="info">
                  Stage: {incident.pipelineStage}
                </Badge>
                <Badge
                  tone={incident.severity === "CRITICAL" ? "danger" : "warning"}
                >
                  Severity: {incident.severity}
                </Badge>
                <Badge tone="brand">
                  Confidence: {(incident.confidenceScore * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-1">
                Root Cause Hypothesis
              </h4>
              <p className="text-sm text-fg/90 bg-surface-2 p-3 rounded-lg border border-border leading-relaxed">
                {incident.rootCauseHypothesis || "Hypothesis formation in progress..."}
              </p>
            </div>

            {incident.evidentiaryUncertainty && (
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Evidentiary Uncertainty & Open Queries
                </h4>
                <p className="text-xs text-muted italic bg-surface-2/40 p-2.5 rounded border border-border">
                  {incident.evidentiaryUncertainty}
                </p>
              </div>
            )}
          </div>

          {/* 12-Stage Pipeline Visual Tracker */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm">
            <h4 className="text-xs font-semibold text-fg uppercase tracking-wider mb-4">
              12-Stage Autonomous Forensic Pipeline Progression
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {PIPELINE_STAGES.map((stage, idx) => (
                <div
                  key={stage}
                  className="rounded border border-border bg-surface-2/50 p-2 text-[11px] flex items-center gap-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="truncate font-mono text-muted">{stage.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Findings Breakdown */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
            <h4 className="text-base font-semibold text-fg">
              Investigation Findings ({incident.findings?.length || 0})
            </h4>

            <div className="space-y-3">
              {incident.findings?.map((f) => (
                <div
                  key={f.id}
                  className={`rounded-lg border p-3.5 text-xs space-y-1.5 ${
                    f.findingType === "VERIFIED_FACT"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : f.findingType === "CONTRADICTION"
                      ? "border-red-500/30 bg-red-500/5"
                      : f.findingType === "WORKING_HYPOTHESIS"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : f.findingType === "MISSING_INFORMATION"
                      ? "border-sky-500/30 bg-sky-500/5"
                      : "border-blue-500/30 bg-blue-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          f.findingType === "VERIFIED_FACT"
                            ? "success"
                            : f.findingType === "CONTRADICTION"
                            ? "danger"
                            : f.findingType === "WORKING_HYPOTHESIS"
                            ? "warning"
                            : f.findingType === "MISSING_INFORMATION"
                            ? "brand"
                            : "info"
                        }
                      >
                        {f.findingType}
                      </Badge>
                      <span className="font-semibold text-fg">{f.category}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted">
                      Confidence: {(f.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-muted leading-relaxed">{f.summary}</p>
                  {f.evidenceAnchor && (
                    <div className="text-[10px] font-mono text-faint">
                      Anchor: {f.evidenceAnchor}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
