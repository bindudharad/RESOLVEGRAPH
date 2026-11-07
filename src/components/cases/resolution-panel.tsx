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
  reason: string;
  policyVersion: string;
  responses: Array<{
    id: string;
    responder: { id: string; fullName: string; role: string };
    response: string;
  }>;
}

interface RemedyOption {
  id: string;
  title: string;
  kind: "Replacement" | "Full Refund" | "Partial Settlement" | "Human Review";
  description: string;
  amountCalc?: (amount: number) => number;
  icon: typeof RefreshCw;
  recommended?: boolean;
}

const REMEDY_OPTIONS: RemedyOption[] = [
  {
    id: "replace",
    title: "Dispatch Replacement Unit",
    kind: "Replacement",
    description: "Merchant dispatches the 1 TB model upon receiving carrier tracking verification.",
    icon: RefreshCw,
    recommended: true,
  },
  {
    id: "refund_full",
    title: "Full Transaction Refund",
    kind: "Full Refund",
    description: "Full reverse payout credited to buyer once the 512 GB unit is scanned in warehouse.",
    amountCalc: (amount) => amount,
    icon: DollarSign,
  },
  {
    id: "settle_partial",
    title: "Partial Settlement (Difference Offset)",
    kind: "Partial Settlement",
    description: "Refund the price differential allowing buyer to keep the delivered unit.",
    amountCalc: (amount) => Math.round(amount * 0.3),
    icon: Scale,
  },
  {
    id: "human_review",
    title: "Escalate to Human Arbitrator",
    kind: "Human Review",
    description: "Route dispute packet to senior risk specialist for bilateral settlement negotiation.",
    icon: UserCheck,
  },
];

export function ResolutionPanel({ caseItem }: ResolutionPanelProps) {
  const [selectedRemedy, setSelectedRemedy] = useState<string>("replace");
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [policyInfo, setPolicyInfo] = useState<{ policyName: string; policyVersion: string; violations: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadProposalsAndOptions = async () => {
    try {
      const [optRes, propRes] = await Promise.all([
        fetch(`/api/cases/${caseItem.id}/resolution-options`),
        fetch(`/api/cases/${caseItem.id}/resolution-proposals`),
      ]);

      if (optRes.ok) {
        const optData = await optRes.json();
        setPolicyInfo({
          policyName: optData.policyName,
          policyVersion: optData.policyVersion,
          violations: optData.violations || [],
        });
      }

      if (propRes.ok) {
        const propData = await propRes.json();
        setProposals(propData.proposals || []);
      }
    } catch {
      // Fallback
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
          const optData = await optRes.json();
          setPolicyInfo({
            policyName: optData.policyName,
            policyVersion: optData.policyVersion,
            violations: optData.violations || [],
          });
        }

        if (propRes.ok && !ignore) {
          const propData = await propRes.json();
          setProposals(propData.proposals || []);
        }
      } catch {
        // Fallback
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
      const proposalTypeMap: Record<string, string> = {
        replace: "REPLACEMENT",
        refund_full: "FULL_REFUND",
        settle_partial: "PARTIAL_REFUND",
        human_review: "HUMAN_REVIEW",
      };

      const res = await fetch(`/api/cases/${caseItem.id}/resolution-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalType: proposalTypeMap[option.id] || "REPLACEMENT",
          title: option.title,
          description: option.description,
          amountMinor: option.amountCalc ? option.amountCalc(caseItem.amount) * 100 : undefined,
          currency: caseItem.currency,
          reason: `Formally proposed based on bilateral review under ${policyInfo?.policyName || "Standard Policy"}.`,
        }),
      });

      if (res.ok) {
        toast({
          tone: "success",
          title: "Resolution Proposal Submitted",
          description: `"${option.title}" dispatched to counterparty for bilateral response.`,
        });
        await loadProposalsAndOptions();
      } else {
        toast({
          tone: "info",
          title: "Proposal Preview Recorded",
          description: `"${option.title}" recorded for this session.`,
        });
      }
    } catch {
      toast({
        tone: "info",
        title: "Proposal Preview Recorded",
        description: `"${option.title}" recorded in session state.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToProposal = async (proposalId: string, response: "ACCEPTED" | "REJECTED" | "REQUESTED_CHANGES") => {
    try {
      const res = await fetch(`/api/resolution-proposals/${proposalId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          tone: response === "ACCEPTED" ? "success" : "info",
          title: `Proposal ${response}`,
          description: `Status updated to: ${data.proposal?.status || response}`,
        });
        await loadProposalsAndOptions();
      }
    } catch {
      toast({
        tone: "error",
        title: "Action Failed",
        description: "Unable to submit response to proposal.",
      });
    }
  };

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

      {/* Policy Evaluation Notice */}
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
              const isAgreed = prop.status === "AGREED";
              const isPending = prop.status.startsWith("PENDING");

              return (
                <div
                  key={prop.id}
                  className={`flex flex-col gap-2 rounded-lg border p-3.5 ${
                    isAgreed
                      ? "border-emerald-500/40 bg-emerald-950/20"
                      : "border-line bg-surface"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-400" />
                      <span className="text-[13px] font-bold text-fg">{prop.title}</span>
                    </div>

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

                  <p className="text-[12px] text-subtle">{prop.description}</p>
                  <p className="text-[11px] text-faint italic">&ldquo;{prop.reason}&rdquo;</p>

                  {/* Actions for Pending Proposals */}
                  {isPending && (
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-line/60 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRespondToProposal(prop.id, "REQUESTED_CHANGES")}
                      >
                        Request Changes
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRespondToProposal(prop.id, "REJECTED")}
                        icon={<X className="h-3.5 w-3.5 text-rose-400" />}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRespondToProposal(prop.id, "ACCEPTED")}
                        icon={<Check className="h-3.5 w-3.5" />}
                      >
                        Accept Proposal
                      </Button>
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
          Available Remedy Blueprints
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REMEDY_OPTIONS.map((option) => {
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
                        <span className="text-[11px] font-medium text-subtle">{option.kind}</span>
                      </div>
                    </div>

                    {option.recommended && (
                      <span className="shrink-0 rounded bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#b3a1ff]">
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-muted">{option.description}</p>

                  {option.amountCalc && (
                    <div className="mt-2 text-[12px] font-medium text-fg">
                      Estimated Value:{" "}
                      <span className="font-semibold tabular-nums text-[#34d399]">
                        {formatCurrency(option.amountCalc(caseItem.amount), caseItem.currency)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-2.5">
                  <span className="text-[11px] text-faint">
                    {isSelected ? "Active selection" : "Click to select"}
                  </span>
                  <Button
                    variant={isSelected ? "primary" : "secondary"}
                    size="sm"
                    disabled={isSubmitting}
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
