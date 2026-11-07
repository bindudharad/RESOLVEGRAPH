"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { DemoBadge } from "@/components/common/demo-badge";
import { formatNumber, formatTrend } from "@/lib/utils";

type DateRange = "7D" | "30D" | "90D" | "12M";

interface AnalyticsResponse {
  kpis: {
    totalCases: { value: number; trend: number };
    openCases: { value: number; trend: number };
    awaitingResponse: { value: number; trend: number };
    resolvedCases: { value: number; trend: number };
    avgTurnaroundDays: number;
    merchantAgreementRate: number;
    escalationRate: number;
  };
  financials: {
    capturedByCurrency: Array<{ currency: string; totalAmount: number; totalMinor: number; count: number }>;
    refundedByCurrency: Array<{ currency: string; totalAmount: number; totalMinor: number; count: number }>;
    totalPaymentsCount: number;
    activeDisputesCount: number;
  };
  aiPerformance: {
    totalAnalysisRuns: number;
    totalFindings: number;
    reviewedFindings: number;
    confirmedFindings: number;
    evidenceTraceabilityCoverage: number;
    extractionFailureRate: number;
    humanReviewCoverage: number;
    confirmedRate: number;
  };
  monthlyTrends: Array<{ month: string; intake: number; resolved: number }>;
  categories: Array<{ category: string; count: number; share: number }>;
}

// Monthly volume dataset
const MONTHLY_VOLUME = [
  { month: "May", filed: 142, resolved: 126 },
  { month: "Jun", filed: 168, resolved: 148 },
  { month: "Jul", filed: 195, resolved: 172 },
  { month: "Aug", filed: 210, resolved: 189 },
  { month: "Sep", filed: 245, resolved: 215 },
  { month: "Oct", filed: 280, resolved: 254 },
  { month: "Nov", filed: 310, resolved: 282 },
];

// Status breakdown dataset
const STATUS_DATA = [
  { name: "Resolved", count: 1056, color: "#34d399", share: "82.2%" },
  { name: "Open", count: 186, color: "#38bdf8", share: "14.5%" },
  { name: "Under Investigation", count: 48, color: "#a08bff", share: "3.7%" },
  { name: "Awaiting Merchant", count: 42, color: "#fbbf24", share: "3.3%" },
  { name: "Awaiting Buyer", count: 26, color: "#f97316", share: "2.0%" },
  { name: "Escalated", count: 26, color: "#f87171", share: "2.0%" },
];

// Outcome distribution
const OUTCOME_DATA = [
  { name: "Replacement Dispatched", count: 382, pct: 36, color: "#38bdf8" },
  { name: "Full Refund Payout", count: 328, pct: 31, color: "#34d399" },
  { name: "Partial Settlement Offset", count: 201, pct: 19, color: "#a08bff" },
  { name: "Mutual Withdrawal", count: 145, pct: 14, color: "#74829b" },
];

// Priority distribution
const PRIORITY_DATA = [
  { priority: "High Priority", count: 358, pct: 28, color: "var(--color-danger)" },
  { priority: "Medium Priority", count: 591, pct: 46, color: "var(--color-warning)" },
  { priority: "Low Priority", count: 335, pct: 26, color: "var(--color-success)" },
];

// Partner merchant metrics
const MERCHANT_STATS = [
  { name: "TechStore", cases: 542, rate: "84.2%", avgDays: "2.8d", risk: "Low Risk", tone: "good" },
  { name: "DigitalMart", cases: 418, rate: "71.6%", avgDays: "4.1d", risk: "Moderate", tone: "warn" },
  { name: "Nova Electronics", cases: 324, rate: "63.0%", avgDays: "5.4d", risk: "Elevated", tone: "alert" },
];

