/**
 * RESOLVEGRAPH — Step 10 Pilot Readiness & Operational Quality Tests
 * 
 * Validates:
 * 1. Environment validation & security startup boundaries (EnvValidator)
 * 2. Feature flags & financial circuit breakers (FeatureFlags)
 * 3. Privacy governance: DSAR export & Right-to-Erasure with legal holds (PrivacyService)
 * 4. Agent SRE operations: Stuck-run recovery & stale approval expiration (AgentOperationsService)
 * 5. Evidence storage reconciliation & hash integrity (StorageReconciliationService)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { EnvValidator } from '../src/lib/env-validator';
import { FeatureFlags } from '../src/lib/feature-flags';
import { PrivacyService } from '../src/server/services/privacy.service';
import { AgentOperationsService } from '../src/server/agents/runtime/agent-operations.service';
import { StorageReconciliationService } from '../src/server/storage/storage-reconciliation.service';
import { prisma } from '../src/lib/prisma';

describe('Step 10: Pilot Readiness & Production Engineering', () => {
  let testBuyerId: string;
  let testMerchantId: string;
  let testOrgId: string;
  let activeCaseId: string;
  let closedCaseId: string;

  before(async () => {
    // Setup test organization and test users
    const org = await prisma.organization.create({
      data: {
        name: 'Pilot Readiness Test Store',
        slug: `pilot-test-${Date.now()}`,
      },
    });
    testOrgId = org.id;

    const buyer = await prisma.user.create({
      data: {
        email: `pilot_buyer_${Date.now()}@example.com`,
        fullName: 'Pilot Test Buyer',
        role: 'BUYER',
      },
    });
    testBuyerId = buyer.id;

    const merchant = await prisma.user.create({
      data: {
        email: `pilot_merchant_${Date.now()}@example.com`,
        fullName: 'Pilot Test Merchant',
        role: 'MERCHANT',
        orgMemberships: {
          create: {
            organizationId: testOrgId,
            role: 'ORG_ADMIN',
          },
        },
      },
    });
    testMerchantId = merchant.id;

    // Create an active case
    const activeCase = await prisma.caseRecord.create({
      data: {
        caseNumber: `CASE-PLT-ACT-${Date.now()}`,
        title: 'Active Dispute Case',
        description: 'Item did not arrive within expected window',
        category: 'NON_DELIVERY',
        status: 'SUBMITTED',
        organizationId: testOrgId,
        buyerId: testBuyerId,
        merchantId: testMerchantId,
        amountMinor: 8500,
        currency: 'USD',
      },
    });
    activeCaseId = activeCase.id;

    // Create a closed case
    const closedCase = await prisma.caseRecord.create({
      data: {
        caseNumber: `CASE-PLT-CLS-${Date.now()}`,
        title: 'Closed Dispute Case',
        description: 'Item arrived with minor scratches',
        category: 'DAMAGED_GOODS',
        status: 'RESOLVED',
        organizationId: testOrgId,
        buyerId: testBuyerId,
        merchantId: testMerchantId,
        amountMinor: 4500,
        currency: 'USD',
      },
    });
    closedCaseId = closedCase.id;
  });

  after(async () => {
    // Teardown test artifacts safely
    try {
      await prisma.caseRecord.deleteMany({
        where: { id: { in: [activeCaseId, closedCaseId] } },
      });
      await prisma.organizationMember.deleteMany({
        where: { organizationId: testOrgId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testBuyerId, testMerchantId] } },
      });
      await prisma.organization.deleteMany({
        where: { id: testOrgId },
      });
    } catch {
      // Best-effort cleanup
    }
  });

  // --------------------------------------------------------------------------
  // 1. Environment Configuration & Security Startup Boundaries
  // --------------------------------------------------------------------------
  describe('Environment Configuration (EnvValidator)', () => {
    it('validates development environment without fatal failures', () => {
      const res = EnvValidator.validate({
        NODE_ENV: 'development',
        DATABASE_URL: 'file:./prisma/dev.db',
        BETTER_AUTH_SECRET: 'test-better-auth-secret-minimum-32-chars-long!',
      });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.errors.length, 0);
    });

    it('rejects SQLite database connection strings in production', () => {
      const res = EnvValidator.validate({
        NODE_ENV: 'production',
        DATABASE_URL: 'file:./prisma/dev.db',
        BETTER_AUTH_SECRET: 'super-secure-production-secret-value-longer-than-32-chars!',
        NEXT_PUBLIC_APP_URL: 'https://resolvegraph.com',
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('Production deployment cannot use local SQLite')));
    });

    it('rejects short authentication secrets (< 32 characters)', () => {
      const res = EnvValidator.validate({
        NODE_ENV: 'development',
        DATABASE_URL: 'file:./prisma/dev.db',
        BETTER_AUTH_SECRET: 'too-short',
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('at least 32 characters')));
    });

    it('strictly forbids live PayPal enablement in non-production environments', () => {
      const res = EnvValidator.validate({
        NODE_ENV: 'development',
        DATABASE_URL: 'file:./prisma/dev.db',
        BETTER_AUTH_SECRET: 'valid-length-test-secret-value-32-chars-ok!',
        PAYPAL_LIVE_ENABLED: 'true',
        PAYPAL_ENV: 'live',
        PAYPAL_CLIENT_ID: 'fake-id',
        PAYPAL_CLIENT_SECRET: 'fake-secret',
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('strictly forbidden in non-production environments')));
    });

    it('rejects non-HTTPS public URLs in production', () => {
      const res = EnvValidator.validate({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        BETTER_AUTH_SECRET: 'super-secure-production-secret-value-longer-than-32-chars!',
        NEXT_PUBLIC_APP_URL: 'http://insecure-http.resolvegraph.com',
      });
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('must use HTTPS')));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Feature Flags & Financial Circuit Breakers
  // --------------------------------------------------------------------------
  describe('Feature Flags & Safety Guardrails (FeatureFlags)', () => {
    it('hard-blocks live PayPal transactions when not in production', () => {
      const liveStatus = FeatureFlags.isPayPalLiveEnabled();
      assert.strictEqual(liveStatus, false, 'Live payments must be permanently false outside production');
    });

    it('provides default boolean states for pilot core capabilities', () => {
      assert.strictEqual(typeof FeatureFlags.isAiAnalysisEnabled(), 'boolean');
      assert.strictEqual(typeof FeatureFlags.isAgentCopilotEnabled(), 'boolean');
      assert.strictEqual(typeof FeatureFlags.isMerchantPilotEnabled(), 'boolean');
    });

    it('returns a comprehensive snapshot of all feature flags', () => {
      const snapshot = FeatureFlags.getAll();
      assert.ok('aiAnalysisEnabled' in snapshot);
      assert.ok('agentCopilotEnabled' in snapshot);
      assert.ok('paypalLiveEnabled' in snapshot);
      assert.strictEqual(snapshot.paypalLiveEnabled, false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Privacy Governance & DSAR Operations
  // --------------------------------------------------------------------------
  describe('Privacy Service (DSAR & Right to Erasure)', () => {
    it('generates a complete, structured DSAR data export package', async () => {
      const exportData = await PrivacyService.exportUserData(testBuyerId);

      assert.ok(exportData.exportDate);
      assert.strictEqual(exportData.user.id, testBuyerId);
      assert.ok(Array.isArray(exportData.cases));
      assert.ok(exportData.cases.some((c) => c.id === activeCaseId));
      assert.ok(Array.isArray(exportData.claims));
      assert.ok(Array.isArray(exportData.evidenceItems));
      assert.ok(Array.isArray(exportData.auditEvents));
    });

    it('blocks deletion when user is a party to an active dispute', async () => {
      const result = await PrivacyService.processDeletionRequest(testBuyerId, 'User requested complete erasure');

      assert.strictEqual(result.canDeleteImmediately, false);
      assert.strictEqual(result.actionTaken, 'BLOCKED_BY_ACTIVE_DISPUTE');
      assert.ok(result.activeLegalHolds.includes('ACTIVE_COMMERCIAL_DISPUTE'));
      assert.strictEqual(result.preservedRecordsCount.activeCases >= 1, true);
    });

    it('pseudonymizes user identity when no active disputes remain', async () => {
      // Create an isolated user with no active cases
      const ephemeralUser = await prisma.user.create({
        data: {
          email: `ephemeral_${Date.now()}@test.internal`,
          fullName: 'Ephemeral Subject',
          role: 'BUYER',
        },
      });

      const result = await PrivacyService.processDeletionRequest(ephemeralUser.id, 'Right to erasure invoked');

      assert.strictEqual(result.actionTaken, 'ANONYMIZED_WITH_LEGAL_HOLD');

      // Verify that user profile was pseudonymized
      const updatedUser = await prisma.user.findUnique({
        where: { id: ephemeralUser.id },
      });
      assert.ok(updatedUser);
      assert.ok(updatedUser.email.includes('anonymized_'));
      assert.strictEqual(updatedUser.fullName, 'Redacted Subject');
      assert.strictEqual(updatedUser.isActive, false);

      // Clean up
      await prisma.user.delete({ where: { id: ephemeralUser.id } });
    });
  });

  // --------------------------------------------------------------------------
  // 4. Agent SRE Operations & Monitoring
  // --------------------------------------------------------------------------
  describe('Agent Operations & Queue SRE (AgentOperationsService)', () => {
    it('detects and recovers stuck agent runs exceeding timeout', async () => {
      // Create a simulated stuck agent run
      const stuckRun = await prisma.agentRun.create({
        data: {
          caseId: activeCaseId,
          organizationId: testOrgId,
          userId: testMerchantId,
          title: 'Hanging Agent Run',
          status: 'RUNNING',
          prompt: 'Test stuck recovery',
          updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        },
      });

      const recoveredCount = await AgentOperationsService.recoverStuckRuns(15);
      assert.ok(recoveredCount >= 1, 'Should recover at least 1 stuck run');

      const recheckedRun = await prisma.agentRun.findUnique({
        where: { id: stuckRun.id },
      });
      assert.strictEqual(recheckedRun?.status, 'FAILED');
      assert.ok(recheckedRun?.error?.includes('exceeded execution timeout'));

      // Clean up
      await prisma.agentRun.delete({ where: { id: stuckRun.id } });
    });

    it('expires stale human approval requests that passed expiresAt', async () => {
      const run = await prisma.agentRun.create({
        data: {
          caseId: activeCaseId,
          organizationId: testOrgId,
          userId: testMerchantId,
          title: 'Approval Run',
          status: 'COMPLETED',
          prompt: 'Testing approval expiration',
        },
      });

      const staleApproval = await prisma.agentApprovalRequest.create({
        data: {
          runId: run.id,
          actionType: 'REFUND_PROPOSAL',
          description: 'Approval request for refund',
          proposedArgumentsJson: JSON.stringify({ amount: 25.0 }),
          argumentsHash: 'mocked-hash-value',
          requestedById: testMerchantId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        },
      });

      const expiredCount = await AgentOperationsService.expireStaleApprovals();
      assert.ok(expiredCount >= 1, 'Should expire at least 1 stale approval');

      const recheckedApproval = await prisma.agentApprovalRequest.findUnique({
        where: { id: staleApproval.id },
      });
      assert.strictEqual(recheckedApproval?.status, 'EXPIRED');

      // Clean up
      await prisma.agentApprovalRequest.delete({ where: { id: staleApproval.id } });
      await prisma.agentRun.delete({ where: { id: run.id } });
    });

    it('returns an accurate aggregate operations metrics report', async () => {
      const metrics = await AgentOperationsService.getOperationsMetrics();

      assert.ok(metrics.timestamp);
      assert.ok(typeof metrics.runs.total === 'number');
      assert.ok(typeof metrics.approvals.total === 'number');
      assert.ok(typeof metrics.resourceConsumption.totalTokensEstimated === 'number');
      assert.ok(['HEALTHY', 'DEGRADED'].includes(metrics.queueHealth.status));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Storage Reconciliation & Parity Scanning
  // --------------------------------------------------------------------------
  describe('Evidence Storage Reconciliation (StorageReconciliationService)', () => {
    it('executes storage reconciliation scan and returns structured audit report', async () => {
      const report = await StorageReconciliationService.reconcileStorage({
        cleanOrphans: false,
      });

      assert.ok(report.timestamp);
      assert.strictEqual(typeof report.totalFilesOnDisk, 'number');
      assert.strictEqual(typeof report.totalRecordsInDb, 'number');
      assert.ok(Array.isArray(report.orphanFiles));
      assert.ok(Array.isArray(report.missingFiles));
      assert.ok(Array.isArray(report.hashMismatches));
      assert.ok(['IN_SYNC', 'DISCREPANCIES_DETECTED'].includes(report.status));
    });
  });
});
