"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  FolderOpen,
  Brain,
  Network,
  Layers,
  AlertTriangle,
  Store,
} from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import {
  CaseFilters,
  EMPTY_FILTERS,
  type CaseFilterState,
} from "@/components/cases/case-filters";
import { CaseTable } from "@/components/cases/case-table";
import { CreateCaseAction } from "@/components/cases/create-case-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
import { CASE_STATUSES } from "@/lib/types";
import { useSession } from "@/lib/auth-client";
import { BuyerComplaintsList } from "@/components/buyer/buyer-complaints-list";

const QUICK_STATUS_TABS = [
  "All",
  "Open",
  "Under Investigation",
  "Awaiting Merchant",
  "Awaiting Buyer",
  "Resolved",
  "Escalated",
] as const;

export default function CasesPage() {
  const router = useRouter();
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
        Loading complaints...
      </div>
    );
  }

  if (isBuyer) {
    return <BuyerComplaintsList />;
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

  return <EnterpriseCasesWorkbench />;
}

function EnterpriseCasesWorkbench() {
  const { cases } = useDemoCases();
  const [filters, setFilters] = useState<CaseFilterState>(EMPTY_FILTERS);
  const { toast } = useToast();

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filters.query.trim()) {
        const q = filters.query.toLowerCase().trim();
        const matches =
          c.id.toLowerCase().includes(q) ||
          c.customer.toLowerCase().includes(q) ||
          c.merchant.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filters.category !== "All" && c.category !== filters.category) {
        return false;
      }

      if (filters.status !== "All" && c.status !== filters.status) {
        return false;
      }

      if (filters.priority !== "All" && c.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [cases, filters]);

  // Status counts for quick tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: cases.length };
    for (const status of CASE_STATUSES) {
      counts[status] = cases.filter((c) => c.status === status).length;
    }
    return counts;
  }, [cases]);

  // Aggregate metrics
  const activeCount = useMemo(() => cases.filter((c) => c.status !== "Resolved").length, [cases]);
  const awaitingMerchantCount = useMemo(() => cases.filter((c) => c.status === "Awaiting Merchant").length, [cases]);
  const highPriorityCount = useMemo(() => cases.filter((c) => c.priority === "High" && c.status !== "Resolved").length, [cases]);
  const underInvestigationCount = useMemo(() => cases.filter((c) => c.status === "Under Investigation").length, [cases]);

  const handleExport = () => {
    try {
      const headers = [
        "Case ID",
        "Title",
        "Customer",
        "Merchant",
        "Amount",
        "Currency",
        "Status",
        "Priority",
        "Category",
        "Created At",
      ];
      const rows = filteredCases.map((c) => [
        `"${c.id}"`,
        `"${c.title.replace(/"/g, '""')}"`,
        `"${c.customer.replace(/"/g, '""')}"`,
        `"${c.merchant.replace(/"/g, '""')}"`,
        c.amount,
        c.currency,
        c.status,
        c.priority,
        c.category,
        `"${c.createdAt}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `resolvegraph_cases_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        tone: "success",
        title: "CSV Export Downloaded",
        description: `Successfully exported ${filteredCases.length} case records to CSV format.`,
      });
    } catch {
      toast({
        tone: "error",
        title: "Export Error",
        description: "Failed to generate CSV export file.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 antialiased">
      {/* ======================================================== */}
      {/* 1. INVESTIGATIONS UNIFIED SUB-NAVIGATION                 */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-[#3B82F6] text-white px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Investigation Cases</span>
          </span>
          <Link
            href="/investigation"
            className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[#A7B2C2] hover:text-[#F5F7FA] hover:bg-[#151F2B]/80 transition-colors inline-flex items-center gap-1.5 border border-transparent hover:border-white/[0.08]"
          >
            <Brain className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>BERR Reasoning Engine</span>
          </Link>
          <Link
            href="/cases/RG-1001"
            className="rounded-xl px-3.5 py-1.5 text-xs font-medium text-[#A7B2C2] hover:text-[#F5F7FA] hover:bg-[#151F2B]/80 transition-colors inline-flex items-center gap-1.5 border border-transparent hover:border-white/[0.08]"
          >
            <Network className="h-3.5 w-3.5 text-[#3B82F6]" />
            <span>Evidence Graph View</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs border-white/[0.08] bg-[#151F2B]/70 text-[#F5F7FA] hover:bg-[#1B2634] gap-1.5 rounded-xl shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-[#A7B2C2]" />
            <span>Export CSV</span>
          </Button>
          <CreateCaseAction />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PAGE HEADER                                           */}
      {/* ======================================================== */}
      <header className="glass-card rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#A7B2C2]">
                Dispute Case Management
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 font-mono text-[11px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active Dossiers Synchronized
              </span>
            </div>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#F5F7FA]">
              Investigation Cases
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#A7B2C2]">
              Review and manage ongoing purchase disputes. Cross-examine assertions with symmetric BERR evidence reasoning.
            </p>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. ACTIVE INVESTIGATION SUMMARY (4 CARDS)                */}
      {/* ======================================================== */}
      <section
        aria-label="Investigation Summary Metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Total Active Cases */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[#A7B2C2] text-xs font-medium">
            <span>Active Disputes</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6]">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold text-[#F5F7FA] tabular-nums">
              {activeCount}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2]">Open investigation files</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-[#3B82F6]">
            Across 14 Merchants
          </div>
        </div>

        {/* Under Investigation */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[#A7B2C2] text-xs font-medium">
            <span>Forensic Triage</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Brain className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold text-teal-400 tabular-nums">
              {underInvestigationCount}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2]">Under BERR engine analysis</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-teal-400">
            Contradiction Detection Active
          </div>
        </div>

        {/* Awaiting Merchant */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[#A7B2C2] text-xs font-medium">
            <span>Awaiting Merchant</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Store className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {awaitingMerchantCount}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2]">Counter-evidence pending</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-amber-400">
            Statutory TAT: 72h
          </div>
        </div>

        {/* High Priority */}
        <div className="glass-card rounded-2xl p-4.5 flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[#A7B2C2] text-xs font-medium">
            <span>Priority Attention</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold text-rose-400 tabular-nums">
              {highPriorityCount}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2]">SLA breach risk / high value</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-rose-400">
            Action Required
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. STATUS PILLS & FILTER BAR                             */}
      {/* ======================================================== */}
      <div className="flex flex-col gap-3 rounded-2xl glass-panel p-4 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_STATUS_TABS.map((statusTab) => {
            const isActive = filters.status === statusTab;
            const count = statusCounts[statusTab] ?? 0;

            return (
              <button
                key={statusTab}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    status: statusTab,
                  }))
                }
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
                  isActive
                    ? "bg-[#3B82F6] text-white font-semibold shadow-xs"
                    : "bg-[#1B2634]/60 border border-white/[0.08] text-[#A7B2C2] hover:text-[#F5F7FA] hover:bg-[#1B2634]"
                }`}
              >
                <span>{statusTab}</span>
                <span
                  className={`font-mono text-[10.5px] tabular-nums rounded-full px-1.5 py-0.2 ${
                    isActive ? "bg-black/20 text-white font-bold" : "text-[#718096]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Secondary Filter Dropdowns */}
        <div className="pt-2 border-t border-white/[0.08]">
          <CaseFilters state={filters} onChange={setFilters} />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. INVESTIGATION ROSTER TABLE                            */}
      {/* ======================================================== */}
      <div className="rounded-2xl glass-panel shadow-[0_12px_40px_rgba(0,0,0,0.22)] overflow-hidden">
        <CaseTable cases={filteredCases} />
      </div>
    </div>
  );
}
