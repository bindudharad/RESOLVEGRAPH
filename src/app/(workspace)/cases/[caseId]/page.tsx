"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  CreditCard,
  Download,
  Mail,
  Receipt,
  Scale,
  Store,
  User,
  Network,
  Clock,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  History,
  ShoppingBag,
  Bot,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import { DEMO_CASES } from "@/lib/mock-data";
import { CANONICAL_DEMO_CASE } from "@/lib/demo-fixture";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ActionConfirmationDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/common/toast";
import { ConvergenceTimeline } from "@/components/cases/convergence-timeline";
import { BerrView } from "@/components/cases/berr-view";
import { CaseOverview } from "@/components/cases/case-overview";
import { ClaimsPanel } from "@/components/cases/claims-panel";
import { EvidencePreview } from "@/components/cases/evidence-preview";
import { ResolutionPanel } from "@/components/cases/resolution-panel";
import { AiInvestigationCard } from "@/components/cases/ai-investigation-card";
import { CaseNotesPanel } from "@/components/cases/case-notes-panel";
import { EvidenceGraphExplorer } from "@/components/cases/evidence-graph-explorer";
import { TemporalTimelineExplorer } from "@/components/cases/temporal-timeline-explorer";
import { CasePurchaseTab } from "@/components/cases/case-purchase-tab";
import { CasePayPalDisputeTab } from "@/components/cases/case-paypal-dispute-tab";
import { CaseAuditTab } from "@/components/cases/case-audit-tab";
import { CaseCopilotTab } from "@/components/cases/case-copilot-tab";
import { CASE_STATUSES, type CaseStatus } from "@/lib/types";

export type ActiveTab =
  | "overview"
  | "berr"
  | "purchase"
  | "claims"
  | "evidence"
  | "investigation"
  | "graph"
  | "timeline"
  | "resolution"
  | "paypal"
  | "audit"
  | "copilot";

