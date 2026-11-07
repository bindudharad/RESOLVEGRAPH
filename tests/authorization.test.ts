import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { getAccessibleCases } from '../src/server/dal/get-accessible-cases';
import { canAccessCase, canMutateCase, canViewEvidence } from '../src/server/auth/permissions';
import { AuthenticatedUser } from '../src/server/auth/session';
import {
  OrganizationRole,
  UserRole,
  EvidenceVisibility,
} from '../src/generated/prisma/client';

describe('ResolveGraph Authorization & Multi-Tenant Isolation Suite', () => {
  // Test personas
  let platformAdmin: AuthenticatedUser;
  let buyerAlex: AuthenticatedUser;
  let buyerSarah: AuthenticatedUser;
  let merchantCarlos: AuthenticatedUser;
  let managerDavid: AuthenticatedUser;

  before(async () => {
    // 1. Load Priya (Platform Admin)
    const priya = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@resolvegraph.demo' },
    });
    platformAdmin = {
      id: priya.id,
      email: priya.email,
      name: priya.fullName,
      fullName: priya.fullName,
      role: priya.role,
      isPlatformAdmin: true,
      isActive: true,
      avatarUrl: priya.avatarUrl,
      organization: priya.organization,
      orgMemberships: [],
    };

    // 2. Load Alex Morgan (Buyer A)
    const alex = await prisma.user.findUniqueOrThrow({
      where: { email: 'alex.morgan@consumer.demo' },
    });
    buyerAlex = {
      id: alex.id,
      email: alex.email,
      name: alex.fullName,
      fullName: alex.fullName,
      role: alex.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: alex.avatarUrl,
      organization: alex.organization,
      orgMemberships: [],
    };

    // 3. Load Sarah Johnson (Buyer B)
    const sarah = await prisma.user.findUniqueOrThrow({
      where: { email: 'sarah.johnson@consumer.demo' },
    });
    buyerSarah = {
      id: sarah.id,
      email: sarah.email,
      name: sarah.fullName,
      fullName: sarah.fullName,
      role: sarah.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: sarah.avatarUrl,
      organization: sarah.organization,
      orgMemberships: [],
    };

    // 4. Load TechStore Merchant Agent
    const techStore = await prisma.user.findUniqueOrThrow({
      where: { email: 'disputes@techstore.demo' },
      include: {
        orgMemberships: {
          include: { organization: true },
        },
      },
    });
    merchantCarlos = {
      id: techStore.id,
      email: techStore.email,
      name: techStore.fullName,
      fullName: techStore.fullName,
      role: techStore.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: techStore.avatarUrl,
      organization: techStore.organization,
      orgMemberships: techStore.orgMemberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
        },
      })),
    };

    // 5. Initialize Resolution Manager Persona
    managerDavid = {
      id: 'usr_david_manager',
      email: 'david.chen@resolvegraph.demo',
      name: 'David Chen',
      fullName: 'David Chen',
      role: UserRole.RESOLUTION_MANAGER,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: 'ResolveGraph Operations',
      orgMemberships: [],
    };
  });

  test('Buyer Isolation: Buyer A cannot see Buyer B cases', async () => {
    // Fetch cases accessible to Alex Morgan
    const alexCases = await getAccessibleCases(buyerAlex, { limit: 100 });
    assert.ok(alexCases.items.length > 0, 'Alex should have accessible cases');

    for (const c of alexCases.items) {
      assert.equal(
        c.buyer.email,
        buyerAlex.email,
        `Alex Morgan should only see cases where he is the buyer (encountered ${c.buyer.email})`
      );
      assert.notEqual(
        c.buyer.email,
        buyerSarah.email,
        'Alex Morgan must never access Sarah Johnsons cases'
      );
    }
  });

  test('Merchant Tenant Isolation: Carlos Mendez only sees TechStore organization cases', async () => {
    const carlosCases = await getAccessibleCases(merchantCarlos, { limit: 100 });
    assert.ok(carlosCases.items.length > 0, 'Carlos should have accessible organization cases');

    const techStoreOrg = merchantCarlos.orgMemberships.find(
      (m) => m.organization.slug === 'techstore'
    );
    assert.ok(techStoreOrg, 'Carlos must belong to TechStore organization');

    for (const c of carlosCases.items) {
      assert.equal(
        c.organizationId,
        techStoreOrg?.organizationId,
        `All accessible cases must belong to TechStore org_techstore (got ${c.organizationId})`
      );
    }
  });

  test('Platform Admin Scope: Priya Raghavan sees cases across all tenants', async () => {
    const adminCases = await getAccessibleCases(platformAdmin, { limit: 100 });
    assert.ok(adminCases.items.length >= 10, 'Platform admin should access full case dataset');

    const buyers = new Set(adminCases.items.map((c) => c.buyer.email));
    assert.ok(buyers.has(buyerAlex.email), 'Admin can view Alexs cases');
    assert.ok(buyers.has(buyerSarah.email), 'Admin can view Sarahs cases');
  });

  test('Evidence Visibility Permissions: Buyer vs Merchant vs Resolution Manager', () => {
    const mockCase = {
      id: 'case_rg_1001',
      caseNumber: 'RG-1001',
      buyerId: buyerAlex.id,
      merchantId: merchantCarlos.id,
      assignedManagerId: managerDavid.id,
      organizationId: 'org_techstore',
    };

    // 1. Shared with all participants
    const sharedEvidence = {
      id: 'ev_shared',
      caseId: 'case_rg_1001',
      uploadedById: buyerAlex.id,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
    };
    assert.equal(canViewEvidence(buyerAlex, sharedEvidence, mockCase), true, 'Buyer can view shared evidence');
    assert.equal(canViewEvidence(merchantCarlos, sharedEvidence, mockCase), true, 'Merchant can view shared evidence');
    assert.equal(canViewEvidence(buyerSarah, sharedEvidence, mockCase), false, 'Unrelated buyer cannot view shared evidence');

    // 2. Buyer Only (Private to Buyer and Platform Admin)
    const buyerOnlyEvidence = {
      id: 'ev_buyer_only',
      caseId: 'case_rg_1001',
      uploadedById: buyerAlex.id,
      visibility: EvidenceVisibility.BUYER_ONLY,
    };
    assert.equal(canViewEvidence(buyerAlex, buyerOnlyEvidence, mockCase), true, 'Buyer can view own buyer-only evidence');
    assert.equal(canViewEvidence(merchantCarlos, buyerOnlyEvidence, mockCase), false, 'Merchant CANNOT view buyer-only evidence');
    assert.equal(canViewEvidence(platformAdmin, buyerOnlyEvidence, mockCase), true, 'Platform admin can view buyer-only evidence');

    // 3. Merchant Only
    const merchantOnlyEvidence = {
      id: 'ev_merchant_only',
      caseId: 'case_rg_1001',
      uploadedById: merchantCarlos.id,
      visibility: EvidenceVisibility.MERCHANT_ONLY,
    };
    assert.equal(canViewEvidence(buyerAlex, merchantOnlyEvidence, mockCase), false, 'Buyer CANNOT view merchant-only evidence');
    assert.equal(canViewEvidence(merchantCarlos, merchantOnlyEvidence, mockCase), true, 'Merchant can view merchant-only evidence');

    // 4. Internal Resolution Only
    const internalEvidence = {
      id: 'ev_internal',
      caseId: 'case_rg_1001',
      uploadedById: platformAdmin.id,
      visibility: EvidenceVisibility.INTERNAL,
    };
    const regularAgent: AuthenticatedUser = {
      ...merchantCarlos,
      orgMemberships: [
        {
          organizationId: 'org_techstore',
          role: OrganizationRole.MERCHANT_AGENT,
          organization: { id: 'org_techstore', name: 'TechStore', slug: 'techstore' },
        },
      ],
    };
    assert.equal(canViewEvidence(buyerAlex, internalEvidence, mockCase), false, 'Buyer CANNOT view internal evidence');
    assert.equal(canViewEvidence(regularAgent, internalEvidence, mockCase), false, 'Regular Merchant Agent CANNOT view internal evidence');
    assert.equal(canViewEvidence(platformAdmin, internalEvidence, mockCase), true, 'Platform admin can view internal evidence');
  });

  test('Cross-Tenant Mutation Guard: Merchant cannot mutate another organizations case', () => {
    const foreignCase = {
      id: 'case_rg_1002',
      caseNumber: 'RG-1002',
      buyerId: buyerSarah.id,
      merchantId: 'usr_digitalmart_agent',
      assignedManagerId: null,
      organizationId: 'org_digitalmart', // DigitalMart, not TechStore!
    };

    assert.equal(canAccessCase(merchantCarlos, foreignCase), false, 'Carlos cannot access DigitalMart case');
    assert.equal(canMutateCase(merchantCarlos, foreignCase), false, 'Carlos cannot mutate DigitalMart case');
  });
});
