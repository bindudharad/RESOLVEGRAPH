/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { toMinorUnits } from '../utils/money';

export interface PaymentReconciliationResult {
  paymentId: string;
  providerOrderId: string;
  captureId?: string | null;
  isMatched: boolean;
  discrepancies: string[];
  internalAmountMinor: number;
  providerAmountMinor?: number;
  internalStatus: string;
  providerStatus?: string;
  refundDiscrepancyMinor?: number;
  checkedAt: string;
}

export interface WorkspaceReconciliationSummary {
  totalPaymentsAudited: number;
  matchedCount: number;
  discrepancyCount: number;
  unresolvedAmountMinor: number;
  results: PaymentReconciliationResult[];
}

export class ReconciliationService {
  /**
   * Reconciles a single payment record against PayPal provider state.
   */
  public static async reconcilePayment(paymentId: string): Promise<PaymentReconciliationResult> {
    const payment = await prisma.payPalPayment.findUnique({
      where: { id: paymentId },
      include: {
        commerceOrder: true,
        refunds: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment record not found: ${paymentId}`);
    }

    const discrepancies: string[] = [];
    const provider = PayPalProviderFactory.getProvider();

    let providerAmountMinor: number | undefined;
    let providerStatus: string | undefined;

    try {
      if (payment.captureId) {
        const capture = await provider.getCapture(payment.captureId);
        providerStatus = capture.status;
        providerAmountMinor = toMinorUnits(capture.amount.value, capture.amount.currency_code);

        // Check amount match
        if (payment.amountMinor !== providerAmountMinor) {
          discrepancies.push(
            `Amount mismatch: Internal ledger has ${payment.amountMinor} minor units, but provider reported ${providerAmountMinor}`
          );
        }

        // Check status match
        if (payment.paymentStatus !== providerStatus) {
          discrepancies.push(
            `Status mismatch: Internal status is "${payment.paymentStatus}", provider status is "${providerStatus}"`
          );
        }

        // Check currency match
        if (payment.currency !== capture.amount.currency_code) {
          discrepancies.push(
            `Currency mismatch: Internal currency is "${payment.currency}", provider is "${capture.amount.currency_code}"`
          );
        }
      } else {
        const order = await provider.getOrder(payment.providerOrderId);
        providerStatus = order.status;
        const orderAmount = order.purchase_units?.[0]?.amount;
        if (orderAmount) {
          providerAmountMinor = toMinorUnits(orderAmount.value, orderAmount.currency_code);
          if (payment.amountMinor !== providerAmountMinor) {
            discrepancies.push(`Order amount mismatch: internal ${payment.amountMinor} vs provider ${providerAmountMinor}`);
          }
        }
      }
    } catch (err: any) {
      discrepancies.push(`Failed to fetch provider status: ${err.message}`);
    }

    return {
      paymentId: payment.id,
      providerOrderId: payment.providerOrderId,
      captureId: payment.captureId,
      isMatched: discrepancies.length === 0,
      discrepancies,
      internalAmountMinor: payment.amountMinor,
      providerAmountMinor,
      internalStatus: payment.paymentStatus,
      providerStatus,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Performs reconciliation across all recent payments.
   */
  public static async reconcileWorkspace(organizationId?: string): Promise<WorkspaceReconciliationSummary> {
    const where: any = {};
    if (organizationId) {
      where.commerceOrder = { merchantOrganizationId: organizationId };
    }

    const payments = await prisma.payPalPayment.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const results: PaymentReconciliationResult[] = [];
    let matchedCount = 0;
    let discrepancyCount = 0;
    let unresolvedAmountMinor = 0;

    for (const payment of payments) {
      const rec = await this.reconcilePayment(payment.id);
      results.push(rec);
      if (rec.isMatched) {
        matchedCount++;
      } else {
        discrepancyCount++;
        unresolvedAmountMinor += payment.amountMinor;
      }
    }

    return {
      totalPaymentsAudited: payments.length,
      matchedCount,
      discrepancyCount,
      unresolvedAmountMinor,
      results,
    };
  }
}
