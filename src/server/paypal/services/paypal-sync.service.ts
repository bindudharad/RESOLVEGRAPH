/**
 * RESOLVEGRAPH 2.0 — PayPal & Canonical Transaction Synchronization Service
 * 
 * Bridges official PayPal REST/Sandbox events directly into:
 * 1. Canonical Transaction Engine (provider-neutral normalization, minor currency units)
 * 2. Cross-Platform Transaction Matching Engine (deterministic reconciliation)
 * 3. Bilateral Evidence Graph (BEG) with cryptographic provenance and edge typing
 */

import { prisma } from '@/lib/prisma';
import { CanonicalTransactionService } from '@/server/services/canonical-transaction.service';
import { CrossPlatformMatchingService } from '@/server/services/cross-platform-matching.service';

export interface PayPalSyncOrderParams {
  providerOrderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  status: string;
  caseId?: string | null;
  payerReference?: string | null;
  payeeReference?: string | null;
  timestamp?: Date;
}

export interface PayPalSyncCaptureParams {
  captureId: string;
  providerOrderId: string;
  orderNumber?: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  caseId?: string | null;
  payerReference?: string | null;
  payeeReference?: string | null;
  timestamp?: Date;
  rawPayload?: Record<string, unknown>;
}

export interface PayPalSyncRefundParams {
  refundId: string;
  captureId: string;
  amountMinor: number;
  currency: string;
  status: string;
  reason?: string;
  caseId?: string | null;
  timestamp?: Date;
}

export interface PayPalSyncDisputeParams {
  disputeId: string;
  captureId?: string | null;
  amountMinor: number;
  currency: string;
  disputeReason: string;
  lifecycleStage: string;
  status: string;
  caseId?: string | null;
  timestamp?: Date;
}

export class PayPalSyncService {
  /**
   * Synchronizes an authorized or created PayPal order into CanonicalTransaction and source records.
   */
  public static async syncOrder(params: PayPalSyncOrderParams) {
    const normalizedStatus = CanonicalTransactionService.normalizeProviderStatus('PAYPAL', params.status);

    // Look for existing canonical tx by providerTxId or orderReference
    let canonical = await prisma.canonicalTransaction.findFirst({
      where: {
        OR: [
          { providerTxId: params.providerOrderId },
          { orderReference: params.orderNumber },
        ],
      },
    });

    if (canonical) {
      canonical = await prisma.canonicalTransaction.update({
        where: { id: canonical.id },
        data: {
          caseId: params.caseId || canonical.caseId,
          orderReference: params.orderNumber,
          originalStatus: params.status,
          normalizedStatus,
          payerReference: params.payerReference || canonical.payerReference,
          payeeReference: params.payeeReference || canonical.payeeReference,
          updatedAt: new Date(),
        },
      });
    } else {
      canonical = await prisma.canonicalTransaction.create({
        data: {
          caseId: params.caseId || null,
          provider: 'PAYPAL',
          providerTxId: params.providerOrderId,
          externalReference: params.providerOrderId,
          orderReference: params.orderNumber,
          payerReference: params.payerReference || null,
          payeeReference: params.payeeReference || 'TechStore Solutions (merchant@techstore.demo)',
          merchantName: 'TechStore Solutions',
          grossAmountMinor: params.amountMinor,
          feeAmountMinor: Math.round(params.amountMinor * 0.029 + 30), // PayPal standard merchant fee estimate
          netAmountMinor: params.amountMinor - Math.round(params.amountMinor * 0.029 + 30),
          currency: params.currency.toUpperCase(),
          originalStatus: params.status,
          normalizedStatus,
          reconciliationState: 'UNMATCHED',
          transactionTimestamp: params.timestamp || new Date(),
        },
      });
    }

    // Ingest source record
    await prisma.transactionSourceRecord.create({
      data: {
        caseId: params.caseId || null,
        canonicalTransactionId: canonical.id,
        sourceType: 'GATEWAY_API',
        sourceName: 'PayPal Orders API v2',
        referenceId: params.providerOrderId,
        amountMinor: params.amountMinor,
        currency: params.currency.toUpperCase(),
        reportedStatus: params.status,
        reportedAt: params.timestamp || new Date(),
        confidence: 1.0,
        extractedFieldsJson: JSON.stringify({
          providerOrderId: params.providerOrderId,
          orderNumber: params.orderNumber,
          channel: 'PayPal Sandbox',
        }),
      },
    });

    return canonical;
  }

