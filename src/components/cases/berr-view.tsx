"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  History,
  Info,
  Network,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CANONICAL_BERR_ROWS, type BerrComparisonRow } from "@/lib/demo-fixture";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/ui/slide-over";
import { BerrLoadingState } from "@/components/cases/berr-loading-state";
import { cn } from "@/lib/utils";
import type {
  BerrNextActionType,
  BerrStructuredFinding,
  BerrV2ReasoningOutput,
  FactClassification,
} from "@/server/ai/reasoning/berr-v2.types";

interface LiveBerrRow extends BerrComparisonRow {
  dbId?: string;
  findingId?: string;
  claim?: string;
  verificationState?: string;
  verificationMethod?: string;
  verificationAuthority?: string;
  verifiedAt?: string;
  buyerEvidenceIds?: string[];
  sellerEvidenceIds?: string[];
  linkedBegNodeIds?: string[];
  linkedBegEdgeIds?: string[];
  recommendedNextAction?: string;
  humanReviewStatus?: "UNREVIEWED" | "ACCEPTED" | "REJECTED" | "CORRECTED";
  originalAiClassification?: FactClassification;
  originalAiExplanation?: string;
  humanOverrideReason?: string;
}

interface BerrHistoryItem {
  id: string;
  version: number;
  begGraphVersion: number;
  status: string;
  overallStatus?: string;
  isStale: boolean;
  staleReason: string | null;
  triggerReason: string;
  humanReviewStatus?: string;
  createdAt: string;
  factCounts?: { agreed: number; verified: number; contested: number; missing: number };
}

interface BerrReviewActionItem {
  id: string;
  assessmentId: string;
  findingId: string | null;
  actorId: string;
  actorName: string;
  action: string;
  reason: string;
  createdAt: string;
}

interface BerrViewProps {
  caseId?: string;
  customerName?: string;
  merchantName?: string;
  onInspectBegNodes?: (nodeIds: string[], edgeIds: string[]) => void;
  onOpenResolution?: () => void;
}

