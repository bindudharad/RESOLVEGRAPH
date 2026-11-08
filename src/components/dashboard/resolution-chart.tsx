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
import { BarChart3 } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ChartSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeading } from "@/components/ui/card";
import { RESOLUTION_SERIES } from "@/lib/mock-data";
import { formatNumber, cn } from "@/lib/utils";
import type { ResolutionPoint, ResolutionRange } from "@/lib/types";

const SERIES = [
  { key: "total", label: "Total Cases", color: "#F59E0B" },
  { key: "resolved", label: "Resolved Cases", color: "#10B981" },
  { key: "open", label: "Open Cases", color: "#38BDF8" },
] as const;

const RANGES: { value: ResolutionRange; label: string }[] = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
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
    <div className="min-w-[168px] rounded-lg border border-line-2 bg-[#0B0F17] px-3 py-2.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)]">
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-faint">
        {label}
      </p>
      <div className="flex flex-col gap-1.5">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[12px] text-subtle">{entry.name}</span>
            <span className="ml-auto text-[12.5px] font-semibold tabular-nums text-fg">
              {typeof entry.value === "number" ? formatNumber(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResolutionChart() {
  const { period, setPeriod, refreshing } = useDashboard();
  const gradientId = useId();
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const data = useMemo<ResolutionPoint[]>(
    () => RESOLUTION_SERIES[period],
    [period],
  );

  const summary = useMemo(() => {
    const totals = data.reduce(
      (acc, point) => ({
        total: acc.total + point.total,
        resolved: acc.resolved + point.resolved,
      }),
      { total: 0, resolved: 0 },
    );
    const latestOpen = data.length > 0 ? data[data.length - 1].open : 0;
    return { ...totals, open: latestOpen };
  }, [data]);

  const interval = period === "30D" ? 4 : period === "90D" ? 1 : 0;

  if (refreshing) return <ChartSkeleton />;

  return (
    <section className="rg-card p-5" aria-labelledby="resolution-chart-title">
      <SectionHeading
        title={<span id="resolution-chart-title">Case Resolution Overview</span>}
        description="Track case activity and resolution performance over time."
        actions={
          <div
            role="group"
            aria-label="Time period"
            className="flex items-center rounded-md border border-line bg-[#0B0F17] p-0.5"
          >
            {RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setPeriod(range.value)}
                aria-pressed={period === range.value}
                className={cn(
                  "h-7 rounded px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors",
                  period === range.value
                    ? "bg-[var(--color-brand-solid)] text-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                    : "text-subtle hover:text-fg",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        }
      />

      {data.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={BarChart3}
            title="No data for this period"
            description="There is no recorded case activity in the selected range yet."
            compact
          />
        </div>
      ) : (
        <>
          <div className="mt-4 h-[264px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <defs>
                  {SERIES.map((series) => (
                    <linearGradient
                      key={series.key}
                      id={`${gradientId}-${series.key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={series.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={interval}
                  minTickGap={12}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ stroke: "#222D42", strokeWidth: 1 }}
                  content={<ChartTooltip />}
                />

                {SERIES.map((series) => (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2}
                    fill={`url(#${gradientId}-${series.key})`}
                    hide={Boolean(hidden[series.key])}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#0B0F17" }}
                    animationDuration={520}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {SERIES.map((series) => {
                const isHidden = Boolean(hidden[series.key]);
                const value =
                  series.key === "open" ? summary.open : summary[series.key];
                return (
                  <button
                    key={series.key}
                    type="button"
                    onClick={() =>
                      setHidden((current) => ({
                        ...current,
                        [series.key]: !current[series.key],
                      }))
                    }
                    aria-pressed={!isHidden}
                    className="flex items-center gap-2 rounded px-1 py-0.5 transition-opacity hover:opacity-80"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full transition-opacity",
                        isHidden && "opacity-30",
                      )}
                      style={{ backgroundColor: series.color }}
                    />
                    <span
                      className={cn(
                        "text-[12px] text-subtle",
                        isHidden && "line-through opacity-60",
                      )}
                    >
                      {series.label}
                    </span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-fg">
                      {formatNumber(value)}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-faint">
              Demo series · totals for the selected range; Open is the latest reading.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
