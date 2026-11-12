import { prisma } from '@/lib/prisma';
import { FeatureFlags } from '@/lib/feature-flags';
import { AuthenticatedUser } from '@/server/auth/session';
import { AuthError } from '@/server/auth/require-auth';
import { Prisma, UserRole } from '@/generated/prisma/client';
import {
  CaptureAnalyticsValidationError,
  formatDayKey,
  formatMonthKey,
  getDaysInMonth,
  getFullDateLabel,
  getLastMonthsWindow,
  getMonthDisplayNames,
  getPrevMonthYearMonth,
  getShortDateLabel,
  getZonedDateParts,
  getZonedDayKey,
  getZonedMonthKey,
  getZonedMonthStartUtc,
  parseAndValidateMonthParam,
  resolveBusinessTimezone,
} from './timezone-calendar';

export type CaptureEnvironmentFilter = 'all' | 'sandbox' | 'live';
export type CaptureEnvironmentMode = 'LIVE' | 'SANDBOX' | 'MIXED' | 'NONE';

export interface CaptureAnalyticsQueryOptions {
  currency?: string | null;
  organizationId?: string | null;
  environment?: string | null;
  timezone?: string | null;
  month?: string | null;
  referenceDate?: Date;
}

export interface CurrencyCaptureTotals {
  currency: string;
  grossCapturedMinor: number;
  refundedMinor: number;
  netCapturedMinor: number;
  captureCount: number;
  completedRefundCount: number;
  averageCaptureMinor: number;
}

export interface CaptureSummaryResult {
  reportingPeriod: {
    key: 'LIFETIME';
    label: string;
    currentMonthKey: string;
    currentMonthLabel: string;
    previousMonthKey: string;
    previousMonthLabel: string;
    timezone: string;
    asOf: string;
  };
  scope: {
    persona: 'PLATFORM' | 'MERCHANT';
    organizationIds: string[] | null;
    requestedOrganizationId: string | null;
  };
  environmentMode: CaptureEnvironmentMode;
  selectedCurrency: string;
  availableCurrencies: CurrencyCaptureTotals[];
  lifetime: CurrencyCaptureTotals;
  currentMonth: CurrencyCaptureTotals & {
    monthKey: string;
    label: string;
    shortLabel: string;
    elapsedDays: number;
    daysInMonth: number;
  };
  previousMonth: CurrencyCaptureTotals & {
    monthKey: string;
    label: string;
    shortLabel: string;
    comparisonPercent: number | null;
    comparisonDeltaMinor: number | null;
  };
  hasAnyCaptures: boolean;
}

export interface MonthlyCaptureBucket {
  monthKey: string;
  year: number;
  month: number;
  shortLabel: string;
  monthName: string;
  fullLabel: string;
  isCurrentMonth: boolean;
  currency: string;
  grossCapturedMinor: number;
  refundedMinor: number;
  netCapturedMinor: number;
  captureCount: number;
  completedRefundCount: number;
}

export interface CaptureMonthlyResult {
  timezone: string;
  selectedCurrency: string;
  availableCurrencies: CurrencyCaptureTotals[];
  environmentMode: CaptureEnvironmentMode;
  months: MonthlyCaptureBucket[];
  windowTotals: CurrencyCaptureTotals;
  hasAnyCapturesInWindow: boolean;
}

export interface DailyCapturePoint {
  day: number;
  dateKey: string;
  label: string;
  fullDateLabel: string;
  isToday: boolean;
  currency: string;
  grossCapturedMinor: number;
  refundedMinor: number;
  netCapturedMinor: number;
  captureCount: number;
  completedRefundCount: number;
}

export interface CaptureDailyResult {
  timezone: string;
  selectedCurrency: string;
  availableCurrencies: CurrencyCaptureTotals[];
  environmentMode: CaptureEnvironmentMode;
  selectedMonth: string;
  year: number;
  month: number;
  monthLabel: string;
  shortLabel: string;
  isCurrentMonth: boolean;
  daysInMonth: number;
  elapsedDaysCount: number;
  summary: CurrencyCaptureTotals;
  days: DailyCapturePoint[];
  hasCapturesInMonth: boolean;
}

/**
 * Valid settlement statuses establishing that a payment was genuinely captured.
 * Note: Refunded/Partially-refunded captures remain valid historical gross captures;
 * completed refunds are exposed separately via refundedMinor / netCapturedMinor.
 */
