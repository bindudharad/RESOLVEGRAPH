"use client";

import { Calendar, RotateCw, AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { CreateCaseAction } from "@/components/cases/create-case-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { CURRENT_USER } from "@/lib/mock-data";
import { formatLongDate, cn } from "@/lib/utils";
import type { ResolutionRange } from "@/lib/types";

const RANGES: { value: ResolutionRange; label: string }[] = [
  { value: "7D", label: "Last 7 days" },
  { value: "30D", label: "Last 30 days" },
  { value: "90D", label: "Last 90 days" },
];

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function WelcomeHeader() {
  const { period, setPeriod, refreshing, refresh } = useDashboard();
  const now = useMemo(() => new Date(), []);

  return (
    <section className="flex flex-col gap-4">
      {/* Persistent Demo Data Ribbon (Section 7) */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--line-strong)] bg-[var(--surface-2)] px-3.5 py-1.5 text-[12px] text-[var(--ink-2)]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[var(--contested)]" />
          <span className="font-semibold text-[var(--ink)]">Demo Environment</span>
          <span className="text-[var(--ink-3)] hidden sm:inline">·</span>
          <span className="text-[var(--ink-3)] hidden sm:inline">
            Figures below are demonstration values, not live business data.
          </span>
        </div>
        <span className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider">
          RG-EVAL-V2
        </span>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--ink)] sm:text-[24px]">
              <span suppressHydrationWarning>{greetingFor(now)}</span>, {CURRENT_USER.name}
            </h1>
          </div>

          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-2)]">
            One Payment. Every Source. One Explainable Resolution. Here is the operational state across your bilateral disputes.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--ink-3)]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[var(--ink-3)]" aria-hidden="true" />
              <span suppressHydrationWarning className="font-medium text-[var(--ink-2)]">
                {formatLongDate(now)}
              </span>
            </span>
            <span aria-hidden="true" className="hidden h-3 w-px bg-[var(--line)] sm:block" />
            <span className="font-mono text-[11px]">Bilateral Convergence Ledger</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Date range</span>
            <Select
              value={period}
              onChange={(event) => setPeriod(event.target.value as ResolutionRange)}
              aria-label="Date range"
              className="w-[140px] text-[12px] h-9"
            >
              {RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </Select>
          </label>

          <Button
            variant="outline"
            size="md"
            onClick={refresh}
            disabled={refreshing}
            aria-live="polite"
            className={cn(refreshing && "text-[var(--accent)]")}
            icon={
              <RotateCw
                className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
                aria-hidden="true"
              />
            }
          >
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>

          <CreateCaseAction />
        </div>
      </div>
    </section>
  );
}
