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

const ICONS: Record<string, LucideIcon> = {
  "total-cases": FolderOpen,
  "open-cases": Clock,
  "awaiting-response": MessageCircle,
  "resolved-cases": CheckCircle2,
};

const TONES: Record<MetricCardData["tone"], { icon: string; ring: string }> = {
  neutral: { icon: "text-[#b3a1ff]", ring: "border-[color-mix(in_srgb,var(--color-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_13%,transparent)]" },
  info: { icon: "text-[#5ccdf7]", ring: "border-[color-mix(in_srgb,var(--color-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-info)_13%,transparent)]" },
  warning: { icon: "text-[#f7c95c]", ring: "border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_13%,transparent)]" },
  success: { icon: "text-[#4fdcae]", ring: "border-[color-mix(in_srgb,var(--color-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_13%,transparent)]" },
};

function MetricCard({ metric }: { metric: MetricCardData }) {
  const Icon = ICONS[metric.key] ?? FolderOpen;
  const tone = TONES[metric.tone];
  const positive = metric.trend >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <article
      className="rg-card rg-card-hover group px-5 py-4.5 transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(124,92,255,0.12)]"
      aria-label={`${metric.label}: ${formatNumber(metric.value)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-medium text-subtle">{metric.label}</p>
        <span
          aria-hidden="true"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-transform duration-200 group-hover:-translate-y-0.5",
            tone.ring,
            tone.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-fg">
        {formatNumber(metric.value)}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums",
            positive ? "text-[#4fdcae]" : "text-[#fa8b8b]",
          )}
          title={`${formatTrend(metric.trend)} versus the previous period (demo data)`}
        >
          <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {formatTrend(metric.trend)}
        </span>
        <span className="text-[11.5px] text-faint">vs previous period</span>
      </div>

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">{metric.hint}</p>
    </article>
  );
}

/** KPI row — swaps to shimmering skeletons while the view refreshes. */
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCardSkeleton key={metric.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="rg-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}