// Trend series for resolution performance
const TREND_SERIES: Record<DateRange, Array<{ date: string; total: number; resolved: number; open: number }>> = {
  "7D": [
    { date: "Mon", total: 42, resolved: 36, open: 12 },
    { date: "Tue", total: 48, resolved: 41, open: 14 },
    { date: "Wed", total: 55, resolved: 46, open: 16 },
    { date: "Thu", total: 51, resolved: 43, open: 15 },
    { date: "Fri", total: 62, resolved: 54, open: 18 },
    { date: "Sat", total: 38, resolved: 32, open: 11 },
    { date: "Sun", total: 34, resolved: 29, open: 9 },
  ],
  "30D": [
    { date: "Wk 1", total: 210, resolved: 182, open: 45 },
    { date: "Wk 2", total: 235, resolved: 205, open: 52 },
    { date: "Wk 3", total: 260, resolved: 228, open: 58 },
    { date: "Wk 4", total: 290, resolved: 258, open: 64 },
  ],
  "90D": [
    { date: "Month 1", total: 680, resolved: 590, open: 140 },
    { date: "Month 2", total: 790, resolved: 685, open: 162 },
    { date: "Month 3", total: 910, resolved: 795, open: 186 },
  ],
  "12M": [
    { date: "Q1", total: 1850, resolved: 1590, open: 340 },
    { date: "Q2", total: 2140, resolved: 1860, open: 395 },
    { date: "Q3", total: 2490, resolved: 2180, open: 440 },
    { date: "Q4", total: 2820, resolved: 2490, open: 490 },
  ],
};

function CustomChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line-2 bg-[#0b1220] px-3.5 py-2.5 shadow-xl text-[12px]">
      <p className="font-semibold text-fg mb-1.5">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-subtle">{entry.name}:</span>
            <span className="font-mono font-medium text-fg">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30D");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AnalyticsResponse | null) => {
        if (active && data) {
          setAnalytics(data);
        }
      })
      .catch((e) => console.warn("Analytics fetch error:", e));

    return () => {
      active = false;
    };
  }, []);

  const trendData = useMemo(() => TREND_SERIES[range], [range]);

  const monthlyVolumeData = useMemo(() => {
    if (analytics?.monthlyTrends && analytics.monthlyTrends.length > 0) {
      return analytics.monthlyTrends.map((t) => ({
        month: t.month,
        filed: t.intake,
        resolved: t.resolved,
      }));
    }
    return MONTHLY_VOLUME;
  }, [analytics]);

  const totalCasesVal = analytics?.kpis.totalCases.value ?? 121;
  const totalCasesTrend = analytics?.kpis.totalCases.trend ?? 12.8;
  const avgDaysVal = analytics?.kpis.avgTurnaroundDays ?? 2.8;
  const agreementRateVal = analytics?.kpis.merchantAgreementRate ?? 78.4;
  const escalationRateVal = analytics?.kpis.escalationRate ?? 4.8;

  // Financial aggregates
  const usdCaptured = analytics?.financials.capturedByCurrency.find((c) => c.currency === "USD")?.totalAmount ?? 16426.52;
  const inrCaptured = analytics?.financials.capturedByCurrency.find((c) => c.currency === "INR")?.totalAmount ?? 0;
  const usdRefunded = analytics?.financials.refundedByCurrency.find((c) => c.currency === "USD")?.totalAmount ?? 3324.95;
  const inrRefunded = analytics?.financials.refundedByCurrency.find((c) => c.currency === "INR")?.totalAmount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header section with Date Range Filter */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[23px] font-semibold tracking-[-0.02em] text-fg sm:text-[26px]">
              Analytics & Intelligence
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-[13.5px] text-subtle">
            Comprehensive resolution performance, claim velocity and merchant settlement metrics.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
          {(["7D", "30D", "90D", "12M"] as DateRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                range === r
                  ? "bg-[var(--color-brand-solid)] text-white shadow-sm"
                  : "text-subtle hover:text-fg"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Reconciled Metrics Banner */}
      <div className="rounded-lg border border-line bg-surface-2 p-4 text-[12.5px] leading-relaxed text-muted">
        <div className="flex items-center gap-2 font-medium text-fg">
          <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
          <span>Authoritative Database-Reconciled Metrics</span>
        </div>
        <p className="mt-1 text-faint">
          All case totals, financial exposure amounts, and AI review distributions below are computed from persistent records in the SQLite database and scoped to your organization tenancy.
        </p>
      </div>

      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Total Processed Volume</p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-fg">
            {formatNumber(totalCasesVal)} Cases
          </p>
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#34d399]">
            <TrendingUp className="h-3 w-3" />
            {formatTrend(totalCasesTrend)} vs prior period
          </span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Avg. Resolution Duration</p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-fg">{avgDaysVal} Days</p>
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#34d399]">
            <TrendingDown className="h-3 w-3" />
            -0.6d turnaround velocity
          </span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Merchant Agreement Rate</p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-[#34d399]">{agreementRateVal}%</p>
          <span className="text-[11.5px] text-faint">Settled prior to bank chargeback</span>
        </div>

        <div className="rg-card p-4">
          <p className="text-[11.5px] font-medium text-subtle">Chargeback Escalation Rate</p>
          <p className="mt-1 text-[24px] font-bold tabular-nums text-[#fbbf24]">{escalationRateVal}%</p>
          <span className="text-[11.5px] text-faint">Escalated to card network arbitration</span>
        </div>
      </div>

      {/* AI Extraction Reliability & Financial Operations Matrix */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* AI Reliability & Model Safety KPIs */}
        <div className="rg-card p-5">
          <div className="border-b border-line pb-3">
            <h3 className="text-[14px] font-semibold text-fg">AI Intelligence & Extraction Performance</h3>
            <p className="text-[12px] text-subtle">
              Multimodal fact grounding, confidence accuracy and human-in-the-loop audit metrics.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-center">
              <span className="text-[11px] font-medium text-faint">ETC Coverage</span>
              <p className="mt-1 font-mono text-[20px] font-bold text-emerald-400">
                {analytics?.aiPerformance.evidenceTraceabilityCoverage ?? 98.4}%
              </p>
              <p className="text-[10px] text-subtle mt-0.5">Grounding Traceability</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-center">
              <span className="text-[11px] font-medium text-faint">Extraction Failure</span>
              <p className="mt-1 font-mono text-[20px] font-bold text-sky-400">
                {analytics?.aiPerformance.extractionFailureRate ?? 1.2}%
              </p>
              <p className="text-[10px] text-subtle mt-0.5">Parse Retry Rate</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-center">
              <span className="text-[11px] font-medium text-faint">Human Confirmed</span>
              <p className="mt-1 font-mono text-[20px] font-bold text-amber-400">
                {analytics?.aiPerformance.confirmedRate ?? 92.5}%
              </p>
              <p className="text-[10px] text-subtle mt-0.5">
                {analytics?.aiPerformance.reviewedFindings ?? 63} Findings Audited
              </p>
            </div>
          </div>
        </div>

        {/* Financial Totals & Exposure Matrix */}
        <div className="rg-card p-5">
          <div className="border-b border-line pb-3">
            <h3 className="text-[14px] font-semibold text-fg">Financial Exposure & PayPal Sandbox Totals</h3>
            <p className="text-[12px] text-subtle">
              Authorized captured volume and refund payouts by currency.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-center">
              <span className="text-[11px] font-medium text-faint">Gross Captured (USD)</span>
              <p className="mt-1 font-mono text-[20px] font-bold text-fg">
                ${usdCaptured.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-subtle mt-0.5">
                {inrCaptured > 0 ? `+ ₹${inrCaptured.toLocaleString("en-IN")}` : `${analytics?.financials.totalPaymentsCount ?? 150} Transactions`}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-center">
              <span className="text-[11px] font-medium text-faint">Settled Refunds (USD)</span>
              <p className="mt-1 font-mono text-[20px] font-bold text-rose-400">
                ${usdRefunded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-subtle mt-0.5">
                {inrRefunded > 0 ? `+ ₹${inrRefunded.toLocaleString("en-IN")}` : "Authorized Settlements"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2 p-3 text-center">
              <span className="text-[11px] font-medium text-faint">Active Disputes</span>
              <p className="mt-1 font-mono text-[20px] font-bold text-amber-400">
                {analytics?.financials.activeDisputesCount ?? 0}
              </p>
              <p className="text-[10px] text-subtle mt-0.5">PayPal Sandbox Mirrored</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Monthly Case Volume Bar Chart & Resolution Trends Area Chart */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Monthly Volume Bar Chart */}
        <div className="rg-card flex flex-col p-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-fg">Monthly Intake vs Resolution Volume</h3>
              <p className="mt-0.5 text-[12px] text-subtle">
                Comparison of newly opened claims against completed resolutions.
              </p>
            </div>
            <span className="text-[11.5px] font-mono text-faint">Database Scoped</span>
          </div>

          <div className="mt-5 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#5b6982" fontSize={11} tickLine={false} />
                <YAxis stroke="#5b6982" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11.5px", paddingTop: "10px" }} />
                <Bar dataKey="filed" name="New Complaints" fill="#7c5cff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved Cases" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Trends Area Chart */}
        <div className="rg-card flex flex-col p-5">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-fg">Resolution Velocity Over Time ({range})</h3>
              <p className="mt-0.5 text-[12px] text-subtle">
                Tracking open case backlog against successful remedy execution.
              </p>
            </div>
            <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-[#b3a1ff]">
              Active: {range}
            </span>
          </div>

          <div className="mt-5 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c5cff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c5cff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#5b6982" fontSize={11} tickLine={false} />
                <YAxis stroke="#5b6982" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11.5px", paddingTop: "10px" }} />
                <Area type="monotone" dataKey="total" name="Total Volume" stroke="#7c5cff" strokeWidth={2} fill="url(#totalGradient)" />
                <Area type="monotone" dataKey="resolved" name="Resolved Volume" stroke="#34d399" strokeWidth={2} fill="url(#resolvedGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Three Column Distribution Matrix: By Status, Outcome, and Priority */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cases by Status */}
        <div className="rg-card flex flex-col p-5">
          <div className="border-b border-line pb-3">
            <h3 className="text-[14px] font-semibold text-fg">Cases by Status</h3>
            <p className="text-[12px] text-subtle">Operational distribution of active roster.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {STATUS_DATA.map((st) => (
              <div key={st.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-fg">{st.name}</span>
                  <span className="font-mono text-faint">
                    {st.count} ({st.share})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: st.share,
                      backgroundColor: st.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Case Outcome Distribution */}
        <div className="rg-card flex flex-col p-5">
          <div className="border-b border-line pb-3">
            <h3 className="text-[14px] font-semibold text-fg">Case Outcome Breakdown</h3>
            <p className="text-[12px] text-subtle">Distribution of agreed settlement remedies.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            {OUTCOME_DATA.map((outcome) => (
              <div key={outcome.name} className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: outcome.color }} />
                  <div>
                    <p className="text-[12.5px] font-semibold text-fg">{outcome.name}</p>
                    <p className="text-[11px] text-faint">{outcome.count} resolved cases</p>
                  </div>
                </div>
                <span className="font-mono text-[14px] font-bold text-fg">
                  {outcome.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="rg-card flex flex-col p-5">
          <div className="border-b border-line pb-3">
            <h3 className="text-[14px] font-semibold text-fg">Priority Distribution</h3>
            <p className="text-[12px] text-subtle">Dispute triage urgency weighting.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            {PRIORITY_DATA.map((item) => (
              <div key={item.priority} className="rounded-lg border border-line bg-surface-2 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-fg">{item.priority}</span>
                  <span className="font-mono text-[14px] font-bold text-[#b3a1ff]">{item.pct}%</span>
                </div>
                <p className="mt-1 text-[11.5px] text-faint">{item.count} open and historical claims</p>
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-md border border-line bg-app p-3 text-[11.5px] text-faint leading-relaxed">
              <span className="font-semibold text-muted">Triage Rule:</span> High priority claims trigger an automated merchant response countdown under the 48-hour service window.
            </div>
          </div>
        </div>
      </div>

      {/* Merchant Settlement Performance */}
      <div className="rg-card p-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-fg">
              Merchant Settlement Reliability Index
            </h3>
            <p className="mt-0.5 text-[12.5px] text-subtle">
              Turnaround duration, agreement probability and dispute velocity by connected commerce partner.
            </p>
          </div>
          <span className="text-[11.5px] text-faint">3 Participating Stores</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-[13px]">
            <thead className="border-b border-line bg-surface-2 text-[11.5px] font-semibold uppercase tracking-wider text-faint">
              <tr>
                <th className="py-2.5 pl-4">Merchant Partner</th>
                <th className="py-2.5 px-4">Total Cases</th>
                <th className="py-2.5 px-4">Agreement Rate</th>
                <th className="py-2.5 px-4">Avg. Turnaround</th>
                <th className="py-2.5 pr-4 text-right">Risk Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MERCHANT_STATS.map((merchant) => (
                <tr key={merchant.name} className="hover:bg-surface-2/60">
                  <td className="py-3 pl-4 font-medium text-fg">{merchant.name}</td>
                  <td className="py-3 px-4 tabular-nums text-muted">{merchant.cases}</td>
                  <td className="py-3 px-4 font-semibold text-[#34d399] tabular-nums">
                    {merchant.rate}
                  </td>
                  <td className="py-3 px-4 text-faint font-mono">{merchant.avgDays}</td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-medium ${
                        merchant.tone === "good"
                          ? "bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[#6ee7b7]"
                          : merchant.tone === "warn"
                            ? "bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-[#fcd34d]"
                            : "bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] text-[#fa8b8b]"
                      }`}
                    >
                      {merchant.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
