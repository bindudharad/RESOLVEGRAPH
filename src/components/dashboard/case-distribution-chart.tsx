"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ChartSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { SectionHeading } from "@/components/ui/card";
import { CASE_DISTRIBUTION, DISTRIBUTION_TOTAL } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

/** Ordered so adjacent slices stay visually distinct on a dark surface. */
const SLICE_COLORS = [
  "#F59E0B",
  "#38BDF8",
  "#10B981",
  "#D97706",
  "#F87171",
  "#A855F7",
  "#64748B",
];

const COLOR_BY_CATEGORY = new Map(
  CASE_DISTRIBUTION.map((slice, index) => [slice.category, SLICE_COLORS[index]]),
);

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
    <div className="min-w-[180px] rounded-lg border border-line-2 bg-[#0B0F17] px-3 py-2.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.9)]">
      <p className="text-[12.5px] font-medium text-fg">{entry.category}</p>
      <p className="mt-1.5 flex items-center justify-between gap-4 text-[12px] text-subtle">
        <span>Cases</span>
        <span className="font-semibold tabular-nums text-fg">
          {formatNumber(entry.count ?? 0)}
        </span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-4 text-[12px] text-subtle">
        <span>Share</span>
        <span className="font-semibold tabular-nums text-fg">
          {(entry.share ?? 0).toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

/**
 * Case category distribution.
 * Every percentage shown is derived from the underlying counts — the footer
 * states the denominator so no figure is left unexplained.
 */
export function CaseDistributionChart() {
  const { refreshing } = useDashboard();

  const data = useMemo(
    () =>
      CASE_DISTRIBUTION.map((slice) => ({
        ...slice,
        fill: COLOR_BY_CATEGORY.get(slice.category) ?? "#64748b",
      })),
    [],
  );

  if (refreshing) return <ChartSkeleton height={230} />;

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
        description="How cases are spread across complaint categories."
      />

      <div className="mt-4 flex flex-col items-center gap-5 xl:flex-row xl:items-center">
        <div className="relative h-[212px] w-full shrink-0 xl:w-[212px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                innerRadius="64%"
                outerRadius="94%"
                paddingAngle={2}
                stroke="#0c1322"
                strokeWidth={2}
                isAnimationActive
                animationDuration={620}
              >
                {data.map((slice) => (
                  <Cell key={slice.category} fill={slice.fill} />
                ))}
              </Pie>
              <Tooltip content={<SliceTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-fg">
              {formatNumber(DISTRIBUTION_TOTAL)}
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.07em] text-faint">
              Total cases
            </span>
          </div>
        </div>

        <ul className="w-full min-w-0 flex-1 space-y-0.5">
          {data.map((slice) => (
            <li
              key={slice.category}
              className="flex items-center gap-2.5 rounded-md px-2 py-[7px] transition-colors hover:bg-surface-2"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: slice.fill }}
              />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                {slice.category}
              </span>
              <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-fg">
                {formatNumber(slice.count)}
              </span>
              <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-faint">
                {slice.share.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-[11px] text-faint">
        Percentages are computed from {formatNumber(DISTRIBUTION_TOTAL)} categorised
        demo cases. Sample data.
      </p>
    </section>
  );
}
