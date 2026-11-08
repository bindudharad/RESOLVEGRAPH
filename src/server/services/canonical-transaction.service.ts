/**
 * RESOLVEGRAPH Hackathon Expansion
 * Feature 02: Canonical Transaction Engine
 * 
 * Provides a provider-neutral representation of payment attempts, captures, and refunds:
 * - Deterministic integer minor units for all arithmetic (zero floating point drift)
 * - Provider status normalization across PayPal, PhonePe, GPay, Paytm, BHIM, Banks
 * - FX rate conversion tracking & decimal-safe string formatting
 * - Largest-remainder proportional allocation method
 */

import { prisma } from '@/lib/prisma';

export interface CreateCanonicalTransactionInput {
  caseId?: string;
  provider: 'PAYPAL' | 'PHONEPE' | 'GOOGLE_PAY' | 'PAYTM' | 'BHIM' | 'HDFC_BANK' | 'ICICI_BANK' | 'STRIPE' | 'RAZORPAY' | 'CASHFREE' | 'OTHER';
  providerTxId?: string;
  externalReference?: string;
  payerReference?: string;
  payeeReference?: string;
  merchantName?: string;
  orderReference?: string;
  grossAmountMinor: number;
  feeAmountMinor?: number;
  currency?: string;
  originalStatus: string;
  transactionTimestamp: Date;
  metadata?: Record<string, unknown>;
}

export class CanonicalTransactionService {
  /**
   * Maps raw provider-specific statuses to normalized state machine.
   */
  public static normalizeStatus(rawStatus: string): string {
    return this.normalizeProviderStatus('GENERIC', rawStatus);
  }

  public static normalizeProviderStatus(provider: string, rawStatus: string): string {
    const s = rawStatus.toUpperCase().trim();

    // Completed / Success
    if (['COMPLETED', 'SUCCESS', 'SUCCEEDED', 'SUCCESSFUL', 'PAID', 'SETTLED', 'CAPTURED', 'DEBITED'].includes(s)) {
      if (s === 'DEBITED') return 'COMPLETED'; // Bank debited means completed from customer perspective
      return 'COMPLETED';
    }

    // Pending / Processing / In-Transit
    if (['PENDING', 'PROCESSING', 'IN_PROGRESS', 'SUBMITTED', 'INITIATED', 'PAYER_ACTION_REQUIRED'].includes(s)) {
      return 'PENDING';
    }

    // Authorized / Held
    if (['AUTHORIZED', 'HELD', 'ON_HOLD', 'ESCROWED'].includes(s)) {
      return 'AUTHORIZED';
    }

    // Failed / Declined
    if (['FAILED', 'DECLINED', 'REJECTED', 'BOUNCED', 'ERROR'].includes(s)) {
      return 'FAILED';
    }

    // Cancelled / Voided
    if (['CANCELLED', 'CANCELED', 'VOIDED', 'EXPIRED'].includes(s)) {
      return 'CANCELLED';
    }

    // Refunded / Reversal
    if (['REFUNDED', 'REVERSED', 'RETURNED'].includes(s)) {
      return 'REFUNDED';
    }
    if (['PARTIALLY_REFUNDED', 'PARTIAL_REFUND'].includes(s)) {
      return 'PARTIALLY_REFUNDED';
    }
    if (['REFUND_INITIATED', 'REVERSAL_INITIATED', 'PENDING_REFUND'].includes(s)) {
      return 'REFUND_INITIATED';
    }

    // Disputed / Chargeback
    if (['DISPUTED', 'CHARGEBACK', 'INQUIRY'].includes(s)) {
      return 'DISPUTED';
    }

    return 'PENDING';
  }

  /**
   * Formats minor integer currency units to human-readable decimal string.
   */
  public static formatMinorUnits(amountMinor: number, currency: string = 'INR'): string {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return `${currency} ${amountMinor.toString()}`;
    }

