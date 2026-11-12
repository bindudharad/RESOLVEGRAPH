"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Hash,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type {
  CaptureDailyResult,
  CaptureMonthlyResult,
  CaptureSummaryResult,
  DailyCapturePoint,
  MonthlyCaptureBucket,
} from "@/server/analytics/capture-analytics.service";
import { formatMinorCurrency } from "@/server/analytics/timezone-calendar";

type CaptureMetricMode = "amount" | "count";

interface AxisTickFormatArgs {
  value: number;
  currency: string;
  metric: CaptureMetricMode;
}

function formatAxisTick({ value, currency, metric }: AxisTickFormatArgs): string {
  if (metric === "count") {
    return Number.isInteger(value) ? value.toLocaleString("en-US") : "";
  }
  const major = value / 100;
  const formattedFull = formatMinorCurrency(Math.round(value), currency);
  const prefix = formattedFull.startsWith("-") ? "-" : "";
  const symbolMatch = /^(-?[^\d.,\s-]+\s?)/.exec(formattedFull);
  const symbol = symbolMatch ? symbolMatch[1].replace(/^-/, "") : `${currency} `;
  const absMajor = Math.abs(major);
  if (absMajor >= 1_000_000) {
    return `${prefix}${symbol}${(absMajor / 1_000_000).toFixed(1)}M`;
  }
  if (absMajor >= 1_000) {
    return `${prefix}${symbol}${(absMajor / 1_000).toFixed(1)}k`;
  }
  return `${prefix}${symbol}${Math.round(absMajor).toLocaleString("en-US")}`;
}

interface MonthlyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: MonthlyCaptureBucket }>;
}

function MonthlyCaptureTooltip({ active, payload }: MonthlyTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 shadow-lg text-xs">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-1.5 mb-1.5">
        <span className="font-semibold text-[var(--ink)]">{item.fullLabel}</span>
        {item.isCurrentMonth && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-300">
            Current
          </span>
        )}
      </div>
      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--ink-3)] font-sans">Captured Amount:</span>
          <span className="font-semibold text-[var(--ink)]">
            {formatMinorCurrency(item.grossCapturedMinor, item.currency)} {item.currency}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--ink-3)] font-sans">Number of Captures:</span>
          <span className="font-semibold text-[var(--ink)]">
            {item.captureCount.toLocaleString("en-US")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--ink-3)] font-sans">Completed Refunds:</span>
          <span className="text-[var(--ink-2)]">
            {formatMinorCurrency(item.refundedMinor, item.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--ink-3)] font-sans">Net Captured:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMinorCurrency(item.netCapturedMinor, item.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DailyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyCapturePoint }>;
}

