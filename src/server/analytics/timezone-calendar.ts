import { getCurrencyDecimals, toDecimalString } from '@/server/paypal/utils/money';

export class CaptureAnalyticsValidationError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'CaptureAnalyticsValidationError';
    this.status = status;
  }
}

export interface ZonedDateParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number;
  minute: number;
  second: number;
}

export interface CalendarMonthSlot {
  monthKey: string; // YYYY-MM
  year: number;
  month: number; // 1..12
  shortLabel: string; // e.g. "Jun"
  monthName: string; // e.g. "June"
  fullLabel: string; // e.g. "June 2026"
  startUtc: Date;
  endExclusiveUtc: Date;
  isCurrentMonth: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

function normalizeTimezoneAlias(tz: string): string {
  const trimmed = tz.trim();
  if (trimmed === 'Asia/Calcutta') return 'Asia/Kolkata';
  return trimmed;
}

/**
 * Validates and resolves the active business timezone.
 * Order of precedence: explicit requested timezone > configured env > runtime system timezone > Asia/Kolkata.
 */
export function resolveBusinessTimezone(requestedTimezone?: string | null): string {
  if (requestedTimezone !== undefined && requestedTimezone !== null && requestedTimezone !== '') {
    const normalized = normalizeTimezoneAlias(requestedTimezone);
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: normalized });
      return normalized;
    } catch {
      throw new CaptureAnalyticsValidationError(
        `Invalid timezone parameter: "${requestedTimezone}". Expected a valid IANA timezone identifier (e.g. "Asia/Kolkata", "UTC", "America/New_York").`
      );
    }
  }

  const candidates = [
    process.env.BUSINESS_TIMEZONE,
    process.env.APP_TIMEZONE,
    process.env.TZ,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    'Asia/Kolkata',
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeTimezoneAlias(candidate);
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: normalized });
      return normalized;
    } catch {
      // Try next candidate
    }
  }

  return 'UTC';
}

/**
 * Extracts year, month, day, hour, minute, second in the specified IANA timezone.
 */
