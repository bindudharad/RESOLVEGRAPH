import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { PolicyValidator } from "../src/server/resolution/policy-validator";
import { ResolutionEngine } from "../src/server/resolution/resolution-engine";
import { ProposalWorkflowService } from "../src/server/resolution/proposal-workflow";
import { prisma } from "../src/lib/prisma";

describe("ResolveGraph Resolution Intelligence & Policy Suite", () => {
  let caseId: string;
  let buyerId: string;
  let merchantId: string;
  let orgId: string;

  before(async () => {
    const c = await prisma.caseRecord.findFirst({
      include: { buyer: true, merchant: true },
    });
    if (c) {
      caseId = c.id;
      buyerId = c.buyerId;
      merchantId = c.merchantId;
      orgId = c.organizationId || "org_techstore_online";

      // Seed a test resolution policy if not exists
      const existingPolicy = await prisma.resolutionPolicy.findFirst({
        where: { organizationId: orgId },
      });

      if (!existingPolicy) {
        await prisma.resolutionPolicy.create({
          data: {
            organizationId: orgId,
            name: "Enterprise Dispute Policy",
            version: "1.0",
            createdById: merchantId,
            rules: {
              create: [
                {
                  ruleType: "RETURN_WINDOW",
                  configurationJson: JSON.stringify({ maxDays: 30, basis: "DELIVERY_DATE" }),
                  priority: 1,
                },
                {
                  ruleType: "REQUIRED_EVIDENCE",
                  configurationJson: JSON.stringify({ requiredTypes: ["RECEIPT", "PHOTO"] }),
                  priority: 2,
                },
                {
                  ruleType: "REFUND_LIMIT",
                  configurationJson: JSON.stringify({ maxAmountMinor: 500000, currency: "USD", allowOverrideWithApproval: true }),
                  priority: 3,
                },
              ],
            },
          },
        });
      }
    }
  });

  test("PolicyValidator validates schemas and rejects malformed JSON", () => {
    // Valid configs
    const validReturn = PolicyValidator.validateRuleConfig(
      "RETURN_WINDOW",
      JSON.stringify({ maxDays: 14, basis: "ORDER_DATE" })
    );
    assert.strictEqual(validReturn.isValid, true);

    const validReq = PolicyValidator.validateRuleConfig(
      "REQUIRED_EVIDENCE",
      JSON.stringify({ requiredTypes: ["RECEIPT", "TRACKING_DOCUMENT"] })
    );
    assert.strictEqual(validReq.isValid, true);

    // Invalid config (negative maxDays)
    const invalidReturn = PolicyValidator.validateRuleConfig(
      "RETURN_WINDOW",
      JSON.stringify({ maxDays: -5 })
    );
    assert.strictEqual(invalidReturn.isValid, false);
    assert.ok(invalidReturn.error);
  });

  test("ResolutionEngine evaluates case against policy and suggests grounded remedies", async () => {
    if (!caseId) return;

    const result = await ResolutionEngine.evaluateCase(caseId);

    assert.ok(result);
    assert.strictEqual(result.caseId, caseId);
    assert.ok(result.candidateOptions.length >= 1);
    assert.ok(result.recommendedOption);
    assert.ok(result.recommendedOption.reason.length > 0);
  });

  test("ProposalWorkflowService manages bilateral lifecycle to AGREED status", async () => {
    if (!caseId || !buyerId || !merchantId) return;

    // 1. Buyer creates proposal
    const proposal = await ProposalWorkflowService.createProposal({
      caseId,
      proposedById: buyerId,
      proposalType: "PARTIAL_REFUND",
      title: "50% Partial Settlement Agreement",
      description: "Buyer agrees to retain unit for 50% discount.",
      amountMinor: 50000,
      currency: "USD",
      reason: "Fair split compensation for specification discrepancy.",
    });

    assert.ok(proposal.id);
    assert.strictEqual(proposal.status, "PENDING_MERCHANT");

    // 2. Unauthorized third-party cannot respond
    await assert.rejects(
      async () => {
        await ProposalWorkflowService.submitPartyResponse({
          proposalId: proposal.id,
          responderId: "unrelated-user-999",
          response: "ACCEPTED",
        });
      },
      /Unauthorized/
    );

    // 3. Merchant responds with ACCEPTED
    const acceptedProposal = await ProposalWorkflowService.submitPartyResponse({
      proposalId: proposal.id,
      responderId: merchantId,
      response: "ACCEPTED",
      comment: "Agreed to 50% settlement as goodwill gesture.",
    });

    assert.strictEqual(acceptedProposal.status, "AGREED");
  });
});