  /**
   * Synchronizes a captured PayPal transaction, updates canonical status to CAPTURED,
   * and runs deterministic cross-platform matching against case evidence and complaints.
   */
  public static async syncCapture(params: PayPalSyncCaptureParams) {
    const normalizedStatus = 'CAPTURED';

    let canonical = await prisma.canonicalTransaction.findFirst({
      where: {
        OR: [
          { providerTxId: params.captureId },
          { externalReference: params.providerOrderId },
          ...(params.orderNumber ? [{ orderReference: params.orderNumber }] : []),
        ],
      },
    });

    if (canonical) {
      canonical = await prisma.canonicalTransaction.update({
        where: { id: canonical.id },
        data: {
          providerTxId: params.captureId,
          externalReference: params.providerOrderId,
          caseId: params.caseId || canonical.caseId,
          originalStatus: params.status,
          normalizedStatus,
          payerReference: params.payerReference || canonical.payerReference,
          payeeReference: params.payeeReference || canonical.payeeReference,
          updatedAt: new Date(),
        },
      });
    } else {
      canonical = await prisma.canonicalTransaction.create({
        data: {
          caseId: params.caseId || null,
          provider: 'PAYPAL',
          providerTxId: params.captureId,
          externalReference: params.providerOrderId,
          orderReference: params.orderNumber || null,
          payerReference: params.payerReference || null,
          payeeReference: params.payeeReference || 'TechStore Solutions (merchant@techstore.demo)',
          merchantName: 'TechStore Solutions',
          grossAmountMinor: params.amountMinor,
          feeAmountMinor: Math.round(params.amountMinor * 0.029 + 30),
          netAmountMinor: params.amountMinor - Math.round(params.amountMinor * 0.029 + 30),
          currency: params.currency.toUpperCase(),
          originalStatus: params.status,
          normalizedStatus,
          reconciliationState: 'UNMATCHED',
          transactionTimestamp: params.timestamp || new Date(),
          metadataJson: params.rawPayload ? JSON.stringify(params.rawPayload) : null,
        },
      });
    }

    // Ingest transaction source record for Capture
    await prisma.transactionSourceRecord.create({
      data: {
        caseId: params.caseId || null,
        canonicalTransactionId: canonical.id,
        sourceType: 'GATEWAY_API',
        sourceName: 'PayPal Captures API v2',
        referenceId: params.captureId,
        amountMinor: params.amountMinor,
        currency: params.currency.toUpperCase(),
        reportedStatus: params.status,
        reportedAt: params.timestamp || new Date(),
        confidence: 1.0,
        extractedFieldsJson: JSON.stringify({
          captureId: params.captureId,
          orderId: params.providerOrderId,
          status: params.status,
        }),
      },
    });

    // Run cross-source reconciliation if linked to a case
    if (canonical.caseId) {
      await this.runCaseReconciliation(canonical.caseId, canonical.id);
    }

    return canonical;
  }