export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const fmt = getPartsFormatter(timeZone);
  const parts = fmt.formatToParts(date);
  let year = 1970;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (const part of parts) {
    switch (part.type) {
      case 'year':
        year = parseInt(part.value, 10);
        break;
      case 'month':
        month = parseInt(part.value, 10);
        break;
      case 'day':
        day = parseInt(part.value, 10);
        break;
      case 'hour': {
        const h = parseInt(part.value, 10);
        hour = h === 24 ? 0 : h;
        break;
      }
      case 'minute':
        minute = parseInt(part.value, 10);
        break;
      case 'second':
        second = parseInt(part.value, 10);
        break;
    }
  }

  return { year, month, day, hour, minute, second };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}`;
}

export function formatDayKey(year: number, month: number, day: number): string {
  return `${formatMonthKey(year, month)}-${day.toString().padStart(2, '0')}`;
}

export function getZonedMonthKey(date: Date, timeZone: string): string {
  const p = getZonedDateParts(date, timeZone);
  return formatMonthKey(p.year, p.month);
}

export function getZonedDayKey(date: Date, timeZone: string): string {
  const p = getZonedDateParts(date, timeZone);
  return formatDayKey(p.year, p.month, p.day);
}

/**
 * Returns the exact UTC instant corresponding to 00:00:00.000 of a calendar date in `timeZone`.
 */
export function getZonedStartOfDayUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string
): Date {
  const targetAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let candidate = targetAsUtc;

  for (let i = 0; i < 3; i++) {
    const actual = getZonedDateParts(new Date(candidate), timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      0
    );
    const diff = targetAsUtc - actualAsUtc;
    if (diff === 0) break;
    candidate += diff;
  }

  return new Date(candidate);
}

export function getZonedMonthStartUtc(year: number, month: number, timeZone: string): Date {
  return getZonedStartOfDayUtc(year, month, 1, timeZone);
}

export function getNextMonthYearMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function getPrevMonthYearMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function getNextZonedMonthStartUtc(year: number, month: number, timeZone: string): Date {
  const next = getNextMonthYearMonth(year, month);
  return getZonedMonthStartUtc(next.year, next.month, timeZone);
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getMonthDisplayNames(year: number, month: number): {
  shortLabel: string;
  monthName: string;
  fullLabel: string;
} {
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const shortLabel = MONTH_SHORT_NAMES[month - 1] || monthName.slice(0, 3);
  return {
    shortLabel,
    monthName,
    fullLabel: `${monthName} ${year}`,
  };
}

export function getFullDateLabel(year: number, month: number, day: number): string {
  const { monthName } = getMonthDisplayNames(year, month);
  return `${monthName} ${day}, ${year}`;
}

export function getShortDateLabel(month: number, day: number): string {
  const shortMonth = MONTH_SHORT_NAMES[month - 1] || `${month}`;
  return `${shortMonth} ${day}`;
}

/**
 * Computes the last N calendar months (default 6) ending at `referenceDate` in `timeZone`.
 */
export function getLastMonthsWindow(
  referenceDate: Date,
  timeZone: string,
  count: number = 6
): CalendarMonthSlot[] {
  const current = getZonedDateParts(referenceDate, timeZone);
  const currentKey = formatMonthKey(current.year, current.month);

  const pairs: Array<{ year: number; month: number }> = [];
  let cursor = { year: current.year, month: current.month };
  for (let i = 0; i < count; i++) {
    pairs.unshift(cursor);
    cursor = getPrevMonthYearMonth(cursor.year, cursor.month);
  }

  return pairs.map(({ year, month }) => {
    const monthKey = formatMonthKey(year, month);
    const names = getMonthDisplayNames(year, month);
    const startUtc = getZonedMonthStartUtc(year, month, timeZone);
    const isCurrentMonth = monthKey === currentKey;
    const nextStart = getNextZonedMonthStartUtc(year, month, timeZone);
    const endExclusiveUtc = isCurrentMonth
      ? new Date(Math.min(nextStart.getTime(), referenceDate.getTime() + 1))
      : nextStart;

    return {
      monthKey,
      year,
      month,
      ...names,
      startUtc,
      endExclusiveUtc,
      isCurrentMonth,
    };
  });
}

/**
 * Parses and validates `?month=YYYY-MM`, defaulting to current zoned month if omitted.
 * Rejects invalid formats or any future month after the current zoned month.
 */
export function parseAndValidateMonthParam(
  monthParam: string | null | undefined,
  referenceDate: Date,
  timeZone: string
): {
  monthKey: string;
  year: number;
  month: number;
  isCurrentMonth: boolean;
  daysInMonth: number;
  elapsedDaysCount: number;
  startUtc: Date;
  endExclusiveUtc: Date;
} {
  const current = getZonedDateParts(referenceDate, timeZone);
  const currentKey = formatMonthKey(current.year, current.month);

  let targetYear = current.year;
  let targetMonth = current.month;

  if (monthParam !== undefined && monthParam !== null && monthParam !== '') {
    const trimmed = monthParam.trim();
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(trimmed);
    if (!match) {
      throw new CaptureAnalyticsValidationError(
        `Invalid month format: "${monthParam}". Expected YYYY-MM (e.g. "2026-11").`
      );
    }
    targetYear = parseInt(match[1], 10);
    targetMonth = parseInt(match[2], 10);
  }

  const targetKey = formatMonthKey(targetYear, targetMonth);
  if (targetKey > currentKey) {
    throw new CaptureAnalyticsValidationError(
      `Cannot inspect future month "${targetKey}". Latest available period is "${currentKey}".`
    );
  }

  const isCurrentMonth = targetKey === currentKey;
  const daysInMonth = getDaysInMonth(targetYear, targetMonth);
  const elapsedDaysCount = isCurrentMonth ? current.day : daysInMonth;
  const startUtc = getZonedMonthStartUtc(targetYear, targetMonth, timeZone);
  const nextMonthStart = getNextZonedMonthStartUtc(targetYear, targetMonth, timeZone);
  const endExclusiveUtc = isCurrentMonth
    ? new Date(Math.min(nextMonthStart.getTime(), referenceDate.getTime() + 1))
    : nextMonthStart;

  return {
    monthKey: targetKey,
    year: targetYear,
    month: targetMonth,
    isCurrentMonth,
    daysInMonth,
    elapsedDaysCount,
    startUtc,
    endExclusiveUtc,
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
};

/**
 * Formats integer minor units with exact decimal precision (zero IEEE-754 loss on display strings).
 */
export function formatMinorCurrency(amountMinor: number, currency = 'USD'): string {
  const code = (currency || 'USD').toUpperCase().trim();
  const safeMinor = Number.isFinite(amountMinor) ? Math.round(amountMinor) : 0;
  const decimals = getCurrencyDecimals(code);
  const decimalStr = toDecimalString(safeMinor, code);
  const isNegative = decimalStr.startsWith('-');
  const unsigned = isNegative ? decimalStr.slice(1) : decimalStr;
  const [wholeRaw, fractionRaw] = unsigned.split('.');

  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  const wholeFormatted = BigInt(wholeRaw || '0').toLocaleString(locale);
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
  const fracPart = decimals > 0 ? `.${(fractionRaw || '').padEnd(decimals, '0')}` : '';

  return `${isNegative ? '-' : ''}${symbol}${wholeFormatted}${fracPart}`;
}