export default function CaseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = (params?.caseId as string) || "RG-2026-0412";
  const { cases, updateCaseStatus } = useDemoCases();
  const { toast } = useToast();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Sync tab with URL query parameter ?tab=
  const initialTab = (searchParams.get("tab") as ActiveTab) || "overview";
  const [activeTab, setActiveTabState] = useState<ActiveTab>(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as ActiveTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  // Find matching case or default to canonical demo fixture
  const caseItem = useMemo(() => {
    if (caseId.toUpperCase() === CANONICAL_DEMO_CASE.id.toUpperCase()) {
      return CANONICAL_DEMO_CASE;
    }
    const found = cases.find((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (found) return found;
    return CANONICAL_DEMO_CASE;
  }, [cases, caseId]);

  const handleStatusChange = (newStatus: CaseStatus) => {
    updateCaseStatus(caseItem.id, newStatus);
    setStatusMenuOpen(false);
    toast({
      tone: "success",
      title: `Status Updated to "${newStatus}"`,
      description: `Case ${caseItem.id} status modified for this session. Demonstrational state only.`,
    });
  };

  const handleExportBrief = () => {
    window.open(`/api/investigations/${caseItem.id}/report?format=markdown`, "_blank");
    toast({
      tone: "success",
      title: "Case Brief Download Initiated",
      description: `Downloading full forensic arbitration dossier for ${caseItem.id}.`,
    });
  };

  const handleRequestEvidence = () => {
    toast({
      tone: "info",
      title: "Opening Universal Intake",
      description: `Navigating to evidence intake bound to case ${caseItem.id}...`,
    });
    router.push(`/intake?caseId=${caseItem.id}`);
  };

  const tabList: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: "berr", label: "BERR Analysis", icon: <Scale className="h-4 w-4 text-[var(--accent)]" /> },
    { id: "graph", label: "Evidence Graph", icon: <Network className="h-4 w-4 text-[var(--contested)]" /> },
    { id: "evidence", label: "Evidence Locker", icon: <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" /> },
    { id: "purchase", label: "Purchase & Payment", icon: <ShoppingBag className="h-4 w-4 text-[var(--payment)]" /> },
    { id: "investigation", label: "AI Investigation", icon: <Sparkles className="h-4 w-4 text-[var(--ai)]" /> },
    { id: "claims", label: "Claims Matrix", icon: <FileText className="h-4 w-4 text-[var(--buyer)]" /> },
    { id: "resolution", label: "Remedy Options", icon: <Scale className="h-4 w-4 text-[var(--merchant)]" /> },
    { id: "timeline", label: "Temporal Replay", icon: <Clock className="h-4 w-4 text-subtle" /> },
    { id: "paypal", label: "PayPal Webhook", icon: <ShieldAlert className="h-4 w-4 text-[var(--buyer)]" /> },
    { id: "audit", label: "Audit Log", icon: <History className="h-4 w-4 text-subtle" /> },
    { id: "copilot", label: "AI Copilot", icon: <Bot className="h-4 w-4 text-[var(--ai)]" /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back button & Breadcrumb bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Cases</span>
        </Link>

        <div className="flex items-center gap-2">
          <DemoBadge size="sm" />
          <span className="text-[12px] font-mono text-subtle">Evaluation Dataset RG-2026-0412</span>
        </div>
      </div>

      {/* Convergence Timeline */}
      <ConvergenceTimeline currentStepId="STEP-5" />

      {/* Primary Case Header */}
      <section className="rg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[14px] font-bold text-fg">
                {caseItem.id}
              </span>

              {/* Interactive Status Changer */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                  className="group flex items-center gap-1 rounded-full transition-opacity hover:opacity-85"
                  title="Click to change demonstration status"
                >
                  <CaseStatusBadge status={caseItem.status} />
                  <ChevronDown className="h-3 w-3 text-subtle transition-transform group-hover:text-muted" />
                </button>

                {statusMenuOpen && (
                  <div className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
                    <p className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-subtle">
                      Update Case Status
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {CASE_STATUSES.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(status)}
                          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                            caseItem.status === status
                              ? "bg-surface-2 font-semibold text-fg"
                              : "text-muted hover:bg-surface-2 hover:text-fg"
                          }`}
                        >
                          <span>{status}</span>
                          {caseItem.status === status && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <PriorityBadge priority={caseItem.priority} />

              {caseItem.id === "RG-2026-0412" && (
                <span className="rounded bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--buyer)] border border-[color-mix(in_srgb,var(--buyer)_30%,transparent)]">
                  Canonical Evaluation Story
                </span>
              )}
            </div>

            <h1 className="mt-2 text-[22px] font-bold tracking-tight text-fg sm:text-[25px]">
              {caseItem.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-subtle">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4 text-[var(--buyer)]" />
                <span className="text-fg font-medium">{caseItem.customer}</span>
                <span className="text-subtle font-mono text-xs">(Buyer)</span>
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Store className="h-4 w-4 text-[var(--merchant)]" />
                <span className="text-fg font-medium">{caseItem.merchant}</span>
                <span className="text-subtle font-mono text-xs">(Merchant)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                <Receipt className="h-4 w-4 text-[var(--payment)]" />
                <span className="font-mono">
                  {formatCurrency(caseItem.amount, caseItem.currency)}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-subtle">
                <Calendar className="h-4 w-4" />
                <span>Opened {formatDate(caseItem.createdAt)}</span>
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("berr")}
              icon={<Scale className="h-3.5 w-3.5 text-[var(--accent)]" />}
            >
              BERR Matrix
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("graph")}
              icon={<Network className="h-3.5 w-3.5 text-[var(--contested)]" />}
            >
              Evidence Graph
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestEvidence}
              icon={<Mail className="h-3.5 w-3.5" />}
            >
              Intake
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportBrief}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Dossier
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmDialogOpen(true)}
            >
              Take Action
            </Button>
          </div>
        </div>
      </section>

      {/* Tab Navigation Bar with horizontal overflow */}
      <div className="relative border-b border-[var(--line)]">
        <div className="overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 min-w-max pr-8">
            {tabList.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] font-semibold shadow-xs"
                      : "border-transparent text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab 1: Overview with Right Rail */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-6">
            <AiInvestigationCard caseId={caseItem.id} />
            <CaseOverview caseItem={caseItem} />
            <ClaimsPanel caseItem={caseItem} />
            <ResolutionPanel caseItem={caseItem} />
          </div>

          {/* Right Rail: Key Facts, Next Recommended Action, Human Review */}
          <div className="flex flex-col gap-6">
            {/* Next Recommended Action (Section 4 & Section 2: dashed violet outline) */}
            <div className="rounded-lg border border-dashed border-[var(--ai)] bg-[var(--ai)]/5 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--ai)] uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  Next Recommended Action
                </span>
                <span className="rounded bg-[var(--ai)]/10 px-1.5 py-0.2 font-mono text-[10px] text-[var(--ai)] font-bold">
                  89% CONFIDENCE
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-fg">
                Execute ₹1,800 Partial Settlement via PayPal
              </p>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                BERR evidence verifies 512GB received vs 1TB ordered. Proposed remedy reimburses the exact price delta between models while buyer keeps the drive.
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                <span className="text-[11px] font-mono text-subtle">
                  Citation: E-0101, E-0201, BERR-001
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setConfirmDialogOpen(true)}
                >
                  Approve Remedy
                </Button>
              </div>
            </div>

            {/* Human Review Status Card */}
            <div className="rg-card p-5">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-fg">Human Review Gate</h3>
              </div>
              <p className="mt-1 text-xs text-muted">
                In compliance with ResolveGraph arbitration policy, no financial disbursement or merchant liability determination executes autonomously.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-md bg-surface-2 p-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-[var(--agreed)] shrink-0" />
                <span className="text-subtle">
                  Assigned Officer: <strong className="text-fg">Priya Raghavan</strong> (Administrator)
                </span>
              </div>
            </div>

            {/* Key Facts Summary */}
            <div className="rg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-fg border-b border-line pb-2">
                Key Facts Ledger
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-subtle">Disputed Value:</span>
                  <span className="font-mono font-semibold text-fg">
                    {formatCurrency(caseItem.amount, caseItem.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtle">Buyer Claim:</span>
                  <span className="font-medium text-[var(--buyer)]">{caseItem.expectedProduct || "ApexPro 1TB NVMe"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtle">Delivered Hardware:</span>
                  <span className="font-medium text-[var(--merchant)]">{caseItem.reportedProduct || "ApexPro 512GB NVMe"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtle">Payment Method:</span>
                  <span className="font-mono text-fg">PayPal Sandbox (TXN-8921-PP)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtle">Evidence Verification:</span>
                  <span className="font-mono text-[var(--agreed)]">4 of 5 verified</span>
                </div>
              </div>
            </div>

            <EvidencePreview caseId={caseItem.id} />
            <CaseNotesPanel caseId={caseItem.id} />
          </div>
        </div>
      )}

      {/* Tab 2: BERR Analysis */}
      {activeTab === "berr" && (
        <BerrView
          caseId={caseItem.id}
          customerName={`${caseItem.customer} (Buyer Thread)`}
          merchantName={`${caseItem.merchant} (Merchant Thread)`}
        />
      )}

      {/* Tab 3: Purchase & Payment */}
      {activeTab === "purchase" && (
        <CasePurchaseTab
          caseId={caseItem.id}
          amount={caseItem.amount}
          currency={caseItem.currency}
          customer={caseItem.customer}
          merchant={caseItem.merchant}
        />
      )}

      {/* Tab 4: Claims */}
      {activeTab === "claims" && (
        <div className="flex flex-col gap-6">
          <ClaimsPanel caseItem={caseItem} />
        </div>
      )}

      {/* Tab 5: Evidence Locker */}
      {activeTab === "evidence" && (
        <div className="flex flex-col gap-6">
          <EvidencePreview caseId={caseItem.id} />
        </div>
      )}

      {/* Tab 6: AI Investigation */}
      {activeTab === "investigation" && (
        <div className="flex flex-col gap-6">
          <AiInvestigationCard caseId={caseItem.id} />
        </div>
      )}

      {/* Tab 7: Evidence Graph */}
      {activeTab === "graph" && (
        <EvidenceGraphExplorer caseId={caseItem.id} />
      )}

      {/* Tab 8: Timeline & Replay */}
      {activeTab === "timeline" && (
        <TemporalTimelineExplorer caseId={caseItem.id} />
      )}

      {/* Tab 9: Resolution */}
      {activeTab === "resolution" && (
        <ResolutionPanel caseItem={caseItem} />
      )}

      {/* Tab 10: AI Copilot */}
      {activeTab === "copilot" && (
        <CaseCopilotTab caseId={caseItem.id} />
      )}

      {/* Tab 11: PayPal Dispute */}
      {activeTab === "paypal" && (
        <CasePayPalDisputeTab
          caseId={caseItem.id}
          amount={caseItem.amount}
          currency={caseItem.currency}
          merchant={caseItem.merchant}
        />
      )}

      {/* Tab 12: Audit History */}
      {activeTab === "audit" && (
        <CaseAuditTab caseId={caseItem.id} />
      )}

      {/* Action Confirmation Dialog */}
      <ActionConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          toast({
            tone: "success",
            title: "Simulated Action Executed",
            description: `Authorised ₹1,800 Partial Settlement for case ${caseItem.id}.`,
          });
        }}
        title="Authorize Bilateral Remedy"
        actionVerb="Execute Settlement"
        consequence="Submits a ₹1,800 reimbursement to buyer Alex Morgan via PayPal Sandbox and updates dispute status to Settled."
        requiredApprover="Priya Raghavan (Administrator)"
        isFinancial={true}
      />
    </div>
  );
}