export const VALID_CAPTURED_PAYMENT_STATUSES = [
  'COMPLETED',
  'CAPTURED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
];

export const COMPLETED_REFUND_STATUSES = ['COMPLETED', 'SUCCESS'];

export class CaptureAnalyticsService {
  /**
   * Resolves tenant/role authorization strictly from the server-verified session.
   * Blocks unauthenticated access (401), BUYER access (403), and cross-org tampering (403).
   */
  public static async resolveScope(
    user: AuthenticatedUser | null | undefined,
    requestedOrganizationId?: string | null
  ): Promise<{
    persona: 'PLATFORM' | 'MERCHANT';
    organizationIds: string[] | null;
    requestedOrganizationId: string | null;
  }> {
    if (!user) {
      throw new AuthError('Authentication required to view capture analytics.', 401);
    }
    if (!user.isActive) {
      throw new AuthError('Your account is inactive. Access denied.', 403);
    }
    if (!user.isPlatformAdmin && user.role === UserRole.BUYER) {
      throw new AuthError(
        'Access denied: Capture analytics is available only to authorized merchants, resolution managers, and administrators.',
        403
      );
    }

    const sanitizedRequestedOrg =
      requestedOrganizationId && requestedOrganizationId.trim()
        ? requestedOrganizationId.trim()
        : null;

    let activeOrgIds = user.orgMemberships?.map((m) => m.organizationId) ?? [];
    if (
      activeOrgIds.length === 0 &&
      !user.isPlatformAdmin &&
      user.role !== UserRole.ADMIN
    ) {
      const dbMemberships = await prisma.organizationMember.findMany({
        where: { userId: user.id, isActive: true },
        select: { organizationId: true },
      });
      activeOrgIds = dbMemberships.map((m) => m.organizationId);
    }

    const hasPlatformOversight =
      user.isPlatformAdmin ||
      user.role === UserRole.ADMIN ||
      (user.role === UserRole.RESOLUTION_MANAGER && activeOrgIds.length === 0);

    if (hasPlatformOversight) {
      return {
        persona: 'PLATFORM',
        organizationIds: sanitizedRequestedOrg ? [sanitizedRequestedOrg] : null,
        requestedOrganizationId: sanitizedRequestedOrg,
      };
    }

    if (activeOrgIds.length === 0) {
      throw new AuthError(
        'Access denied: No active merchant or organization membership found.',
        403
      );
    }

    if (sanitizedRequestedOrg && !activeOrgIds.includes(sanitizedRequestedOrg)) {
      throw new AuthError(
        'Access denied: You do not have permission to view capture analytics for this organization.',
        403
      );
    }

    return {
      persona: 'MERCHANT',
      organizationIds: sanitizedRequestedOrg ? [sanitizedRequestedOrg] : activeOrgIds,
      requestedOrganizationId: sanitizedRequestedOrg,
    };
  }

