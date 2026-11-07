import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { DisputeService } from '../src/server/paypal/services/dispute.service';
import { EvidenceCompilerService } from '../src/server/paypal/services/evidence-compiler.service';
import { PayPalMockProvider } from '../src/server/paypal/providers/paypal-mock.provider';
import { AuthenticatedUser } from '../src/server/auth/session';

describe('ResolveGraph PayPal Disputes & Evidence Compilation Suite', () => {
  let merchantUser: AuthenticatedUser;
  let orgId: string;
  let testCaseId: string;

  before(async () => {
    PayPalMockProvider.reset();

    const techStoreUser = await prisma.user.findFirstOrThrow({
      where: { email: { contains: 'techstore' } },
      include: { orgMemberships: { include: { organization: true } } },
    });

    merchantUser = {
      id: techStoreUser.id,
      email: techStoreUser.email,
      name: techStoreUser.fullName,
      fullName: techStoreUser.fullName,
      role: techStoreUser.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: techStoreUser.avatarUrl,
      organization: techStoreUser.organization,
      orgMemberships: techStoreUser.orgMemberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
        },
      })),
    };

    orgId = merchantUser.orgMemberships[0]?.organizationId;
    const firstCase = await prisma.caseRecord.findFirstOrThrow();
    testCaseId = firstCase.id;
  });

  it('determines dynamic allowed response actions correctly', async () => {
    const disputeId = `PP-D-ACTIONS-${Date.now()}`;
    await prisma.payPalDispute.create({
      data: {
        organizationId: orgId,
        paypalDisputeId: disputeId,
        disputeReason: 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED',
        lifecycleStage: 'INQUIRY',
        paypalStatus: 'WAITING_FOR_SELLER_RESPONSE',
        disputeAmountMinor: 5000,
        currency: 'USD',
      },
    });

    const details = await DisputeService.getDisputeDetails(disputeId);
    assert.ok(details);
    assert.ok(details.allowedActions.includes('PROVIDE_EVIDENCE'));
    assert.ok(details.allowedActions.includes('ACCEPT_CLAIM'));
    assert.ok(details.allowedActions.includes('MAKE_OFFER')); // Allowed during INQUIRY
  });

  it('compiles case evidence respecting visibility and maps to PayPal format', async () => {
    const compiled = await EvidenceCompilerService.compileCaseEvidence(
      testCaseId,
      'PROOF_OF_FULFILLMENT',
      'Merchant tracking proof from logistics carrier.'
    );

    assert.equal(compiled.evidenceType, 'PROOF_OF_FULFILLMENT');
    assert.ok(compiled.notes.includes('tracking proof'));
    assert.ok(Array.isArray(compiled.documents));

    // Convert to PayPal submission payload
    const paypalSubmission = EvidenceCompilerService.toPayPalSubmission(compiled);
    assert.equal(paypalSubmission.evidence_type, 'PROOF_OF_FULFILLMENT');
    assert.ok(paypalSubmission.notes?.includes('tracking proof'));
    assert.ok(Array.isArray(paypalSubmission.documents));
  });

  it('merchant accepts dispute claim and closes dispute to RESOLVED', async () => {
    const disputeId = `PP-D-ACCEPT-${Date.now()}`;
    await prisma.payPalDispute.create({
      data: {
        organizationId: orgId,
        paypalDisputeId: disputeId,
        disputeReason: 'DEFECTIVE_PRODUCT',
        lifecycleStage: 'CHARGEBACK',
        paypalStatus: 'WAITING_FOR_SELLER_RESPONSE',
        disputeAmountMinor: 7500,
        currency: 'USD',
      },
    });

    const updated = await DisputeService.acceptClaim(
      disputeId,
      merchantUser,
      'Merchant agreed to settle and accept claim.'
    );

    assert.equal(updated.paypalStatus, 'RESOLVED');
  });
});
