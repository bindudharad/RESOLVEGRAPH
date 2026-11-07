/**
 * RESOLVEGRAPH — Payment Reconciliation CLI Runner
 * 
 * Audits recent internal payments against PayPal provider state
 * detecting amount mismatches, unrecorded captures, and status divergences.
 */

import { ReconciliationService } from '../src/server/paypal/services/reconciliation.service';

async function main() {
  console.log('========================================================================');
  console.log('        RESOLVEGRAPH: PAYPAL FINANCIAL RECONCILIATION RUNNER            ');
  console.log('========================================================================\n');

  const summary = await ReconciliationService.reconcileWorkspace();

  console.log(`Payments Audited:        ${summary.totalPaymentsAudited}`);
  console.log(`Matched (Reconciled):    ${summary.matchedCount}`);
  console.log(`Discrepancies Flagged:   ${summary.discrepancyCount}`);
  console.log(`Unresolved Amount:       $${(summary.unresolvedAmountMinor / 100).toFixed(2)}`);

  if (summary.discrepancyCount > 0) {
    console.log('\n[FLAGGED DISCREPANCIES]:');
    summary.results
      .filter((r) => !r.isMatched)
      .slice(0, 5)
      .forEach((r) => {
        console.log(`  - Payment ID: ${r.paymentId} (Order: ${r.providerOrderId})`);
        r.discrepancies.forEach((d) => console.log(`      * ${d}`));
      });
  }

  console.log('\n========================================================================');
  console.log(` RECONCILIATION RESULT: ${summary.discrepancyCount === 0 ? 'ALL_MATCHED' : 'DISCREPANCIES_FLAGGED'}`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('[Reconciliation Error]:', err);
  process.exit(1);
});
