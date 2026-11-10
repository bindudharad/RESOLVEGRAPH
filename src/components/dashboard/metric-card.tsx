"use client";

import { useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  FolderOpen,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { MetricCardSkeleton } from "@/components/common/loading-skeleton";
import { KPI_METRICS, type MetricCardData } from "@/lib/mock-data";
import { cn, formatNumber, formatTrend } from "@/lib/utils";
import { CountUp } from "@/components/landing/motion-primitives";

const ICONS: Record<string, LucideIcon> = {
  "total-cases": FolderOpen,
  "open-cases": Clock,
  "awaiting-response": MessageCircle,
  "resolved-cases": CheckCircle2,
};

// Seeded sparklines for each card (800ms draw)
const SPARKLINES: Record<string, number[]> = {
  "total-cases": [24, 28, 32, 30, 38, 42, 48, 54, 52, 60],
  "open-cases": [18, 16, 20, 19, 22, 21, 24, 26, 23, 25],
  "awaiting-response": [12, 14, 11, 13, 10, 9, 12, 11, 8, 7],
  "resolved-cases": [30, 34, 38, 40, 45, 52, 58, 65, 72, 80],
};

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 24;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const strokeColor = positive ? "var(--agreed)" : "var(--contested)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="opacity-90"
      />
    </svg>
  );
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  const Icon = ICONS[metric.key] ?? FolderOpen;
  const positive = metric.trend >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;
  const sparklineData = SPARKLINES[metric.key] || [10, 15, 12, 18, 22, 26];

  return (
    <article
      className={cn(
        "rg-card rg-card-hover group relative flex h-[112px] flex-col justify-between p-3.5 transition-all",
        "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
      )}
      aria-label={`${metric.label}: ${formatNumber(metric.value)}`}
    >
      {/* Top row: Label + Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[var(--ink-2)] truncate">
          {metric.label}
        </span>
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--ink-2)] group-hover:text-[var(--accent)] transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Middle row: Tabular value + Sparkline */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[24px] font-bold tracking-tight text-[var(--ink)] rg-tabular">
          <CountUp end={metric.value} duration={1.2} />
        </div>
        <Sparkline data={sparklineData} positive={positive} />
      </div>

      {/* Bottom row: Delta chip + hint */}
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={cn(
            "inline-flex items-center gap-1 font-semibold rg-tabular rounded px-1.5 py-0.2",
            positive
              ? "bg-[color-mix(in_srgb,var(--agreed)_12%,transparent)] text-[var(--agreed)]"
              : "bg-[color-mix(in_srgb,var(--contested)_12%,transparent)] text-[var(--contested)]"
          )}
        >
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          {formatTrend(metric.trend)}
        </span>
        <span className="text-[10.5px] text-[var(--ink-3)] font-mono">
          vs prev period (demo)
        </span>
      </div>
    </article>
  );
}

/** Compact 4-card metric grid (~112px height) */
export function MetricGrid() {
  const { refreshing, summary } = useDashboard();

  const metrics: MetricCardData[] = useMemo(() => {
    if (!summary?.kpis) return KPI_METRICS;
    return [
      {
        key: "total-cases",
        label: "Total Cases",
        value: summary.kpis.totalCases.value,
        trend: summary.kpis.totalCases.trend,
        hint: summary.kpis.totalCases.hint,
        tone: "neutral",
      },
      {
        key: "open-cases",
        label: "Open Cases",
        value: summary.kpis.openCases.value,
        trend: summary.kpis.openCases.trend,
        hint: summary.kpis.openCases.hint,
        tone: "info",
      },
      {
        key: "awaiting-response",
        label: "Awaiting Response",
        value: summary.kpis.awaitingResponse.value,
        trend: summary.kpis.awaitingResponse.trend,
        hint: summary.kpis.awaitingResponse.hint,
        tone: "warning",
      },
      {
        key: "resolved-cases",
        label: "Resolved Cases",
        value: summary.kpis.resolvedCases.value,
        trend: summary.kpis.resolvedCases.trend,
        hint: summary.kpis.resolvedCases.hint,
        tone: "success",
      },
    ];
  }, [summary]);

  if (refreshing) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCardSkeleton key={metric.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}
