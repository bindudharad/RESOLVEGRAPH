"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon, Table as TableIcon } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ChartSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeading } from "@/components/ui/card";
import { CASE_DISTRIBUTION, DISTRIBUTION_TOTAL } from "@/lib/mock-data";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Convergence Ledger semantic colors:
 * - Item Not Received: Buyer Azure (#2B7BD6)
 * - Product Not as Described: Contested Amber (#D97706)
 * - Refund Pending: Merchant Teal (#0C9A8A)
 * - Payment Issue: AI / Security Violet (#7A5AE0)
 * - Damaged Product: Warning Coral (#C8372D)
 * - Other / Denied: Calm Slate (#64748B)
 */
const CATEGORY_COLORS: Record<string, string> = {
  "Product Not as Described": "var(--contested)",
  "Item Not Received": "var(--buyer)",
  "Damaged Product": "var(--danger)",
  "Refund Pending": "var(--merchant)",
  "Return Denied": "var(--line-2)",
  "Payment Issue": "var(--ai)",
  "Other": "#8A91A5",
};

interface TooltipEntry {
  payload?: {
    category?: string;
    count?: number;
    share?: number;
  };
}

function SliceTooltip(props: unknown) {
  const { active, payload } = props as { active?: boolean; payload?: TooltipEntry[] };
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;

  return (
    <div className="min-w-[190px] rounded-lg border border-line bg-surface p-3 shadow-md">
      <p className="text-[12.5px] font-semibold text-fg">{entry.category}</p>
      <div className="mt-2 space-y-1 text-[12px]">
        <p className="flex items-center justify-between gap-4 text-muted">
          <span>Cases</span>
          <span className="font-mono font-medium text-fg">
            {formatNumber(entry.count ?? 0)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-4 text-muted">
          <span>Share</span>
          <span className="font-mono font-medium text-fg">
            {(entry.share ?? 0).toFixed(1)}%
          </span>
        </p>
      </div>
    </div>
  );
}

export function CaseDistributionChart() {
  const { refreshing } = useDashboard();
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(
    () =>
      CASE_DISTRIBUTION.map((slice) => ({
        ...slice,
        fill: CATEGORY_COLORS[slice.category] || "#8A91A5",
      })),
    [],
  );

  if (refreshing) return <ChartSkeleton height={260} />;

  if (data.length === 0 || DISTRIBUTION_TOTAL === 0) {
    return (
      <section className="rg-card p-5" aria-labelledby="distribution-title">
        <SectionHeading
          title={<span id="distribution-title">Case Distribution</span>}
          description="How cases are spread across complaint categories."
        />
        <div className="mt-4">
          <EmptyState
            icon={PieChartIcon}
            title="No category data yet"
            description="Distribution appears once cases have been categorised in this workspace."
            compact
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rg-card p-5" aria-labelledby="distribution-title">
      <SectionHeading
        title={<span id="distribution-title">Case Distribution</span>}
        description="Share of disputes across complaint categories."
        actions={
          <div className="flex items-center rounded-lg border border-line bg-surface-2 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "chart"
                  ? "bg-surface text-fg shadow-xs"
                  : "text-muted hover:text-fg",
              )}
            >
              <PieChartIcon className="h-3 w-3" />
              Chart
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === "table"
                  ? "bg-surface text-fg shadow-xs"
                  : "text-muted hover:text-fg",
              )}
            >
              <TableIcon className="h-3 w-3" />
              Table
            </button>
          </div>
        }
      />

      {viewMode === "chart" ? (
        <div className="mt-4 flex flex-col items-center gap-6 xl:flex-row xl:items-center">
          <div className="relative h-[220px] w-full shrink-0 xl:w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="category"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="var(--surface)"
                  strokeWidth={2}
                  isAnimationActive
                  animationDuration={600}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((slice, index) => (
                    <Cell
                      key={slice.category}
                      fill={slice.fill}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                      stroke={activeIndex === index ? "var(--fg)" : "var(--surface)"}
                      strokeWidth={activeIndex === index ? 2 : 1.5}
                    />
                  ))}
                </Pie>
                <Tooltip content={<SliceTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[24px] font-bold tracking-tight text-fg">
                {formatNumber(DISTRIBUTION_TOTAL)}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-subtle">
                Total cases
              </span>
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-1">
            {data.map((slice, index) => {
              const isHovered = activeIndex === index;
              return (
                <li
                  key={slice.category}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors cursor-pointer",
                    isHovered ? "bg-surface-2 ring-1 ring-line-2" : "hover:bg-surface-2",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: slice.fill }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                    {slice.category}
                  </span>
                  <span className="shrink-0 font-mono text-[12.5px] font-medium text-fg">
                    {formatNumber(slice.count)}
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-[12px] text-subtle">
                    {slice.share.toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium text-right">Case Volume</th>
                <th className="px-4 py-2 font-medium text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((slice) => (
                <tr key={slice.category} className="hover:bg-surface-2/60">
                  <td className="flex items-center gap-2 px-4 py-2.5 text-fg">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: slice.fill }}
                    />
                    {slice.category}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-muted">
                    {formatNumber(slice.count)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-fg font-medium">
                    {slice.share.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 text-[11px] text-subtle">
        Percentages computed across {formatNumber(DISTRIBUTION_TOTAL)} categorised
        demo cases. Sample data.
      </p>
    </section>
  );
}
