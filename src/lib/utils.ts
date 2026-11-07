import type { Currency } from "@/lib/types";

/**
 * Minimal class-name joiner.
 * Kept dependency-free on purpose: Step 1 only needs string + conditional joining.
 */
export function cn(
  ...values: Array<string | false | null | undefined | Record<string, boolean>>
): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string") {
      out.push(value);
    } else {
      for (const [key, enabled] of Object.entries(value)) {
        if (enabled) out.push(key);
      }
    }
  }
  return out.join(" ");
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
};

const CURRENCY_FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  INR: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

/** ₹6,499 / $149.00 — symbol + locale-correct grouping, no decimals for INR. */
export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const body = CURRENCY_FORMATTERS[currency].format(amount);
  return `${symbol}${body}`;
}

/** 1,284 — used for KPI values and axis ticks. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** +12.8% — always signed, one decimal. */
export function formatTrend(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/* ---------------------------------------------------------------------------
   Date helpers
   ---------------------------------------------------------------------------
   Mock timestamps are derived from *calendar-day* anchors rather than a raw
   `Date.now()` captured at module load. That keeps server-rendered markup and
   client-hydrated markup byte-identical, which avoids hydration mismatches
   while still producing dates that stay relative to "today".
   --------------------------------------------------------------------------- */

/** Midnight of `offsetDays` from today (0 = today, -1 = yesterday). */
export function dayAnchor(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** A specific wall-clock time on a given day anchor. */
export function atTime(day: Date, hours: number, minutes = 0): Date {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATE_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** Nov 2, 2026 */
export function formatDate(value: string | Date): string {
  return DATE_FORMAT.format(toDate(value));
}

/** Oct 28 */
export function formatDateShort(value: string | Date): string {
  return DATE_MONTH_FORMAT.format(toDate(value));
}

/** Nov 2, 09:14 */
export function formatDateTime(value: string | Date): string {
  const d = toDate(value);
  return `${DATE_MONTH_FORMAT.format(d)}, ${TIME_FORMAT.format(d)}`;
}

/** Monday, November 2, 2026 — used by the dashboard welcome header. */
export function formatLongDate(value: string | Date): string {
  return DAY_FORMAT.format(toDate(value));
}

/** Whole calendar days between a date and today (never negative for past dates). */
function daysAgo(value: string | Date): number {
  const target = toDate(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((dayAnchor(0).getTime() - target.getTime()) / 86_400_000);
}

/**
 * "Today", "Yesterday", "2 days ago", "Oct 24" — deterministic for the current
 * calendar day, so server and client render the same string.
 */
export function relativeLabel(value: string | Date): string {
  const diff = daysAgo(value);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return formatDateShort(value);
}

/** "3h ago", "45m ago", "2d ago" — compact relative age used in tables. */
export function relativeAge(value: string | Date): string {
  const diff = daysAgo(value);
  if (diff === 0) {
    const d = toDate(value);
    const now = atTime(dayAnchor(0), 23, 59);
    const minutes = Math.max(
      0,
      Math.round((now.getTime() - d.getTime()) / 60_000),
    );
    if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }
  if (diff === 1) return "1d ago";
  if (diff < 30) return `${diff}d ago`;
  return formatDateShort(value);
}

/** Deterministic plural helper for activity/attention copy. */
export function plural(count: number, singular: string, pluralWord?: string): string {
  return count === 1 ? singular : (pluralWord ?? `${singular}s`);
}

/** Percentage with one decimal, always derived from real parts (never invented). */
export function shareOf(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
