"use client";

import { Calendar, RotateCw } from "lucide-react";
import { useMemo } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { DemoBadge } from "@/components/common/demo-badge";
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
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
            <span suppressHydrationWarning>{greetingFor(now)}</span>, {CURRENT_USER.name}
          </h1>
          <DemoBadge />
        </div>

        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-subtle">
          Here&apos;s what&apos;s happening across your commerce resolution workspace.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
            <span suppressHydrationWarning className="text-muted">
              {formatLongDate(now)}
            </span>
          </span>
          <span aria-hidden="true" className="hidden h-3 w-px bg-line-2 sm:block" />
          <span>Figures below are demonstration values, not live business data.</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Date range</span>
          <Select
            value={period}
            onChange={(event) => setPeriod(event.target.value as ResolutionRange)}
            aria-label="Date range"
            className="w-[164px]"
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
          className={cn(refreshing && "text-amber-400")}
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
    </section>
  );
}
