"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
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
  CheckCircle2,
  Lock,
  Building2,
  Layers,
  Check,
} from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import { CANONICAL_DEMO_CASE, CANONICAL_TIMELINE_STEPS } from "@/lib/demo-fixture";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { PriorityBadge } from "@/components/cases/priority-badge";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { ActionConfirmationDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/common/toast";
import { useSession } from "@/lib/auth-client";
import { BuyerCaseDetail } from "@/components/buyer/buyer-case-detail";
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
import { SellerOutreachTab } from "@/components/cases/seller-outreach-tab";
import { CASE_STATUSES, type CaseStatus, type ResolutionCase } from "@/lib/types";

export type ActiveTab =
  | "overview"
  | "evidence_beg"
  | "berr"
  | "seller_outreach"
  | "resolution"
  | "audit"
  | "graph"
  | "evidence"
  | "purchase"
  | "claims"
  | "investigation"
  | "timeline"
  | "paypal"
  | "copilot";

interface EnrichedResolutionCase extends ResolutionCase {
  marketplace?: string | null;
  orderId?: string | null;
  productName?: string | null;
  sellerGstin?: string | null;
  sellerRegistrationStatus?: string | null;
  assignedOfficer?: string | null;
  rawMerchantName?: string | null;
}

export default function CaseDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = (params?.caseId as string) || "RG-2026-0412";
  const { data: session, isPending } = useSession();
  const sessionUser = session?.user as { role?: string; isPlatformAdmin?: boolean } | undefined;
  const isBuyer = Boolean(sessionUser?.role === "BUYER" && !sessionUser?.isPlatformAdmin);
  const isMerchant = Boolean(sessionUser?.role === "MERCHANT" && !sessionUser?.isPlatformAdmin);

  useEffect(() => {
    if (!isPending && isMerchant) {
      router.replace("/seller/requests");
    }
  }, [isPending, isMerchant, router]);

  if (isPending) {
    return (
      <div className="py-16 text-center text-sm text-[var(--ink-3)]">
        Loading complaint details...
      </div>
    );
  }

  if (isBuyer) {
    return <BuyerCaseDetail caseId={caseId} />;
  }

  if (isMerchant) {
    return (
      <div className="py-16 text-center text-sm text-[var(--ink-3)]">
        Redirecting to{" "}
        <Link href="/seller/requests" className="text-[var(--accent)] underline">
          Seller Evidence Requests
        </Link>
        ...
      </div>
    );
  }

  return <EnterpriseCaseDetailsView />;
}

