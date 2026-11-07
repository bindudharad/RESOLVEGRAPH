"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import {
  CaseFilters,
  EMPTY_FILTERS,
  type CaseFilterState,
} from "@/components/cases/case-filters";
import { CaseTable } from "@/components/cases/case-table";
import { CreateCaseAction } from "@/components/cases/create-case-dialog";
import { DemoBadge } from "@/components/common/demo-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";
import { CASE_STATUSES } from "@/lib/types";

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
  const { cases } = useDemoCases();
  const [filters, setFilters] = useState<CaseFilterState>(EMPTY_FILTERS);
  const { toast } = useToast();

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Query search across id, customer, merchant, title, category
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

      // Category filter
      if (filters.category !== "All" && c.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status !== "All" && c.status !== filters.status) {
        return false;
      }

      // Priority filter
      if (filters.priority !== "All" && c.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }, [cases, filters]);

  // Compute status counts for quick tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: cases.length };
    for (const status of CASE_STATUSES) {
      counts[status] = cases.filter((c) => c.status === status).length;
    }
    return counts;
  }, [cases]);

  const handleExport = () => {
    toast({
      tone: "info",
      title: "Export Generated (Demo)",
      description: `Exported ${filteredCases.length} case records to CSV format. No backend call initiated.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Case Management
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Track, review and manage commerce resolution cases.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            onClick={handleExport}
            icon={<Download className="h-4 w-4" />}
          >
            Export (Demo)
          </Button>

          <CreateCaseAction />
        </div>
      </section>

      {/* Quick Status Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {QUICK_STATUS_TABS.map((statusTab) => {
          const isActive = filters.status === statusTab;
          const count = statusCounts[statusTab] ?? 0;
          return (
            <button
              key={statusTab}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: statusTab }))}
              className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                isActive
                  ? "bg-[var(--color-brand-solid)] text-white shadow-sm"
                  : "border border-line bg-surface-2 text-subtle hover:border-line-2 hover:text-fg"
              }`}
            >
              <span>{statusTab}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10.5px] font-mono ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-surface-3 text-faint"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter toolbar */}
      <div className="rg-card p-4">
        <CaseFilters state={filters} onChange={setFilters} />
      </div>

      {/* Results summary & table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1 text-[12.5px] text-faint">
          <span>
            Showing <strong className="text-fg">{filteredCases.length}</strong> of{" "}
            {cases.length} cases
          </span>
          {filters.status !== "All" && (
            <span>
              Filtered by: <span className="font-medium text-[#b3a1ff]">{filters.status}</span>
            </span>
          )}
        </div>

        <CaseTable
          cases={filteredCases}
          pageSize={10}
          emptyTitle="No cases match your filter criteria"
          emptyDescription="Try resetting the status filter or clearing your search keywords."
          onResetFilters={() => setFilters(EMPTY_FILTERS)}
        />
      </div>
    </div>
  );
}