  private static validateCurrencyParam(currency?: string | null): string | null {
    if (currency === undefined || currency === null || currency.trim() === '') {
      return null;
    }
    const normalized = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new CaptureAnalyticsValidationError(
        `Invalid currency parameter: "${currency}". Expected a 3-letter ISO 4217 code (e.g. "USD", "INR").`
      );
    }
    return normalized;
  }

  private static validateEnvironmentParam(env?: string | null): CaptureEnvironmentFilter {
    if (env === undefined || env === null || env.trim() === '') {
      return 'all';
    }
    const normalized = env.trim().toLowerCase();
    if (normalized !== 'all' && normalized !== 'sandbox' && normalized !== 'live') {
      throw new CaptureAnalyticsValidationError(
        `Invalid environment filter: "${env}". Allowed values: all, sandbox, live.`
      );
    }
    return normalized;
  }

  private static buildCapturedWhere(
    organizationIds: string[] | null,
    environmentFilter: CaptureEnvironmentFilter,
    extraCapturedAt?: Prisma.DateTimeNullableFilter<'PayPalPayment'>,
    currency?: string
  ): Prisma.PayPalPaymentWhereInput {
    const strictLiveOnly = FeatureFlags.isPayPalLiveEnabled();
    const effectiveEnv = strictLiveOnly ? 'live' : environmentFilter;

    const where: Prisma.PayPalPaymentWhereInput = {
      paymentStatus: { in: VALID_CAPTURED_PAYMENT_STATUSES },
      captureId: { not: null },
      amountMinor: { gt: 0 },
      capturedAt: {
        ...(extraCapturedAt || {}),
        not: null,
      },
    };

    if (currency) {
      where.currency = currency;
    }

    if (organizationIds !== null) {
      where.commerceOrder = {
        merchantOrganizationId: { in: organizationIds },
      };
    }

    if (effectiveEnv === 'live') {
      where.environment = 'live';
      where.NOT = [
        { captureId: { startsWith: 'MOCK-' } },
        { providerOrderId: { startsWith: 'MOCK-' } },
      ];
    } else if (effectiveEnv === 'sandbox') {
      where.environment = 'sandbox';
    }

    return where;
  }

  private static resolveEnvironmentMode(
    envGroups: Array<{ environment: string; count: number }>
  ): CaptureEnvironmentMode {
    let hasLive = false;
    let hasSandbox = false;
    for (const g of envGroups) {
      if (g.count <= 0) continue;
      if (g.environment === 'live') hasLive = true;
      else hasSandbox = true;
    }
    if (hasLive && hasSandbox) return 'MIXED';
    if (hasLive) return 'LIVE';
    if (hasSandbox) return 'SANDBOX';
    return 'NONE';
  }

  private static buildCurrencySummaryList(
    capturedGroups: Array<{ currency: string; sumMinor: number; count: number }>,
    refundGroups: Array<{ currency: string; sumMinor: number; count: number }>
  ): CurrencyCaptureTotals[] {
    const refundMap = new Map<string, { sumMinor: number; count: number }>();
    for (const r of refundGroups) {
      const code = (r.currency || '').toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(code)) continue;
      const existing = refundMap.get(code) || { sumMinor: 0, count: 0 };
      existing.sumMinor += r.sumMinor;
      existing.count += r.count;
      refundMap.set(code, existing);
    }

    const currencyMap = new Map<string, CurrencyCaptureTotals>();
    for (const c of capturedGroups) {
      const code = (c.currency || '').toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(code)) continue;
      const prev = currencyMap.get(code) || {
        currency: code,
        grossCapturedMinor: 0,
        refundedMinor: 0,
        netCapturedMinor: 0,
        captureCount: 0,
        completedRefundCount: 0,
        averageCaptureMinor: 0,
      };
      prev.grossCapturedMinor += c.sumMinor;
      prev.captureCount += c.count;
      currencyMap.set(code, prev);
    }

    const list: CurrencyCaptureTotals[] = [];
    for (const [code, entry] of currencyMap.entries()) {
      const refund = refundMap.get(code) || { sumMinor: 0, count: 0 };
      const boundedRefundMinor = Math.min(entry.grossCapturedMinor, Math.max(0, refund.sumMinor));
      entry.refundedMinor = boundedRefundMinor;
      entry.completedRefundCount = refund.count;
      entry.netCapturedMinor = Math.max(0, entry.grossCapturedMinor - boundedRefundMinor);
      entry.averageCaptureMinor =
        entry.captureCount > 0 ? Math.round(entry.grossCapturedMinor / entry.captureCount) : 0;
      list.push(entry);
    }

    list.sort((a, b) => {
      if (b.captureCount !== a.captureCount) {
        return b.captureCount - a.captureCount;
      }
      if (b.grossCapturedMinor !== a.grossCapturedMinor) {
        return b.grossCapturedMinor - a.grossCapturedMinor;
      }
      return a.currency.localeCompare(b.currency);
    });

    return list;
  }

  private static emptyCurrencyTotals(currency: string): CurrencyCaptureTotals {
    return {
      currency,
      grossCapturedMinor: 0,
      refundedMinor: 0,
      netCapturedMinor: 0,
      captureCount: 0,
      completedRefundCount: 0,
      averageCaptureMinor: 0,
    };
  }

  private static selectActiveCurrency(
    availableCurrencies: CurrencyCaptureTotals[],
    requestedCurrency: string | null
  ): string {
    if (requestedCurrency) return requestedCurrency;
    if (availableCurrencies.length > 0) return availableCurrencies[0].currency;
    return 'USD';
  }

  private static async getAvailableCurrenciesAndEnv(
    organizationIds: string[] | null,
    environmentFilter: CaptureEnvironmentFilter,
    referenceDate: Date
  ): Promise<{
    availableCurrencies: CurrencyCaptureTotals[];
    environmentMode: CaptureEnvironmentMode;
  }> {
    const lifetimeWhere = this.buildCapturedWhere(organizationIds, environmentFilter, {
      lte: referenceDate,
    });

    const [capturedRaw, refundedRaw] = await Promise.all([
      prisma.payPalPayment.groupBy({
        by: ['currency', 'environment'],
        where: lifetimeWhere,
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
      prisma.refundTransaction.groupBy({
        by: ['currency'],
        where: {
          status: { in: COMPLETED_REFUND_STATUSES },
          amountMinor: { gt: 0 },
          payment: lifetimeWhere,
        },
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
    ]);

    const availableCurrencies = this.buildCurrencySummaryList(
      capturedRaw.map((g) => ({
        currency: g.currency,
        sumMinor: g._sum.amountMinor || 0,
        count: g._count._all,
      })),
      refundedRaw.map((r) => ({
        currency: r.currency,
        sumMinor: r._sum.amountMinor || 0,
        count: r._count._all,
      }))
    );

    const environmentMode = this.resolveEnvironmentMode(
      capturedRaw.map((g) => ({
        environment: g.environment,
        count: g._count._all,
      }))
    );

    return { availableCurrencies, environmentMode };
  }

  /**
   * Computes aggregated Total Capture summary (lifetime, current month, previous month)
   * using database groupBy queries strictly scoped by role and organization tenancy.
   */
  public static async getSummary(
    user: AuthenticatedUser | null | undefined,
    options: CaptureAnalyticsQueryOptions = {}
  ): Promise<CaptureSummaryResult> {
    const scope = await this.resolveScope(user, options.organizationId);
    const timeZone = resolveBusinessTimezone(options.timezone);
    const requestedCurrency = this.validateCurrencyParam(options.currency);
    const environmentFilter = this.validateEnvironmentParam(options.environment);
    const referenceDate = options.referenceDate ?? new Date();

    const nowParts = getZonedDateParts(referenceDate, timeZone);
    const currentMonthKey = formatMonthKey(nowParts.year, nowParts.month);
    const currentMonthNames = getMonthDisplayNames(nowParts.year, nowParts.month);
    const currentMonthStartUtc = getZonedMonthStartUtc(nowParts.year, nowParts.month, timeZone);
    const currentMonthDays = getDaysInMonth(nowParts.year, nowParts.month);

    const prevYM = getPrevMonthYearMonth(nowParts.year, nowParts.month);
    const previousMonthKey = formatMonthKey(prevYM.year, prevYM.month);
    const prevMonthNames = getMonthDisplayNames(prevYM.year, prevYM.month);
    const prevMonthStartUtc = getZonedMonthStartUtc(prevYM.year, prevYM.month, timeZone);

    const { availableCurrencies, environmentMode } = await this.getAvailableCurrenciesAndEnv(
      scope.organizationIds,
      environmentFilter,
      referenceDate
    );

    const selectedCurrency = this.selectActiveCurrency(availableCurrencies, requestedCurrency);

    const currentMonthWhere = this.buildCapturedWhere(
      scope.organizationIds,
      environmentFilter,
      { gte: currentMonthStartUtc, lte: referenceDate },
      selectedCurrency
    );
    const prevMonthWhere = this.buildCapturedWhere(
      scope.organizationIds,
      environmentFilter,
      { gte: prevMonthStartUtc, lt: currentMonthStartUtc },
      selectedCurrency
    );

    const [currCap, currRef, prevCap, prevRef] = await Promise.all([
      prisma.payPalPayment.groupBy({
        by: ['currency'],
        where: currentMonthWhere,
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
      prisma.refundTransaction.groupBy({
        by: ['currency'],
        where: {
          status: { in: COMPLETED_REFUND_STATUSES },
          amountMinor: { gt: 0 },
          currency: selectedCurrency,
          payment: currentMonthWhere,
        },
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
      prisma.payPalPayment.groupBy({
        by: ['currency'],
        where: prevMonthWhere,
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
      prisma.refundTransaction.groupBy({
        by: ['currency'],
        where: {
          status: { in: COMPLETED_REFUND_STATUSES },
          amountMinor: { gt: 0 },
          currency: selectedCurrency,
          payment: prevMonthWhere,
        },
        _sum: { amountMinor: true },
        _count: { _all: true },
      }),
    ]);

    const lifetime =
      availableCurrencies.find((c) => c.currency === selectedCurrency) ||
      this.emptyCurrencyTotals(selectedCurrency);

    const currList = this.buildCurrencySummaryList(
      currCap.map((c) => ({
        currency: c.currency,
        sumMinor: c._sum.amountMinor || 0,
        count: c._count._all,
      })),
      currRef.map((r) => ({
        currency: r.currency,
        sumMinor: r._sum.amountMinor || 0,
        count: r._count._all,
      }))
    );
    const currTotals = currList[0] || this.emptyCurrencyTotals(selectedCurrency);

    const prevList = this.buildCurrencySummaryList(
      prevCap.map((c) => ({
        currency: c.currency,
        sumMinor: c._sum.amountMinor || 0,
        count: c._count._all,
      })),
      prevRef.map((r) => ({
        currency: r.currency,
        sumMinor: r._sum.amountMinor || 0,
        count: r._count._all,
      }))
    );
    const prevTotals = prevList[0] || this.emptyCurrencyTotals(selectedCurrency);

    const comparisonDeltaMinor =
      prevTotals.grossCapturedMinor > 0
        ? currTotals.grossCapturedMinor - prevTotals.grossCapturedMinor
        : null;
    const comparisonPercent =
      prevTotals.grossCapturedMinor > 0
        ? Math.round(
            ((currTotals.grossCapturedMinor - prevTotals.grossCapturedMinor) /
              prevTotals.grossCapturedMinor) *
              1000
          ) / 10
        : null;

    return {
      reportingPeriod: {
        key: 'LIFETIME',
        label: 'All-time captured ledger through today',
        currentMonthKey,
        currentMonthLabel: currentMonthNames.fullLabel,
        previousMonthKey,
        previousMonthLabel: prevMonthNames.fullLabel,
        timezone: timeZone,
        asOf: referenceDate.toISOString(),
      },
      scope,
      environmentMode,
      selectedCurrency,
      availableCurrencies,
      lifetime,
      currentMonth: {
        ...currTotals,
        monthKey: currentMonthKey,
        label: currentMonthNames.fullLabel,
        shortLabel: currentMonthNames.shortLabel,
        elapsedDays: nowParts.day,
        daysInMonth: currentMonthDays,
      },
      previousMonth: {
        ...prevTotals,
        monthKey: previousMonthKey,
        label: prevMonthNames.fullLabel,
        shortLabel: prevMonthNames.shortLabel,
        comparisonPercent,
        comparisonDeltaMinor,
      },
      hasAnyCaptures: availableCurrencies.some((c) => c.captureCount > 0),
    };
  }

  /**
   * Computes last 6 calendar months of verified captures ending at the current month
   * in the configured business timezone, zero-filling empty months cleanly.
   */
  public static async getMonthly(
    user: AuthenticatedUser | null | undefined,
    options: CaptureAnalyticsQueryOptions = {}
  ): Promise<CaptureMonthlyResult> {
    const scope = await this.resolveScope(user, options.organizationId);
    const timeZone = resolveBusinessTimezone(options.timezone);
    const requestedCurrency = this.validateCurrencyParam(options.currency);
    const environmentFilter = this.validateEnvironmentParam(options.environment);
    const referenceDate = options.referenceDate ?? new Date();

    const { availableCurrencies, environmentMode } = await this.getAvailableCurrenciesAndEnv(
      scope.organizationIds,
      environmentFilter,
      referenceDate
    );
    const selectedCurrency = this.selectActiveCurrency(availableCurrencies, requestedCurrency);

    const slots = getLastMonthsWindow(referenceDate, timeZone, 6);
    const windowStartUtc = slots[0].startUtc;

    const where = this.buildCapturedWhere(
      scope.organizationIds,
      environmentFilter,
      { gte: windowStartUtc, lte: referenceDate },
      selectedCurrency
    );

    const rows = await prisma.payPalPayment.findMany({
      where,
      select: {
        id: true,
        captureId: true,
        amountMinor: true,
        currency: true,
        capturedAt: true,
        refunds: {
          where: {
            status: { in: COMPLETED_REFUND_STATUSES },
            amountMinor: { gt: 0 },
          },
          select: {
            id: true,
            paypalRefundId: true,
            refundRequestId: true,
            amountMinor: true,
            currency: true,
          },
        },
      },
    });

    const bucketMap = new Map<string, MonthlyCaptureBucket>();
    for (const slot of slots) {
      bucketMap.set(slot.monthKey, {
        monthKey: slot.monthKey,
        year: slot.year,
        month: slot.month,
        shortLabel: slot.shortLabel,
        monthName: slot.monthName,
        fullLabel: slot.fullLabel,
        isCurrentMonth: slot.isCurrentMonth,
        currency: selectedCurrency,
        grossCapturedMinor: 0,
        refundedMinor: 0,
        netCapturedMinor: 0,
        captureCount: 0,
        completedRefundCount: 0,
      });
    }

    const seenCaptureIds = new Set<string>();
    const seenRefundKeys = new Set<string>();

    for (const row of rows) {
      if (!row.capturedAt || !row.captureId) continue;
      if (row.amountMinor <= 0) continue;
      if (seenCaptureIds.has(row.captureId)) continue;
      seenCaptureIds.add(row.captureId);

      const monthKey = getZonedMonthKey(row.capturedAt, timeZone);
      const bucket = bucketMap.get(monthKey);
      if (!bucket) continue;

      bucket.grossCapturedMinor += row.amountMinor;
      bucket.captureCount += 1;

      let paymentRefundedMinor = 0;
      for (const ref of row.refunds) {
        if ((ref.currency || '').toUpperCase() !== selectedCurrency) continue;
        const refDedupKey = ref.paypalRefundId || ref.refundRequestId || ref.id;
        if (seenRefundKeys.has(refDedupKey)) continue;
        seenRefundKeys.add(refDedupKey);

        const remainingCap = Math.max(0, row.amountMinor - paymentRefundedMinor);
        const appliedMinor = Math.min(ref.amountMinor, remainingCap);
        paymentRefundedMinor += appliedMinor;
        bucket.refundedMinor += appliedMinor;
        bucket.completedRefundCount += 1;
      }
    }

    const months = slots.map((slot) => {
      const b = bucketMap.get(slot.monthKey)!;
      b.netCapturedMinor = Math.max(0, b.grossCapturedMinor - b.refundedMinor);
      return b;
    });

    const windowGross = months.reduce((acc, m) => acc + m.grossCapturedMinor, 0);
    const windowRefunded = months.reduce((acc, m) => acc + m.refundedMinor, 0);
    const windowCount = months.reduce((acc, m) => acc + m.captureCount, 0);
    const windowRefundCount = months.reduce((acc, m) => acc + m.completedRefundCount, 0);

    return {
      timezone: timeZone,
      selectedCurrency,
      availableCurrencies,
      environmentMode,
      months,
      windowTotals: {
        currency: selectedCurrency,
        grossCapturedMinor: windowGross,
        refundedMinor: Math.min(windowGross, windowRefunded),
        netCapturedMinor: Math.max(0, windowGross - windowRefunded),
        captureCount: windowCount,
        completedRefundCount: windowRefundCount,
        averageCaptureMinor: windowCount > 0 ? Math.round(windowGross / windowCount) : 0,
      },
      hasAnyCapturesInWindow: windowCount > 0,
    };
  }

  /**
   * Computes daily capture activity for the selected YYYY-MM calendar month
   * (defaults to current month, capped at elapsed days through today, zero-filling inactive days).
   */
  public static async getDaily(
    user: AuthenticatedUser | null | undefined,
    options: CaptureAnalyticsQueryOptions = {}
  ): Promise<CaptureDailyResult> {
    const scope = await this.resolveScope(user, options.organizationId);
    const timeZone = resolveBusinessTimezone(options.timezone);
    const requestedCurrency = this.validateCurrencyParam(options.currency);
    const environmentFilter = this.validateEnvironmentParam(options.environment);
    const referenceDate = options.referenceDate ?? new Date();

    const monthInfo = parseAndValidateMonthParam(options.month, referenceDate, timeZone);

    const { availableCurrencies, environmentMode } = await this.getAvailableCurrenciesAndEnv(
      scope.organizationIds,
      environmentFilter,
      referenceDate
    );
    const selectedCurrency = this.selectActiveCurrency(availableCurrencies, requestedCurrency);

    const upperBoundUtc = monthInfo.isCurrentMonth
      ? referenceDate
      : new Date(monthInfo.endExclusiveUtc.getTime() - 1);

    const where = this.buildCapturedWhere(
      scope.organizationIds,
      environmentFilter,
      {
        gte: monthInfo.startUtc,
        ...(monthInfo.isCurrentMonth
          ? { lte: upperBoundUtc }
          : { lt: monthInfo.endExclusiveUtc }),
      },
      selectedCurrency
    );

    const rows = await prisma.payPalPayment.findMany({
      where,
      select: {
        id: true,
        captureId: true,
        amountMinor: true,
        currency: true,
        capturedAt: true,
        refunds: {
          where: {
            status: { in: COMPLETED_REFUND_STATUSES },
            amountMinor: { gt: 0 },
          },
          select: {
            id: true,
            paypalRefundId: true,
            refundRequestId: true,
            amountMinor: true,
            currency: true,
          },
        },
      },
    });

    const todayKey = getZonedDayKey(referenceDate, timeZone);
    const dayMap = new Map<string, DailyCapturePoint>();

    for (let day = 1; day <= monthInfo.elapsedDaysCount; day++) {
      const dateKey = formatDayKey(monthInfo.year, monthInfo.month, day);
      dayMap.set(dateKey, {
        day,
        dateKey,
        label: getShortDateLabel(monthInfo.month, day),
        fullDateLabel: getFullDateLabel(monthInfo.year, monthInfo.month, day),
        isToday: dateKey === todayKey,
        currency: selectedCurrency,
        grossCapturedMinor: 0,
        refundedMinor: 0,
        netCapturedMinor: 0,
        captureCount: 0,
        completedRefundCount: 0,
      });
    }

    const seenCaptureIds = new Set<string>();
    const seenRefundKeys = new Set<string>();

    for (const row of rows) {
      if (!row.capturedAt || !row.captureId) continue;
      if (row.amountMinor <= 0) continue;
      if (seenCaptureIds.has(row.captureId)) continue;
      seenCaptureIds.add(row.captureId);

      const dayKey = getZonedDayKey(row.capturedAt, timeZone);
      const bucket = dayMap.get(dayKey);
      if (!bucket) continue;

      bucket.grossCapturedMinor += row.amountMinor;
      bucket.captureCount += 1;

      let paymentRefundedMinor = 0;
      for (const ref of row.refunds) {
        if ((ref.currency || '').toUpperCase() !== selectedCurrency) continue;
        const refDedupKey = ref.paypalRefundId || ref.refundRequestId || ref.id;
        if (seenRefundKeys.has(refDedupKey)) continue;
        seenRefundKeys.add(refDedupKey);

        const remainingCap = Math.max(0, row.amountMinor - paymentRefundedMinor);
        const appliedMinor = Math.min(ref.amountMinor, remainingCap);
        paymentRefundedMinor += appliedMinor;
        bucket.refundedMinor += appliedMinor;
        bucket.completedRefundCount += 1;
      }
    }

    const days: DailyCapturePoint[] = [];
    for (let day = 1; day <= monthInfo.elapsedDaysCount; day++) {
      const point = dayMap.get(formatDayKey(monthInfo.year, monthInfo.month, day))!;
      point.netCapturedMinor = Math.max(0, point.grossCapturedMinor - point.refundedMinor);
      days.push(point);
    }

    const grossTotal = days.reduce((acc, d) => acc + d.grossCapturedMinor, 0);
    const refundTotal = days.reduce((acc, d) => acc + d.refundedMinor, 0);
    const countTotal = days.reduce((acc, d) => acc + d.captureCount, 0);
    const refundCountTotal = days.reduce((acc, d) => acc + d.completedRefundCount, 0);
    const monthNames = getMonthDisplayNames(monthInfo.year, monthInfo.month);

    return {
      timezone: timeZone,
      selectedCurrency,
      availableCurrencies,
      environmentMode,
      selectedMonth: monthInfo.monthKey,
      year: monthInfo.year,
      month: monthInfo.month,
      monthLabel: monthNames.fullLabel,
      shortLabel: monthNames.shortLabel,
      isCurrentMonth: monthInfo.isCurrentMonth,
      daysInMonth: monthInfo.daysInMonth,
      elapsedDaysCount: monthInfo.elapsedDaysCount,
      summary: {
        currency: selectedCurrency,
        grossCapturedMinor: grossTotal,
        refundedMinor: Math.min(grossTotal, refundTotal),
        netCapturedMinor: Math.max(0, grossTotal - refundTotal),
        captureCount: countTotal,
        completedRefundCount: refundCountTotal,
        averageCaptureMinor: countTotal > 0 ? Math.round(grossTotal / countTotal) : 0,
      },
      days,
      hasCapturesInMonth: countTotal > 0,
    };
  }
}

export { CaptureAnalyticsValidationError };
