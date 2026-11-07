"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import { DEMO_CASES } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
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
import { Bot } from "lucide-react";

export type ActiveTab =
  | "overview"
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
  const params = useParams();
  const caseId = (params?.caseId as string) || "RG-1001";
  const { cases, updateCaseStatus } = useDemoCases();
  const { toast } = useToast();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  // Find matching case or default to the featured RG-1001
  const caseItem = useMemo(() => {
    const found = cases.find((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (found) return found;
    const fallback = DEMO_CASES.find((c) => c.id === "RG-1001");
    if (fallback) return fallback;
    return DEMO_CASES[0];
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
    toast({
      tone: "info",
      title: "Case Brief Exported (Demo)",
      description: `Summary PDF for ${caseItem.id} prepared for arbitration review.`,
    });
  };

  const handleRequestEvidence = () => {
    toast({
      tone: "info",
      title: "Evidence Request Dispatched",
      description: `Notification ping sent to merchant ${caseItem.merchant} for case ${caseItem.id}.`,
    });
  };

  const tabList: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: "purchase", label: "Purchase & Payment", icon: <ShoppingBag className="h-4 w-4 text-emerald-400" /> },
    { id: "claims", label: "Claims", icon: <FileText className="h-4 w-4 text-sky-400" /> },
    { id: "evidence", label: "Evidence Locker", icon: <ShieldCheck className="h-4 w-4 text-amber-400" /> },
    { id: "investigation", label: "AI Investigation", icon: <Sparkles className="h-4 w-4 text-rose-400" /> },
    { id: "graph", label: "Evidence Graph", icon: <Network className="h-4 w-4 text-purple-400" /> },
    { id: "timeline", label: "Timeline & Replay", icon: <Clock className="h-4 w-4 text-indigo-400" /> },
    { id: "resolution", label: "Resolution", icon: <Scale className="h-4 w-4 text-teal-400" /> },
    { id: "copilot", label: "AI Copilot", icon: <Bot className="h-4 w-4 text-violet-400" /> },
    { id: "paypal", label: "PayPal Dispute", icon: <ShieldAlert className="h-4 w-4 text-sky-400" /> },
    { id: "audit", label: "Audit History", icon: <History className="h-4 w-4 text-slate-400" /> },
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
          <span className="text-[12px] text-faint">Fictional Demo Record</span>
        </div>
      </div>

      {/* Primary Case Header */}
      <section className="rg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[14px] font-bold text-[#b3a1ff]">
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
                  <ChevronDown className="h-3 w-3 text-faint transition-transform group-hover:text-muted" />
                </button>

                {statusMenuOpen && (
                  <div className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-lg border border-line-2 bg-[#0c1322] p-1.5 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.8)]">
                    <p className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
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
                              ? "bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] font-semibold text-[#b3a1ff]"
                              : "text-muted hover:bg-surface-2 hover:text-fg"
                          }`}
                        >
                          <span>{status}</span>
                          {caseItem.status === status && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <PriorityBadge priority={caseItem.priority} />

              {caseItem.ephemeral && (
                <span className="rounded bg-[color-mix(in_srgb,var(--color-brand)_20%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[#c4b5fd]">
                  Session Temporary
                </span>
              )}
            </div>

            <h1 className="mt-2 text-[22px] font-bold tracking-tight text-fg sm:text-[26px]">
              {caseItem.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-subtle">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted" />
                <span className="text-fg font-medium">{caseItem.customer}</span>
                <span className="text-faint">(Buyer)</span>
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Store className="h-4 w-4 text-muted" />
                <span className="text-fg font-medium">{caseItem.merchant}</span>
                <span className="text-faint">(Merchant)</span>
              </span>

              <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
                <Receipt className="h-4 w-4 text-[#34d399]" />
                <span className="tabular-nums">
                  {formatCurrency(caseItem.amount, caseItem.currency)}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 text-faint">
                <Calendar className="h-4 w-4 text-subtle" />
                <span>Opened {formatDate(caseItem.createdAt)}</span>
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("resolution")}
              icon={<Scale className="h-3.5 w-3.5 text-teal-400" />}
            >
              Remedies
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("purchase")}
              icon={<CreditCard className="h-3.5 w-3.5 text-sky-400" />}
            >
              Purchase & Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestEvidence}
              icon={<Mail className="h-3.5 w-3.5" />}
            >
              Request Evidence
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportBrief}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Export Brief
            </Button>
          </div>
        </div>
      </section>

      {/* High-Level AI Investigation Summary Banner */}
      <AiInvestigationCard caseId={caseItem.id} />

      {/* 10-Tab Navigation Bar with horizontal overflow */}
      <div className="overflow-x-auto border-b border-line pb-0.5">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabList.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "border-[var(--color-brand)] bg-surface text-fg shadow-sm"
                    : "border-transparent text-subtle hover:bg-surface-2/60 hover:text-fg"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col gap-6">
            <CaseOverview caseItem={caseItem} />
            <ClaimsPanel caseItem={caseItem} />
            <div id="remedies-section">
              <ResolutionPanel caseItem={caseItem} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <EvidencePreview caseId={caseItem.id} />
            <CaseNotesPanel caseId={caseItem.id} />
          </div>
        </div>
      )}

      {/* Tab 2: Purchase & Payment */}
      {activeTab === "purchase" && (
        <CasePurchaseTab
          caseId={caseItem.id}
          amount={caseItem.amount}
          currency={caseItem.currency}
          customer={caseItem.customer}
          merchant={caseItem.merchant}
        />
      )}

      {/* Tab 3: Claims */}
      {activeTab === "claims" && (
        <div className="flex flex-col gap-6">
          <ClaimsPanel caseItem={caseItem} />
        </div>
      )}

      {/* Tab 4: Evidence Locker */}
      {activeTab === "evidence" && (
        <div className="flex flex-col gap-6">
          <EvidencePreview caseId={caseItem.id} />
        </div>
      )}

      {/* Tab 5: AI Investigation */}
      {activeTab === "investigation" && (
        <div className="flex flex-col gap-6">
          <AiInvestigationCard caseId={caseItem.id} />
          <div className="rg-card p-6">
            <h3 className="text-sm font-semibold text-fg mb-2">Multimodal Deep Fact Extraction</h3>
            <p className="text-xs text-subtle mb-4">
              BERR engine decomposes unstructured buyer statements, invoices, and device photos into structured facts
              with normalized units and exact bounding box coordinates.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-lg border border-line bg-surface-2 p-3.5">
                <span className="font-semibold text-rose-400">Exact Discrepancy (D_exact)</span>
                <p className="font-mono text-base font-bold text-fg mt-1">1.00</p>
                <p className="text-[11px] text-faint mt-1">Direct clash between 1000GB purchased vs 512GB received.</p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2 p-3.5">
                <span className="font-semibold text-amber-400">Semantic Drift (D_semantic)</span>
                <p className="font-mono text-base font-bold text-fg mt-1">0.75</p>
                <p className="text-[11px] text-faint mt-1">Packaging asserts 1TB while device label identifies 512GB model.</p>
              </div>
              <div className="rounded-lg border border-line bg-surface-2 p-3.5">
                <span className="font-semibold text-sky-400">Temporal Discrepancy (D_temporal)</span>
                <p className="font-mono text-base font-bold text-fg mt-1">0.00</p>
                <p className="text-[11px] text-faint mt-1">Timestamps across carrier tracking and receipt align consistently.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Evidence Graph */}
      {activeTab === "graph" && (
        <EvidenceGraphExplorer caseId={caseItem.id} />
      )}

      {/* Tab 7: Timeline & Replay */}
      {activeTab === "timeline" && (
        <TemporalTimelineExplorer caseId={caseItem.id} />
      )}

      {/* Tab 8: Resolution */}
      {activeTab === "resolution" && (
        <ResolutionPanel caseItem={caseItem} />
      )}

      {/* Tab 9: AI Copilot */}
      {activeTab === "copilot" && (
        <CaseCopilotTab caseId={caseItem.id} />
      )}

      {/* Tab 10: PayPal Dispute */}
      {activeTab === "paypal" && (
        <CasePayPalDisputeTab
          caseId={caseItem.id}
          amount={caseItem.amount}
          currency={caseItem.currency}
          merchant={caseItem.merchant}
        />
      )}

      {/* Tab 10: Audit History */}
      {activeTab === "audit" && (
        <CaseAuditTab caseId={caseItem.id} />
      )}
    </div>
  );
}
