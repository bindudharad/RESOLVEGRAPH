import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { toMinorUnits, toDecimalString, getCurrencyDecimals } from '../src/server/paypal/utils/money';
import { OrderService } from '../src/server/paypal/services/order.service';
import { CaptureService } from '../src/server/paypal/services/capture.service';
import { PayPalMockProvider } from '../src/server/paypal/providers/paypal-mock.provider';

describe('ResolveGraph PayPal Orders & Capture Suite', () => {
  let buyerId: string;
  let orgId: string;

  before(async () => {
    PayPalMockProvider.reset();

    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    assert.ok(buyer, 'Buyer user must exist in database');
    buyerId = buyer.id;

    const org = await prisma.organization.findFirst();
    assert.ok(org, 'Organization must exist in database');
    orgId = org.id;
  });

  describe('Currency & Minor Unit Calculations', () => {
    it('accurately parses decimal currency strings to minor units', () => {
      assert.equal(toMinorUnits('19.99', 'USD'), 1999);
      assert.equal(toMinorUnits('0.50', 'USD'), 50);
      assert.equal(toMinorUnits('100', 'USD'), 10000);
      assert.equal(toMinorUnits('12.345', 'USD'), 1234); // Truncates to 2 decimals
    });

    it('respects zero-decimal currencies like JPY', () => {
      assert.equal(getCurrencyDecimals('JPY'), 0);
      assert.equal(toMinorUnits('2500', 'JPY'), 2500);
      assert.equal(toDecimalString(2500, 'JPY'), '2500');
    });

    it('formats minor units to decimal strings accurately', () => {
      assert.equal(toDecimalString(1999, 'USD'), '19.99');
      assert.equal(toDecimalString(50, 'USD'), '0.50');
      assert.equal(toDecimalString(5, 'USD'), '0.05');
      assert.equal(toDecimalString(10000, 'USD'), '100.00');
    });

    it('rejects invalid inputs', () => {
      assert.throws(() => toMinorUnits('invalid', 'USD'));
      assert.throws(() => toDecimalString(19.99, 'USD')); // Non-integer minor
    });
  });

  describe('Order Creation & Line Item Math', () => {
    it('creates CommerceOrder and PayPal order session with correct pricing', async () => {
      const result = await OrderService.createOrder({
        buyerId,
        merchantOrganizationId: orgId,
        currency: 'USD',
        items: [
          {
            productReference: 'PROD-1',
            sku: 'SKU-HEADPHONES',
            title: 'Wireless ANC Headphones',
            quantity: 2,
            unitAmountMinor: 4999, // $49.99 each
          },
          {
            productReference: 'PROD-2',
            sku: 'SKU-CASE',
            title: 'Protective Travel Case',
            quantity: 1,
            unitAmountMinor: 1500, // $15.00
          },
        ],
      });

      // Expected total: 4999 * 2 + 1500 = 11498 ($114.98)
      assert.equal(result.order.totalAmountMinor, 11498);
      assert.equal(result.order.status, 'PENDING');
      assert.equal(result.order.items.length, 2);
      assert.ok(result.paypalOrder.id.startsWith('MOCK-ORD-'));
      assert.equal(result.payment.amountMinor, 11498);
      assert.equal(result.payment.paymentStatus, 'CREATED');
    });
  });

  describe('Order Capture & Ledger Updates', () => {
    it('captures approved PayPal order and marks payment COMPLETED', async () => {
      const created = await OrderService.createOrder({
        buyerId,
        merchantOrganizationId: orgId,
        currency: 'USD',
        items: [
          {
            productReference: 'PROD-3',
            title: 'Mechanical Keyboard',
            quantity: 1,
            unitAmountMinor: 8900,
          },
        ],
      });

      const captureResult = await CaptureService.captureOrder({
        providerOrderId: created.paypalOrder.id,
      });

      assert.equal(captureResult.isAlreadyCaptured, false);
      assert.equal(captureResult.payment.paymentStatus, 'COMPLETED');
      assert.ok(captureResult.payment.captureId?.startsWith('MOCK-CAP-'));

      // Verify CommerceOrder is updated
      const updatedOrder = await prisma.commerceOrder.findUnique({
        where: { id: created.order.id },
      });
      assert.equal(updatedOrder?.status, 'CAPTURED');
    });

    it('prevents double capture idempotently', async () => {
      const created = await OrderService.createOrder({
        buyerId,
        merchantOrganizationId: orgId,
        currency: 'USD',
        items: [
          {
            productReference: 'PROD-4',
            title: 'Smart Watch',
            quantity: 1,
            unitAmountMinor: 19900,
          },
        ],
      });

      // First capture
      await CaptureService.captureOrder({ providerOrderId: created.paypalOrder.id });

      // Second capture should not throw and should report isAlreadyCaptured
      const secondCapture = await CaptureService.captureOrder({
        providerOrderId: created.paypalOrder.id,
      });

      assert.equal(secondCapture.isAlreadyCaptured, true);
      assert.equal(secondCapture.payment.paymentStatus, 'COMPLETED');
    });
  });
});
