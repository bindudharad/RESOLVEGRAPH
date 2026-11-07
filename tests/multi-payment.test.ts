import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { upiComplaintService } from '../src/server/services/upi-complaint.service';

describe('RESOLVEGRAPH Version 2.0: Multi-Payment Resolution Engine & UPI Complaints', () => {
  let testCaseId: string;
  const testUtr1 = 'UTR' + Date.now().toString().slice(-9);
  const testUtr2 = 'UTR' + (Date.now() + 1).toString().slice(-9);

  before(async () => {
    // Find or create a test case
    const existingCase = await prisma.caseRecord.findFirst({
      where: { organizationId: 'org_techstore' },
    });

    if (existingCase) {
      testCaseId = existingCase.id;
    } else {
      const created = await prisma.caseRecord.create({
        data: {
          caseNumber: `CASE-PAY-${Date.now()}`,
          title: 'Payment Test Case',
          description: 'Payment Test Case Description',
          status: 'UNDER_ANALYSIS',
          currency: 'INR',
          organizationId: 'org_techstore',
          buyerId: 'usr_alex_buyer',
          merchantId: 'usr_techstore_merchant',
        },
      });
      testCaseId = created.id;
    }
  });

  after(async () => {
    await prisma.paymentComplaint.deleteMany({
      where: {
        transactionReference: { in: [testUtr1, testUtr2, 'UTR_INVALID_TEST'] },
      },
    });
  });

  test('registers a customer-submitted PhonePe complaint with honest status labeling', async () => {
    const result = await upiComplaintService.registerComplaint({
      caseId: testCaseId,
      paymentProvider: 'PHONEPE',
      transactionReference: testUtr1,
      amountMinor: 249900, // ₹2,499.00
      currency: 'INR',
      complaintCategory: 'DEBITED_NOT_CREDITED',
      senderVpa: 'buyer@ybl',
      recipientVpa: 'merchant@techstore',
    });

    assert.ok(result.complaint);
    assert.strictEqual(result.complaint.paymentProvider, 'PHONEPE');
    assert.strictEqual(result.complaint.transactionReference, testUtr1);
    assert.strictEqual(result.complaint.providerVerificationStatus, 'CUSTOMER_SUBMITTED');
    assert.ok(result.verificationNotice.includes('CUSTOMER_SUBMITTED'));
    assert.ok(result.guidance.regulatoryFramework.includes('DPSS.CO.PD No.629'));
    assert.ok(result.guidance.tatSummary.includes('T+1'));
  });

  test('generates immediate emergency escalation guidance for UNAUTHORIZED_TRANSACTION', async () => {
    const result = await upiComplaintService.registerComplaint({
      caseId: testCaseId,
      paymentProvider: 'GOOGLE_PAY',
      transactionReference: testUtr2,
      amountMinor: 1500000, // ₹15,000.00
      currency: 'INR',
      complaintCategory: 'UNAUTHORIZED_TRANSACTION',
      senderVpa: 'victim@okaxis',
    });

    assert.strictEqual(result.complaint.complaintCategory, 'UNAUTHORIZED_TRANSACTION');
    assert.strictEqual(result.complaint.escalationGuidanceProvided, true);
    assert.strictEqual(result.guidance.requiresImmediateAction, true);
    assert.ok(result.guidance.regulatoryFramework.includes('RBI Circular RBI/2017-18/15'));

    // Helplines must contain 1930 Cybercrime and NPCI
    const helplineContacts = result.guidance.helplines.map((h) => h.contact);
    assert.ok(helplineContacts.includes('1930'));
    assert.ok(result.guidance.recommendedActions.some((a) => a.includes('3 working days')));
  });

  test('rejects complaint registration with missing or invalid fields', async () => {
    await assert.rejects(
      async () => {
        await upiComplaintService.registerComplaint({
          paymentProvider: 'BHIM',
          transactionReference: '',
          amountMinor: 1000,
          complaintCategory: 'FAILED_PAYMENT',
        });
      },
      { message: /Transaction reference \(UTR\/RRN\/ID\) is required/ }
    );

    await assert.rejects(
      async () => {
        await upiComplaintService.registerComplaint({
          paymentProvider: 'BHIM',
          transactionReference: 'UTR_INVALID_TEST',
          amountMinor: -500,
          complaintCategory: 'FAILED_PAYMENT',
        });
      },
      { message: /Amount must be greater than zero/ }
    );
  });

  test('lists complaints filtered by caseId and paymentProvider', async () => {
    const list = await upiComplaintService.listComplaints({
      caseId: testCaseId,
      paymentProvider: 'PHONEPE',
    });

    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 1);
    assert.strictEqual(list[0].paymentProvider, 'PHONEPE');
    assert.strictEqual(list[0].caseId, testCaseId);
  });

  test('retrieves full complaint details and guidance by ID', async () => {
    const list = await upiComplaintService.listComplaints({ caseId: testCaseId });
    const target = list.find((c) => c.transactionReference === testUtr2);
    assert.ok(target);

    const fullDetails = await upiComplaintService.getComplaintById(target!.id);
    assert.ok(fullDetails);
    assert.strictEqual(fullDetails?.complaint.id, target!.id);
    assert.strictEqual(fullDetails?.guidance.requiresImmediateAction, true);
  });
});
