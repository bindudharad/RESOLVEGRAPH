"use client";

import { useEffect, useState } from "react";
import {
  FileSearch,
  Clock,
  Sparkles,
  Download,
  RefreshCw,
  Plus,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/common/toast";
import { formatCurrency } from "@/lib/utils";
import type { Currency } from "@/lib/types";

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

interface ComplaintRecord {
  id: string;
  caseId: string;
  paymentProvider: string;
  transactionReference: string;
  amountMinor: number;
  currency: string;
  complaintCategory: string;
  complaintStatus: string;
  createdAt: string;
  case?: {
    caseNumber: string;
    title: string;
  };
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
  const { toast } = useToast();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [incident, setIncident] = useState<Incident | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [investigating, setInvestigating] = useState(false);
  const [category, setCategory] = useState("DEBITED_NOT_CREDITED_UPI");
  const [message, setMessage] = useState<string | null>(null);

  // Register UPI Complaint Modal State
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiProvider, setUpiProvider] = useState("PhonePe");
  const [upiRef, setUpiRef] = useState("UPI/AXIS/405829103948");
  const [upiAmount, setUpiAmount] = useState("4500");
  const [upiCategory, setUpiCategory] = useState("DEBITED_NOT_CREDITED_UPI");
  const [senderVpa, setSenderVpa] = useState("alex.morgan@oksbi");
  const [recipientVpa, setRecipientVpa] = useState("disputes@techstore.okhdfc");
  const [isRegisteringUpi, setIsRegisteringUpi] = useState(false);

  const loadComplaints = () => {
    fetch("/api/payments/complaints")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.complaints) {
          setComplaints(data.complaints);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/cases?limit=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.cases || data?.items || [];
        if (list.length > 0) {
          setCases(list);
          setSelectedCaseId(list[0].id);
        }
      })
      .catch((err) => console.error(err));

    loadComplaints();
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
      toast({
        tone: "success",
        title: "Forensic Pipeline Complete",
        description: `Stage ${data.incident.pipelineStage} reached. Statutory TAT evaluated.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Investigation error";
      setMessage(msg);
      toast({ tone: "error", title: "Investigation Error", description: msg });
    } finally {
      setInvestigating(false);
    }
  };

  const handleRegisterUpiComplaint = async () => {
    if (!selectedCaseId || !upiRef || !upiAmount) return;
    setIsRegisteringUpi(true);
    try {
      const res = await fetch("/api/payments/complaints/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: selectedCaseId,
          paymentProvider: upiProvider,
          transactionReference: upiRef,
          amountMinor: Math.round(parseFloat(upiAmount) * 100),
          currency: "INR",
          complaintCategory: upiCategory,
          senderVpa,
          recipientVpa,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register complaint");

      toast({
        tone: "success",
        title: "UPI Dispute Registered",
        description: `Statutory turnaround time (T+1) applied. ${data.guidance?.slice(0, 80) || ""}`,
      });

      setShowUpiModal(false);
      loadComplaints();
      // Refresh current investigation
      const invRes = await fetch(`/api/investigations/${selectedCaseId}`);
      if (invRes.ok) {
        const invData = await invRes.json();
        setIncident(invData.incident);
      }
    } catch (e: unknown) {
      toast({ tone: "error", title: "Registration Failed", description: e instanceof Error ? e.message : "Error" });
    } finally {
      setIsRegisteringUpi(false);
    }
  };

  const handleDownloadReport = (format: "markdown" | "json" | "csv") => {
    if (!selectedCaseId) return;
    window.open(`/api/investigations/${selectedCaseId}/report?format=${format}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">
              AI Root-Cause Payment Investigation
            </h1>
            <Badge tone="brand">12-Stage Forensic Pipeline</Badge>
          </div>
          <p className="text-sm text-muted">
            Investigate complex multi-party payment failures, debited-not-credited disputes, and chargeback anomalies with statutory TAT audit tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowUpiModal(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Register UPI Dispute
          </Button>
          <Button
            size="sm"
            onClick={handleRunInvestigation}
            disabled={investigating || !selectedCaseId}
            className="text-xs"
          >
            {investigating ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Executing Forensics...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Run 12-Stage Forensics
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Target Case Selector and Category Control */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-[var(--ink-2)] mb-1 block">
            Select Investigation Case
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-mono text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            {cases.length === 0 && <option value="">Loading cases...</option>}
            {cases.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--surface)] text-[var(--ink)]">
                {c.caseNumber} — {c.title.slice(0, 45)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--ink-2)] mb-1 block">
            Incident Anomaly Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="DEBITED_NOT_CREDITED_UPI">Debited Not Credited (UPI / IMPS)</option>
            <option value="DUPLICATE_DEBIT_UPI">Duplicate Debit on Single QR</option>
            <option value="PAYMENT_CAPTURED_MERCHANT_UNFULFILLED">Captured but Fulfillment Failed</option>
            <option value="REFUND_INITIATED_NOT_CREDITED">Refund Initiated but Not Credited</option>
            <option value="CROSS_PROVIDER_STATUS_DESYNC">Cross-Provider Status Desync</option>
            <option value="CARD_CHARGEBACK_MERCHANDISE">Card Chargeback (Merchandise / Service)</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadReport("markdown")}
            disabled={!incident}
            className="text-xs flex-1"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Markdown Dossier
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadReport("json")}
            disabled={!incident}
            className="text-xs flex-1"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            JSON Export
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-muted flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          Loading forensic case records...
        </div>
      ) : !incident ? (
        <div className="py-12 text-center text-xs text-muted rounded-xl border border-dashed border-border bg-surface-1">
          No active forensic investigation initialized for this case. Click &quot;Run 12-Stage Forensics&quot; above to calibrate findings.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Diagnostics Card */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      incident.severity === "CRITICAL"
                        ? "danger"
                        : incident.severity === "HIGH"
                        ? "warning"
                        : "info"
                    }
                  >
                    {incident.severity} SEVERITY
                  </Badge>
                  <h3 className="text-base font-bold text-fg">
                    Diagnostic Hypothesis: {incident.rootCauseHypothesis || "Inconclusive"}
                  </h3>
                </div>
                <p className="text-xs text-muted mt-1">
                  Confidence Score:{" "}
                  <strong className="text-fg">
                    {(incident.confidenceScore * 100).toFixed(0)}%
                  </strong>{" "}
                  · Evidentiary Uncertainty:{" "}
                  <strong className="text-fg">
                    {incident.evidentiaryUncertainty || "0.08 (Minimal Uncertainty)"}
                  </strong>
                </p>
              </div>

              {incident.compensationEligible && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase font-semibold text-emerald-400">
                    Statutory Compensation
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-300">
                    {formatCurrency(incident.compensationAmountMinor / 100, "INR" as Currency)}
                  </div>
                  <div className="text-[10px] text-emerald-400/80">RBI DPSS.CO.PD Mandate</div>
                </div>
              )}
            </div>

            {incident.tatStatutoryGuidance && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Statutory Turnaround Time Guidance:</span>
                  <p className="text-amber-200/90 leading-relaxed">
                    {incident.tatStatutoryGuidance}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 12-Stage Visual Progress Matrix */}
          <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-semibold text-fg flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-primary" />
              12-Stage Forensic Pipeline Execution State
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {PIPELINE_STAGES.map((stg, idx) => {
                const isCurrent = stg === incident.pipelineStage;
                const isPassed =
                  PIPELINE_STAGES.indexOf(incident.pipelineStage) >= idx;

                return (
                  <div
                    key={stg}
                    className={`rounded-lg border p-2.5 text-xs transition-colors ${
                      isCurrent
                        ? "border-amber-500 bg-amber-500/10 text-amber-300 font-semibold shadow-sm"
                        : isPassed
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                        : "border-border bg-surface-2/40 text-faint"
                    }`}
                  >
                    <div className="text-[10px] font-mono text-faint">
                      STAGE {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="truncate font-mono mt-0.5">{stg}</div>
                  </div>
                );
              })}
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

      {/* Registered Payment Complaints & UPI Disputes Ledger */}
      <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-fg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-400" />
              Registered Payment Complaints &amp; UPI Disputes Ledger
            </h3>
            <p className="text-xs text-muted">
              Statutory dispute tracking across PhonePe, Google Pay, Paytm, BHIM, Axis Bank, and SBI.
            </p>
          </div>
          <Badge tone="brand">{complaints.length} Logged</Badge>
        </div>

        {complaints.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            No external UPI complaints currently registered. Click &quot;Register UPI Dispute&quot; to log a debited-not-credited claim.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-2 text-muted uppercase font-mono">
                <tr>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Transaction URN / RRN</th>
                  <th className="px-3 py-2">Disputed Amount</th>
                  <th className="px-3 py-2">Complaint Category</th>
                  <th className="px-3 py-2">Statutory Status</th>
                  <th className="px-3 py-2">Logged Date</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2/40">
                    <td className="px-3 py-2.5 font-semibold text-fg">
                      {c.paymentProvider}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-amber-400">
                      {c.transactionReference}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium text-fg">
                      {formatCurrency(c.amountMinor / 100, (c.currency as Currency) || "INR")}
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {c.complaintCategory.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={c.complaintStatus === "RESOLVED" ? "success" : "warning"}>
                        {c.complaintStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-faint">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedCaseId(c.caseId);
                          toast({ tone: "info", title: "Case Selected", description: `Loaded case ${c.caseId} for investigation.` });
                        }}
                        className="text-xs h-6 px-2 text-amber-400 hover:underline"
                      >
                        Investigate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register UPI Dispute Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface-1 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-fg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-400" />
              Register UPI Payment Dispute
            </h3>
            <p className="mt-1 text-xs text-muted">
              Submit a formal debited-not-credited UPI complaint. Enforces RBI DPSS TAT T+1 guidelines and begins automated switch reconciliation.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-fg">Target Investigation Case</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-mono text-fg mt-1"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} - {c.title.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-fg">Payment App / Switch</label>
                  <Select
                    value={upiProvider}
                    onChange={(e) => setUpiProvider(e.target.value)}
                    className="mt-1"
                  >
                    <option value="PhonePe">PhonePe</option>
                    <option value="Google Pay">Google Pay</option>
                    <option value="Paytm">Paytm</option>
                    <option value="BHIM UPI">BHIM UPI</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="HDFC Bank">HDFC Bank</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-fg">Disputed Amount (₹ INR)</label>
                  <Input
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    placeholder="4500"
                    type="number"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-fg">UPI Transaction Reference (URN / RRN / Txn ID)</label>
                <Input
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="UPI/AXIS/405829103948"
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-fg">Complaint Category</label>
                <Select
                  value={upiCategory}
                  onChange={(e) => setUpiCategory(e.target.value)}
                  className="mt-1"
                >
                  <option value="DEBITED_NOT_CREDITED_UPI">Debited Not Credited (Failed / Timeout U30)</option>
                  <option value="DUPLICATE_DEBIT_UPI">Duplicate Debit (Single Merchant Fulfillment)</option>
                  <option value="WRONG_VPA_TRANSFER">Wrong Beneficiary VPA Transfer</option>
                  <option value="TECHNICAL_DECLINE_NOT_REVERSED">Technical Decline Not Auto-Reversed</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-fg">Sender VPA</label>
                  <Input
                    value={senderVpa}
                    onChange={(e) => setSenderVpa(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-fg">Recipient VPA</label>
                  <Input
                    value={recipientVpa}
                    onChange={(e) => setRecipientVpa(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpiModal(false)}
                disabled={isRegisteringUpi}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRegisterUpiComplaint}
                disabled={isRegisteringUpi || !upiRef || !upiAmount}
              >
                {isRegisteringUpi ? "Submitting..." : "Register Statutory Dispute"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
