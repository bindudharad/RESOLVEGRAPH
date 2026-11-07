import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { WebhookVerificationService } from '../src/server/paypal/services/webhook-verification.service';
import { WebhookProcessingService } from '../src/server/paypal/services/webhook-processing.service';
import { OrderService } from '../src/server/paypal/services/order.service';
import { PayPalMockProvider } from '../src/server/paypal/providers/paypal-mock.provider';

describe('ResolveGraph PayPal Webhooks Suite', () => {
  before(() => {
    PayPalMockProvider.reset();
  });

  describe('Webhook Signature & Security Verification', () => {
    it('validates trusted PayPal cert URLs and rejects untrusted hosts (SSRF prevention)', () => {
      assert.equal(
        WebhookVerificationService.isValidCertUrl('https://api.sandbox.paypal.com/v1/cert.pem'),
        true
      );
      assert.equal(
        WebhookVerificationService.isValidCertUrl('https://api-m.paypal.com/v1/cert.pem'),
        true
      );
      assert.equal(
        WebhookVerificationService.isValidCertUrl('https://evil-attacker.com/fake-cert.pem'),
        false
      );
      assert.equal(
        WebhookVerificationService.isValidCertUrl('http://api.paypal.com/cert.pem'), // non-https
        false
      );
    });

    it('rejects webhooks with missing security transmission headers', async () => {
      const isValid = await WebhookVerificationService.verifyWebhook(
        {
          authAlgo: null,
          certUrl: 'https://api.sandbox.paypal.com/cert.pem',
          transmissionId: null,
          transmissionSig: null,
          transmissionTime: null,
        },
        {}
      );
      assert.equal(isValid, false);
    });

    it('rejects webhooks with invalid signatures', async () => {
      const isValid = await WebhookVerificationService.verifyWebhook(
        {
          authAlgo: 'SHA256withRSA',
          certUrl: 'https://api.sandbox.paypal.com/cert.pem',
          transmissionId: 'tx-12345',
          transmissionSig: 'INVALID_SIGNATURE_STRING',
          transmissionTime: new Date().toISOString(),
        },
        { id: 'WH-TEST' }
      );
      assert.equal(isValid, false);
    });
  });

  describe('Webhook Processing & Event Dispatch Pipeline', () => {
    it('processes PAYMENT.CAPTURE.COMPLETED idempotently and ignores duplicate events', async () => {
      const buyer = await prisma.user.findFirstOrThrow({ where: { role: 'BUYER' } });
      const org = await prisma.organization.findFirstOrThrow();

      const created = await OrderService.createOrder({
        buyerId: buyer.id,
        merchantOrganizationId: org.id,
        items: [{ productReference: 'P10', title: 'Speaker', quantity: 1, unitAmountMinor: 4500 }],
      });

      const eventId = `WH-EVT-${Date.now()}`;
      const captureId = `CAP-${Date.now()}`;

      const payload = {
        id: eventId,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
        resource: {
          id: captureId,
          custom_id: created.order.id,
          status: 'COMPLETED',
          amount: { value: '45.00', currency_code: 'USD' },
          create_time: new Date().toISOString(),
        },
      };

      // 1. Process event first time
      const result1 = await WebhookProcessingService.processEvent(payload);
      assert.equal(result1.status, 'PROCESSED');
      assert.equal(result1.eventType, 'PAYMENT.CAPTURE.COMPLETED');

      // Verify payment updated
      const payment = await prisma.payPalPayment.findUnique({
        where: { id: created.payment.id },
      });
      assert.equal(payment?.paymentStatus, 'COMPLETED');
      assert.equal(payment?.captureId, captureId);

      // 2. Process duplicate event -> returns ALREADY_PROCESSED
      const result2 = await WebhookProcessingService.processEvent(payload);
      assert.equal(result2.status, 'ALREADY_PROCESSED');
    });

    it('processes CUSTOMER.DISPUTE.CREATED and records dispute in database', async () => {
      const disputeId = `PP-D-TEST-${Date.now()}`;
      const payload = {
        id: `WH-DISPUTE-${Date.now()}`,
        event_type: 'CUSTOMER.DISPUTE.CREATED',
        resource_type: 'dispute',
        resource: {
          dispute_id: disputeId,
          dispute_reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
          dispute_life_cycle_stage: 'INQUIRY',
          status: 'WAITING_FOR_SELLER_RESPONSE',
          dispute_amount: { value: '99.00', currency_code: 'USD' },
          allowed_response_actions: ['ACCEPT_CLAIM', 'MAKE_OFFER', 'PROVIDE_EVIDENCE'],
        },
      };

      const result = await WebhookProcessingService.processEvent(payload);
      assert.equal(result.status, 'PROCESSED');

      const savedDispute = await prisma.payPalDispute.findUnique({
        where: { paypalDisputeId: disputeId },
      });

      assert.ok(savedDispute);
      assert.equal(savedDispute.disputeAmountMinor, 9900);
      assert.equal(savedDispute.disputeReason, 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED');
      assert.equal(savedDispute.paypalStatus, 'WAITING_FOR_SELLER_RESPONSE');
    });
  });
});