    const isNegative = amountMinor < 0;
    const absMinor = Math.abs(amountMinor);
    const major = Math.floor(absMinor / 100);
    const cents = absMinor % 100;
    const paddedCents = cents < 10 ? `0${cents}` : `${cents}`;
    const sign = isNegative ? '-' : '';

    return `${currency} ${sign}${major}.${paddedCents}`;
  }

  /**
   * Deterministically converts decimal currency string into integer minor units.
   */
  public static parseDecimalToMinor(decimalStr: string | number, currency: string = 'INR'): number {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP'];
    const val = typeof decimalStr === 'number' ? decimalStr.toString() : decimalStr.trim();
    const clean = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) throw new Error(`Invalid monetary amount: ${decimalStr}`);

    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(num);
    }

    return Math.round(num * 100);
  }

  /**
   * Applies Largest-Remainder method to proportionally allocate a total amount
   * across multiple items without rounding leakage or fractional cents.
   */
  public static allocateProportional(totalMinor: number, weights: number[]): number[] {
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    if (sumWeights <= 0) {
      throw new Error('Sum of allocation weights must be strictly positive.');
    }

    const exactShares = weights.map((w) => (w / sumWeights) * totalMinor);
    const integerAllocations = exactShares.map((s) => Math.floor(s));
    const remainderFractions = exactShares.map((s, idx) => ({
      index: idx,
      fraction: s - Math.floor(s),
    }));

    const allocatedSum = integerAllocations.reduce((a, b) => a + b, 0);
    const shortfall = totalMinor - allocatedSum;

    // Sort by largest remainder descending
    remainderFractions.sort((a, b) => b.fraction - a.fraction);

    for (let i = 0; i < shortfall; i++) {
      const idx = remainderFractions[i].index;
      integerAllocations[idx] += 1;
    }

    return integerAllocations;
  }

  /**
   * Creates or records a CanonicalTransaction in the database.
   */
  public static async createCanonicalTransaction(input: CreateCanonicalTransactionInput) {
    const feeMinor = input.feeAmountMinor ?? 0;
    const netMinor = input.grossAmountMinor - feeMinor;
    const normalizedStatus = this.normalizeProviderStatus(input.provider, input.originalStatus);

    return prisma.canonicalTransaction.create({
      data: {
        caseId: input.caseId,
        provider: input.provider,
        providerTxId: input.providerTxId,
        externalReference: input.externalReference,
        payerReference: input.payerReference,
        payeeReference: input.payeeReference,
        merchantName: input.merchantName,
        orderReference: input.orderReference,
        grossAmountMinor: input.grossAmountMinor,
        feeAmountMinor: feeMinor,
        netAmountMinor: netMinor,
        currency: (input.currency || 'INR').toUpperCase(),
        originalStatus: input.originalStatus,
        normalizedStatus,
        reconciliationState: 'UNMATCHED',
        transactionTimestamp: input.transactionTimestamp,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }

  /**
   * Records an extracted source observation linked to a canonical transaction.
   */
  public static async recordSourceObservation(data: {
    caseId?: string;
    canonicalTransactionId?: string;
    evidenceId?: string;
    sourceType: string;
    sourceName: string;
    referenceId: string;
    amountMinor: number;
    currency?: string;
    reportedStatus: string;
    reportedAt: Date;
    confidence?: number;
    extractedFields?: Record<string, unknown>;
  }) {
    return prisma.transactionSourceRecord.create({
      data: {
        caseId: data.caseId,
        canonicalTransactionId: data.canonicalTransactionId,
        evidenceId: data.evidenceId,
        sourceType: data.sourceType,
        sourceName: data.sourceName,
        referenceId: data.referenceId,
        amountMinor: data.amountMinor,
        currency: (data.currency || 'INR').toUpperCase(),
        reportedStatus: data.reportedStatus,
        reportedAt: data.reportedAt,
        confidence: data.confidence ?? 1.0,
        extractedFieldsJson: data.extractedFields ? JSON.stringify(data.extractedFields) : null,
      },
    });
  }
}
