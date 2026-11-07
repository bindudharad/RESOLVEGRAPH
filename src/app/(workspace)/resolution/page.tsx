"use client";

import { useMemo, useState } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { DEMO_REMEDIES, DEMO_CASES } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/common/toast";
import type { RemedyItem, RemedyKind, RemedyState } from "@/lib/types";

const REMEDY_KINDS: RemedyKind[] = [
  "Replacement",
  "Full Refund",
  "Partial Settlement",
  "Human Review",
];

const REMEDY_STATES: RemedyState[] = ["Pending", "Approved", "Requested"];

export default function ResolutionPage() {
  const [remedies, setRemedies] = useState<RemedyItem[]>(DEMO_REMEDIES);
  const [selectedState, setSelectedState] = useState<string>("All");
  const [selectedKind, setSelectedKind] = useState<string>("All");
  const [activeRemedy, setActiveRemedy] = useState<RemedyItem | null>(null);
  const { toast } = useToast();

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

  // Aggregate stats
  const stats = useMemo(() => {
    const pending = remedies.filter((r) => r.state === "Pending").length;
    const approved = remedies.filter((r) => r.state === "Approved").length;
    const refunds = remedies.filter((r) => r.requestType === "Refund").length;
    const replacements = remedies.filter((r) => r.requestType === "Replacement").length;
    const humanReviews = remedies.filter((r) => r.requestType === "Human Review").length;
    return { pending, approved, refunds, replacements, humanReviews };
  }, [remedies]);

  const handleSimulateApprove = (remedyId: string) => {
    setRemedies((current) =>
      current.map((r) => (r.id === remedyId ? { ...r, state: "Approved" } : r)),
    );
    setActiveRemedy(null);
    toast({
      tone: "success",
      title: "Remedy Approved (Simulated)",
      description: "State moved to Approved in local demonstration session. No gateway payout executed.",
    });
  };

  const handleSimulateHumanReview = (remedyId: string) => {
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
      title: "Escalated to Human Review",
      description: "Dispute dossier queued for senior arbitrator assessment (Demo session).",
    });
  };

  const getKindIcon = (kind: RemedyKind) => {
    switch (kind) {
      case "Replacement":
        return <RefreshCw className="h-4 w-4 text-[#38bdf8]" />;
      case "Full Refund":
        return <DollarSign className="h-4 w-4 text-[#34d399]" />;
      case "Partial Settlement":
        return <Scale className="h-4 w-4 text-[#a08bff]" />;
      case "Human Review":
        return <UserCheck className="h-4 w-4 text-[#fbbf24]" />;
    }
  };

  const getStateBadge = (state: RemedyState) => {
    switch (state) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#6ee7b7]">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#fcd34d]">
            <Clock className="h-3 w-3" />
            Pending Approval
          </span>
        );
      case "Requested":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[color-mix(in_srgb,var(--color-info)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#7dd3fc]">
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
      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Resolution Center
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Coordination hub for dispute remedies, replacement authorizations and refund requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-[12px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-[#34d399]" />
            Remedy Engine v0.1 Preview
          </span>
        </div>
      </section>

      {/* Explicit Architecture Phase Banner */}
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)] p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b3a1ff]" />
          <div className="text-[12.5px] leading-relaxed text-muted">
            <strong className="text-fg font-semibold">Future Development Notice:</strong> The queues below display illustrative remedy proposals. Live payment gateway integrations (PayPal Orders, Disputes, and Refund APIs) and autonomous dispute settlement will be engineered in subsequent development phases.
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Pending Remedies</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#fbbf24]">{stats.pending}</p>
          <span className="text-[10.5px] text-faint">Awaiting review</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Approved Remedies</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#34d399]">{stats.approved}</p>
          <span className="text-[10.5px] text-faint">Agreed terms</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Refund Requests</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-fg">{stats.refunds}</p>
          <span className="text-[10.5px] text-faint">Payout pathway</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Replacement Requests</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-fg">{stats.replacements}</p>
          <span className="text-[10.5px] text-faint">Reship pathway</span>
        </div>

        <div className="rg-card p-4 col-span-2 sm:col-span-1">
          <p className="text-[11.5px] font-medium text-subtle">Human Review</p>
          <p className="mt-1 text-[22px] font-bold tabular-nums text-[#a08bff]">{stats.humanReviews}</p>
          <span className="text-[10.5px] text-faint">Specialist assigned</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedState("All")}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              selectedState === "All"
                ? "bg-[var(--color-brand-solid)] text-white"
                : "bg-surface-2 text-subtle hover:text-fg"
            }`}
          >
            All States ({remedies.length})
          </button>
          {REMEDY_STATES.map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => setSelectedState(state)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                selectedState === state
                  ? "bg-[var(--color-brand-solid)] text-white"
                  : "bg-surface-2 text-subtle hover:text-fg"
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
            className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[12px] text-fg focus:outline-none focus:border-[var(--color-brand)]"
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

      {/* Remedy Queue Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filteredRemedies.map((remedy) => (
          <div
            key={remedy.id}
            onClick={() => setActiveRemedy(remedy)}
            className="rg-card flex cursor-pointer flex-col justify-between p-5 transition-all hover:border-[var(--color-brand)] hover:bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand)_4%)]"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface-3">
                    {getKindIcon(remedy.kind)}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-fg">
                      {remedy.title}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-faint">
                      <span>Case:</span>
                      <Link
                        href={`/cases/${remedy.caseId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono font-medium text-[#a08bff] hover:underline"
                      >
                        {remedy.caseId}
                      </Link>
                    </div>
                  </div>
                </div>

                {getStateBadge(remedy.state)}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-line bg-surface-2 p-3 text-[12px]">
                <div>
                  <span className="text-subtle">Remedy Kind</span>
                  <p className="mt-0.5 font-medium text-fg">{remedy.kind}</p>
                </div>
                <div>
                  <span className="text-subtle">Requested Value</span>
                  <p className="mt-0.5 font-semibold tabular-nums text-[#34d399]">
                    {formatCurrency(remedy.amount, remedy.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-subtle">Raised Date</span>
                  <p className="mt-0.5 font-medium text-fg">{formatDate(remedy.raisedAt)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
              <span className="text-[11px] text-faint">
                Queue ID: {remedy.id}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/cases/${remedy.caseId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md border border-line px-2.5 py-1 text-[11.5px] font-medium text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  View Case
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
                  Review Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRemedies.length === 0 && (
        <div className="rg-card p-8 text-center text-muted">
          No remedy items found matching the selected filter state.
        </div>
      )}

      {/* Interactive Remedy Inspection & Simulation Modal */}
      <Dialog
        open={Boolean(activeRemedy)}
        onClose={() => setActiveRemedy(null)}
        title={activeRemedy ? `${activeRemedy.title}` : "Remedy Details"}
        description="Review proposed resolution parameters before simulating authorization."
        size="md"
        footer={
          activeRemedy ? (
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSimulateHumanReview(activeRemedy.id)}
              >
                Escalate Review
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setActiveRemedy(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSimulateApprove(activeRemedy.id)}
                >
                  Authorize Remedy (Demo)
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {activeRemedy && (
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-lg border border-line bg-surface-2 p-3.5 text-[12.5px]">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-subtle font-medium">Associated Dispute Case</span>
                <Link
                  href={`/cases/${activeRemedy.caseId}`}
                  className="font-mono font-semibold text-[#a08bff] hover:underline"
                >
                  {activeRemedy.caseId}
                </Link>
              </div>

              {(() => {
                const c = getAssociatedCase(activeRemedy.caseId);
                return c ? (
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[12px]">
                    <div className="flex items-center gap-1.5 text-muted">
                      <User className="h-3.5 w-3.5 text-subtle" />
                      <span>Buyer: <strong className="text-fg">{c.customer}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted">
                      <Store className="h-3.5 w-3.5 text-subtle" />
                      <span>Merchant: <strong className="text-fg">{c.merchant}</strong></span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-line bg-surface-2 p-3">
                <span className="text-[11.5px] text-subtle">Remedy Kind</span>
                <p className="mt-0.5 text-[14px] font-semibold text-fg">{activeRemedy.kind}</p>
              </div>
              <div className="rounded-md border border-line bg-surface-2 p-3">
                <span className="text-[11.5px] text-subtle">Settlement Amount</span>
                <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#34d399]">
                  {formatCurrency(activeRemedy.amount, activeRemedy.currency)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] p-3 text-[11.5px] leading-relaxed text-muted">
              <div className="flex items-center gap-1.5 font-semibold text-[#fcd34d]">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Simulated Authorization Notice</span>
              </div>
              <p className="mt-1">
                Authorizing this remedy updates UI state in local memory. In Phase 3, this executes the live PayPal Refund API transaction or carrier reshipment webhook.
              </p>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
