"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  HelpCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Send,
  Check,
  X,
  FileText,
} from "lucide-react";
import type { ResolutionCase } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";

interface ResolutionPanelProps {
  caseItem: ResolutionCase;
}

interface ProposalItem {
  id: string;
  proposalType: string;
  title: string;
  description: string;
  amountMinor?: number;
  currency: string;
  status: string;
  authorizationStatus?: string;
  denialReason?: string | null;
  basedOnAssessmentId?: string | null;
  reason: string;
  policyVersion: string;
  responses: Array<{
    id: string;
    responder: { id: string; fullName: string; role: string };
    response: string;
  }>;
  refunds?: Array<{
    id: string;
    status: string;
    amountMinor: number;
    currency: string;
    paypalRefundId?: string | null;
  }>;
  replacementFulfillment?: {
    id: string;
    status: string;
    carrierName?: string | null;
    trackingNumber?: string | null;
  } | null;
}

interface CandidateOptionApi {
  proposalType: string;
  title: string;
  description: string;
  suggestedAmountMinor?: number;
  isEligible: boolean;
  requiresEscalation: boolean;
  reason: string;
}

interface PolicyEvalView {
  policyName: string;
  policyVersion: string;
  violations: string[];
  candidateOptions: CandidateOptionApi[];
  recommendedOption?: CandidateOptionApi;
  berrSummary?: {
    assessmentId: string | null;
    version: number | null;
    overallStatus: string | null;
    status: string | null;
    isStale: boolean;
    hasUnresolvedConflicts: boolean;
    hasMissingEvidence: boolean;
    buyerEvidenceBlocked: boolean;
    sellerEvidenceMissing: boolean;
  };
  activeRefund?: {
    hasCompletedFullRefund: boolean;
    hasActivePendingRefund: boolean;
    totalRefundedMinor: number;
  };
}

interface RemedyOption {
  id: string;
  proposalType: string;
  title: string;
  kind: "Replacement" | "Full Refund" | "Partial Settlement" | "Human Review" | "Information Request";
  description: string;
  amountMinor?: number;
  icon: typeof RefreshCw;
  recommended?: boolean;
  isEligible: boolean;
  requiresEscalation: boolean;
  reason?: string;
}

const OPTION_META: Record<
  string,
  { id: string; kind: RemedyOption["kind"]; icon: typeof RefreshCw }
> = {
  REPLACEMENT: { id: "replace", kind: "Replacement", icon: RefreshCw },
  FULL_REFUND: { id: "refund_full", kind: "Full Refund", icon: DollarSign },
  PARTIAL_REFUND: { id: "settle_partial", kind: "Partial Settlement", icon: Scale },
  RETURN_AND_REFUND: { id: "return_refund", kind: "Full Refund", icon: DollarSign },
  HUMAN_REVIEW: { id: "human_review", kind: "Human Review", icon: UserCheck },
  INFORMATION_REQUEST: { id: "info_request", kind: "Information Request", icon: HelpCircle },
};