const OVERALL_STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  COMPLETED: {
    label: "Evaluation Complete",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  COMPLETED_WITH_CONFLICTS: {
    label: "Completed with Conflicts",
    cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  REQUIRES_ADDITIONAL_EVIDENCE: {
    label: "Additional Evidence Required",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  HUMAN_REVIEW_REQUIRED: {
    label: "Human Review Required",
    cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    cls: "border-line bg-surface-2 text-subtle",
  },
  FAILED: {
    label: "Evaluation Failed",
    cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

export function BerrView({
  caseId = "RG-2026-0412",
  customerName = "Alex Morgan (Buyer)",
  merchantName = "Seller Organization (Merchant)",
  onInspectBegNodes,
  onOpenResolution,
}: BerrViewProps) {
  const [filterState, setFilterState] = useState<string>("ALL");
  const [selectedRow, setSelectedRow] = useState<LiveBerrRow | null>(null);
  const [hoveredSource, setHoveredSource] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [liveAssessment, setLiveAssessment] = useState<BerrV2ReasoningOutput | null>(null);
  const [history, setHistory] = useState<BerrHistoryItem[]>([]);
  const [reviewActions, setReviewActions] = useState<BerrReviewActionItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [runningEval, setRunningEval] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Human review form state inside SlideOver or Action Bar
  const [reviewReason, setReviewReason] = useState("");
  const [correctedClass, setCorrectedClass] = useState<FactClassification>("VERIFIED");
  const [overrideAction, setOverrideAction] = useState<BerrNextActionType>("ROUTE_TO_HUMAN_REVIEW");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  const loadBerr = useCallback(
    async (version?: number) => {
      setLoading(true);
      setAccessError(null);
      try {
        const qs = version ? `?version=${version}` : "";
        const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/berr-v2${qs}`);
        if (res.status === 403) {
          const j = await res.json().catch(() => ({}));
          if (caseId !== "RG-2026-0412") {
            setAccessError(j.error || "Access denied to internal BERR investigation view.");
          }
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setLiveAssessment(data.berrV2 || null);
          setHistory(data.history || []);
          setReviewActions(data.reviewActions || []);
        }
      } catch {
        // offline or landing fallback
      } finally {
        setLoading(false);
      }
    },
    [caseId]
  );

  useEffect(() => {
    loadBerr(selectedVersion);
  }, [loadBerr, selectedVersion]);

  const handleRunEvaluation = async () => {
    setRunningEval(true);
    setReviewFeedback(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/berr-v2`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setLiveAssessment(data.berrV2 || null);
        setHistory(data.history || []);
        setReviewActions(data.reviewActions || []);
        setSelectedVersion(undefined);
      } else {
        const err = await res.json().catch(() => ({}));
        setAccessError(err.error || "Failed to execute BERR evaluation.");
      }
    } finally {
      setRunningEval(false);
    }
  };

  const handleReviewAction = async (payload: {
    action:
      | "ACCEPT_FINDING"
      | "REJECT_FINDING"
      | "CORRECT_CLASSIFICATION"
      | "CHANGE_NEXT_ACTION"
      | "REQUEST_MORE_INFO"
      | "ESCALATE_CASE";
    findingId?: string;
    correctedClassification?: FactClassification;
    newNextAction?: BerrNextActionType;
    reasonText?: string;
  }) => {
    if (!liveAssessment?.assessmentId) return;
    const reason =
      (payload.reasonText || reviewReason).trim() ||
      `Investigator recorded ${payload.action.toLowerCase().replace(/_/g, " ")} decision.`;

    setSubmittingReview(true);
    setReviewFeedback(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/berr-v2/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: liveAssessment.assessmentId,
          findingId: payload.findingId,
          action: payload.action,
          correctedClassification: payload.correctedClassification,
          newNextAction: payload.newNextAction,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Review override failed");
      }
      setLiveAssessment(data.berrV2 || null);
      setHistory(data.history || []);
      setReviewActions(data.reviewActions || []);
      setReviewReason("");
      setReviewFeedback(`Saved human review decision (${payload.action}) cleanly.`);
      if (selectedRow && data.berrV2?.findings) {
        const refreshed = (data.berrV2.findings as BerrStructuredFinding[]).find(
          (f) => f.dbId === selectedRow.dbId || f.findingId === selectedRow.findingId
        );
        if (refreshed) {
          setSelectedRow((prev) =>
            prev
              ? {
                  ...prev,
                  state: refreshed.classification,
                  humanReviewStatus: refreshed.humanReviewStatus,
                  humanOverrideReason: refreshed.humanOverrideReason,
                }
              : null
          );
        }
      }
    } catch (err: unknown) {
      setReviewFeedback(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const rows = useMemo<LiveBerrRow[]>(() => {
    if (liveAssessment?.findings && liveAssessment.findings.length > 0) {
      return liveAssessment.findings.map((f) => ({
        id: f.id,
        dbId: f.dbId,
        findingId: f.findingId,
        claim: f.claim,
        attribute: f.claim || f.field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        state: f.classification,
        verificationState: f.verificationState,
        verificationMethod: f.verificationMethod,
        verificationAuthority: f.verificationAuthority,
        verifiedAt: f.verifiedAt,
        buyerEvidence:
          f.buyerAssertion ||
          (f.classification === "MISSING"
            ? "Supporting customer information absent or pending"
            : f.explanation),
        merchantEvidence:
          f.merchantAssertion ||
          f.independentProof ||
          (f.classification === "MISSING" ? "Awaiting seller submission or verification" : "Evaluated via BEG"),
        buyerSourceId: f.buyerEvidenceIds[0] || f.supportingEvidenceIds[0] || undefined,
        merchantSourceId: f.sellerEvidenceIds[0] || f.supportingEvidenceIds[1] || undefined,
        buyerEvidenceIds: f.buyerEvidenceIds,
        sellerEvidenceIds: f.sellerEvidenceIds,
        explanation: f.explanation,
        confidence: f.confidence,
        linkedBegNodeIds: f.linkedBegNodeIds || [],
        linkedBegEdgeIds: f.linkedBegEdgeIds || [],
        recommendedNextAction: f.recommendedNextAction,
        humanReviewStatus: f.humanReviewStatus,
        originalAiClassification: f.originalAiClassification,
        originalAiExplanation: f.originalAiExplanation,
        humanOverrideReason: f.humanOverrideReason,
      }));
    }
    if (liveAssessment && liveAssessment.classifiedFacts.length > 0) {
      return liveAssessment.classifiedFacts.map((fact, idx) => ({
        id: fact.id,
        dbId: fact.dbId,
        findingId: fact.findingId || `BERR-F-${String(idx + 1).padStart(3, "0")}`,
        claim: fact.claim,
        attribute: fact.claim || fact.field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        state: fact.classification,
        verificationState: fact.verificationState,
        verificationMethod: fact.verificationMethod,
        verificationAuthority: fact.verificationAuthority,
        verifiedAt: fact.verifiedAt,
        buyerEvidence:
          fact.buyerAssertion ||
          (fact.classification === "MISSING" ? "Not supplied in current buyer submission" : fact.explanation),
        merchantEvidence:
          fact.merchantAssertion ||
          fact.independentProof ||
          (fact.classification === "MISSING" ? "Awaiting seller submission" : "Evaluated via BEG"),
        buyerSourceId: fact.buyerEvidenceIds?.[0] || fact.supportingEvidenceIds[0] || undefined,
        merchantSourceId: fact.sellerEvidenceIds?.[0] || fact.supportingEvidenceIds[1] || undefined,
        buyerEvidenceIds: fact.buyerEvidenceIds || [],
        sellerEvidenceIds: fact.sellerEvidenceIds || [],
        explanation: fact.explanation,
        confidence: fact.confidence,
        linkedBegNodeIds: fact.linkedBegNodeIds || [],
        linkedBegEdgeIds: fact.linkedBegEdgeIds || [],
        recommendedNextAction: fact.recommendedNextAction,
        humanReviewStatus: fact.humanReviewStatus,
        originalAiClassification: fact.originalAiClassification,
        originalAiExplanation: fact.originalAiExplanation,
        humanOverrideReason: fact.humanOverrideReason,
      }));
    }
    return caseId === "RG-2026-0412" ? CANONICAL_BERR_ROWS : [];
  }, [liveAssessment, caseId]);

  const filteredRows = rows.filter((row) => {
    if (filterState === "ALL") return true;
    return row.state === filterState;
  });

  const countAgreed = rows.filter((r) => r.state === "AGREED").length;
  const countVerified = rows.filter((r) => r.state === "VERIFIED").length;
  const countContested = rows.filter((r) => r.state === "CONTESTED").length;
  const countMissing = rows.filter((r) => r.state === "MISSING").length;

  if (accessError) {
    return (
      <div className="rg-card border-rose-500/30 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-fg">Restricted BERR Investigation View</h3>
            <p className="mt-1 text-xs text-muted">{accessError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !liveAssessment) {
    return <BerrLoadingState />;
  }

  const invCtx = liveAssessment?.investigationContext;
  const overallBadge =
    OVERALL_STATUS_BADGES[liveAssessment?.overallStatus || "COMPLETED"] ||
    OVERALL_STATUS_BADGES.COMPLETED;

  return (
    <div className="space-y-4">
      {/* A & B: Complaint Summary + Overall Assessment Banner */}
      <div className="rg-card p-5 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-bold text-fg">
                Bilateral Evidence-to-Remedy Reasoning (BERR)
              </h2>
              <span className="rounded bg-[var(--ai)]/10 px-2 py-0.5 text-[11px] font-mono text-[var(--ai)] border border-[var(--ai)]/30">
                {liveAssessment
                  ? `Assessment v${liveAssessment.version || 1} • BEG v${liveAssessment.begGraphVersion || 1}`
                  : "Convergence Spine"}
              </span>
              {liveAssessment?.overallStatus && (
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 text-[11px] font-semibold",
                    overallBadge.cls
                  )}
                >
                  {overallBadge.label}
                </span>
              )}
              {liveAssessment?.isStale && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  <AlertTriangle className="h-3 w-3" />
                  BEG Updated — Re-run BERR
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              BEG connects evidence; BERR evaluates claims into AGREED, VERIFIED, CONTESTED, and MISSING findings grounded in verified provenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunEvaluation}
              disabled={runningEval}
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", runningEval && "animate-spin")} />
              {runningEval ? "Evaluating BEG..." : "Run BERR Re-evaluation"}
            </Button>
          </div>
        </div>

        {/* Complaint Structured Context Strip (Part 13.A) */}
        {invCtx && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2/60 p-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <span className="text-[10px] uppercase text-muted">Complaint / Order</span>
              <p className="font-mono font-semibold text-fg truncate">
                {invCtx.caseNumber} {invCtx.sharedInfo.orderId ? `• ${invCtx.sharedInfo.orderId}` : ""}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-muted">Marketplace</span>
              <p className="font-medium text-fg truncate">{invCtx.sharedInfo.marketplace || "Direct"}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-muted">Identified Seller</span>
              <p className="font-medium text-fg truncate">
                {invCtx.sellerInfo.identifiedSellerName || "Pending ID"}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-muted">Product / SKU</span>
              <p className="font-medium text-fg truncate">
                {invCtx.sharedInfo.productName || "See Description"}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-muted">Reasoning Track</span>
              <p className="font-mono font-semibold text-fg">{invCtx.complaintTrack}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase text-muted">BEG Inputs</span>
              <p className="font-mono text-subtle">
                {invCtx.begNodeCount} nodes • {invCtx.begEdgeCount} edges
              </p>
            </div>
          </div>
        )}

        {/* Prompt Injection / Uncertainty Alert if Present */}
        {invCtx?.promptInjectionDetected && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Adversarial Input Quarantined:</strong> Untrusted document text contained instruction-override patterns ({invCtx.promptInjectionWarnings.join(", ")}). Policy and remedy rules were protected; mandatory human review is active.
            </div>
          </div>
        )}

        {/* Four Classification Segmented Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center rounded-lg border border-line bg-surface-2 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setFilterState("ALL")}
              className={cn(
                "rounded-md px-3 py-1 font-medium transition-colors",
                filterState === "ALL"
                  ? "bg-surface text-fg shadow-xs font-semibold"
                  : "text-subtle hover:text-fg"
              )}
            >
              All ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("AGREED")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "AGREED"
                  ? "bg-surface text-[var(--agreed)] shadow-xs font-semibold"
                  : "text-subtle hover:text-fg"
              )}
            >
              <Check className="h-3 w-3 text-[var(--agreed)]" />
              Agreed ({countAgreed})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("VERIFIED")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "VERIFIED"
                  ? "bg-surface text-emerald-600 shadow-xs font-semibold"
                  : "text-subtle hover:text-fg"
              )}
            >
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Verified ({countVerified})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("CONTESTED")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "CONTESTED"
                  ? "bg-surface text-[var(--contested)] shadow-xs font-semibold"
                  : "text-subtle hover:text-fg"
              )}
            >
              <ArrowLeftRight className="h-3 w-3 text-[var(--contested)]" />
              Contested ({countContested})
            </button>
            <button
              type="button"
              onClick={() => setFilterState("MISSING")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                filterState === "MISSING"
                  ? "bg-surface text-[var(--ink-2)] shadow-xs font-semibold"
                  : "text-subtle hover:text-fg"
              )}
            >
              <HelpCircle className="h-3 w-3 text-subtle" />
              Missing ({countMissing})
            </button>
          </div>

          {liveAssessment?.uncertaintyAnalysis && (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-subtle">
                Uncertainty: <strong>{Math.round(liveAssessment.uncertaintyAnalysis.objectiveUncertaintyScore * 100)}%</strong>
              </span>
              {liveAssessment.uncertaintyAnalysis.requiresHumanReview && (
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <UserCheck className="h-3 w-3" />
                  Human Support Review Required
                </span>
              )}
            </div>
          )}
        </div>

        {/* Assessment History Version Switcher (Part 13.F) */}
        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-2.5 text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono text-muted">
              <History className="h-3 w-3" />
              Assessment Versions:
            </span>
            {history.slice(0, 8).map((h) => {
              const isSelectedVer =
                selectedVersion === h.version || (!selectedVersion && h.version === liveAssessment?.version);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedVersion(h.version)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono transition-colors",
                    isSelectedVer
                      ? "border-fg bg-fg text-bg font-semibold"
                      : h.isStale
                      ? "border-line bg-surface-2 text-muted hover:text-fg"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  v{h.version} (BEG v{h.begGraphVersion}) • {h.triggerReason}
                  {h.isStale ? " [History]" : " [Latest]"}
                </button>
              );
            })}
          </div>
        )}

        {/* Bilateral Party Header Track */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_200px_1fr] items-center gap-4 border-t border-line pt-4">
          <div className="rounded-md border-t-2 border-t-[var(--buyer)] bg-surface-2/60 p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--buyer)]">
              Buyer Evidence Thread
            </span>
            <p className="mt-0.5 text-[13px] font-medium text-fg">{customerName}</p>
          </div>

          <div className="text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
              Claim & Classification
            </span>
            <div className="mx-auto mt-1 h-[2px] w-12 bg-line-strong" />
          </div>

          <div className="rounded-md border-t-2 border-t-[var(--merchant)] bg-surface-2/60 p-3 text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--merchant)]">
              Seller / Ledger Thread
            </span>
            <p className="mt-0.5 text-[13px] font-medium text-fg">{merchantName}</p>
          </div>
        </div>
      </div>

      {/* C: Finding Comparison Cards */}
      <div className="space-y-3">
        {runningEval ? (
          <BerrLoadingState />
        ) : (
          filteredRows.map((row) => {
          const isSelected = selectedRow?.id === row.id;
          const isBuyerHovered = hoveredSource === row.buyerSourceId;
          const isMerchantHovered = hoveredSource === row.merchantSourceId;

          return (
            <div
              key={row.id}
              onClick={() => {
                setSelectedRow(row);
                setCorrectedClass(row.state);
                setReviewFeedback(null);
              }}
              className={cn(
                "group cursor-pointer rounded-lg border border-line bg-surface p-4 transition-all hover:border-line-strong hover:shadow-sm",
                isSelected && "ring-2 ring-[var(--accent)]",
                row.state === "CONTESTED" && "border-l-4 border-l-[var(--contested)]",
                row.state === "AGREED" && "border-l-4 border-l-[var(--agreed)]",
                row.state === "VERIFIED" && "border-l-4 border-l-emerald-500",
                row.state === "MISSING" && "border-l-4 border-l-line-strong"
              )}
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_1fr] gap-4 items-center">
                {/* Buyer Column */}
                <div
                  className={cn(
                    "rounded-md p-3 transition-colors",
                    isBuyerHovered ? "bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)]" : "bg-surface-2/40"
                  )}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-subtle font-mono">
                      {row.findingId ? `${row.findingId} • ` : ""}
                      {row.buyerSourceId || "BUYER CLAIM / NO FILE"}
                    </span>
                    {row.buyerSourceId && (
                      <span
                        onMouseEnter={() => setHoveredSource(row.buyerSourceId!)}
                        onMouseLeave={() => setHoveredSource(null)}
                        className="rounded bg-surface px-1.5 py-0.2 font-mono text-[10px] text-[var(--buyer)] border border-[var(--buyer)]/30"
                      >
                        Ref {row.buyerSourceId.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-fg leading-snug">{row.buyerEvidence}</p>
                </div>

                {/* Central Spine */}
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[12px] font-bold text-fg">{row.attribute}</span>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
                    {row.state === "AGREED" && <Chip variant="agreed">Agreed</Chip>}
                    {row.state === "CONTESTED" && <Chip variant="contested">Contested</Chip>}
                    {row.state === "MISSING" && <Chip variant="missing">Missing</Chip>}
                    {row.state === "VERIFIED" && <Chip variant="verified">Verified</Chip>}
                  </div>
                  {row.humanReviewStatus && row.humanReviewStatus !== "UNREVIEWED" && (
                    <span className="mt-1 rounded bg-surface-2 border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg">
                      Human: {row.humanReviewStatus}
                      {row.originalAiClassification && row.originalAiClassification !== row.state
                        ? ` (AI: ${row.originalAiClassification})`
                        : ""}
                    </span>
                  )}
                  <span className="mt-1 font-mono text-[10px] text-subtle">
                    {row.verificationMethod ? row.verificationMethod : `Confidence ${(row.confidence * 100).toFixed(0)}%`}
                  </span>
                </div>

                {/* Seller / Verification Column */}
                <div
                  className={cn(
                    "rounded-md p-3 transition-colors text-right",
                    isMerchantHovered ? "bg-[color-mix(in_srgb,var(--merchant)_12%,transparent)]" : "bg-surface-2/40"
                  )}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    {row.merchantSourceId ? (
                      <span
                        onMouseEnter={() => setHoveredSource(row.merchantSourceId!)}
                        onMouseLeave={() => setHoveredSource(null)}
                        className="rounded bg-surface px-1.5 py-0.2 font-mono text-[10px] text-[var(--merchant)] border border-[var(--merchant)]/30"
                      >
                        Ref {row.merchantSourceId.slice(0, 10)}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-subtle font-mono">
                      {row.verificationAuthority || row.merchantSourceId || "SELLER / LEDGER"}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-[13px] leading-snug",
                      row.state === "MISSING"
                        ? "italic text-subtle rg-hatched-missing py-1 px-2 rounded"
                        : "text-fg"
                    )}
                  >
                    {row.merchantEvidence}
                  </p>
                </div>
              </div>

              {/* Explanation & BEG Navigation */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2 text-[11.5px] text-subtle">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
                  <span className="text-muted">{row.explanation}</span>
                </span>
                <div className="flex items-center gap-3">
                  {onInspectBegNodes && row.linkedBegNodeIds && row.linkedBegNodeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectBegNodes(row.linkedBegNodeIds || [], row.linkedBegEdgeIds || []);
                      }}
                      className="inline-flex items-center gap-1 font-medium text-[var(--ai)] hover:underline"
                    >
                      <Network className="h-3 w-3" />
                      Highlight in BEG
                    </button>
                  )}
                  <span className="font-medium text-[var(--accent)] group-hover:underline flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Inspect & Review
                  </span>
                </div>
              </div>
            </div>
          );
        }))}

        {!loading && !runningEval && filteredRows.length === 0 && (
          <div className="rg-card p-8 text-center">
            <p className="text-sm font-medium text-fg">
              No findings match this filter in BERR v{liveAssessment?.version || 1}.
            </p>
            <p className="mt-1 text-xs text-muted">
              Click &quot;Run BERR Re-evaluation&quot; to evaluate persisted Bilateral Evidence Graph records.
            </p>
          </div>
        )}
      </div>

      {/* D & E: Recommended Next Actions, Policy-Safe Remedy Readiness & Quality Review */}
      {liveAssessment && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recommended Next Actions */}
          <div className="rg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-[var(--ai)]" />
                Recommended Next Investigation Actions
              </h3>
              <span className="font-mono text-[10px] text-muted">
                {liveAssessment.recommendedNextActions.length} action(s)
              </span>
            </div>
            <div className="space-y-2">
              {liveAssessment.recommendedNextActions.map((act, idx) => (
                <div
                  key={act.id || `${act.action}_${idx}`}
                  className="rounded-lg border border-line bg-surface-2 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-fg">{act.action}</span>
                    <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-subtle">
                      Target: {act.targetParty}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{act.reason}</p>
                </div>
              ))}
            </div>

            {/* Assessment-level Human Actions */}
            <div className="border-t border-line pt-3 flex flex-wrap items-center gap-2">
              <select
                value={overrideAction}
                onChange={(e) => setOverrideAction(e.target.value as BerrNextActionType)}
                className="h-8 rounded border border-line bg-surface-2 px-2 text-xs text-fg"
              >
                <option value="ROUTE_TO_HUMAN_REVIEW">ROUTE_TO_HUMAN_REVIEW</option>
                <option value="REQUEST_ADDITIONAL_SELLER_EVIDENCE">REQUEST_ADDITIONAL_SELLER_EVIDENCE</option>
                <option value="REQUEST_ADDITIONAL_BUYER_EVIDENCE">REQUEST_ADDITIONAL_BUYER_EVIDENCE</option>
                <option value="START_REINVESTIGATION">START_REINVESTIGATION</option>
                <option value="PROCEED_TO_POLICY_EVALUATION">PROCEED_TO_POLICY_EVALUATION</option>
                <option value="ESCALATE_CASE">ESCALATE_CASE</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={submittingReview}
                onClick={() =>
                  handleReviewAction({
                    action: "CHANGE_NEXT_ACTION",
                    newNextAction: overrideAction,
                    reasonText: reviewReason || `Investigator selected next action ${overrideAction}`,
                  })
                }
              >
                Add Action Override
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={submittingReview}
                onClick={() =>
                  handleReviewAction({
                    action: "ESCALATE_CASE",
                    reasonText: reviewReason || "Escalated by Resolution Manager from BERR assessment.",
                  })
                }
              >
                Escalate Case
              </Button>
            </div>
          </div>

          {/* Remedy Readiness & Layer 4 Quality Review */}
          <div className="rg-card p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-[var(--agreed)]" />
              Policy Readiness & BERR Quality Gate
            </h3>

            <div className="rounded-lg border border-line bg-surface-2 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted">Remedy Status:</span>
                <span className="font-mono font-semibold text-fg">
                  {liveAssessment.recommendedRemedyDetail.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Customer Request / BERR Suggestion:</span>
                <span className="font-medium text-fg">
                  {liveAssessment.recommendedRemedyDetail.customerRequestedRemedy || "N/A"} /{" "}
                  {liveAssessment.recommendedRemedyDetail.remedy || "NOT READY"}
                </span>
              </div>
              <p className="text-[11px] text-subtle">
                {liveAssessment.recommendedRemedyDetail.reason}
              </p>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted">
                  Autonomous Money Movement: DISABLED (Human Approval Required)
                </span>
                {onOpenResolution && (
                  <Button variant="secondary" size="sm" onClick={onOpenResolution}>
                    Open Resolution Engine
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-fg">
                Layer 4 Quality Review Checks ({liveAssessment.qualityReview.checks.length})
              </span>
              {liveAssessment.qualityReview.checks.map((chk) => (
                <div
                  key={chk.check}
                  className="flex items-start justify-between gap-2 rounded border border-line px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-mono text-subtle">{chk.check}</span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      chk.passed ? "text-emerald-600" : "text-rose-600"
                    )}
                  >
                    {chk.passed ? "PASS" : "FLAGGED"}
                  </span>
                </div>
              ))}
            </div>

            {reviewActions.length > 0 && (
              <div className="border-t border-line pt-2 space-y-1">
                <span className="text-[11px] font-semibold text-fg">Recent Human Review Log</span>
                {reviewActions.slice(0, 4).map((ra) => (
                  <p key={ra.id} className="text-[11px] text-subtle">
                    <strong className="text-fg">{ra.actorName}</strong>: {ra.action} — {ra.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side Finding Inspection & Human Override SlideOver */}
      <SlideOver
        open={selectedRow !== null}
        onClose={() => {
          setSelectedRow(null);
          setZoomLevel(1);
        }}
        title={selectedRow ? `${selectedRow.findingId || "Finding"}: ${selectedRow.attribute}` : "Evidence Comparison"}
        description="Inspect supporting source records and apply human investigator review while preserving original AI assessment."
        width="wide"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                icon={<ZoomOut className="h-3.5 w-3.5" />}
              >
                Zoom Out
              </Button>
              <span className="font-mono text-xs text-muted">{(zoomLevel * 100).toFixed(0)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                icon={<ZoomIn className="h-3.5 w-3.5" />}
              >
                Zoom In
              </Button>
            </div>
            <Button variant="primary" size="sm" onClick={() => setSelectedRow(null)}>
              Done Viewing
            </Button>
          </div>
        }
      >
        {selectedRow && (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-subtle">Claim Under Evaluation</span>
                <p className="font-bold text-fg text-sm">{selectedRow.attribute}</p>
                {selectedRow.originalAiClassification && (
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    Original AI Classification: {selectedRow.originalAiClassification}
                  </p>
                )}
              </div>
              <Chip
                variant={
                  selectedRow.state === "AGREED"
                    ? "agreed"
                    : selectedRow.state === "CONTESTED"
                    ? "contested"
                    : selectedRow.state === "VERIFIED"
                    ? "verified"
                    : "missing"
                }
              >
                {selectedRow.state}
              </Chip>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-line p-3 bg-surface-2/40">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-[12px] text-[var(--buyer)]">
                    Buyer Evidence ({selectedRow.buyerSourceId || "Claim / None"})
                  </span>
                </div>
                <div
                  className="mt-3 rounded border border-dashed border-line bg-surface p-4 text-center"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                >
                  <Camera className="h-6 w-6 mx-auto text-[var(--buyer)] mb-2" />
                  <p className="text-xs font-medium text-fg">{selectedRow.buyerEvidence}</p>
                </div>
              </div>

              <div className="rounded-lg border border-line p-3 bg-surface-2/40">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-semibold text-[12px] text-[var(--merchant)]">
                    Seller / Verification Record ({selectedRow.merchantSourceId || "Ledger / None"})
                  </span>
                </div>
                <div
                  className="mt-3 rounded border border-dashed border-line bg-surface p-4 text-center"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                >
                  <FileText className="h-6 w-6 mx-auto text-[var(--merchant)] mb-2" />
                  <p className="text-xs font-medium text-fg">{selectedRow.merchantEvidence}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-[var(--ai)] bg-[var(--ai)]/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--ai)]">
                <Sparkles className="h-4 w-4" />
                <span>Grounded Explanation</span>
              </div>
              <p className="mt-2 text-xs text-fg leading-relaxed">{selectedRow.explanation}</p>
            </div>

            {/* Human Review Override Controls inside SlideOver */}
            {liveAssessment?.assessmentId && selectedRow.dbId && (
              <div className="rounded-lg border border-line p-4 space-y-3">
                <h4 className="text-xs font-bold text-fg">Human Investigator Finding Review</h4>
                <textarea
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="Enter investigator rationale for accepting, rejecting, or correcting classification..."
                  className="w-full rounded-md border border-line bg-surface-2 p-2 text-xs text-fg focus:border-fg focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={submittingReview}
                    onClick={() =>
                      handleReviewAction({
                        action: "ACCEPT_FINDING",
                        findingId: selectedRow.dbId,
                      })
                    }
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Accept Finding
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={submittingReview}
                    onClick={() =>
                      handleReviewAction({
                        action: "REJECT_FINDING",
                        findingId: selectedRow.dbId,
                      })
                    }
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Reject Finding
                  </Button>
                  <select
                    value={correctedClass}
                    onChange={(e) => setCorrectedClass(e.target.value as FactClassification)}
                    className="h-8 rounded border border-line bg-surface-2 px-2 text-xs text-fg"
                  >
                    <option value="AGREED">AGREED</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="CONTESTED">CONTESTED</option>
                    <option value="MISSING">MISSING</option>
                  </select>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={submittingReview}
                    onClick={() =>
                      handleReviewAction({
                        action: "CORRECT_CLASSIFICATION",
                        findingId: selectedRow.dbId,
                        correctedClassification: correctedClass,
                      })
                    }
                  >
                    Correct Classification
                  </Button>
                </div>
                {reviewFeedback && (
                  <p className="text-xs font-medium text-emerald-600">{reviewFeedback}</p>
                )}
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  );
}
