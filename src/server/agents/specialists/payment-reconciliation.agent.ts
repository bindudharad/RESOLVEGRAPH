/**
 * Payment Reconciliation Specialist Agent
 * 
 * Inspects canonical transaction records, runs multi-tier deterministic matching,
 * detects fee/amount mismatches, duplicate records, and explains reconciliation status.
 */

import { AgentExecutionContext } from '../types/agent.types';
import { CrossPlatformMatchingService } from '../../services/cross-platform-matching.service';

export interface ReconciliationAgentResult {
  agentRole: string;
  caseId: string;
  totalTransactions: number;
  totalMismatches: number;
  mismatchSummary: Array<{
    type: string;
    severity: string;
    description: string;
    suggestedAction: string;
  }>;
  reconciliationState: 'RECONCILED' | 'UNMATCHED_ITEMS' | 'CONFLICT_DETECTED';
  explanation: string;
}

export class PaymentReconciliationAgent {
  public static readonly ROLE = 'PaymentReconciliationAgent';

  public static async execute(
    ctx: AgentExecutionContext
  ): Promise<ReconciliationAgentResult> {
    if (!ctx.caseId) {
      throw new Error('[PaymentReconciliationAgent] caseId is required.');
    }

    // Run cross-platform deterministic reconciliation
    await CrossPlatformMatchingService.reconcileCase(ctx.caseId);
    const summary = await CrossPlatformMatchingService.getReconciliationSummary(ctx.caseId);

    const hasConflicts = summary.mismatches.some((m) => m.severity === 'CRITICAL' || m.severity === 'HIGH');
    const hasUnmatched = summary.transactions.some((t) => t.reconciliationState === 'UNMATCHED');

    let reconciliationState: 'RECONCILED' | 'UNMATCHED_ITEMS' | 'CONFLICT_DETECTED' = 'RECONCILED';
    if (hasConflicts) reconciliationState = 'CONFLICT_DETECTED';
    else if (hasUnmatched) reconciliationState = 'UNMATCHED_ITEMS';

    const mismatchSummary = summary.mismatches.map((m) => ({
      type: m.mismatchType,
      severity: m.severity,
      description: m.description,
      suggestedAction: m.suggestedAction,
    }));

    const explanation = hasConflicts
      ? `Reconciliation engine identified ${summary.mismatches.length} evidentiary discrepancy(s) requiring forensic review before settlement.`
      : hasUnmatched
      ? `Reconciliation identified ${summary.transactions.length} canonical records with missing source confirmations.`
      : `All transaction records across submitted sources reconcile deterministically without amount or status discrepancies.`;

    return {
      agentRole: this.ROLE,
      caseId: ctx.caseId,
      totalTransactions: summary.transactionCount,
      totalMismatches: summary.mismatchCount,
      mismatchSummary,
      reconciliationState,
      explanation,
    };
  }
}