export function ResolutionPanel({ caseItem }: ResolutionPanelProps) {
  const [selectedRemedy, setSelectedRemedy] = useState<string>("refund_full");
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [policyInfo, setPolicyInfo] = useState<PolicyEvalView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const applyPolicyData = (optData: PolicyEvalView) => {
    setPolicyInfo({
      policyName: optData.policyName,
      policyVersion: optData.policyVersion,
      violations: optData.violations || [],
      candidateOptions: optData.candidateOptions || [],
      recommendedOption: optData.recommendedOption,
      berrSummary: optData.berrSummary,
      activeRefund: optData.activeRefund,
    });
    if (optData.recommendedOption?.proposalType) {
      const meta = OPTION_META[optData.recommendedOption.proposalType];
      if (meta) setSelectedRemedy(meta.id);
    }
  };

  const loadProposalsAndOptions = async () => {
    try {
      setLoadError(null);
      const [optRes, propRes] = await Promise.all([
        fetch(`/api/cases/${caseItem.id}/resolution-options`),
        fetch(`/api/cases/${caseItem.id}/resolution-proposals`),
      ]);

      if (optRes.ok) {
        const optData = (await optRes.json()) as PolicyEvalView;
        applyPolicyData(optData);
      } else {
        const err = await optRes.json().catch(() => ({}));
        setLoadError(err.error || "Unable to evaluate resolution policy options.");
      }

      if (propRes.ok) {
        const propData = await propRes.json();
        setProposals(propData.proposals || []);
      }
    } catch {
      setLoadError("Network error while loading policy options and proposals.");
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [optRes, propRes] = await Promise.all([
          fetch(`/api/cases/${caseItem.id}/resolution-options`),
          fetch(`/api/cases/${caseItem.id}/resolution-proposals`),
        ]);

        if (optRes.ok && !ignore) {
          const optData = (await optRes.json()) as PolicyEvalView;
          applyPolicyData(optData);
        } else if (!ignore) {
          const err = await optRes.json().catch(() => ({}));
          setLoadError(err.error || "Unable to evaluate resolution policy options.");
        }

        if (propRes.ok && !ignore) {
          const propData = await propRes.json();
          setProposals(propData.proposals || []);
        }
      } catch {
        if (!ignore) {
          setLoadError("Network error while loading policy options and proposals.");
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [caseItem.id]);

  const handleProposeRemedy = async (option: RemedyOption) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseItem.id}/resolution-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalType: option.proposalType,
          title: option.title,
          description: option.description,
          amountMinor: option.amountMinor,
          currency: caseItem.currency,
          reason:
            option.reason ||
            `Formally proposed based on BERR and policy review under ${policyInfo?.policyName || "Standard Policy"}.`,
          basedOnAssessmentId: policyInfo?.berrSummary?.assessmentId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({
          tone: "success",
          title: "Resolution Proposal Submitted",
          description: `"${option.title}" persisted and awaiting review/authorization.`,
        });
        await loadProposalsAndOptions();
      } else {
        toast({
          tone: "error",
          title: "Proposal Rejected",
          description: data.error || "Server rejected this resolution proposal.",
        });
      }
    } catch {
      toast({
        tone: "error",
        title: "Submission Error",
        description: "Network failure while persisting resolution proposal.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToProposal = async (proposalId: string, response: "ACCEPTED" | "REJECTED" | "REQUESTED_CHANGES") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/resolution-proposals/${proposalId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({
          tone: response === "ACCEPTED" ? "success" : "info",
          title: `Proposal ${response}`,
          description: `Status updated to ${data.proposalStatus || data.proposal?.status || response} (Auth: ${data.authorizationStatus || "PENDING_APPROVAL"}).`,
        });
        await loadProposalsAndOptions();
      } else {
        toast({
          tone: "error",
          title: "Response Blocked",
          description: data.error || "Unable to submit response to proposal.",
        });
      }
    } catch {
      toast({
        tone: "error",
        title: "Action Failed",
        description: "Unable to submit response to proposal.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthorizeDecision = async (proposalId: string, decision: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/resolution-proposals/${proposalId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reviewNotes:
            decision === "APPROVED"
              ? "Authorized via Case Resolution Panel"
              : "Authorization denied via Case Resolution Panel",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({
          tone: decision === "APPROVED" ? "success" : "info",
          title: decision === "APPROVED" ? "Remedy Authorized" : "Authorization Denied",
          description: data.message || `Authorization status: ${data.proposal?.authorizationStatus}`,
        });
        await loadProposalsAndOptions();
      } else {
        toast({
          tone: "error",
          title: "Authorization Blocked",
          description: data.error || "Permission or policy precondition failed.",
        });
      }
    } catch {
      toast({
        tone: "error",
        title: "Authorization Error",
        description: "Network failure during authorization decision.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteAuthorized = async (proposalId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/resolution-proposals/${proposalId}/execute`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({
          tone: data.execution?.status === "FAILED" ? "error" : "success",
          title: `Execution ${data.execution?.status || "Triggered"}`,
          description: data.execution?.error || "Authorized remedy execution initiated and tracked.",
        });
        await loadProposalsAndOptions();
      } else {
        toast({
          tone: "error",
          title: "Execution Blocked",
          description: data.error || data.execution?.error || "Unable to execute proposal.",
        });
      }
    } catch {
      toast({
        tone: "error",
        title: "Execution Error",
        description: "Network failure while executing authorized proposal.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remedyOptions: RemedyOption[] = (policyInfo?.candidateOptions || []).map((opt) => {
    const meta = OPTION_META[opt.proposalType] || {
      id: opt.proposalType.toLowerCase(),
      kind: "Human Review" as const,
      icon: Scale,
    };
    return {
      id: meta.id,
      proposalType: opt.proposalType,
      title: opt.title,
      kind: meta.kind,
      description: opt.description,
      amountMinor: opt.suggestedAmountMinor,
      icon: meta.icon,
      recommended: policyInfo?.recommendedOption?.proposalType === opt.proposalType,
      isEligible: opt.isEligible,
      requiresEscalation: opt.requiresEscalation,
      reason: opt.reason,
    };
  });

  return (
    <div className="rg-card flex flex-col gap-5 p-5">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-fg">Resolution Intelligence & Bilateral Workflow</h3>
            <span className="rounded border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_12%,transparent)] px-2 py-0.5 text-[10.5px] font-semibold text-[#fcd34d]">
              Policy Grounded
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] text-subtle">
            Proposed pathways evaluated against {policyInfo?.policyName || "Standard Resolution Policy"} ({policyInfo?.policyVersion || "v1.0"}).
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-[#34d399]" />
          <span>Bilateral Agreement Enforced</span>
        </div>
      </div>

      {/* Policy & BERR Evaluation Notice */}
      {loadError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3.5 text-[12px] text-rose-300">
          {loadError}
        </div>
      )}

      {policyInfo?.berrSummary?.assessmentId && (
        <div className="rounded-lg border border-line bg-surface-2/80 p-3 text-[11.5px] text-subtle flex flex-wrap items-center justify-between gap-2">
          <div>
            BERR v{policyInfo.berrSummary.version ?? 1}:{" "}
            <strong className="text-fg">{policyInfo.berrSummary.overallStatus || policyInfo.berrSummary.status}</strong>
            {policyInfo.berrSummary.isStale ? " (Stale — Re-evaluation Required)" : ""}
          </div>
          {policyInfo.activeRefund?.hasActivePendingRefund && (
            <span className="text-amber-300 font-medium">Pending refund active on order</span>
          )}
          {policyInfo.activeRefund?.hasCompletedFullRefund && (
            <span className="text-emerald-400 font-medium">Full refund completed on order</span>
          )}
        </div>
      )}

      {policyInfo && policyInfo.violations.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-[12px] text-amber-300">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Policy Compliance Flags:</span>
          </div>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11.5px] text-amber-300/90">
            {policyInfo.violations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Formal Proposals (if any exist) */}
      {proposals.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-faint">
              Active Formal Bilateral Proposals ({proposals.length})
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {proposals.map((prop) => {
              const isAgreed = prop.status === "AGREED" || prop.status === "COMPLETED";
              const isPending = prop.status.startsWith("PENDING");
              const authStatus = prop.authorizationStatus || "PENDING_APPROVAL";
              const canAuthorize =
                authStatus === "PENDING_APPROVAL" && prop.status !== "REJECTED" && prop.status !== "CANCELLED";
              const canExecute =
                (authStatus === "AUTHORIZED" || authStatus === "EXECUTION_FAILED") &&
                ["FULL_REFUND", "PARTIAL_REFUND", "RETURN_AND_REFUND", "REPLACEMENT"].includes(prop.proposalType);

              return (
                <div
                  key={prop.id}
                  className={`flex flex-col gap-2 rounded-lg border p-3.5 ${
                    isAgreed
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : prop.status === "REJECTED"
                      ? "border-rose-500/30 bg-rose-950/15"
                      : "border-line bg-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-400" />
                      <span className="text-[13px] font-bold text-fg">{prop.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10.5px] font-medium text-subtle">
                        Auth: {authStatus}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isAgreed
                            ? "bg-emerald-500/20 text-emerald-400"
                            : prop.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {prop.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[12px] text-subtle">{prop.description}</p>
                  <p className="text-[11px] text-faint italic">&ldquo;{prop.reason}&rdquo;</p>
                  {prop.denialReason && (
                    <p className="text-[11.5px] text-rose-400">Denial reason: {prop.denialReason}</p>
                  )}
                  {prop.refunds && prop.refunds.length > 0 && (
                    <p className="text-[11px] text-sky-300">
                      Refund Execution: {prop.refunds[0].status} ({prop.refunds[0].currency} {(prop.refunds[0].amountMinor / 100).toFixed(2)})
                    </p>
                  )}
                  {prop.replacementFulfillment && (
                    <p className="text-[11px] text-sky-300">
                      Replacement Status: {prop.replacementFulfillment.status}
                      {prop.replacementFulfillment.trackingNumber ? ` • Tracking #${prop.replacementFulfillment.trackingNumber}` : ""}
                    </p>
                  )}

                  {/* Actions for Pending / Authorizable / Executable Proposals */}
                  {(isPending || canAuthorize || canExecute) && (
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-line/60 pt-2">
                      {isPending && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleRespondToProposal(prop.id, "REQUESTED_CHANGES")}
                          >
                            Request Changes
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleRespondToProposal(prop.id, "REJECTED")}
                            icon={<X className="h-3.5 w-3.5 text-rose-400" />}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleRespondToProposal(prop.id, "ACCEPTED")}
                            icon={<Check className="h-3.5 w-3.5" />}
                          >
                            Accept Proposal
                          </Button>
                        </>
                      )}
                      {canAuthorize && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleAuthorizeDecision(prop.id, "REJECTED")}
                          >
                            Deny Authorization
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleAuthorizeDecision(prop.id, "APPROVED")}
                          >
                            Authorize Remedy
                          </Button>
                        </>
                      )}
                      {canExecute && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isSubmitting}
                          onClick={() => handleExecuteAuthorized(prop.id)}
                        >
                          Execute Authorized Remedy
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidate Remedy Selector */}
      <div>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-faint mb-3">
          Policy-Evaluated Remedy Options
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {remedyOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRemedy === option.id;
            return (
              <div
                key={option.id}
                onClick={() => setSelectedRemedy(option.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedRemedy(option.id);
                  }
                }}
                tabIndex={0}
                role="radio"
                aria-checked={isSelected}
                className={`flex cursor-pointer flex-col justify-between rounded-lg border p-4 transition-all focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] ${
                  isSelected
                    ? "border-[var(--color-brand)] bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))]"
                    : "border-line bg-surface-2 hover:border-line-2"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-md ${
                          isSelected
                            ? "bg-[var(--color-brand-solid)] text-white"
                            : "border border-line bg-surface-3 text-subtle"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-[13px] font-semibold text-fg">{option.title}</h4>
                        <span className="text-[11px] font-medium text-subtle">
                          {option.kind} • {option.isEligible ? "Eligible" : "Ineligible / Guarded"}
                        </span>
                      </div>
                    </div>

                    {option.recommended && (
                      <span className="shrink-0 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-muted">{option.description}</p>
                  {option.reason && (
                    <p className="mt-1.5 text-[11px] text-faint">{option.reason}</p>
                  )}

                  {typeof option.amountMinor === "number" && option.amountMinor > 0 && (
                    <div className="mt-2 text-[12px] font-medium text-fg">
                      Estimated Value:{" "}
                      <span className="font-semibold tabular-nums text-[#34d399]">
                        {formatCurrency(option.amountMinor / 100, caseItem.currency)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2.5">
                  <span className="text-[11px] text-faint">
                    {option.isEligible ? "Policy eligible" : "Blocked / requires escalation"}
                  </span>
                  <Button
                    variant={isSelected ? "primary" : "secondary"}
                    size="sm"
                    disabled={isSubmitting || (!option.isEligible && option.proposalType !== "HUMAN_REVIEW" && option.proposalType !== "INFORMATION_REQUEST")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRemedy(option.id);
                      handleProposeRemedy(option);
                    }}
                    icon={<Send className="h-3 w-3" />}
                  >
                    Propose Remedy
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-[#040813] p-3.5 text-[11.5px] leading-relaxed text-faint">
        <div className="flex items-center gap-2 text-subtle font-medium">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Bilateral Execution Safety</span>
        </div>
        <p className="mt-1">
          Proposals require explicit acceptance by both Buyer and Merchant to reach AGREED status. ResolveGraph does not execute unilateral financial transfers or premature case closures without bilateral consensus.
        </p>
      </div>
    </div>
  );
}