function EnterpriseCaseDetailsView() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const caseId = (params?.caseId as string) || "RG-2026-0412";
  const { cases, updateCaseStatus } = useDemoCases();
  const { toast } = useToast();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
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

  const [fetchedCase, setFetchedCase] = useState<EnrichedResolutionCase | null>(null);
  const [policyEval, setPolicyEval] = useState<any>(null);
  const [highlightedBegNodeIds, setHighlightedBegNodeIds] = useState<string[]>([]);
  const [highlightedBegEdgeIds, setHighlightedBegEdgeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!caseId) return;
    let active = true;

    // 1. Fetch case details
    fetch(`/api/cases/${encodeURIComponent(caseId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;

        // Resolve clean seller display name
        const resolvedMerchant =
          data.sellerDisplayName ||
          (typeof data.merchant === "string" ? data.merchant : data.merchant?.fullName || data.merchant?.name) ||
          data.merchantOrganization?.name ||
          (data.organizationId ? "Registered Seller" : "Unregistered Seller");

        const formatted: EnrichedResolutionCase = {
          id: data.caseNumber || data.id,
          title: data.title || `Dispute ${data.caseNumber || data.id}`,
          customer: data.buyer?.fullName || data.buyer?.name || data.customer || "Alex Morgan",
          merchant: resolvedMerchant,
          rawMerchantName: data.identifiedSeller || resolvedMerchant,
          category: (data.category as any) || "Damaged Product",
          amount: typeof data.amountMinor === "number" ? data.amountMinor / 100 : (data.amount || 956.0),
          currency: (data.currency as "USD" | "INR") || "INR",
          priority: (data.priority as any) || "High",
          status:
            data.status === "RESOLVED"
              ? "Resolved"
              : data.status === "UNDER_ANALYSIS"
              ? "Under Investigation"
              : data.status === "EVIDENCE_REQUESTED"
              ? "Awaiting Merchant"
              : "Open",
          createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
          description: data.description || "",
          expectedProduct: data.productName || data.expectedProduct,
          reportedProduct: data.reportedProduct,
          marketplace: data.marketplace || null,
          orderId: data.orderId || null,
          productName: data.productName || null,
          sellerGstin: data.sellerGstin || null,
          sellerRegistrationStatus: data.sellerRegistrationStatus || null,
          assignedOfficer: data.assignedManager?.fullName || "Priya Raghavan",
        };
        setFetchedCase(formatted);
      })
      .catch(() => {});

    // 2. Fetch policy resolution evaluation for dynamic next recommended action
    fetch(`/api/cases/${encodeURIComponent(caseId)}/resolution-options`)
      .then((res) => (res.ok ? res.json() : null))
      .then((evalData) => {
        if (active && evalData) {
          setPolicyEval(evalData);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [caseId]);

  // Find matching case or default to canonical demo fixture
  const caseItem = useMemo<EnrichedResolutionCase>(() => {
    if (fetchedCase) return fetchedCase;
    if (caseId.toUpperCase() === CANONICAL_DEMO_CASE.id.toUpperCase()) {
      return {
        ...CANONICAL_DEMO_CASE,
        marketplace: "Direct Store",
        orderId: "ORD-2026-8841",
        productName: "ApexDrive Pro 1TB NVMe PCIe 4.0 SSD",
        sellerGstin: null,
        sellerRegistrationStatus: "APPROVED_ACTIVE",
        assignedOfficer: "Priya Raghavan",
      };
    }
    const found = cases.find((c) => c.id.toLowerCase() === caseId.toLowerCase());
    if (found) {
      return {
        ...found,
        marketplace: null,
        orderId: null,
        productName: found.expectedProduct || null,
        sellerGstin: null,
        sellerRegistrationStatus: null,
        assignedOfficer: "Priya Raghavan",
      };
    }
    return {
      ...CANONICAL_DEMO_CASE,
      marketplace: "Direct Store",
      orderId: "ORD-2026-8841",
      productName: "ApexDrive Pro 1TB NVMe PCIe 4.0 SSD",
      sellerGstin: null,
      sellerRegistrationStatus: "APPROVED_ACTIVE",
      assignedOfficer: "Priya Raghavan",
    };
  }, [fetchedCase, cases, caseId]);

  const isCanonicalDemo = caseItem.id.toUpperCase() === "RG-2026-0412";

  const handleStatusChange = (newStatus: CaseStatus) => {
    updateCaseStatus(caseItem.id, newStatus);
    setStatusMenuOpen(false);
    toast({
      tone: "success",
      title: `Status Updated to "${newStatus}"`,
      description: `Case ${caseItem.id} status modified in session.`,
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

  // Primary 6 lifecycle-focused tabs
  const primaryTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview & Case Dossier", icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: "evidence_beg", label: "Evidence & BEG", icon: <Network className="h-4 w-4 text-[var(--accent)]" /> },
    { id: "berr", label: "BERR Analysis", icon: <Scale className="h-4 w-4 text-[var(--contested)]" /> },
    { id: "seller_outreach", label: "Seller Outreach", icon: <Building2 className="h-4 w-4 text-[var(--merchant)]" /> },
    { id: "resolution", label: "Resolution", icon: <ShieldCheck className="h-4 w-4 text-[var(--agreed)]" /> },
    { id: "audit", label: "Activity & Audit", icon: <History className="h-4 w-4 text-subtle" /> },
  ];

  // Advanced contextual investigation tools
  const advancedToolTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "timeline", label: "Temporal Replay", icon: <Clock className="h-4 w-4 text-subtle" /> },
    { id: "paypal", label: "PayPal Webhook & Dispute", icon: <ShieldAlert className="h-4 w-4 text-[var(--buyer)]" /> },
    { id: "purchase", label: "Purchase & Order Details", icon: <ShoppingBag className="h-4 w-4 text-[var(--payment)]" /> },
    { id: "claims", label: "Claims Matrix", icon: <FileText className="h-4 w-4 text-[var(--buyer)]" /> },
    { id: "copilot", label: "AI Investigation Copilot", icon: <Bot className="h-4 w-4 text-[var(--ai)]" /> },
  ];

  // Dynamic next recommended action derived from real policy evaluation
  const recOption = policyEval?.recommendedOption;
  const isEligibleRec = recOption?.isEligible ?? false;

  // Dynamic 5-milestone bilateral timeline derived from genuine case properties (no demo leakage)
  const dynamicTimelineSteps = useMemo(() => {
    if (caseItem.id === "RG-2026-0412") {
      return CANONICAL_TIMELINE_STEPS;
    }
    const isResolved = caseItem.status === "Resolved";
    const hasOutreach = Boolean(caseItem.merchant && caseItem.merchant !== "Unregistered Seller");
    const formattedAmount = formatCurrency(caseItem.amount, caseItem.currency);
    const dateFormatted = caseItem.createdAt ? formatDate(caseItem.createdAt) : "Day 1";

    return [
      {
        id: "STEP-1",
        title: "Complaint Registered",
        party: "BUYER" as const,
        timestamp: dateFormatted,
        completed: true,
        description: `Customer ${caseItem.customer || "Alex Morgan"} filed dispute for ${caseItem.productName || caseItem.title} (${formattedAmount}) on ${caseItem.marketplace || "Marketplace"}.`,
      },
      {
        id: "STEP-2",
        title: "Evidence Ingestion",
        party: "RESOLVEGRAPH" as const,
        timestamp: dateFormatted,
        completed: true,
        description: `Customer proof of purchase and damage artifacts ingested into bilateral evidence locker.`,
      },
      {
        id: "STEP-3",
        title: "Seller Outreach",
        party: "MERCHANT" as const,
        timestamp: hasOutreach ? "Active" : "Awaiting Seller",
        completed: Boolean(caseItem.sellerGstin || hasOutreach),
        current: !isResolved && caseItem.status === "Awaiting Merchant",
        description: `Bilateral communication routed to ${caseItem.merchant || "Identified Seller Organization"} for fulfillment documentation.`,
      },
      {
        id: "STEP-4",
        title: "BEG & BERR Analysis",
        party: "AI" as const,
        timestamp: "Active",
        completed: isResolved,
        current: !isResolved && (caseItem.status === "Under Investigation" || caseItem.status === "Escalated"),
        description: `Cross-correlating buyer evidence, packing declarations, and policy constraints in BEG.`,
      },
      {
        id: "STEP-5",
        title: "Resolution Governance",
        party: "RESOLVEGRAPH" as const,
        timestamp: isResolved ? "Resolved" : "Pending",
        completed: isResolved,
        current: isResolved,
        description: isResolved
          ? `Dispute finalized with authorized remedy fulfillment.`
          : `Remedy evaluation governed by Resolution Manager under Enterprise Dispute Policy.`,
      },
    ];
  }, [caseItem]);

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
          {isCanonicalDemo ? (
            <>
              <DemoBadge size="sm" />
              <span className="text-[12px] font-mono text-subtle">Evaluation Dataset RG-2026-0412</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-mono text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Persisted Case · {caseItem.id}
            </span>
          )}
        </div>
      </div>

      {/* Primary Case Header */}
      <section className="rg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[15px] font-bold text-fg">
                {caseItem.id}
              </span>

              {/* Interactive Status Changer */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                  className="group flex items-center gap-1 rounded-full transition-opacity hover:opacity-85"
                  title="Click to update status"
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

              {caseItem.marketplace && (
                <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-400 border border-sky-500/20">
                  {caseItem.marketplace}
                </span>
              )}

              {caseItem.orderId && (
                <span className="font-mono text-[11px] text-subtle border border-line rounded px-1.5 py-0.5">
                  Order: {caseItem.orderId}
                </span>
              )}

              {isCanonicalDemo && (
                <span className="rounded bg-[color-mix(in_srgb,var(--buyer)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--buyer)] border border-[color-mix(in_srgb,var(--buyer)_30%,transparent)]">
                  Canonical Evaluation Story
                </span>
              )}
            </div>

            <h1 className="mt-2 text-[20px] font-bold tracking-tight text-fg sm:text-[23px]">
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
                <span className="text-subtle font-mono text-xs">(Seller)</span>
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

              <span className="inline-flex items-center gap-1.5 text-subtle">
                <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Investigator: <strong className="text-fg font-medium">{caseItem.assignedOfficer || "Priya Raghavan"}</strong></span>
              </span>
            </div>
          </div>

          {/* Clean Primary Action Bar */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("resolution")}
              icon={<Scale className="h-3.5 w-3.5 text-[var(--accent)]" />}
            >
              Propose Remedy
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportBrief}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Export Dossier
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

      {/* Tab Navigation Bar: 6 Primary Tabs + Advanced Tools Dropdown */}
      <div className="relative border-b border-[var(--line)]">
        <div className="flex items-center justify-between overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 min-w-max pr-4">
            {primaryTabs.map((tab) => {
              const isActive =
                activeTab === tab.id ||
                (tab.id === "evidence_beg" && (activeTab === "graph" || activeTab === "evidence"));
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

          {/* Advanced Tools Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setToolsMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-subtle hover:text-fg hover:border-line-2 transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Advanced Tools</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {toolsMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-xl">
                <p className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-subtle border-b border-line pb-1 mb-1">
                  Diagnostics & Exploration
                </p>
                <div className="flex flex-col gap-0.5">
                  {advancedToolTabs.map((tool) => (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tool.id);
                        setToolsMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors ${
                        activeTab === tool.id
                          ? "bg-surface-2 font-semibold text-[var(--accent)]"
                          : "text-muted hover:bg-surface-2 hover:text-fg"
                      }`}
                    >
                      {tool.icon}
                      <span>{tool.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: Overview & Case Dossier Tab                                    */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-6">
            <AiInvestigationCard caseId={caseItem.id} />
            <CaseOverview caseItem={caseItem} />
            <ClaimsPanel caseItem={caseItem} />
          </div>

          {/* Right Rail: Dynamic Next Recommended Action, Human Review, Key Facts */}
          <div className="flex flex-col gap-6">
            {/* Dynamic Next Recommended Action Card */}
            <div className="rounded-lg border border-dashed border-[var(--ai)] bg-[var(--ai)]/5 p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--ai)] uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  Next Recommended Action
                </span>
                <span className="rounded bg-[var(--ai)]/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--ai)] font-bold">
                  {recOption ? (isEligibleRec ? "POLICY COMPLIANT" : "ACTION REQUIRED") : "EVALUATING"}
                </span>
              </div>

              {recOption ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-fg">
                    {recOption.title}
                  </p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {recOption.reason}
                  </p>

                  {recOption.groundingFindings && recOption.groundingFindings.length > 0 && (
                    <div className="mt-3 rounded bg-surface/50 p-2 text-[11px] text-subtle space-y-1">
                      {recOption.groundingFindings.slice(0, 2).map((gf: string, idx: number) => (
                        <p key={idx} className="truncate">{gf}</p>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="text-[11px] font-mono text-subtle">
                      Policy: {policyEval.policyName} v{policyEval.policyVersion}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmDialogOpen(true)}
                    >
                      Authorize Action
                    </Button>
                  </div>
                </>
              ) : isCanonicalDemo ? (
                <>
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
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-fg">
                    Reviewing Bilateral Evidence & Policy Rules
                  </p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Awaiting seller evidence or policy evaluation. Open the Resolution tab to review candidate options.
                  </p>
                  <div className="mt-4 flex items-center justify-end border-t border-line/60 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("resolution")}
                    >
                      View Resolution Options
                    </Button>
                  </div>
                </>
              )}
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
                  Assigned Officer: <strong className="text-fg">{caseItem.assignedOfficer || "Priya Raghavan"}</strong> (Administrator)
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
                  <span className="text-subtle">Marketplace / Channel:</span>
                  <span className="font-medium text-fg">{caseItem.marketplace || "ResolveGraph Direct"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtle">Identified Seller:</span>
                  <span className="font-medium text-[var(--merchant)] truncate max-w-[180px]" title={caseItem.merchant}>
                    {caseItem.merchant}
                  </span>
                </div>
                {caseItem.sellerGstin && (
                  <div className="flex justify-between">
                    <span className="text-subtle">Seller GSTIN:</span>
                    <span className="font-mono text-fg">{caseItem.sellerGstin}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-subtle">Disputed Product:</span>
                  <span className="font-medium text-[var(--buyer)] truncate max-w-[180px]" title={caseItem.productName || caseItem.expectedProduct || caseItem.title}>
                    {caseItem.productName || caseItem.expectedProduct || caseItem.title}
                  </span>
                </div>
              </div>
            </div>

            <EvidencePreview caseId={caseItem.id} />
            <CaseNotesPanel caseId={caseItem.id} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: Evidence & BEG Tab (Unified Forensic Vault + Graph Explorer)   */}
      {/* ========================================================================= */}
      {(activeTab === "evidence_beg" || activeTab === "graph" || activeTab === "evidence") && (
        <div className="flex flex-col gap-6">
          <EvidencePreview caseId={caseItem.id} />
          <EvidenceGraphExplorer
            caseId={caseItem.id}
            externalHighlightedNodeIds={highlightedBegNodeIds}
            externalHighlightedEdgeIds={highlightedBegEdgeIds}
            onSwitchToBerr={() => setActiveTab("berr")}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: BERR Analysis Tab                                              */}
      {/* ========================================================================= */}
      {activeTab === "berr" && (
        <BerrView
          caseId={caseItem.id}
          customerName={`${caseItem.customer} (Buyer Thread)`}
          merchantName={`${caseItem.merchant} (Merchant Thread)`}
          onInspectBegNodes={(nodeIds, edgeIds) => {
            setHighlightedBegNodeIds(nodeIds);
            setHighlightedBegEdgeIds(edgeIds);
            setActiveTab("evidence_beg");
          }}
          onOpenResolution={() => setActiveTab("resolution")}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: Seller Outreach Tab                                            */}
      {/* ========================================================================= */}
      {activeTab === "seller_outreach" && (
        <SellerOutreachTab caseId={caseItem.id} />
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: Resolution Management Tab                                      */}
      {/* ========================================================================= */}
      {activeTab === "resolution" && (
        <ResolutionPanel caseItem={caseItem} />
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: Activity & Audit Trail Tab                                     */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="flex flex-col gap-6">
          <ConvergenceTimeline
            steps={dynamicTimelineSteps}
            currentStepId={dynamicTimelineSteps.find((s) => s.current)?.id || (caseItem.status === "Resolved" ? "STEP-5" : "STEP-4")}
          />
          <CaseAuditTab caseId={caseItem.id} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED INVESTIGATION TOOLS (Accessible via menu or deep-link)           */}
      {/* ========================================================================= */}
      {activeTab === "timeline" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3 text-xs">
            <span className="font-semibold text-fg">Temporal Replay Engine</span>
            <span className="text-subtle font-mono">Case: {caseItem.id}</span>
          </div>
          <TemporalTimelineExplorer caseId={caseItem.id} />
        </div>
      )}

      {activeTab === "paypal" && (
        <div className="flex flex-col gap-4">
          <CasePayPalDisputeTab
            caseId={caseItem.id}
            amount={caseItem.amount}
            currency={caseItem.currency}
            merchant={caseItem.merchant}
          />
        </div>
      )}

      {activeTab === "purchase" && (
        <CasePurchaseTab
          caseId={caseItem.id}
          amount={caseItem.amount}
          currency={caseItem.currency}
          customer={caseItem.customer}
          merchant={caseItem.merchant}
          productName={caseItem.productName || caseItem.expectedProduct || undefined}
          orderNumber={caseItem.orderId || undefined}
          marketplace={caseItem.marketplace || undefined}
        />
      )}

      {activeTab === "claims" && (
        <div className="flex flex-col gap-6">
          <ClaimsPanel caseItem={caseItem} />
        </div>
      )}

      {activeTab === "copilot" && (
        <CaseCopilotTab caseId={caseItem.id} />
      )}

      {activeTab === "investigation" && (
        <div className="flex flex-col gap-6">
          <AiInvestigationCard caseId={caseItem.id} />
        </div>
      )}

      {/* Action Confirmation Dialog with Dynamic Consequence */}
      <ActionConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          toast({
            tone: "success",
            title: "Remedy Authorized",
            description: recOption
              ? `Action "${recOption.title}" approved for case ${caseItem.id}.`
              : `Arbitration action confirmed for case ${caseItem.id}.`,
          });
          setConfirmDialogOpen(false);
        }}
        title={recOption ? `Authorize: ${recOption.title}` : "Authorize Bilateral Action"}
        actionVerb="Execute Action"
        consequence={
          recOption
            ? `${recOption.reason} This decision will be stamped with Officer Priya Raghavan's digital signature in the case audit ledger.`
            : isCanonicalDemo
            ? "Submits a ₹1,800 reimbursement to buyer Alex Morgan via PayPal Sandbox and updates dispute status to Settled."
            : `Executes the verified resolution remedy for ${caseItem.customer} regarding complaint ${caseItem.id}.`
        }
        requiredApprover={`${caseItem.assignedOfficer || "Priya Raghavan"} (Administrator)`}
        isFinancial={recOption?.proposalType?.includes("REFUND") || isCanonicalDemo}
      />
    </div>
  );
}
