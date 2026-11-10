"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Table as TableIcon, TrendingUp } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ChartSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeading } from "@/components/ui/card";
import { RESOLUTION_SERIES } from "@/lib/mock-data";
import { formatNumber, cn } from "@/lib/utils";
import type { ResolutionPoint, ResolutionRange } from "@/lib/types";

// Convergence Ledger semantic colors (Section 2)
const SERIES = [
  { key: "total", label: "Total Cases", color: "var(--accent, #4350E5)" },
  { key: "resolved", label: "Resolved", color: "var(--agreed, #1F9D6B)" },
  { key: "open", label: "Open", color: "var(--buyer, #2B7BD6)" },
] as const;

const RANGES: { value: ResolutionRange | "12M"; label: string }[] = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
  { value: "12M", label: "12M" },
];

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTooltip(props: unknown) {
  const { active, payload, label } = props as {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string | number;
  };

  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[160px] rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-[12px] shadow-xl">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
        {label}
      </p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[var(--ink-2)]">{entry.name}</span>
            </div>
            <span className="font-semibold text-[var(--ink)] rg-tabular">
              {formatNumber(Number(entry.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResolutionChart() {
  const { period, setPeriod, refreshing, summary } = useDashboard();
  const [showTable, setShowTable] = useState(false);
  const [activeSeries, setActiveSeries] = useState<Record<string, boolean>>({
    total: true,
    resolved: true,
    open: true,
  });

  const gradientId = useId();

  const data: ResolutionPoint[] = useMemo(() => {
    const currentPeriod: ResolutionRange = (period as string) === "90D" || (period as string) === "12M" ? "90D" : period === "30D" ? "30D" : "7D";
    return RESOLUTION_SERIES[currentPeriod] ?? [];
  }, [period]);

  const toggleSeries = (key: string) => {
    setActiveSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (refreshing) {
    return <ChartSkeleton />;
  }

  return (
    <section className="rg-card flex flex-col p-5" aria-labelledby="resolution-chart-title">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--line)]">
        <SectionHeading
          title={<span id="resolution-chart-title">Dispute Resolution Trends</span>}
          description="Inflow, active investigation, and bilateral resolution convergence."
        />

        <div className="flex items-center gap-2">
          {/* Table / Chart View Toggle (Section 6) */}
          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
            title="Toggle between chart and accessible table view"
          >
            {showTable ? <BarChart3 className="h-3.5 w-3.5" /> : <TableIcon className="h-3.5 w-3.5" />}
            <span>{showTable ? "Chart" : "Table"}</span>
          </button>

          {/* Range pills */}
          <div className="flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setPeriod((r.value === "12M" ? "90D" : r.value) as ResolutionRange)}
                className={cn(
                  "px-2.5 py-0.5 text-[11px] font-semibold rounded-md transition-colors",
                  period === r.value || (r.value === "12M" && period === "90D")
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Legend (filters series) */}
      <div className="flex items-center gap-4 py-2 text-[12px]">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => toggleSeries(s.key)}
            className={cn(
              "flex items-center gap-1.5 transition-opacity select-none",
              activeSeries[s.key] ? "opacity-100 font-medium" : "opacity-40 line-through"
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[var(--ink-2)]">{s.label}</span>
          </button>
        ))}
      </div>

      {showTable ? (
        /* Accessible Table View (Section 6) */
        <div className="mt-3 overflow-x-auto max-h-[280px]">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-[var(--line)] text-[var(--ink-3)] font-mono">
              <tr>
                <th className="py-2 px-3">Interval</th>
                <th className="py-2 px-3">Total Cases</th>
                <th className="py-2 px-3">Resolved</th>
                <th className="py-2 px-3">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {data.map((row) => (
                <tr key={row.label} className="hover:bg-[var(--surface-2)]">
                  <td className="py-1.5 px-3 font-medium text-[var(--ink)]">{row.label}</td>
                  <td className="py-1.5 px-3 rg-tabular text-[var(--ink-2)]">{formatNumber(row.total)}</td>
                  <td className="py-1.5 px-3 rg-tabular text-[var(--agreed)]">{formatNumber(row.resolved)}</td>
                  <td className="py-1.5 px-3 rg-tabular text-[var(--buyer)]">{formatNumber(row.open)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No trend data" description="No case records recorded for selected range." />
      ) : (
        <div className="mt-2 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`${gradientId}-total`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${gradientId}-resolved`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--agreed)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--agreed)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.6} />
              <XAxis dataKey="label" stroke="var(--ink-3)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--ink-3)" fontSize={11} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />

              {activeSeries.total && (
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill={`url(#${gradientId}-total)`}
                  isAnimationActive={true}
                  animationDuration={900}
                />
              )}
              {activeSeries.resolved && (
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="var(--agreed)"
                  strokeWidth={1.75}
                  fill={`url(#${gradientId}-resolved)`}
                  isAnimationActive={true}
                  animationDuration={900}
                />
              )}
              {activeSeries.open && (
                <Area
                  type="monotone"
                  dataKey="open"
                  name="Open"
                  stroke="var(--buyer)"
                  strokeWidth={1.5}
                  fill="transparent"
                  strokeDasharray="4 4"
                  isAnimationActive={true}
                  animationDuration={900}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
