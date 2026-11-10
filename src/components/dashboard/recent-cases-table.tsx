"use client";

import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CaseFilters,
  EMPTY_FILTERS,
  type CaseFilterState,
} from "@/components/cases/case-filters";
import { CaseTable } from "@/components/cases/case-table";
import { DemoBadge } from "@/components/common/demo-badge";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { SectionHeading } from "@/components/ui/card";
import { useDemoCases } from "@/hooks/use-demo-cases";
import { cn } from "@/lib/utils";

/**
 * Dashboard case table: live filtering, sorting and pagination over the
 * session case store, including any cases created during this visit.
 */
export function RecentCasesTable() {
  const { cases, ephemeralCount } = useDemoCases();
  const { refreshing } = useDashboard();
  const [filters, setFilters] = useState<CaseFilterState>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return cases.filter((item) => {
      if (query) {
        const haystack = `${item.id} ${item.customer} ${item.merchant} ${item.title} ${item.category}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.category !== "All" && item.category !== filters.category) return false;
      if (filters.status !== "All" && item.status !== filters.status) return false;
      if (filters.priority !== "All" && item.priority !== filters.priority) return false;
      return true;
    });
  }, [cases, filters]);

  return (
    <section className="rg-card" aria-labelledby="recent-cases-title">
      <div className="border-b border-line px-5 py-4">
        <SectionHeading
          title={<span id="recent-cases-title">Recent Cases</span>}
          description="The latest complaints across the workspace, newest update first."
          actions={
            <span className="flex items-center gap-2">
              {ephemeralCount > 0 ? (
                <span className="rounded border border-line-2 bg-surface-2 px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted">
                  +{ephemeralCount} created this session
                </span>
              ) : null}
              <DemoBadge size="xs" />
            </span>
          }
        />
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--surface-2)]/60 px-5 py-3.5">
        <CaseFilters state={filters} onChange={setFilters} />
      </div>

      <div className="p-5">
        {refreshing ? (
          <div className="flex flex-col gap-2.5" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading cases…</span>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rg-skeleton h-11 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <CaseTable
            cases={filtered}
            pageSize={8}
            emptyTitle="No cases match these filters"
            emptyDescription="Adjust the search term or clear a filter to see cases again."
            onResetFilters={() => setFilters(EMPTY_FILTERS)}
            className={cn("border-line")}
          />
        )}
      </div>

      {filtered.length === 0 && !refreshing ? (
        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-[11.5px] text-faint">
          <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
          Showing 0 of {cases.length} cases in this demo workspace.
        </div>
      ) : null}
    </section>
  );
}
