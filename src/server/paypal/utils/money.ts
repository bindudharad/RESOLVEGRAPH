/**
 * Currency Minor Units and Financial Utility Functions
 *
 * Invariant: Authoritative monetary math inside ResolveGraph must ALWAYS use
 * integer minor units (e.g. cents, pence) to eliminate IEEE-754 floating point errors.
 */

// ISO 4217 zero-decimal currencies
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

// ISO 4217 three-decimal currencies
const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND'
]);

export function getCurrencyDecimals(currency = 'USD'): number {
  const code = currency.toUpperCase().trim();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

/**
 * Converts a decimal monetary amount string or number to integer minor units (e.g., "19.99" -> 1999).
 */
export function toMinorUnits(amount: string | number, currency = 'USD'): number {
  const decimals = getCurrencyDecimals(currency);
  const str = String(amount).trim();

  if (!str || !/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Invalid monetary amount format: "${amount}" for currency ${currency}`);
  }

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;
  const parts = cleanStr.split('.');
  const wholePart = parts[0] || '0';
  let fractionPart = parts[1] || '';

  if (fractionPart.length > decimals) {
    // Truncate or reject excess fraction
    fractionPart = fractionPart.slice(0, decimals);
  } else {
    fractionPart = fractionPart.padEnd(decimals, '0');
  }

  const combined = decimals === 0 ? wholePart : `${wholePart}${fractionPart}`;
  const minor = parseInt(combined, 10);
  return isNegative ? -minor : minor;
}

/**
 * Converts integer minor units to PayPal-compliant decimal string (e.g., 1999 -> "19.99").
 */
export function toDecimalString(amountMinor: number, currency = 'USD'): string {
  const decimals = getCurrencyDecimals(currency);
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`Amount must be an integer minor unit. Received: ${amountMinor}`);
  }

  const isNegative = amountMinor < 0;
  const absMinor = Math.abs(amountMinor);

  if (decimals === 0) {
    return `${isNegative ? '-' : ''}${absMinor}`;
  }

  const factor = Math.pow(10, decimals);
  const whole = Math.floor(absMinor / factor);
  const fraction = (absMinor % factor).toString().padStart(decimals, '0');

  return `${isNegative ? '-' : ''}${whole}.${fraction}`;
}

/**
 * Computes remaining refundable amount on a payment.
 * Considers COMPLETED and PENDING refunds.
 */
export function calculateRemainingRefundable(
  capturedMinor: number,
  refundTransactions: Array<{ amountMinor: number; status: string }> = []
): number {
  const activeStatuses = new Set(['PENDING', 'COMPLETED', 'SUCCESS']);
  const totalRefunded = refundTransactions
    .filter((r) => activeStatuses.has(r.status.toUpperCase()))
    .reduce((sum, r) => sum + r.amountMinor, 0);

  const remaining = capturedMinor - totalRefunded;
  return Math.max(0, remaining);
}

/**
 * Formats a minor amount for display with currency symbol.
 */
export function formatCurrency(amountMinor: number, currency = 'USD'): string {
  const decimalStr = toDecimalString(amountMinor, currency);
  const num = parseFloat(decimalStr);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(num);
  } catch {
    return `${currency.toUpperCase()} ${decimalStr}`;
  }
}