  /**
   * Synchronizes an approved refund into Canonical Transactions and updates parent transaction.
   */
  public static async syncRefund(params: PayPalSyncRefundParams) {
    const parentTx = await prisma.canonicalTransaction.findFirst({
      where: {
        OR: [
          { providerTxId: params.captureId },
          { externalReference: params.captureId },
        ],
      },
    });

    const isFullRefund = parentTx ? params.amountMinor >= parentTx.grossAmountMinor : true;
    const normalizedStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    if (parentTx) {
      await prisma.canonicalTransaction.update({
        where: { id: parentTx.id },
        data: {
          normalizedStatus,
          originalStatus: normalizedStatus,
          reconciliationState: 'MATCHED',
          updatedAt: new Date(),
        },
      });
    }

    // Create standalone refund canonical transaction
    const refundTx = await prisma.canonicalTransaction.create({
      data: {
        caseId: params.caseId || parentTx?.caseId || null,
        provider: 'PAYPAL',
        providerTxId: params.refundId,
        externalReference: params.captureId,
        orderReference: parentTx?.orderReference || null,
        payerReference: parentTx?.payeeReference || 'TechStore Solutions',
        payeeReference: parentTx?.payerReference || 'Customer',
        merchantName: parentTx?.merchantName || 'TechStore Solutions',
        grossAmountMinor: params.amountMinor,
        feeAmountMinor: 0,
        netAmountMinor: params.amountMinor,
        currency: params.currency.toUpperCase(),
        originalStatus: params.status,
        normalizedStatus: 'REFUNDED',
        reconciliationState: 'MATCHED',
        transactionTimestamp: params.timestamp || new Date(),
        metadataJson: JSON.stringify({
          refundReason: params.reason || 'Authorized dispute settlement',
          originalCaptureId: params.captureId,
        }),
      },
    });

    // Ingest refund source record
    await prisma.transactionSourceRecord.create({
      data: {
        caseId: params.caseId || parentTx?.caseId || null,
        canonicalTransactionId: refundTx.id,
        sourceType: 'GATEWAY_API',
        sourceName: 'PayPal Refunds API v2',
        referenceId: params.refundId,
        amountMinor: params.amountMinor,
        currency: params.currency.toUpperCase(),
        reportedStatus: params.status,
        reportedAt: params.timestamp || new Date(),
        confidence: 1.0,
      },
    });

    return refundTx;
  }

  /**
   * Synchronizes a PayPal dispute into Canonical Transactions and marks parent transaction as DISPUTED.
   */
  public static async syncDispute(params: PayPalSyncDisputeParams) {
    if (params.captureId) {
      const parentTx = await prisma.canonicalTransaction.findFirst({
        where: {
          OR: [
            { providerTxId: params.captureId },
            { externalReference: params.captureId },
          ],
        },
      });

      if (parentTx) {
        await prisma.canonicalTransaction.update({
          where: { id: parentTx.id },
          data: {
            normalizedStatus: 'DISPUTED',
            originalStatus: params.status,
            reconciliationState: 'CONFLICT',
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Reconciles a case's canonical transactions against other source records (e.g. UPI, bank statements, merchant records).
   */
  public static async runCaseReconciliation(caseId: string, canonicalTxId: string) {
    const [tx, sources] = await Promise.all([
      prisma.canonicalTransaction.findUnique({ where: { id: canonicalTxId } }),
      prisma.transactionSourceRecord.findMany({
        where: { caseId, canonicalTransactionId: { not: canonicalTxId } },
      }),
    ]);

    if (!tx || sources.length === 0) return;

    for (const src of sources) {
      const matchResult = CrossPlatformMatchingService.evaluatePair(
        {
          providerTxId: tx.providerTxId,
          externalReference: tx.externalReference,
          orderReference: tx.orderReference,
          grossAmountMinor: tx.grossAmountMinor,
          currency: tx.currency,
          normalizedStatus: tx.normalizedStatus,
          transactionTimestamp: tx.transactionTimestamp,
          merchantName: tx.merchantName,
        },
        {
          referenceId: src.referenceId,
          amountMinor: src.amountMinor,
          currency: src.currency,
          reportedStatus: src.reportedStatus,
          reportedAt: src.reportedAt,
          sourceName: src.sourceName,
        }
      );

      // Record matching decision
      await prisma.matchingDecision.create({
        data: {
          caseId,
          canonicalTransactionId: tx.id,
          targetRecordId: src.id,
          matchTier: matchResult.matchTier,
          outcome: matchResult.outcome,
          score: matchResult.score,
          matchedFieldsJson: JSON.stringify(matchResult.matchedFields),
          conflictingFieldsJson: JSON.stringify(matchResult.conflictingFields),
          explanation: matchResult.explanation,
        },
      });

      // Update reconciliation state
      if (matchResult.outcome === 'MATCHED') {
        await prisma.canonicalTransaction.update({
          where: { id: tx.id },
          data: { reconciliationState: 'MATCHED' },
        });
      } else if (matchResult.outcome === 'CONFLICT') {
        await prisma.canonicalTransaction.update({
          where: { id: tx.id },
          data: { reconciliationState: 'CONFLICT' },
        });
      }
    }
  }
}
