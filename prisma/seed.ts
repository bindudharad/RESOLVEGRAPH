import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import {
  PrismaClient,
  UserRole,
  OrganizationRole,
  EvidenceVisibility,
  MalwareScanStatus,
  CaseCategory,
  CaseStatus,
  CasePriority,
  CaseStage,
  PartyRole,
  ClaimType,
  ClaimStatus,
  RemedyType,
  EvidenceType,
  EvidenceSource,
  VerificationStatus,
  EventType,
} from '../src/generated/prisma/client';
import { hashPassword } from 'better-auth/crypto';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting RESOLVEGRAPH Step 3 database seeding...');

  // 1. Seed Organizations
  const orgsData = [
    {
      id: 'org_techstore',
      name: 'TechStore Global Workspace',
      slug: 'techstore',
      description: 'Authorized retailer for portable computing, storage hardware and accessories.',
      isActive: true,
    },
    {
      id: 'org_digitalmart',
      name: 'DigitalMart Express Portal',
      slug: 'digitalmart',
      description: 'High-volume digital merchant and multi-category consumer goods vendor.',
      isActive: true,
    },
    {
      id: 'org_nova',
      name: 'Nova Electronics Dispute Hub',
      slug: 'nova-electronics',
      description: 'Enterprise distributor of premium mobile electronics, displays and smart hardware.',
      isActive: true,
    },
  ];

  for (const org of orgsData) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {
        name: org.name,
        slug: org.slug,
        description: org.description,
        isActive: org.isActive,
      },
      create: org,
    });
  }
  console.log(`✓ Seeded ${orgsData.length} organizations.`);

  // 2. Seed Users with Better Auth fields
  const usersData = [
    {
      id: 'usr_priya_admin',
      email: 'admin@resolvegraph.demo',
      name: 'Priya Raghavan',
      fullName: 'Priya Raghavan',
      role: UserRole.ADMIN,
      isPlatformAdmin: true,
      emailVerified: true,
      organization: 'ResolveGraph Global',
      avatarUrl: '/avatars/priya.png',
      phone: '+1 (555) 019-2831',
      defaultPassword: 'Admin@ResolveGraph2026!',
    },
    {
      id: 'usr_alex_buyer',
      email: 'alex.morgan@consumer.demo',
      name: 'Alex Morgan',
      fullName: 'Alex Morgan',
      role: UserRole.BUYER,
      isPlatformAdmin: false,
      emailVerified: true,
      organization: 'Individual Consumer',
      phone: '+1 (555) 342-9901',
      defaultPassword: 'Buyer@ResolveGraph2026!',
    },
    {
      id: 'usr_sarah_buyer',
      email: 'sarah.johnson@consumer.demo',
      name: 'Sarah Johnson',
      fullName: 'Sarah Johnson',
      role: UserRole.BUYER,
      isPlatformAdmin: false,
      emailVerified: true,
      organization: 'Individual Consumer',
      phone: '+1 (555) 881-2045',
      defaultPassword: 'Buyer@ResolveGraph2026!',
    },
    {
      id: 'usr_daniel_buyer',
      email: 'daniel.carter@consumer.demo',
      name: 'Daniel Carter',
      fullName: 'Daniel Carter',
      role: UserRole.BUYER,
      isPlatformAdmin: false,
      emailVerified: true,
      organization: 'Individual Consumer',
      phone: '+1 (555) 749-1132',
      defaultPassword: 'Buyer@ResolveGraph2026!',
    },
    {
      id: 'usr_techstore_merchant',
      email: 'disputes@techstore.demo',
      name: 'TechStore Global',
      fullName: 'TechStore Global',
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      emailVerified: true,
      organization: 'TechStore Retail LLC',
      phone: '+1 (555) 600-4400',
      defaultPassword: 'Merchant@TechStore2026!',
    },
    {
      id: 'usr_digitalmart_merchant',
      email: 'support@digitalmart.demo',
      name: 'DigitalMart Express',
      fullName: 'DigitalMart Express',
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      emailVerified: true,
      organization: 'DigitalMart Commerce Inc.',
      phone: '+1 (555) 600-8800',
      defaultPassword: 'Merchant@DigitalMart2026!',
    },
    {
      id: 'usr_novaelectronics_merchant',
      email: 'resolution@novaelectronics.demo',
      name: 'Nova Electronics',
      fullName: 'Nova Electronics',
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      emailVerified: true,
      organization: 'Nova Hardware Group',
      phone: '+1 (555) 600-1200',
      defaultPassword: 'Merchant@Nova2026!',
    },
  ];

  for (const u of usersData) {
    const { defaultPassword, ...userData } = u;
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        fullName: userData.fullName,
        role: userData.role,
        isPlatformAdmin: userData.isPlatformAdmin,
        emailVerified: userData.emailVerified,
        organization: userData.organization,
        avatarUrl: userData.avatarUrl,
        phone: userData.phone,
      },
      create: userData,
    });

    // Seed Better Auth Account record with hashed password
    const hashedPassword = await hashPassword(defaultPassword);
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          password: hashedPassword,
        },
      });
    }
  }
  console.log(`✓ Seeded ${usersData.length} core users and credential accounts.`);

  // 3. Seed Organization Memberships
  const memberships = [
    // TechStore Members
    {
      organizationId: 'org_techstore',
      userId: 'usr_techstore_merchant',
      role: OrganizationRole.OWNER,
    },
    {
      organizationId: 'org_techstore',
      userId: 'usr_priya_admin',
      role: OrganizationRole.RESOLUTION_MANAGER,
    },

    // DigitalMart Members
    {
      organizationId: 'org_digitalmart',
      userId: 'usr_digitalmart_merchant',
      role: OrganizationRole.OWNER,
    },
    {
      organizationId: 'org_digitalmart',
      userId: 'usr_priya_admin',
      role: OrganizationRole.RESOLUTION_MANAGER,
    },

    // Nova Electronics Members
    {
      organizationId: 'org_nova',
      userId: 'usr_novaelectronics_merchant',
      role: OrganizationRole.OWNER,
    },
    {
      organizationId: 'org_nova',
      userId: 'usr_priya_admin',
      role: OrganizationRole.RESOLUTION_MANAGER,
    },
  ];

  for (const m of memberships) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: m.organizationId,
          userId: m.userId,
        },
      },
      update: { role: m.role, isActive: true },
      create: {
        organizationId: m.organizationId,
        userId: m.userId,
        role: m.role,
        isActive: true,
      },
    });
  }
  console.log(`✓ Seeded ${memberships.length} organization memberships.`);

  // 4. Seed Cases and Backfill organizationId
  const casesData = [
    {
      caseNumber: 'RG-1001',
      title: 'Wrong Product Received',
      description:
        'Customer ordered a Portable SSD 1 TB but received a Portable SSD 512 GB. The packaging label and invoice both list the 1 TB model, while the device reports 512 GB of usable capacity.',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.UNDER_ANALYSIS,
      priority: CasePriority.HIGH,
      amountMinor: 649900,
      currency: 'INR',
      buyerId: 'usr_alex_buyer',
      merchantId: 'usr_techstore_merchant',
      organizationId: 'org_techstore',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.INVESTIGATION,
      recommendedRemedy: RemedyType.REPLACEMENT,
      resolutionSummary: 'Pending hardware serial verification and carrier manifest audit.',
    },
    {
      caseNumber: 'RG-1002',
      title: 'Refund Awaiting Approval',
      description:
        'Buyer returned an unopened item eight days ago. The merchant acknowledged receipt of the return but has not yet approved the refund transaction.',
      category: CaseCategory.REFUND_DISPUTE,
      status: CaseStatus.EVIDENCE_REQUESTED,
      priority: CasePriority.MEDIUM,
      amountMinor: 219900,
      currency: 'INR',
      buyerId: 'usr_sarah_buyer',
      merchantId: 'usr_digitalmart_merchant',
      organizationId: 'org_digitalmart',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.EVIDENCE_GATHERING,
      recommendedRemedy: RemedyType.FULL_REFUND,
    },
    {
      caseNumber: 'RG-1003',
      title: 'Seller Response Overdue',
      description:
        'Order shows a delivered status but the buyer has no parcel. The merchant has not responded to two evidence requests within the response window.',
      category: CaseCategory.NON_DELIVERY,
      status: CaseStatus.IN_REVIEW,
      priority: CasePriority.HIGH,
      amountMinor: 14900,
      currency: 'USD',
      buyerId: 'usr_daniel_buyer',
      merchantId: 'usr_novaelectronics_merchant',
      organizationId: 'org_nova',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.INVESTIGATION,
      recommendedRemedy: RemedyType.FULL_REFUND,
    },
    {
      caseNumber: 'RG-1004',
      title: 'Evidence Incomplete',
      description:
        'Buyer reports a cracked display on arrival. A product photograph was submitted, but packaging and dispatch records are still outstanding.',
      category: CaseCategory.DAMAGED_GOODS,
      status: CaseStatus.EVIDENCE_REQUESTED,
      priority: CasePriority.MEDIUM,
      amountMinor: 485000,
      currency: 'INR',
      buyerId: 'usr_alex_buyer',
      merchantId: 'usr_digitalmart_merchant',
      organizationId: 'org_digitalmart',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.EVIDENCE_GATHERING,
    },
    {
      caseNumber: 'RG-1005',
      title: 'Package Never Arrived',
      description:
        'Tracking has not updated in six days and the estimated delivery window has passed without a delivery attempt.',
      category: CaseCategory.NON_DELIVERY,
      status: CaseStatus.SUBMITTED,
      priority: CasePriority.MEDIUM,
      amountMinor: 8999,
      currency: 'USD',
      buyerId: 'usr_sarah_buyer',
      merchantId: 'usr_techstore_merchant',
      organizationId: 'org_techstore',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.INTAKE,
    },
    {
      caseNumber: 'RG-1006',
      title: 'Cracked Screen on Delivery',
      description:
        'Smartphone arrived with a fractured front panel. Outer carton shows impact damage on one corner; carrier inspection is pending.',
      category: CaseCategory.DAMAGED_GOODS,
      status: CaseStatus.UNDER_ANALYSIS,
      priority: CasePriority.HIGH,
      amountMinor: 1899900,
      currency: 'INR',
      buyerId: 'usr_daniel_buyer',
      merchantId: 'usr_novaelectronics_merchant',
      organizationId: 'org_nova',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.INVESTIGATION,
      recommendedRemedy: RemedyType.REPLACEMENT,
    },
    {
      caseNumber: 'RG-1007',
      title: 'Duplicate Charge on Card',
      description:
        'Buyer reports two identical authorisations for a single order placed three minutes apart. One capture is disputed.',
      category: CaseCategory.UNAUTHORIZED_TRANSACTION,
      status: CaseStatus.IN_REVIEW,
      priority: CasePriority.HIGH,
      amountMinor: 21000,
      currency: 'USD',
      buyerId: 'usr_alex_buyer',
      merchantId: 'usr_digitalmart_merchant',
      organizationId: 'org_digitalmart',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.INVESTIGATION,
      recommendedRemedy: RemedyType.FULL_REFUND,
    },
    {
      caseNumber: 'RG-1008',
      title: 'Return Request Denied',
      description:
        'Merchant declined the return citing the hygiene-seal policy. Buyer contests that the seal was already broken on arrival.',
      category: CaseCategory.REFUND_DISPUTE,
      status: CaseStatus.EVIDENCE_REQUESTED,
      priority: CasePriority.LOW,
      amountMinor: 329900,
      currency: 'INR',
      buyerId: 'usr_sarah_buyer',
      merchantId: 'usr_techstore_merchant',
      organizationId: 'org_techstore',
      stage: CaseStage.EVIDENCE_GATHERING,
    },
    {
      caseNumber: 'RG-1009',
      title: 'Wrong Size Shipped',
      description: 'Ordered size M, received size XL. Tags and packing slip both read XL.',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      priority: CasePriority.LOW,
      amountMinor: 174900,
      currency: 'INR',
      buyerId: 'usr_daniel_buyer',
      merchantId: 'usr_novaelectronics_merchant',
      organizationId: 'org_nova',
      stage: CaseStage.INTAKE,
      recommendedRemedy: RemedyType.REPLACEMENT,
    },
    {
      caseNumber: 'RG-1010',
      title: 'Refund Not Received',
      description:
        'Merchant confirmed a refund twelve days ago. Buyer statement shows no credit after the stated five to seven working days.',
      category: CaseCategory.REFUND_DISPUTE,
      status: CaseStatus.EVIDENCE_REQUESTED,
      priority: CasePriority.MEDIUM,
      amountMinor: 6450,
      currency: 'USD',
      buyerId: 'usr_sarah_buyer',
      merchantId: 'usr_digitalmart_merchant',
      organizationId: 'org_digitalmart',
      stage: CaseStage.EVIDENCE_GATHERING,
    },
    {
      caseNumber: 'RG-1011',
      title: 'Missing Accessories Bundle',
      description: 'Replacement accessory bundle dispatched after merchant confirmed packaging error.',
      category: CaseCategory.OTHER,
      status: CaseStatus.RESOLVED,
      priority: CasePriority.LOW,
      amountMinor: 249900,
      currency: 'INR',
      buyerId: 'usr_alex_buyer',
      merchantId: 'usr_techstore_merchant',
      organizationId: 'org_techstore',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.FINALIZED,
      recommendedRemedy: RemedyType.REPLACEMENT,
      resolutionSummary: 'Merchant shipped missing cables and adapters via courier express #TRK-88219.',
      resolvedAt: new Date(Date.now() - 86400000 * 2),
    },
    {
      caseNumber: 'RG-1012',
      title: 'Counterfeit Item Claim',
      description:
        'Buyer alleges the serial number does not appear in the manufacturer warranty registry. Serial photographs and invoice were submitted.',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.UNDER_ANALYSIS,
      priority: CasePriority.HIGH,
      amountMinor: 32500,
      currency: 'USD',
      buyerId: 'usr_daniel_buyer',
      merchantId: 'usr_novaelectronics_merchant',
      organizationId: 'org_nova',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.INVESTIGATION,
      recommendedRemedy: RemedyType.FULL_REFUND,
    },
    {
      caseNumber: 'RG-1013',
      title: 'Partial Shipment Missing Items',
      description: 'Two of five line items arrived. Remaining three are marked fulfilled in merchant system.',
      category: CaseCategory.NON_DELIVERY,
      status: CaseStatus.SUBMITTED,
      priority: CasePriority.MEDIUM,
      amountMinor: 519900,
      currency: 'INR',
      buyerId: 'usr_sarah_buyer',
      merchantId: 'usr_digitalmart_merchant',
      organizationId: 'org_digitalmart',
      stage: CaseStage.INTAKE,
    },
    {
      caseNumber: 'RG-1014',
      title: 'Warranty Settlement Agreed',
      description: 'Goodwill partial settlement agreed after warranty eligibility review concluded in buyer favour.',
      category: CaseCategory.REFUND_DISPUTE,
      status: CaseStatus.RESOLVED,
      priority: CasePriority.MEDIUM,
      amountMinor: 799900,
      currency: 'INR',
      buyerId: 'usr_alex_buyer',
      merchantId: 'usr_techstore_merchant',
      organizationId: 'org_techstore',
      assignedManagerId: 'usr_priya_admin',
      stage: CaseStage.FINALIZED,
      recommendedRemedy: RemedyType.PARTIAL_REFUND,
      resolutionSummary: 'Settled with 50% partial refund and extended 2-year warranty certificate.',
      resolvedAt: new Date(Date.now() - 86400000 * 5),
    },
  ];

  for (const c of casesData) {
    await prisma.caseRecord.upsert({
      where: { caseNumber: c.caseNumber },
      update: c,
      create: c,
    });
  }
  console.log(`✓ Seeded ${casesData.length} cases with organization links.`);

  // 5. Seed Claims for RG-1001
  const rg1001 = await prisma.caseRecord.findUnique({
    where: { caseNumber: 'RG-1001' },
  });

  if (rg1001) {
    await prisma.claim.deleteMany({ where: { caseId: rg1001.id } });

    const claim1 = await prisma.claim.create({
      data: {
        caseId: rg1001.id,
        authorId: 'usr_alex_buyer',
        partyRole: PartyRole.BUYER,
        claimType: ClaimType.SIGNIFICANTLY_NOT_AS_DESCRIBED,
        statement:
          'I placed an order for the 1 TB Portable NVMe SSD, but the unit shipped to me is only 512 GB capacity. Serial on the outer retail box matches 1 TB, but the unit inside formatted to 476 GiB.',
        requestedRemedy: RemedyType.REPLACEMENT,
        status: ClaimStatus.ACTIVE,
      },
    });

    const claim2 = await prisma.claim.create({
      data: {
        caseId: rg1001.id,
        authorId: 'usr_techstore_merchant',
        partyRole: PartyRole.MERCHANT,
        claimType: ClaimType.OTHER,
        statement:
          'Our automated barcode fulfillment scanner verified SKU SSD-1TB-PRO at warehouse packing station #4. We suspect manufacturer factory mislabeling or packaging tamper.',
        requestedRemedy: RemedyType.REPLACEMENT,
        status: ClaimStatus.ACCEPTED,
      },
    });

    console.log('✓ Seeded claims for RG-1001.');

    // 6. Seed Evidence with visibility and scan status for RG-1001
    await prisma.evidence.deleteMany({ where: { caseId: rg1001.id } });

    await prisma.evidence.createMany({
      data: [
        {
          caseId: rg1001.id,
          uploadedById: 'usr_alex_buyer',
          claimId: claim1.id,
          filename: 'invoice-techstore-10842.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 245000,
          storageKey: 'evidence/rg-1001/invoice-techstore-10842.pdf',
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          description: 'Official invoice from TechStore showing purchase of 1 TB Portable SSD for ₹6,499.',
          evidenceType: EvidenceType.INVOICE,
          sourceType: EvidenceSource.BUYER_UPLOAD,
          verificationStatus: VerificationStatus.VERIFIED,
          visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
          scanStatus: MalwareScanStatus.NOT_CONFIGURED,
        },
        {
          caseId: rg1001.id,
          uploadedById: 'usr_alex_buyer',
          claimId: claim1.id,
          filename: 'ssd-device-properties-screenshot.png',
          mimeType: 'image/png',
          sizeBytes: 1120000,
          storageKey: 'evidence/rg-1001/ssd-device-properties.png',
          sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
          description: 'System disk management screenshot showing partition size 476.9 GB with hardware serial.',
          evidenceType: EvidenceType.PHOTO,
          sourceType: EvidenceSource.BUYER_UPLOAD,
          verificationStatus: VerificationStatus.VERIFIED,
          visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
          scanStatus: MalwareScanStatus.NOT_CONFIGURED,
        },
        {
          caseId: rg1001.id,
          uploadedById: 'usr_techstore_merchant',
          claimId: claim2.id,
          filename: 'fulfillment-station-manifest-scan.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 388000,
          storageKey: 'evidence/rg-1001/manifest-scan.pdf',
          sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
          description: 'Automated warehouse barcode scan log recorded at time of dispatch.',
          evidenceType: EvidenceType.TRACKING_INFO,
          sourceType: EvidenceSource.MERCHANT_PORTAL,
          verificationStatus: VerificationStatus.VERIFIED,
          visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
          scanStatus: MalwareScanStatus.NOT_CONFIGURED,
        },
        {
          caseId: rg1001.id,
          uploadedById: 'usr_techstore_merchant',
          filename: 'internal-investigation-notes.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 98000,
          storageKey: 'evidence/rg-1001/internal-notes.pdf',
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef',
          description: 'Internal fulfillment investigation report for station supervisor.',
          evidenceType: EvidenceType.OTHER,
          sourceType: EvidenceSource.MERCHANT_PORTAL,
          verificationStatus: VerificationStatus.VERIFIED,
          visibility: EvidenceVisibility.INTERNAL, // Sensitive internal document
          scanStatus: MalwareScanStatus.NOT_CONFIGURED,
        },
      ],
    });
    console.log('✓ Seeded evidence files for RG-1001 with visibility settings.');

    // 7. Seed Timeline Events
    await prisma.caseEvent.deleteMany({ where: { caseId: rg1001.id } });

    await prisma.caseEvent.createMany({
      data: [
        {
          caseId: rg1001.id,
          actorId: 'usr_alex_buyer',
          eventType: EventType.CASE_CREATED,
          description: 'Alex Morgan opened case RG-1001 regarding Portable SSD 1 TB.',
          metadataJson: JSON.stringify({ amount: 6499, currency: 'INR', reason: 'Product Not as Described' }),
          createdAt: new Date(Date.now() - 86400000 * 6),
        },
        {
          caseId: rg1001.id,
          actorId: 'usr_alex_buyer',
          eventType: EventType.EVIDENCE_UPLOADED,
          description: 'Alex Morgan uploaded purchase invoice and disk management screenshot.',
          metadataJson: JSON.stringify({ files: ['invoice-techstore-10842.pdf', 'ssd-device-properties-screenshot.png'] }),
          createdAt: new Date(Date.now() - 86400000 * 5),
        },
        {
          caseId: rg1001.id,
          actorId: 'usr_priya_admin',
          eventType: EventType.MANAGER_ASSIGNED,
          description: 'Priya Raghavan took ownership of dispute investigation.',
          metadataJson: JSON.stringify({ assignedRole: 'RESOLUTION_MANAGER' }),
          createdAt: new Date(Date.now() - 86400000 * 4),
        },
        {
          caseId: rg1001.id,
          actorId: 'usr_techstore_merchant',
          eventType: EventType.NOTE_ADDED,
          description: 'TechStore uploaded warehouse fulfillment barcode scan log.',
          metadataJson: JSON.stringify({ station: 'Station #4', sku: 'SSD-1TB-PRO' }),
          createdAt: new Date(Date.now() - 86400000 * 2),
        },
        {
          caseId: rg1001.id,
          actorId: 'usr_priya_admin',
          eventType: EventType.REMEDY_PROPOSED,
          description: 'Resolution proposed: Replacement unit dispatched with pre-paid return label.',
          metadataJson: JSON.stringify({ remedy: 'REPLACEMENT', tracking: 'PENDING_DISPATCH' }),
          createdAt: new Date(Date.now() - 3600000 * 5),
        },
      ],
    });
    console.log('✓ Seeded timeline events for RG-1001.');
  }

  // 8. Seed Initial Security Audit Events
  await prisma.securityAuditEvent.create({
    data: {
      actorId: 'usr_priya_admin',
      action: 'PLATFORM_BOOTSTRAP',
      targetType: 'SYSTEM',
      targetId: 'bootstrap_init',
      status: 'SUCCESS',
      metadataJson: JSON.stringify({
        initialPlatformAdmin: 'admin@resolvegraph.demo',
        organizationsSeeded: 3,
      }),
    },
  });
  console.log('✓ Seeded initial security audit log.');

  // 9. Seed Verified Registered Sellers in Seller Directory for Existing Demo Organizations
  const demoSellers = [
    {
      id: 'sel_techstore_verified',
      legalName: 'TechStore Retail Private Limited',
      normalizedLegalName: 'techstore retail private limited',
      displayName: 'TechStore Official',
      gstin: '29AABCT1234E1Z5',
      businessAddress: 'Bengaluru Fulfillment Hub, Karnataka',
      state: 'Karnataka',
      linkedOrganizationId: 'org_techstore',
      linkedMerchantUserId: 'usr_techstore_merchant',
      marketplace: 'DIRECT',
      marketplaceSellerId: 'TECHSTORE-DIRECT-01',
      storefrontName: 'TechStore',
    },
    {
      id: 'sel_digitalmart_verified',
      legalName: 'DigitalMart Commerce Private Limited',
      normalizedLegalName: 'digitalmart commerce private limited',
      displayName: 'DigitalMart',
      gstin: '27AABCD2345F1Z2',
      businessAddress: 'Mumbai Distribution Center, Maharashtra',
      state: 'Maharashtra',
      linkedOrganizationId: 'org_digitalmart',
      linkedMerchantUserId: 'usr_digitalmart_merchant',
      marketplace: 'AMAZON',
      marketplaceSellerId: 'A2DIGITALMART01',
      storefrontName: 'DigitalMart',
    },
    {
      id: 'sel_nova_verified',
      legalName: 'Nova Electronics India Private Limited',
      normalizedLegalName: 'nova electronics india private limited',
      displayName: 'Nova Electronics',
      gstin: '07AABCN3456G1Z8',
      businessAddress: 'Okhla Industrial Area, New Delhi',
      state: 'Delhi',
      linkedOrganizationId: 'org_nova',
      linkedMerchantUserId: 'usr_novaelectronics_merchant',
      marketplace: 'FLIPKART',
      marketplaceSellerId: 'NOVAELEC_FK01',
      storefrontName: 'Nova Electronics',
    },
  ];

  for (const s of demoSellers) {
    await prisma.sellerDirectoryEntry.upsert({
      where: { id: s.id },
      update: {
        legalName: s.legalName,
        normalizedLegalName: s.normalizedLegalName,
        displayName: s.displayName,
        gstin: s.gstin,
        businessAddress: s.businessAddress,
        state: s.state,
        identityStatus: 'REGISTERED',
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        identificationSource: 'SELLER_REGISTRATION',
        verifiedAt: new Date(),
        linkedOrganizationId: s.linkedOrganizationId,
        linkedMerchantUserId: s.linkedMerchantUserId,
      },
      create: {
        id: s.id,
        legalName: s.legalName,
        normalizedLegalName: s.normalizedLegalName,
        displayName: s.displayName,
        gstin: s.gstin,
        businessAddress: s.businessAddress,
        state: s.state,
        identityStatus: 'REGISTERED',
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        identificationSource: 'SELLER_REGISTRATION',
        verifiedAt: new Date(),
        linkedOrganizationId: s.linkedOrganizationId,
        linkedMerchantUserId: s.linkedMerchantUserId,
      },
    });

    await prisma.sellerMarketplaceAccount.upsert({
      where: {
        marketplace_marketplaceSellerId: {
          marketplace: s.marketplace,
          marketplaceSellerId: s.marketplaceSellerId,
        },
      },
      update: {
        storefrontName: s.storefrontName,
        isVerified: true,
      },
      create: {
        sellerId: s.id,
        marketplace: s.marketplace,
        marketplaceSellerId: s.marketplaceSellerId,
        storefrontName: s.storefrontName,
        relationshipType:
          s.marketplace === 'DIRECT' ? 'DIRECT_BRAND' : 'MARKETPLACE_THIRD_PARTY',
        isVerified: true,
      },
    });
  }
  console.log('✓ Seeded SellerDirectoryEntry & SellerMarketplaceAccount records for demo merchants.');

  console.log('✅ Database Step 3 seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
