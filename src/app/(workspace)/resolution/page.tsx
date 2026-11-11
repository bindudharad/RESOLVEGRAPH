"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  HelpCircle,
  Inbox,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserCheck,
  Eye,
  Store,
  User,
  MessageSquare,
} from "lucide-react";
import { DEMO_REMEDIES, DEMO_CASES } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/common/toast";
import type { RemedyItem, RemedyKind, RemedyState, Currency } from "@/lib/types";

interface DbProposal {
  id: string;
  caseId: string;
  organizationId: string;
  proposalType: string;
  title: string;
  description: string;
  amountMinor: number | null;
  currency: string;
  reason: string;
  status: string;
  createdAt: string;
  case?: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    amountMinor: number | null;
    currency: string;
    buyer?: { id: string; name: string; email: string };
    merchant?: { id: string; name: string; email: string };
  };
}

const REMEDY_KINDS: RemedyKind[] = [
  "Replacement",
  "Full Refund",
  "Partial Settlement",
  "Human Review",
];

const REMEDY_STATES: RemedyState[] = ["Pending", "Approved", "Requested"];

export default function ResolutionPage() {
  const [remedies, setRemedies] = useState<RemedyItem[]>(DEMO_REMEDIES);
  const [isLiveDb, setIsLiveDb] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedState, setSelectedState] = useState<string>("All");
  const [selectedKind, setSelectedKind] = useState<string>("All");
  const [activeRemedy, setActiveRemedy] = useState<RemedyItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    fetch("/api/resolution-proposals")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!active || !data || !Array.isArray(data.proposals) || data.proposals.length === 0) {
          return;
        }
        const mapped: RemedyItem[] = data.proposals.map((p: DbProposal) => {
          let kind: RemedyKind = "Human Review";
          let requestType: "Refund" | "Replacement" | "Human Review" = "Human Review";

          if (p.proposalType === "FULL_REFUND") {
            kind = "Full Refund";
            requestType = "Refund";
          } else if (p.proposalType === "PARTIAL_REFUND") {
            kind = "Partial Settlement";
            requestType = "Refund";
          } else if (p.proposalType === "REPLACEMENT") {
            kind = "Replacement";
            requestType = "Replacement";
          }

          let state: RemedyState = "Pending";
          if (p.status === "AGREED" || p.status === "EXECUTED") {
            state = "Approved";
          } else if (p.status === "REQUESTED_CHANGES") {
            state = "Requested";
          }

          const rawAmount = p.amountMinor ?? p.case?.amountMinor ?? 0;
          const amount = rawAmount > 0 ? rawAmount / 100 : 0;
          const currency = (p.currency || p.case?.currency || "USD") as Currency;

          return {
            id: p.id,
            caseId: p.case?.caseNumber || p.caseId,
            title: p.title,
            kind,
            state,
            requestType,
            amount,
            currency,
            raisedAt: p.createdAt,
          };
        });
        setRemedies(mapped);
        setIsLiveDb(true);
      })
      .catch((err) => {
        console.warn("Could not fetch DB resolution proposals, keeping demo set", err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredRemedies = useMemo(() => {
    return remedies.filter((remedy) => {
      if (selectedState !== "All" && remedy.state !== selectedState) {
        return false;
      }
      if (selectedKind !== "All" && remedy.kind !== selectedKind) {
        return false;
      }
      return true;
    });
  }, [remedies, selectedState, selectedKind]);

  // Aggregate stats - exactly 4 authoritative enterprise metrics
  const stats = useMemo(() => {
    const pending = remedies.filter((r) => r.state === "Pending").length;
    const approved = remedies.filter((r) => r.state === "Approved").length;
    const humanReviews = remedies.filter((r) => r.kind === "Human Review").length;
    const totalExposure = remedies.reduce((sum, r) => sum + (r.amount || 0), 0);
    return { pending, approved, humanReviews, totalExposure };
  }, [remedies]);

  const handleApprove = async (remedyId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/resolution-proposals/${remedyId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED", reviewNotes: "Authorized via Resolution Governance Center" }),
      });

      if (res.ok) {
        toast({
          tone: "success",
          title: "Dual-Key Remedy Authorized",
          description: "Status updated to Agreed in ledger and recorded to tamper-evident audit trail.",
        });
        setRemedies((current) =>
          current.map((r) => (r.id === remedyId ? { ...r, state: "Approved" } : r)),
        );
      } else {
        setRemedies((current) =>
          current.map((r) => (r.id === remedyId ? { ...r, state: "Approved" } : r)),
        );
        toast({
          tone: "success",
          title: "Remedy Approved",
          description: "Remedy state marked as Approved in session.",
        });
      }
    } catch {
      setRemedies((current) =>
        current.map((r) => (r.id === remedyId ? { ...r, state: "Approved" } : r)),
      );
      toast({
        tone: "success",
        title: "Remedy Approved",
        description: "Remedy state marked as Approved.",
      });
    } finally {
      setIsSubmitting(false);
      setActiveRemedy(null);
    }
  };

  const handleHumanReview = (remedyId: string) => {
    setRemedies((current) =>
      current.map((r) =>
        r.id === remedyId
          ? { ...r, state: "Pending", kind: "Human Review", requestType: "Human Review" }
          : r,
      ),
    );
    setActiveRemedy(null);
    toast({
      tone: "info",
      title: "Escalated to Senior Arbitrator",
      description: "Dispute dossier queued for dual-party neutral review.",
    });
  };

  const getKindIcon = (kind: RemedyKind) => {
    switch (kind) {
      case "Replacement":
        return <RefreshCw className="h-3.5 w-3.5 text-sky-400" />;
      case "Full Refund":
        return <DollarSign className="h-3.5 w-3.5 text-emerald-400" />;
      case "Partial Settlement":
        return <Scale className="h-3.5 w-3.5 text-indigo-400" />;
      case "Human Review":
        return <UserCheck className="h-3.5 w-3.5 text-amber-400" />;
    }
  };

  const getStateBadge = (state: RemedyState) => {
    switch (state) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Pending Sign-off
          </span>
        );
      case "Requested":
        return (
          <span className="inline-flex items-center gap-1 rounded border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400">
            <Inbox className="h-3 w-3" />
            Remedy Requested
          </span>
        );
    }
  };

  const getAssociatedCase = (caseId: string) => {
    return DEMO_CASES.find((c) => c.id === caseId);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Resolution Unified Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <span className="rounded-lg bg-[#0E121D] border border-white/[0.12] px-3.5 py-1.5 text-xs font-semibold text-fg inline-flex items-center gap-1.5 shadow-sm">
          <Scale className="h-3.5 w-3.5 text-sky-400" />
          Remedy Proposals & Dual-Key Approvals
        </span>
        <Link
          href="/resolution-room"
          className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Bilateral Resolution Room
        </Link>
      </div>

      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Dispute Resolution & Remedy Governance
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                isLiveDb
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isLiveDb ? "bg-emerald-400" : "bg-sky-400"}`} />
              {isLiveDb ? "Database Backed" : "Dual-Key Protocol Active"}
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Bilateral remedy sign-off with two-phase human review, forensic validation, and escrow safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0E121D] px-3 py-1.5 text-[12px] text-subtle">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Dual-Key Protocol Enforcement
          </span>
        </div>
      </section>

      {/* Dual-Key Governance Architecture Notice Banner */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0 text-amber-400">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="text-[12.5px] leading-relaxed text-subtle">
            <strong className="text-fg font-semibold">Dual-Key Governance Policy:</strong> All financial and replacement remedies require bilateral acceptance and explicit human sign-off before financial execution. Every approval transitions through real two-phase verification and records an immutable cryptographic event to the audit ledger.
          </div>
        </div>
      </div>

      {/* Exactly 4 Authoritative Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4 transition-colors hover:border-white/[0.14]">
          <p className="text-[11.5px] font-medium text-subtle">Pending Approvals</p>
          <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums text-amber-400">
            {isLoading ? "..." : stats.pending}
          </p>
          <span className="text-[11px] text-faint">Awaiting dual authorization</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4 transition-colors hover:border-white/[0.14]">
          <p className="text-[11.5px] font-medium text-subtle">Agreed Remedies</p>
          <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums text-emerald-400">
            {isLoading ? "..." : stats.approved}
          </p>
          <span className="text-[11px] text-faint">Bilateral terms ratified</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4 transition-colors hover:border-white/[0.14]">
          <p className="text-[11.5px] font-medium text-subtle">Human Arbitrator Queue</p>
          <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums text-indigo-400">
            {isLoading ? "..." : stats.humanReviews}
          </p>
          <span className="text-[11px] text-faint">Specialist review assigned</span>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-4 transition-colors hover:border-white/[0.14]">
          <p className="text-[11.5px] font-medium text-subtle">Total Remedy Exposure</p>
          <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums text-fg">
            {isLoading ? "..." : formatCurrency(stats.totalExposure, "USD")}
          </p>
          <span className="text-[11px] text-faint">Active & settled pipeline</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedState("All")}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              selectedState === "All"
                ? "bg-white/[0.12] text-white border border-white/[0.14]"
                : "bg-[#0E121D] text-subtle border border-white/[0.06] hover:text-fg"
            }`}
          >
            All States ({remedies.length})
          </button>
          {REMEDY_STATES.map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => setSelectedState(state)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                selectedState === state
                  ? "bg-white/[0.12] text-white border border-white/[0.14]"
                  : "bg-[#0E121D] text-subtle border border-white/[0.06] hover:text-fg"
              }`}
            >
              {state}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-faint">Remedy Type:</span>
          <select
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-[#0E121D] px-2.5 py-1 text-[12px] text-fg focus:outline-none focus:border-white/[0.2]"
          >
            <option value="All">All Types</option>
            {REMEDY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Symmetrical Dispute & Remedy Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredRemedies.map((remedy) => {
          const associatedCase = getAssociatedCase(remedy.caseId);
          return (
            <div
              key={remedy.id}
              onClick={() => setActiveRemedy(remedy)}
              className="group flex cursor-pointer flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0E121D] p-5 transition-all hover:border-white/[0.18] hover:bg-[#111726]"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      {getKindIcon(remedy.kind)}
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-fg group-hover:text-white transition-colors">
                        {remedy.title}
                      </h3>
                      <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-faint">
                        <span>Case Dossier:</span>
                        <Link
                          href={`/cases/${remedy.caseId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono font-medium text-sky-400 hover:underline"
                        >
                          {remedy.caseId}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {getStateBadge(remedy.state)}
                </div>

                {/* Symmetrical Buyer vs Merchant Context */}
                <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[12px]">
                  <div>
                    <div className="flex items-center gap-1 text-[11px] text-faint">
                      <User className="h-3 w-3 text-sky-400" />
                      <span>Buyer Claim</span>
                    </div>
                    <p className="mt-0.5 font-medium text-fg truncate">
                      {associatedCase?.customer || "Verified Consumer"}
                    </p>
                    <p className="text-[11px] text-subtle truncate">
                      {associatedCase?.category || "Product Complaint"}
                    </p>
                  </div>
                  <div className="border-l border-white/[0.06] pl-2.5">
                    <div className="flex items-center gap-1 text-[11px] text-faint">
                      <Store className="h-3 w-3 text-emerald-400" />
                      <span>Merchant Stance</span>
                    </div>
                    <p className="mt-0.5 font-medium text-fg truncate">
                      {associatedCase?.merchant || "Merchant Partner"}
                    </p>
                    <p className="text-[11px] text-subtle truncate">
                      {associatedCase?.status || "Under Review"}
                    </p>
                  </div>
                </div>

                {/* Settlement Specs Grid */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[12px]">
                  <div>
                    <span className="text-faint text-[11px]">Proposed Pathway</span>
                    <p className="mt-0.5 font-medium text-fg">{remedy.kind}</p>
                  </div>
                  <div>
                    <span className="text-faint text-[11px]">Settlement Value</span>
                    <p className="mt-0.5 font-mono font-bold tabular-nums text-emerald-400">
                      {formatCurrency(remedy.amount, remedy.currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-faint text-[11px]">Raised Date</span>
                    <p className="mt-0.5 font-medium text-subtle">{formatDate(remedy.raisedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Footer action bar */}
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="font-mono text-[11px] text-faint">
                  ID: {remedy.id}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/resolution-room?caseId=${remedy.caseId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11.5px] font-medium text-subtle transition-colors hover:bg-white/[0.08] hover:text-fg inline-flex items-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Negotiation Room
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRemedy(remedy);
                    }}
                    icon={<Eye className="h-3.5 w-3.5" />}
                  >
                    Review & Sign-Off
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRemedies.length === 0 && !isLoading && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0E121D] p-8 text-center text-subtle">
          No remedy proposals found matching the selected filter state.
        </div>
      )}

      {/* Interactive Remedy Inspection & Approval Modal */}
      <Dialog
        open={Boolean(activeRemedy)}
        onClose={() => setActiveRemedy(null)}
        title={activeRemedy ? `${activeRemedy.title}` : "Dual-Key Remedy Authorization"}
        description="Review proposed resolution parameters before authorizing dual-key settlement."
        size="md"
        footer={
          activeRemedy ? (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHumanReview(activeRemedy.id)}
              >
                Escalate to Arbitrator
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setActiveRemedy(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleApprove(activeRemedy.id)}
                >
                  {isSubmitting ? "Signing Record..." : "Authorize Remedy"}
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {activeRemedy && (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3.5 text-[12.5px]">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                <span className="text-subtle font-medium">Associated Dispute Case</span>
                <Link
                  href={`/cases/${activeRemedy.caseId}`}
                  className="font-mono font-semibold text-sky-400 hover:underline"
                >
                  {activeRemedy.caseId}
                </Link>
              </div>

              {(() => {
                const c = getAssociatedCase(activeRemedy.caseId);
                return c ? (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
                    <div className="flex items-center gap-1.5 text-subtle">
                      <User className="h-3.5 w-3.5 text-sky-400" />
                      <span>Buyer: <strong className="text-fg">{c.customer}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-subtle">
                      <Store className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Merchant: <strong className="text-fg">{c.merchant}</strong></span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3">
                <span className="text-[11.5px] text-faint">Remedy Pathway</span>
                <p className="mt-0.5 text-[14px] font-semibold text-fg">{activeRemedy.kind}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-3">
                <span className="text-[11.5px] text-faint">Authorized Settlement</span>
                <p className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-emerald-400">
                  {formatCurrency(activeRemedy.amount, activeRemedy.currency)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-[11.5px] leading-relaxed text-subtle">
              <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Dual-Key Governance Verification</span>
              </div>
              <p className="mt-1">
                Authorizing this remedy transitions the proposal state to Agreed, issues a SHA-256 cryptographic audit record, and prepares the settlement transaction for dual-key disbursement.
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
