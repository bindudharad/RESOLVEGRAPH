import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { NextRequest } from 'next/server';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';
import { OrganizationRole, UserRole } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  GET as getSellerOnboarding,
  PATCH as patchSellerOnboarding,
} from '@/app/api/seller/onboarding/route';
import {
  computeNextOnboardingRecord,
  SellerOnboardingService,
} from '@/server/seller';
import {
  SELLER_COMMITMENTS,
  SELLER_CORE_MESSAGE,
  SELLER_GUIDELINES,
  SELLER_RESPONSE_STATUS_EXPLANATIONS,
  SELLER_WELCOME_STEPS,
  getAcceptableEvidenceGuidanceForCategory,
} from '@/components/seller/seller-guidance-content';
import { NAV_GROUPS, PAGE_META } from '@/lib/navigation';

function makeReq(
  url: string,
  options?: { method?: string; email?: string; jsonBody?: unknown }
) {
  const headers = new Headers();
  if (options?.email) headers.set('x-demo-user-email', options.email);
  if (options?.jsonBody !== undefined) {
    headers.set('content-type', 'application/json');
  }

  return new NextRequest(url, {
    method: options?.method || 'GET',
    headers,
    ...(options?.jsonBody !== undefined ? { body: JSON.stringify(options.jsonBody) } : {}),
  });
}

test('computeNextOnboardingRecord enforces deterministic per-user transitions', () => {
  const t1 = new Date('2026-11-12T10:00:00.000Z');
  const t2 = new Date('2026-11-12T10:05:00.000Z');
  const t3 = new Date('2026-11-12T10:10:00.000Z');

  const initial = {
    status: 'NOT_STARTED' as const,
    lastViewedStep: 1,
    completedAt: null,
    dismissedAt: null,
    updatedAt: null,
  };

  const step2 = computeNextOnboardingRecord(initial, { action: 'VIEW_STEP', step: 2 }, t1);
  assert.equal(step2.status, 'IN_PROGRESS');
  assert.equal(step2.lastViewedStep, 2);
  assert.equal(step2.completedAt, null);

  const skipped = computeNextOnboardingRecord(step2, { action: 'SKIP', step: 2 }, t2);
  assert.equal(skipped.status, 'SKIPPED');
  assert.equal(skipped.dismissedAt?.toISOString(), t2.toISOString());

  const completed = computeNextOnboardingRecord(skipped, { action: 'COMPLETE', step: 4 }, t3);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.lastViewedStep, 4);
  assert.equal(completed.completedAt?.toISOString(), t3.toISOString());

  // Reopening or stepping later via Getting Started never clears completion
  const reopened = computeNextOnboardingRecord(
    completed,
    { action: 'REOPEN', step: 1 },
    new Date('2026-11-12T11:00:00.000Z')
  );
  assert.equal(reopened.status, 'COMPLETED');
  assert.equal(reopened.completedAt?.toISOString(), t3.toISOString());

  const viewWhileReopened = computeNextOnboardingRecord(
    reopened,
    { action: 'VIEW_STEP', step: 2 },
    new Date('2026-11-12T11:01:00.000Z')
  );
  assert.equal(viewWhileReopened.status, 'COMPLETED');

  const closeAfterReopen = computeNextOnboardingRecord(
    viewWhileReopened,
    { action: 'SKIP', step: 2 },
    new Date('2026-11-12T11:02:00.000Z')
  );
  assert.equal(closeAfterReopen.status, 'COMPLETED');
  assert.equal(closeAfterReopen.completedAt?.toISOString(), t3.toISOString());
});