function DailyCaptureTooltip({ active, payload }: DailyTooltipProps) {
  if (!active || !payload || payload.length === 0 || !payload[0]?.payload) {
    return null;
  }
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 shadow-lg text-xs">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-1.5 mb-1.5">
        <span className="font-semibold text-[var(--ink)]">{item.fullDateLabel}</span>
        {item.isToday && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-300">
            Today
          </span>
        )}
      </div>
      <div className="space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--ink-3)] font-sans">Captured Amount:</span>
          <span className="font-semibold text-[var(--ink)]">
            {formatMinorCurrency(item.grossCapturedMinor, item.currency)} {item.currency}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--ink-3)] font-sans">Number of Captures:</span>
          <span className="font-semibold text-[var(--ink)]">
            {item.captureCount.toLocaleString("en-US")}
          </span>
        </div>
        {item.refundedMinor > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--ink-3)] font-sans">Completed Refunds:</span>
            <span className="text-amber-600 dark:text-amber-400">
              -{formatMinorCurrency(item.refundedMinor, item.currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CaptureAnalyticsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const initialMetric: CaptureMetricMode =
    searchParams.get("metric") === "count" ? "count" : "amount";
  const initialCurrency = searchParams.get("currency")?.toUpperCase() || null;
  const initialMonth = searchParams.get("month") || null;

  const [metric, setMetric] = useState<CaptureMetricMode>(initialMetric);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(initialCurrency);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(initialMonth);

  const [summary, setSummary] = useState<CaptureSummaryResult | null>(null);
  const [monthly, setMonthly] = useState<CaptureMonthlyResult | null>(null);
  const [daily, setDaily] = useState<CaptureDailyResult | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authForbidden, setAuthForbidden] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const overviewRequestSeq = useRef(0);
  const dailyRequestSeq = useRef(0);

  const sessionUser = session?.user as { role?: string; isPlatformAdmin?: boolean } | undefined;
  const isMerchant = Boolean(sessionUser?.role === "MERCHANT" && !sessionUser?.isPlatformAdmin);
  const backHref = isMerchant ? "/seller" : "/overview";
  const backLabel = isMerchant ? "Back to Seller Dashboard" : "Back to Overview";

  const syncUrlParams = useCallback(
    (next: { metric?: CaptureMetricMode; currency?: string | null; month?: string | null }) => {
      const sp = new URLSearchParams();
      if (next.metric === "count") sp.set("metric", "count");
      if (next.currency) sp.set("currency", next.currency);
      if (next.month) sp.set("month", next.month);
      const qs = sp.toString();
      router.replace(qs ? `/analytics/captures?${qs}` : "/analytics/captures", { scroll: false });
    },
    [router]
  );

  const fetchAllOverview = useCallback(
    async (opts: { currency: string | null; month: string | null; silent?: boolean }) => {
      const seq = ++overviewRequestSeq.current;
      if (!opts.silent) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      setDailyError(null);
      setAuthForbidden(null);

      try {
        const baseParams = new URLSearchParams();
        if (opts.currency) baseParams.set("currency", opts.currency);
        const baseQs = baseParams.toString();

        const dailyParams = new URLSearchParams(baseParams);
        if (opts.month) dailyParams.set("month", opts.month);
        const dailyQs = dailyParams.toString();

        const [summaryRes, monthlyRes, dailyRes] = await Promise.all([
          fetch(`/api/analytics/captures/summary${baseQs ? `?${baseQs}` : ""}`, {
            cache: "no-store",
          }),
          fetch(`/api/analytics/captures/monthly${baseQs ? `?${baseQs}` : ""}`, {
            cache: "no-store",
          }),
          fetch(`/api/analytics/captures/daily${dailyQs ? `?${dailyQs}` : ""}`, {
            cache: "no-store",
          }),
        ]);

        if (seq !== overviewRequestSeq.current) return;

        if (summaryRes.status === 401 || monthlyRes.status === 401 || dailyRes.status === 401) {
          router.push("/sign-in?callbackUrl=/analytics/captures");
          return;
        }

        if (summaryRes.status === 403 || monthlyRes.status === 403) {
          const payload = await (summaryRes.status === 403 ? summaryRes : monthlyRes)
            .json()
            .catch(() => ({}));
          setAuthForbidden(
            payload.error ||
              "Access denied: Capture analytics is available only to authorized merchants and platform administrators."
          );
          return;
        }

        const [summaryData, monthlyData] = await Promise.all([
          summaryRes.json(),
          monthlyRes.json(),
        ]);

        if (!summaryRes.ok) {
          throw new Error(summaryData.error || "Failed to load capture summary");
        }
        if (!monthlyRes.ok) {
          throw new Error(monthlyData.error || "Failed to load 6-month capture analytics");
        }

        setSummary(summaryData as CaptureSummaryResult);
        setMonthly(monthlyData as CaptureMonthlyResult);

        if (!dailyRes.ok) {
          const dailyErrBody = await dailyRes.json().catch(() => ({}));
          setDailyError(dailyErrBody.error || "Failed to load daily capture performance");
        } else {
          const dailyData = (await dailyRes.json()) as CaptureDailyResult;
          setDaily(dailyData);
          if (!opts.month) {
            setSelectedMonth(dailyData.selectedMonth);
          }
        }
      } catch (err) {
        if (seq !== overviewRequestSeq.current) return;
        setError(err instanceof Error ? err.message : "Unable to load capture analytics");
      } finally {
        if (seq === overviewRequestSeq.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router]
  );

  const fetchDailyOnly = useCallback(
    async (monthKey: string, currency: string | null) => {
      const seq = ++dailyRequestSeq.current;
      setDailyLoading(true);
      setDailyError(null);
      try {
        const sp = new URLSearchParams();
        sp.set("month", monthKey);
        if (currency) sp.set("currency", currency);

        const res = await fetch(`/api/analytics/captures/daily?${sp.toString()}`, {
          cache: "no-store",
        });
        if (seq !== dailyRequestSeq.current) return;

        if (res.status === 401) {
          router.push("/sign-in?callbackUrl=/analytics/captures");
          return;
        }

        if (res.status === 403) {
          const payload = await res.json().catch(() => ({}));
          setAuthForbidden(
            payload.error ||
              "Access denied: Capture analytics is available only to authorized merchants and platform administrators."
          );
          return;
        }

        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || "Failed to load selected month performance");
        }
        setDaily(body as CaptureDailyResult);
      } catch (err) {
        if (seq !== dailyRequestSeq.current) return;
        setDailyError(
          err instanceof Error ? err.message : "Unable to load selected month captures"
        );
      } finally {
        if (seq === dailyRequestSeq.current) {
          setDailyLoading(false);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    void fetchAllOverview({
      currency: selectedCurrency,
      month: selectedMonth,
      silent: false,
    });
    // Initial load; subsequent changes use explicit handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onRefresh = () => {
      void fetchAllOverview({
        currency: selectedCurrency,
        month: selectedMonth,
        silent: true,
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onRefresh();
      }
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("resolvegraph:capture-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("resolvegraph:capture-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchAllOverview, selectedCurrency, selectedMonth]);

  const handleMetricChange = (nextMetric: CaptureMetricMode) => {
    setMetric(nextMetric);
    syncUrlParams({ metric: nextMetric, currency: selectedCurrency, month: selectedMonth });
  };

  const handleCurrencyChange = (nextCurrency: string) => {
    setSelectedCurrency(nextCurrency);
    syncUrlParams({ metric, currency: nextCurrency, month: selectedMonth });
    void fetchAllOverview({ currency: nextCurrency, month: selectedMonth, silent: true });
  };

  const handleSelectMonth = (monthKey: string) => {
    setSelectedMonth(monthKey);
    syncUrlParams({ metric, currency: selectedCurrency, month: monthKey });
    void fetchDailyOnly(monthKey, selectedCurrency);
  };

  const handleResetToCurrentMonth = () => {
    const currentKey = summary?.currentMonth.monthKey;
    if (!currentKey) return;
    handleSelectMonth(currentKey);
  };

  const activeCurrency = summary?.selectedCurrency || monthly?.selectedCurrency || daily?.selectedCurrency || "USD";
  const barDataKey = metric === "amount" ? "grossCapturedMinor" : "captureCount";
  const lineDataKey = metric === "amount" ? "grossCapturedMinor" : "captureCount";

  const availableCurrencies = useMemo(
    () => summary?.availableCurrencies ?? monthly?.availableCurrencies ?? [],
    [summary, monthly]
  );

  if (authForbidden) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-2xl border border-rose-500/30 bg-[var(--surface)] p-8 text-center shadow-xs space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-[var(--ink)]">Capture Analytics Restricted</h1>
          <p className="text-sm text-[var(--ink-3)] max-w-md mx-auto">{authForbidden}</p>
          <div className="pt-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-4 py-2 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading && !summary) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
        <div className="h-24 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-32 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse" />
        <div className="h-80 rounded-2xl border border-[var(--line)] bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <div className="rounded-2xl border border-amber-500/30 bg-[var(--surface)] p-8 text-center shadow-xs space-y-4">
          <h1 className="text-lg font-bold text-[var(--ink)]">Unable to Load Capture Analytics</h1>
          <p className="text-sm text-[var(--ink-3)]">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                void fetchAllOverview({
                  currency: selectedCurrency,
                  month: selectedMonth,
                  silent: false,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-4 py-2 text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{backLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12" data-testid="capture-analytics-page">
      {/* Header & Controls */}
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6 sm:py-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{backLabel}</span>
              </Link>
              {!isMerchant && (
                <>
                  <span className="text-[var(--line)]">/</span>
                  <Link
                    href="/payments"
                    className="font-medium text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                  >
                    Payments Ledger
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
                Total Capture Analytics
              </h1>
              {summary && summary.environmentMode !== "NONE" && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wide border ${
                    summary.environmentMode === "LIVE"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {summary.environmentMode === "LIVE"
                    ? "PayPal Live"
                    : summary.environmentMode === "SANDBOX"
                      ? "PayPal Sandbox"
                      : "Sandbox + Live"}
                </span>
              )}
              {summary && (
                <span className="rounded-full border border-[var(--line)] bg-[var(--bg)] px-2.5 py-0.5 text-[11px] font-mono text-[var(--ink-3)]">
                  TZ: {summary.reportingPeriod.timezone}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--ink-3)]">
              Real-time captured settlement performance backed by persisted PayPal capture and refund
              transactions ({summary?.reportingPeriod.label || "All-time captured ledger"}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Shared Metric Toggle */}
            <div
              role="group"
              aria-label="Capture Analytics Metric Toggle"
              className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--bg)] p-1"
            >
              <button
                type="button"
                data-testid="metric-toggle-amount"
                aria-pressed={metric === "amount"}
                onClick={() => handleMetricChange("amount")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  metric === "amount"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Captured Amount</span>
              </button>
              <button
                type="button"
                data-testid="metric-toggle-count"
                aria-pressed={metric === "count"}
                onClick={() => handleMetricChange("count")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  metric === "count"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                }`}
              >
                <Hash className="h-3.5 w-3.5" />
                <span>Number of Captures</span>
              </button>
            </div>

            {/* Conditional Currency Selector (only rendered when > 1 currency exists in scope) */}
            {availableCurrencies.length > 1 ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1">
                <span className="text-[11px] font-medium text-[var(--ink-3)]">Currency:</span>
                {availableCurrencies.map((c) => (
                  <button
                    key={c.currency}
                    type="button"
                    data-testid={`currency-btn-${c.currency}`}
                    onClick={() => handleCurrencyChange(c.currency)}
                    className={`rounded-lg px-2 py-1 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      activeCurrency === c.currency
                        ? "bg-emerald-600 text-white"
                        : "text-[var(--ink-2)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    {c.currency}
                  </button>
                ))}
              </div>
            ) : (
              <span className="rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs font-mono font-semibold text-[var(--ink-2)]">
                {activeCurrency}
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                void fetchAllOverview({
                  currency: selectedCurrency,
                  month: selectedMonth,
                  silent: true,
                })
              }
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-2)] hover:border-[var(--accent)] hover:text-[var(--ink)] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Summary Financial KPI Strip */}
      {summary && (
        <section
          aria-label="Capture Financial Summary"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Card 1: Total Gross Captured (Lifetime) */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-3)]">
              <span>Total Capture ({activeCurrency})</span>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <div
              data-testid="summary-gross-captured"
              className="font-mono text-2xl font-bold tabular-nums text-[var(--ink)]"
            >
              {formatMinorCurrency(summary.lifetime.grossCapturedMinor, activeCurrency)}
            </div>
            <p className="text-xs text-[var(--ink-3)]">
              {summary.lifetime.captureCount.toLocaleString("en-US")} successful capture
              {summary.lifetime.captureCount === 1 ? "" : "s"} • Avg{" "}
              <span className="font-mono text-[var(--ink-2)]">
                {formatMinorCurrency(summary.lifetime.averageCaptureMinor, activeCurrency)}
              </span>
            </p>
          </div>

          {/* Card 2: Current Calendar Month (stays anchored to Current Month!) */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-3)]">
              <span>Current Month ({summary.currentMonth.shortLabel})</span>
              {summary.previousMonth.comparisonPercent !== null ? (
                summary.previousMonth.comparisonPercent >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )
              ) : (
                <Calendar className="h-4 w-4 text-sky-500" />
              )}
            </div>
            <div
              data-testid="summary-current-month"
              className="font-mono text-2xl font-bold tabular-nums text-[var(--ink)]"
            >
              {formatMinorCurrency(summary.currentMonth.grossCapturedMinor, activeCurrency)}
            </div>
            <p className="text-xs text-[var(--ink-3)]">
              {summary.currentMonth.captureCount.toLocaleString("en-US")} captures (Days 1–
              {summary.currentMonth.elapsedDays})
              {summary.previousMonth.comparisonPercent !== null && (
                <span
                  className={`ml-1.5 font-mono font-semibold ${
                    summary.previousMonth.comparisonPercent >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {summary.previousMonth.comparisonPercent >= 0 ? "+" : ""}
                  {summary.previousMonth.comparisonPercent.toFixed(1)}% vs{" "}
                  {summary.previousMonth.shortLabel}
                </span>
              )}
            </p>
          </div>

          {/* Card 3: Completed Refunds */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-3)]">
              <span>Completed Refunds</span>
              <RotateCcw className="h-4 w-4 text-amber-500" />
            </div>
            <div
              data-testid="summary-refunded"
              className="font-mono text-2xl font-bold tabular-nums text-[var(--ink)]"
            >
              {formatMinorCurrency(summary.lifetime.refundedMinor, activeCurrency)}
            </div>
            <p className="text-xs text-[var(--ink-3)]">
              {summary.lifetime.completedRefundCount.toLocaleString("en-US")} settled refund
              {summary.lifetime.completedRefundCount === 1 ? "" : "s"} (Pending/Failed excluded)
            </p>
          </div>

          {/* Card 4: Net Captured Settlement */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[var(--ink-3)]">
              <span>Net Captured Settlement</span>
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </div>
            <div
              data-testid="summary-net-captured"
              className="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
            >
              {formatMinorCurrency(summary.lifetime.netCapturedMinor, activeCurrency)}
            </div>
            <p className="text-xs text-[var(--ink-3)]">
              Gross captured minus completed refunds
            </p>
          </div>
        </section>
      )}

      {/* 6-Month Comparison Bar Chart */}
      {monthly && (
        <section
          aria-label="6-Month Capture Analytics"
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
                Capture Analytics
              </h2>
              <p className="text-xs text-[var(--ink-3)]">
                Last 6 calendar months ({monthly.months[0]?.shortLabel} –{" "}
                {monthly.months[monthly.months.length - 1]?.fullLabel}) • Click any month to inspect
                daily captures below
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-[var(--ink-2)]">
              <span>
                6-Mo Total:{" "}
                <strong className="text-[var(--ink)]">
                  {metric === "amount"
                    ? `${formatMinorCurrency(monthly.windowTotals.grossCapturedMinor, activeCurrency)} ${activeCurrency}`
                    : `${monthly.windowTotals.captureCount.toLocaleString("en-US")} captures`}
                </strong>
              </span>
            </div>
          </div>

          {!monthly.hasAnyCapturesInWindow && (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-xs text-[var(--ink-3)]">
              No successful {activeCurrency} captures recorded across the last 6 calendar months.
            </div>
          )}

          <div className="h-72 w-full" data-testid="monthly-bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthly.months}
                margin={{ top: 12, right: 16, left: 6, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-[var(--line)] opacity-60"
                />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 12, fill: "var(--ink-3)" }}
                  axisLine={{ stroke: "var(--line)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={metric === "amount"}
                  width={72}
                  tick={{ fontSize: 11, fill: "var(--ink-3)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    formatAxisTick({
                      value: Number(v),
                      currency: activeCurrency,
                      metric,
                    })
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
                  content={<MonthlyCaptureTooltip />}
                />
                <Bar
                  dataKey={barDataKey}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={56}
                  cursor="pointer"
                  onClick={(_bar, index) => {
                    const bucket = monthly.months[index];
                    if (bucket) {
                      handleSelectMonth(bucket.monthKey);
                    }
                  }}
                >
                  {monthly.months.map((bucket) => {
                    const isSelected = bucket.monthKey === (selectedMonth || daily?.selectedMonth);
                    const fill = isSelected
                      ? "#10B981"
                      : bucket.isCurrentMonth
                        ? "#0EA5E9"
                        : "#64748B";
                    return (
                      <Cell
                        key={bucket.monthKey}
                        fill={fill}
                        fillOpacity={isSelected ? 1 : bucket.isCurrentMonth ? 0.85 : 0.45}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive 6-Month Quick-Select Pills (guarantees 0-capture months are trivially clickable) */}
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-1"
            role="list"
            aria-label="Select Month for Daily Performance"
          >
            {monthly.months.map((bucket) => {
              const isSelected = bucket.monthKey === (selectedMonth || daily?.selectedMonth);
              return (
                <button
                  key={bucket.monthKey}
                  type="button"
                  data-testid={`month-pill-${bucket.monthKey}`}
                  onClick={() => handleSelectMonth(bucket.monthKey)}
                  className={`rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/40"
                      : bucket.isCurrentMonth
                        ? "border-sky-500/40 bg-sky-500/5 hover:border-sky-500"
                        : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--ink-3)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[var(--ink)]">
                      {bucket.shortLabel} {bucket.year}
                    </span>
                    {bucket.isCurrentMonth && (
                      <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-sky-600 dark:text-sky-300">
                        NOW
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs font-bold tabular-nums text-[var(--ink)]">
                    {metric === "amount"
                      ? formatMinorCurrency(bucket.grossCapturedMinor, bucket.currency)
                      : `${bucket.captureCount.toLocaleString("en-US")} captures`}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--ink-3)]">
                    {metric === "amount"
                      ? `${bucket.captureCount.toLocaleString("en-US")} capture${
                          bucket.captureCount === 1 ? "" : "s"
                        }`
                      : formatMinorCurrency(bucket.grossCapturedMinor, bucket.currency)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Selected / Current Month Daily Performance Line Chart */}
      <section
        aria-label="Daily Capture Performance"
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                data-testid="daily-section-heading"
                className="text-base sm:text-lg font-bold text-[var(--ink)]"
              >
                {daily?.isCurrentMonth
                  ? "Current Month Performance"
                  : `${daily?.monthLabel || selectedMonth || "Selected Month"} Performance`}
              </h2>
              {daily && !daily.isCurrentMonth && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                  Historical Month
                </span>
              )}
            </div>
            {daily && (
              <p className="text-xs text-[var(--ink-3)]">
                {daily.isCurrentMonth
                  ? `Month-to-date daily breakdown (Days 1–${daily.elapsedDaysCount} of ${daily.daysInMonth} in ${daily.timezone})`
                  : `Complete daily breakdown (All ${daily.daysInMonth} calendar days in ${daily.timezone})`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summary?.currentMonth.monthKey &&
              ((daily && !daily.isCurrentMonth) ||
                (dailyError && selectedMonth !== summary.currentMonth.monthKey)) && (
                <button
                  type="button"
                  data-testid="reset-current-month-btn"
                  onClick={handleResetToCurrentMonth}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Return to Current Month</span>
                </button>
              )}
          </div>
        </div>

        {/* Selected Month Summary Strip (separate from Card #2 Current Month summary) */}
        {daily && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3.5 text-xs">
            <div>
              <div className="text-[var(--ink-3)]">{daily.monthLabel} Captured</div>
              <div
                data-testid="daily-summary-gross"
                className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--ink)]"
              >
                {formatMinorCurrency(daily.summary.grossCapturedMinor, activeCurrency)}{" "}
                <span className="text-[10px] font-normal text-[var(--ink-3)]">
                  {activeCurrency}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[var(--ink-3)]">Successful Captures</div>
              <div
                data-testid="daily-summary-count"
                className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--ink)]"
              >
                {daily.summary.captureCount.toLocaleString("en-US")}
              </div>
            </div>
            <div>
              <div className="text-[var(--ink-3)]">Avg Capture Amount</div>
              <div
                data-testid="daily-summary-avg"
                className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--ink)]"
              >
                {daily.summary.captureCount > 0
                  ? formatMinorCurrency(daily.summary.averageCaptureMinor, activeCurrency)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-[var(--ink-3)]">Completed Refunds</div>
              <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[var(--ink)]">
                {formatMinorCurrency(daily.summary.refundedMinor, activeCurrency)}
              </div>
            </div>
            <div>
              <div className="text-[var(--ink-3)]">Net Settled</div>
              <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMinorCurrency(daily.summary.netCapturedMinor, activeCurrency)}
              </div>
            </div>
          </div>
        )}

        {dailyError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-xs text-rose-600 dark:text-rose-300 flex flex-wrap items-center justify-between gap-2">
            <span>{dailyError}</span>
            <div className="flex items-center gap-3">
              {summary?.currentMonth.monthKey &&
                selectedMonth !== summary.currentMonth.monthKey && (
                  <button
                    type="button"
                    data-testid="daily-error-reset-btn"
                    onClick={handleResetToCurrentMonth}
                    className="font-semibold underline text-emerald-700 dark:text-emerald-300 cursor-pointer"
                  >
                    Return to Current Month
                  </button>
                )}
              <button
                type="button"
                onClick={() =>
                  selectedMonth && void fetchDailyOnly(selectedMonth, selectedCurrency)
                }
                className="font-semibold underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {daily && !daily.hasCapturesInMonth && !dailyLoading && !dailyError && (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-xs text-[var(--ink-3)]">
            No successful {activeCurrency} captures recorded in {daily.monthLabel}. Every day on the
            chart reflects $0.00 / 0 captures accurately.
          </div>
        )}

        <div className="relative h-72 w-full" data-testid="daily-line-chart">
          {dailyLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--surface)]/70 backdrop-blur-[1px]">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--ink-2)]">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                <span>Loading daily breakdown...</span>
              </span>
            </div>
          )}

          {daily && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={daily.days}
                margin={{ top: 12, right: 16, left: 6, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-[var(--line)] opacity-60"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "var(--ink-3)" }}
                  axisLine={{ stroke: "var(--line)" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={metric === "amount"}
                  width={72}
                  tick={{ fontSize: 11, fill: "var(--ink-3)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    formatAxisTick({
                      value: Number(v),
                      currency: activeCurrency,
                      metric,
                    })
                  }
                />
                <Tooltip content={<DailyCaptureTooltip />} />
                <Line
                  type="monotone"
                  dataKey={lineDataKey}
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#10B981", stroke: "#FFFFFF", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
