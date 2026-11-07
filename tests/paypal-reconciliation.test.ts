import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { OrderService } from '../src/server/paypal/services/order.service';
import { CaptureService } from '../src/server/paypal/services/capture.service';
import { ReconciliationService } from '../src/server/paypal/services/reconciliation.service';
import { PayPalMockProvider } from '../src/server/paypal/providers/paypal-mock.provider';

describe('ResolveGraph Payment Ledger Reconciliation Suite', () => {
  let buyerId: string;
  let orgId: string;

  before(async () => {
    PayPalMockProvider.reset();

    const buyer = await prisma.user.findFirstOrThrow({ where: { role: 'BUYER' } });
    buyerId = buyer.id;

    const org = await prisma.organization.findFirstOrThrow();
    orgId = org.id;
  });

  it('successfully reconciles fully matched payment capture', async () => {
    const orderResult = await OrderService.createOrder({
      buyerId,
      merchantOrganizationId: orgId,
      items: [{ productReference: 'REC-1', title: 'Tablet', quantity: 1, unitAmountMinor: 32000 }],
    });

    await CaptureService.captureOrder({ providerOrderId: orderResult.paypalOrder.id });

    const rec = await ReconciliationService.reconcilePayment(orderResult.payment.id);

    assert.equal(rec.isMatched, true);
    assert.equal(rec.discrepancies.length, 0);
    assert.equal(rec.internalAmountMinor, 32000);
    assert.equal(rec.providerAmountMinor, 32000);
    assert.equal(rec.internalStatus, 'COMPLETED');
    assert.equal(rec.providerStatus, 'COMPLETED');
  });

  it('detects and reports amount and status discrepancies accurately', async () => {
    const orderResult = await OrderService.createOrder({
      buyerId,
      merchantOrganizationId: orgId,
      items: [{ productReference: 'REC-2', title: 'Cable', quantity: 1, unitAmountMinor: 1500 }],
    });

    await CaptureService.captureOrder({ providerOrderId: orderResult.paypalOrder.id });

    // Intentionally create internal ledger discrepancy for testing
    await prisma.payPalPayment.update({
      where: { id: orderResult.payment.id },
      data: { amountMinor: 9999 }, // Mismatch from 1500
    });

    const rec = await ReconciliationService.reconcilePayment(orderResult.payment.id);

    assert.equal(rec.isMatched, false);
    assert.ok(rec.discrepancies.some((d) => d.includes('Amount mismatch')));
  });

  it('executes workspace-wide reconciliation audit', async () => {
    const summary = await ReconciliationService.reconcileWorkspace(orgId);
    assert.ok(summary.totalPaymentsAudited >= 1);
    assert.ok(typeof summary.matchedCount === 'number');
    assert.ok(typeof summary.discrepancyCount === 'number');
    assert.ok(Array.isArray(summary.results));
  });
});