test('Seller Onboarding APIs enforce RBAC, multi-member independence, persistence & tamper checks', async () => {
  const suffix = Date.now();
  const org = await prisma.organization.create({
    data: {
      name: `Onboarding Test Org ${suffix}`,
      slug: `onboarding-test-org-${suffix}`,
      isActive: true,
    },
  });

  const sellerA = await prisma.user.create({
    data: {
      email: `seller-a-${suffix}@seller.test`,
      name: 'Seller Member A',
      fullName: 'Seller Member A',
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      isActive: true,
      organization: org.name,
    },
  });

  const sellerB = await prisma.user.create({
    data: {
      email: `seller-b-${suffix}@seller.test`,
      name: 'Seller Member B',
      fullName: 'Seller Member B',
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      isActive: true,
      organization: org.name,
    },
  });

  const unprovisionedMerchant = await prisma.user.create({
    data: {
      email: `unprovisioned-${suffix}@seller.test`,
      name: 'Unprovisioned Seller',
      fullName: 'Unprovisioned Seller',
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      isActive: true,
    },
  });

  await prisma.organizationMember.createMany({
    data: [
      {
        organizationId: org.id,
        userId: sellerA.id,
        role: OrganizationRole.OWNER,
        isActive: true,
      },
      {
        organizationId: org.id,
        userId: sellerB.id,
        role: OrganizationRole.MERCHANT_AGENT,
        isActive: true,
      },
    ],
  });

  try {
    // Test Case 8a: Unauthenticated -> 401
    const unauthGet = await getSellerOnboarding(makeReq('http://localhost:3000/api/seller/onboarding'));
    assert.equal(unauthGet.status, 401);

    const unauthPatch = await patchSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        method: 'PATCH',
        jsonBody: { action: 'COMPLETE' },
      })
    );
    assert.equal(unauthPatch.status, 401);

    // Test Case 8b: Buyer -> 403
    const buyerGet = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: 'alex.morgan@consumer.demo',
      })
    );
    assert.equal(buyerGet.status, 403);

    // Test Case 8c: Platform Admin (non-merchant) -> 403
    const adminGet = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: 'admin@resolvegraph.demo',
      })
    );
    assert.equal(adminGet.status, 403);

    // Test Case 8d: Merchant without active org membership -> 403
    const unprovisionedGet = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: unprovisionedMerchant.email,
      })
    );
    assert.equal(unprovisionedGet.status, 403);

    // Test Case 1: First login for Seller A -> NOT_STARTED + shouldAutoShow = true
    const firstGetA = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: sellerA.email,
      })
    );
    assert.equal(firstGetA.status, 200);
    const firstDataA = await firstGetA.json();
    assert.equal(firstDataA.onboarding.status, 'NOT_STARTED');
    assert.equal(firstDataA.onboarding.shouldAutoShow, true);
    assert.equal(firstDataA.onboarding.lastViewedStep, 1);

    // Test Case 2: Skip persists dismissedAt and suppresses auto-show on reload
    const skipResA = await patchSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        method: 'PATCH',
        email: sellerA.email,
        jsonBody: { action: 'SKIP', step: 2 },
      })
    );
    assert.equal(skipResA.status, 200);
    const skippedBodyA = await skipResA.json();
    assert.equal(skippedBodyA.onboarding.status, 'SKIPPED');
    assert.equal(skippedBodyA.onboarding.shouldAutoShow, false);
    assert.ok(skippedBodyA.onboarding.dismissedAt);

    // Reopen via Getting Started after skip, step through, and Finish -> COMPLETED
    const reopenA = await patchSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        method: 'PATCH',
        email: sellerA.email,
        jsonBody: { action: 'REOPEN', step: 1, source: 'profile_menu' },
      })
    );
    assert.equal(reopenA.status, 200);

    // Test concurrency: rapid step updates + finish settle cleanly as COMPLETED
    await Promise.all([
      patchSellerOnboarding(
        makeReq('http://localhost:3000/api/seller/onboarding', {
          method: 'PATCH',
          email: sellerA.email,
          jsonBody: { action: 'VIEW_STEP', step: 2 },
        })
      ),
      patchSellerOnboarding(
        makeReq('http://localhost:3000/api/seller/onboarding', {
          method: 'PATCH',
          email: sellerA.email,
          jsonBody: { action: 'VIEW_STEP', step: 3 },
        })
      ),
      patchSellerOnboarding(
        makeReq('http://localhost:3000/api/seller/onboarding', {
          method: 'PATCH',
          email: sellerA.email,
          jsonBody: { action: 'COMPLETE', step: 4 },
        })
      ),
    ]);

    const afterCompleteA = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: sellerA.email,
      })
    );
    const completeDataA = await afterCompleteA.json();
    assert.equal(completeDataA.onboarding.status, 'COMPLETED');
    assert.equal(completeDataA.onboarding.shouldAutoShow, false);
    assert.ok(completeDataA.onboarding.completedAt);
    const originalCompletedAt = completeDataA.onboarding.completedAt;

    // Test Case 5: Reopen & close does NOT reset completedAt or re-enable auto-show
    await patchSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        method: 'PATCH',
        email: sellerA.email,
        jsonBody: { action: 'REOPEN', step: 1 },
      })
    );
    await patchSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        method: 'PATCH',
        email: sellerA.email,
        jsonBody: { action: 'VIEW_STEP', step: 2 },
      })
    );
    const reloadAfterReopenA = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: sellerA.email,
      })
    );
    const reopenedCheckA = await reloadAfterReopenA.json();
    assert.equal(reopenedCheckA.onboarding.status, 'COMPLETED');
    assert.equal(reopenedCheckA.onboarding.shouldAutoShow, false);
    assert.equal(reopenedCheckA.onboarding.completedAt, originalCompletedAt);

    // Test Case 4: Second member in SAME org still has fresh NOT_STARTED state
    const firstGetB = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: sellerB.email,
      })
    );
    assert.equal(firstGetB.status, 200);
    const firstDataB = await firstGetB.json();
    assert.equal(firstDataB.onboarding.status, 'NOT_STARTED');
    assert.equal(firstDataB.onboarding.shouldAutoShow, true);

    // Test Case 8e: Cross-user tampering rejected and leaves Seller B unchanged
    const tamperGet = await getSellerOnboarding(
      makeReq(
        `http://localhost:3000/api/seller/onboarding?userId=${encodeURIComponent(sellerB.id)}`,
        { email: sellerA.email }
      )
    );
    assert.equal(tamperGet.status, 403);

    const tamperPatch = await patchSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        method: 'PATCH',
        email: sellerA.email,
        jsonBody: { action: 'COMPLETE', userId: sellerB.id },
      })
    );
    assert.equal(tamperPatch.status, 403);

    const verifyBUnchanged = await getSellerOnboarding(
      makeReq('http://localhost:3000/api/seller/onboarding', {
        email: sellerB.email,
      })
    );
    const verifyBData = await verifyBUnchanged.json();
    assert.equal(verifyBData.onboarding.status, 'NOT_STARTED');
    assert.equal(verifyBData.onboarding.shouldAutoShow, true);
  } finally {
    await prisma.securityAuditEvent.deleteMany({
      where: {
        actorId: { in: [sellerA.id, sellerB.id, unprovisionedMerchant.id] },
      },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: org.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [sellerA.id, sellerB.id, unprovisionedMerchant.id] } },
    });
    await prisma.organization.delete({ where: { id: org.id } });
  }
});

test('Additive SellerOnboardingState migration SQL applies cleanly and persists in normalized SQLite table on an ephemeral copy', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rg-seller-onb-'));
  const tempDbPath = path.join(tempDir, 'ephemeral-test.db');

  try {
    const devDbSource = path.resolve(process.cwd(), 'dev.db');
    await fs.copyFile(devDbSource, tempDbPath);

    const migrationSqlPath = path.resolve(
      process.cwd(),
      'prisma/migrations/20261112000000_add_seller_onboarding_state/migration.sql'
    );
    const migrationSql = await fs.readFile(migrationSqlPath, 'utf8');

    const sqlite = new Database(tempDbPath);
    sqlite.exec(migrationSql);
    sqlite.close();

    const adapter = new PrismaBetterSqlite3({
      url: `file:${tempDbPath}`,
      timeout: 15000,
    });
    const isolatedPrisma = new PrismaClient({ adapter });

    try {
      const suffix = Date.now();
      const org = await isolatedPrisma.organization.create({
        data: {
          name: `Ephemeral Org ${suffix}`,
          slug: `ephemeral-org-${suffix}`,
          isActive: true,
        },
      });
      const merchant = await isolatedPrisma.user.create({
        data: {
          email: `ephemeral-seller-${suffix}@seller.test`,
          name: 'Ephemeral Seller',
          fullName: 'Ephemeral Seller',
          role: UserRole.MERCHANT,
          isPlatformAdmin: false,
          isActive: true,
          organization: org.name,
        },
      });
      await isolatedPrisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: merchant.id,
          role: OrganizationRole.OWNER,
          isActive: true,
        },
      });

      const authUser = {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name,
        fullName: merchant.fullName,
        role: UserRole.MERCHANT,
        isPlatformAdmin: false,
        isActive: true,
        organization: org.name,
        avatarUrl: null,
        orgMemberships: [
          {
            organizationId: org.id,
            role: OrganizationRole.OWNER,
            organization: {
              id: org.id,
              name: org.name,
              slug: org.slug,
            },
          },
        ],
      };

      const initial = await SellerOnboardingService.getStateForUser(authUser, isolatedPrisma);
      assert.equal(initial.persistenceMode, 'database');
      assert.equal(initial.status, 'NOT_STARTED');
      assert.equal(initial.shouldAutoShow, true);

      const completed = await SellerOnboardingService.updateStateForUser(
        authUser,
        { action: 'COMPLETE', step: 4 },
        isolatedPrisma
      );
      assert.equal(completed.persistenceMode, 'database');
      assert.equal(completed.status, 'COMPLETED');
      assert.equal(completed.shouldAutoShow, false);
      assert.ok(completed.completedAt);

      const directRow = await isolatedPrisma.sellerOnboardingState.findUnique({
        where: { userId: merchant.id },
      });
      assert.ok(directRow);
      assert.equal(directRow.status, 'COMPLETED');
    } finally {
      await isolatedPrisma.$disconnect();
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('Seller Welcome Guide, Guidelines, Commitments & Navigation invariants hold cleanly', () => {
  assert.ok(SELLER_CORE_MESSAGE.includes('Your business deserves to be heard.'));
  assert.equal(SELLER_WELCOME_STEPS.length, 4);
  assert.deepEqual(
    SELLER_WELCOME_STEPS.map((s) => s.heading),
    [
      'Welcome to RESOLVEGRAPH.',
      'Your Side Matters.',
      'Evidence First. Fair Consideration.',
      'Stay Informed at Every Step.',
    ]
  );

  assert.equal(SELLER_GUIDELINES.length, 8);
  assert.equal(SELLER_COMMITMENTS.length, 4);
  assert.deepEqual(
    SELLER_RESPONSE_STATUS_EXPLANATIONS.map((s) => s.label),
    [
      'Under Verification',
      'Verified for Investigation',
      'Additional Information Required',
      'Human Review Required',
    ]
  );

  assert.ok(getAcceptableEvidenceGuidanceForCategory('WRONG_PRODUCT').length >= 3);
  assert.ok(getAcceptableEvidenceGuidanceForCategory('DAMAGED_GOODS').length >= 3);
  assert.ok(getAcceptableEvidenceGuidanceForCategory('MISSING_ITEM').length >= 3);

  // Main sidebar navigation groups must not add Getting Started or Seller Guidelines
  const sidebarHrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
  assert.ok(!sidebarHrefs.includes('/seller/guidelines'));
  assert.ok(PAGE_META['/seller/guidelines']);
});
