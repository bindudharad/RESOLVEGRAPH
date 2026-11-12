import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { getAccessibleCases } from "../src/server/dal/get-accessible-cases";
import { CaseService } from "../src/server/services/case.service";
import { mapBackendStatusToCustomerStatus, parseComplaintDetails } from "../src/components/buyer/buyer-complaints-list";
import {
  SHOPPING_PLATFORMS,
  COMPLAINT_CATEGORIES,
  EVIDENCE_SLOTS_BY_CATEGORY,
} from "../src/lib/buyer-complaint-config";
import { detectMagicBytes } from "../src/server/storage/evidence-storage";
import { POST as suggestTitlePost } from "../src/app/api/complaints/suggest-title/route";
import { BuyerTrackingService } from "../src/server/services/buyer-tracking.service";
import { DeliveryReminderService } from "../src/server/services/delivery-reminder.service";
import { groupComplaintsByDate, formatDateHeading } from "../src/lib/buyer-date-grouping";
import { extractComplaintIdFromHref } from "../src/components/common/notification-panel";
import { AuthError } from "../src/server/auth/require-auth";
import {
  CaseCategory,
  CasePriority,
  CaseStatus,
  CaseStage,
  EventType,
  RemedyType,
  PartyRole,
  ClaimType,
  UserRole,
  EvidenceSource,
  EvidenceType,
  EvidenceVisibility,
} from "../src/generated/prisma/client";

test("Customer Status Mapping maps internal database states to consumer-friendly statuses", () => {
  assert.equal(mapBackendStatusToCustomerStatus("SUBMITTED").label, "Submitted");
  assert.equal(mapBackendStatusToCustomerStatus("DRAFT").label, "Submitted");
  assert.equal(mapBackendStatusToCustomerStatus("EVIDENCE_SUBMITTED").label, "Reviewing evidence");
  assert.equal(mapBackendStatusToCustomerStatus("EVIDENCE_REQUESTED").label, "Waiting for merchant response");
  assert.equal(mapBackendStatusToCustomerStatus("UNDER_ANALYSIS").label, "Under investigation");
  assert.equal(mapBackendStatusToCustomerStatus("PROPOSAL_PENDING").label, "Resolution proposed");
  assert.equal(mapBackendStatusToCustomerStatus("APPROVAL_PENDING").label, "Awaiting approval");
  assert.equal(mapBackendStatusToCustomerStatus("EXECUTING_REFUND").label, "Refund in progress");
  assert.equal(mapBackendStatusToCustomerStatus("EXECUTING_REPLACEMENT").label, "Replacement in progress");
  assert.equal(mapBackendStatusToCustomerStatus("RESOLVED").label, "Resolved");
  assert.equal(mapBackendStatusToCustomerStatus("CLOSED").label, "Resolved");
  assert.equal(mapBackendStatusToCustomerStatus("IN_REVIEW").label, "Escalated");
});

test("Complaint parser extracts external platform, order ID, product name, and remedy accurately", () => {
  const mockCase = {
    id: "case_test_99",
    caseNumber: "RG-1099",
    title: "Wrong product received",
    description: "[Platform: Flipkart | Order ID: OD228391823 | Product: Apple iPhone 15 Pro 128GB]\n\nPackage arrived with wrong model inside.",
    category: "NOT_AS_DESCRIBED",
    status: "UNDER_ANALYSIS",
    amountMinor: 11990000,
    currency: "INR",
    claims: [
      {
        requestedRemedy: "REPLACEMENT",
        statement: "Package arrived with wrong model inside.",
      },
    ],
  };

  const parsed = parseComplaintDetails(mockCase);
  assert.equal(parsed.id, "RG-1099");
  assert.equal(parsed.platform, "Flipkart");
  assert.equal(parsed.orderId, "OD228391823");
  assert.equal(parsed.productName, "Apple iPhone 15 Pro 128GB");
  assert.equal(parsed.amount, 119900);
  assert.equal(parsed.currency, "INR");
  assert.equal(parsed.requestedRemedy, "Replacement");
  assert.equal(parsed.status, "Under investigation");
});

test("Buyer Complaint Case Creation creates atomic CaseRecord and links Claim with requested remedy", async () => {
  // Test sequential generation and atomic persistence
  const buyer = await prisma.user.findFirst({
    where: { role: "BUYER" },
  });
  assert.ok(buyer, "Buyer user must exist in database");

  const merchant = await prisma.user.findFirst({
    where: { role: "MERCHANT" },
  });
  assert.ok(merchant, "Merchant user must exist in database");

  const created = await CaseService.createCase({
    title: "Product specifications differ",
    description: "[Platform: Amazon | Order ID: 402-9988-1122 | Product: Samsung 990 Pro 2TB SSD]\n\nCustomer ordered 2TB model but package contained 1TB unit.",
    category: CaseCategory.NOT_AS_DESCRIBED,
    priority: CasePriority.MEDIUM,
    amountMinor: 1499900,
    currency: "INR",
    buyerId: buyer.id,
    merchantId: merchant.id,
  });

  try {
    assert.ok(created.caseNumber.startsWith("RG-"), "Generated case number must start with RG-");
    assert.equal(created.buyerId, buyer.id);
    assert.equal(created.amount, 14999);

    // Link claim with requested remedy
    const claim = await CaseService.addClaim(created.id, {
      authorId: buyer.id,
      partyRole: PartyRole.BUYER,
      claimType: ClaimType.SIGNIFICANTLY_NOT_AS_DESCRIBED,
      statement: "Customer ordered 2TB model but package contained 1TB unit.",
      requestedRemedy: RemedyType.REPLACEMENT,
    });

    assert.equal(claim.requestedRemedy, RemedyType.REPLACEMENT);
    assert.equal(claim.partyRole, PartyRole.BUYER);

    // Verify access control: Buyer only sees own cases
    const accessibleForBuyer = await getAccessibleCases(
      {
        id: buyer.id,
        email: buyer.email,
        name: buyer.name || buyer.fullName,
        fullName: buyer.fullName,
        role: UserRole.BUYER,
        isPlatformAdmin: false,
        isActive: true,
        avatarUrl: buyer.avatarUrl,
        organization: buyer.organization,
        orgMemberships: [],
      },
      { page: 1, limit: 10 }
    );

    assert.ok(accessibleForBuyer.items.length > 0);
    assert.ok(accessibleForBuyer.items.every((c) => c.buyerId === buyer.id), "All returned cases must belong to buyer");
  } finally {
    await prisma.caseRecord.delete({ where: { id: created.dbId } }).catch(() => {});
  }
});

test("Reusable marketplace & category configuration matches exact specifications", () => {
  assert.deepEqual([...SHOPPING_PLATFORMS], ["Amazon", "Flipkart", "OLX", "Meesho", "Myntra", "Other"]);
  assert.equal(COMPLAINT_CATEGORIES.length, 7);

  // Payment/refund categories must NOT require product photographs or unboxing video
  const refundSlots = EVIDENCE_SLOTS_BY_CATEGORY.refund_not_received.map((s) => s.id);
  assert.ok(!refundSlots.includes("product_photos"));
  assert.ok(!refundSlots.includes("unboxing_video"));

  const paymentSlots = EVIDENCE_SLOTS_BY_CATEGORY.payment_problem.map((s) => s.id);
  assert.ok(!paymentSlots.includes("product_photos"));
  assert.ok(!paymentSlots.includes("unboxing_video"));

  // Physical fulfillment categories offer unboxing video strictly as Optional
  const wrongProductVideo = EVIDENCE_SLOTS_BY_CATEGORY.wrong_product.find((s) => s.id === "unboxing_video");
  assert.equal(wrongProductVideo?.requirementLabel, "Optional");
});

test("parseComplaintDetails preserves 'Either is acceptable' from CASE_CREATED metadata", () => {
  const parsed = parseComplaintDetails({
    id: "case_either",
    caseNumber: "RG-2002",
    title: "Damaged product received",
    description: "Package dented",
    status: "SUBMITTED",
    amountMinor: 50000,
    currency: "INR",
    claims: [{ requestedRemedy: "FULL_REFUND" }],
    events: [
      {
        eventType: "CASE_CREATED",
        metadataJson: JSON.stringify({
          platform: "Meesho",
          orderId: "MSH-9001",
          productName: "Ceramic Mug Set",
          originalCategory: "Damaged product received",
          requestedRemedy: "EITHER",
        }),
      },
    ],
  });

  assert.equal(parsed.platform, "Meesho");
  assert.equal(parsed.orderId, "MSH-9001");
  assert.equal(parsed.productName, "Ceramic Mug Set");
  assert.equal(parsed.requestedRemedy, "Either is acceptable");
});

test("detectMagicBytes recognizes valid MP4 and WEBM unboxing video headers", () => {
  const mp4Buf = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
  assert.equal(detectMagicBytes(mp4Buf), "video/mp4");

  const webmBuf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81]);
  assert.equal(detectMagicBytes(webmBuf), "video/webm");
});

test("POST /api/complaints/suggest-title handles category mapping and concise novel fallback titles", async () => {
  const buyer = await prisma.user.findFirst({ where: { role: "BUYER", isActive: true } });
  assert.ok(buyer, "Active buyer user must exist in database");

  const unauthReq = new NextRequest("http://localhost:3000/api/complaints/suggest-title", {
    method: "POST",
    body: JSON.stringify({ description: "I ordered a 1 TB SSD but received a 512 GB SSD." }),
    headers: { "Content-Type": "application/json" },
  });
  const unauthRes = await suggestTitlePost(unauthReq);
  assert.equal(unauthRes.status, 401);

  const req1 = new NextRequest("http://localhost:3000/api/complaints/suggest-title", {
    method: "POST",
    body: JSON.stringify({ description: "I ordered a 1 TB SSD but received a 512 GB SSD." }),
    headers: { "Content-Type": "application/json", "x-demo-user-email": buyer.email },
  });
  const res1 = await suggestTitlePost(req1);
  assert.equal(res1.status, 200);
  const body1 = await res1.json();
  assert.equal(body1.title, "Product specifications differ");
  assert.equal(body1.isExistingCategory, true);

  const req2 = new NextRequest("http://localhost:3000/api/complaints/suggest-title", {
    method: "POST",
    body: JSON.stringify({ description: "I paid twice for the same order." }),
    headers: { "Content-Type": "application/json", "x-demo-user-email": buyer.email },
  });
  const res2 = await suggestTitlePost(req2);
  const body2 = await res2.json();
  assert.equal(body2.title, "Payment problem");

  const req3 = new NextRequest("http://localhost:3000/api/complaints/suggest-title", {
    method: "POST",
    body: JSON.stringify({ description: "The package was delivered to a different address." }),
    headers: { "Content-Type": "application/json", "x-demo-user-email": buyer.email },
  });
  const res3 = await suggestTitlePost(req3);
  const body3 = await res3.json();
  assert.equal(body3.title, "Incorrect delivery destination");
});

test("Date-wise complaint grouping puts Today, Yesterday, and named dates in newest-first order", () => {
  const refNow = new Date(2026, 10, 11, 18, 0, 0); // Nov 11, 2026 6:00 PM local
  const items = [
    { id: "c1", createdAt: new Date(2026, 10, 9, 14, 0, 0).toISOString() },
    { id: "c2", createdAt: new Date(2026, 10, 11, 10, 0, 0).toISOString() },
    { id: "c3", createdAt: new Date(2026, 10, 11, 17, 30, 0).toISOString() },
    { id: "c4", createdAt: new Date(2026, 10, 10, 12, 0, 0).toISOString() },
  ];

  const groups = groupComplaintsByDate(items, refNow);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].heading, "Today");
  assert.deepEqual(groups[0].items.map((x) => x.id), ["c3", "c2"]);
  assert.equal(groups[1].heading, "Yesterday");
  assert.deepEqual(groups[1].items.map((x) => x.id), ["c4"]);
  assert.equal(groups[2].heading, "November 9, 2026");
  assert.equal(formatDateHeading(new Date(2026, 10, 11, 9, 0), refNow), "Today");
});

test("BuyerTrackingService enforces Waiting-for-Seller, Re-investigation, Refund, Replacement & Cross-Buyer Auth", async () => {
  const buyers = await prisma.user.findMany({ where: { role: "BUYER" }, take: 2 });
  assert.ok(buyers.length >= 2, "Need at least 2 buyers in database for isolation test");
  const [buyerA, buyerB] = buyers;

  const merchant = await prisma.user.findFirst({ where: { role: "MERCHANT" } });
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  assert.ok(merchant && org);

  const authBuyerA = {
    id: buyerA.id,
    email: buyerA.email,
    name: buyerA.name || buyerA.fullName,
    fullName: buyerA.fullName,
    role: UserRole.BUYER,
    isPlatformAdmin: false,
    isActive: true,
    avatarUrl: buyerA.avatarUrl,
    organization: buyerA.organization,
    orgMemberships: [],
  };

  const authBuyerB = {
    id: buyerB.id,
    email: buyerB.email,
    name: buyerB.name || buyerB.fullName,
    fullName: buyerB.fullName,
    role: UserRole.BUYER,
    isPlatformAdmin: false,
    isActive: true,
    avatarUrl: buyerB.avatarUrl,
    organization: buyerB.organization,
    orgMemberships: [],
  };

  const created = await CaseService.createCase({
    title: "Wrong product received",
    description: "[Platform: Flipkart | Order ID: FLP-TRK-9901 | Product: Wireless Mechanical Keyboard]\n\nReceived wrong switch color.",
    category: CaseCategory.NOT_AS_DESCRIBED,
    priority: CasePriority.MEDIUM,
    amountMinor: 649900,
    currency: "INR",
    buyerId: buyerA.id,
    merchantId: merchant.id,
    organizationId: org.id,
  });

  try {
    // 1. Add merchant request + completed analysis -> Waiting for seller (NOT resolved!)
    await prisma.aIAnalysisRun.create({
      data: {
        caseId: created.dbId,
        requestedById: buyerA.id,
        provider: "deterministic-berr",
        model: "berr-v2",
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    await prisma.caseEvent.create({
      data: {
        caseId: created.dbId,
        actorId: buyerA.id,
        eventType: EventType.TIMELINE_EVENT_RECORDED,
        description: "Merchant-side fulfillment evidence requested.",
        metadataJson: JSON.stringify({ stage: "MERCHANT_EVIDENCE_REQUESTED" }),
      },
    });

    const waitDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyerA, created.caseNumber);
    assert.ok(waitDetail);
    assert.equal(waitDetail.complaint.status, "Waiting for seller");
    const sellerStage = waitDetail.timeline.find((s) => s.stageKey === "SELLER_EVIDENCE");
    assert.equal(sellerStage?.status, "CURRENT");
    assert.equal(sellerStage?.actionRequired?.label, "Awaiting seller response");
    const solvedStage = waitDetail.timeline.find((s) => s.stageKey === "PROBLEM_SOLVED");
    assert.equal(solvedStage?.status, "UPCOMING");

    // 2. Authorization check: Buyer B CANNOT view Buyer A's complaint
    await assert.rejects(
      async () => {
        await BuyerTrackingService.getBuyerComplaintDetail(authBuyerB, created.caseNumber);
      },
      (err: AuthError) => err.status === 403
    );

    const listB = await BuyerTrackingService.listBuyerComplaints(authBuyerB, { search: created.caseNumber });
    assert.equal(listB.items.length, 0, "Buyer B must not see Buyer A complaints in list");

    // 3. Confidentiality check: MERCHANT_ONLY and INTERNAL evidence must be hidden from Buyer A
    await prisma.evidence.createMany({
      data: [
        {
          caseId: created.dbId,
          uploadedById: merchant.id,
          filename: "internal-margin-sheet.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1200,
          storageKey: "ev_secret",
          sha256: "abc123",
          evidenceType: EvidenceType.OTHER,
          sourceType: EvidenceSource.MERCHANT_PORTAL,
          visibility: EvidenceVisibility.MERCHANT_ONLY,
        },
        {
          caseId: created.dbId,
          uploadedById: merchant.id,
          filename: "dispatch-packing-slip.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2400,
          storageKey: "ev_public",
          sha256: "def456",
          evidenceType: EvidenceType.INVOICE,
          sourceType: EvidenceSource.MERCHANT_PORTAL,
          visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
        },
      ],
    });

    // 4. Trigger Re-investigation requesting customer follow-up
    await prisma.caseEvent.create({
      data: {
        caseId: created.dbId,
        actorId: buyerA.id,
        eventType: EventType.TIMELINE_EVENT_RECORDED,
        description: "Please upload clear photo showing keyboard back label.",
        metadataJson: JSON.stringify({
          stage: "REINVESTIGATION_REQUIRED",
          responsibleParty: "CUSTOMER",
          reason: "Product label unreadable",
          missingInformation: "Clear close-up photo of switch model serial sticker.",
        }),
      },
    });

    const reinvDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyerA, created.caseNumber);
    assert.ok(reinvDetail);
    assert.equal(reinvDetail.complaint.status, "Additional information required");
    const reinvNode = reinvDetail.timeline.find((t) => t.stageKey === "REINVESTIGATION_REQUIRED");
    assert.equal(reinvNode?.status, "ATTENTION");
    assert.equal(reinvNode?.actionRequired?.type, "UPLOAD_ADDITIONAL_EVIDENCE");
    assert.ok(
      reinvDetail.submissionDetails.supportingEvidence.some((e) => e.filename === "dispatch-packing-slip.pdf")
    );
    assert.ok(
      !reinvDetail.submissionDetails.supportingEvidence.some((e) => e.filename === "internal-margin-sheet.pdf"),
      "MERCHANT_ONLY evidence must never leak to Buyer"
    );

    // Customer supplies additional requested evidence + re-evaluation runs -> historical events preserved
    await new Promise((r) => setTimeout(r, 15));
    await prisma.evidence.create({
      data: {
        caseId: created.dbId,
        uploadedById: buyerA.id,
        filename: "keyboard-serial-closeup.png",
        mimeType: "image/png",
        sizeBytes: 3400,
        storageKey: "ev_followup_1",
        sha256: "followup_sha",
        evidenceType: EvidenceType.PHOTO,
        sourceType: EvidenceSource.BUYER_UPLOAD,
        visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      },
    });
    await prisma.aIAnalysisRun.create({
      data: {
        caseId: created.dbId,
        requestedById: buyerA.id,
        provider: "deterministic-berr",
        model: "berr-v2",
        status: "COMPLETED",
        completedAt: new Date(Date.now() + 20),
      },
    });

    const reinvDoneDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyerA, created.caseNumber);
    const reinvNodeAfter = reinvDoneDetail?.timeline.find((t) => t.stageKey === "REINVESTIGATION_REQUIRED");
    assert.ok(reinvNodeAfter?.reinvestigationMeta?.receivedAt, "Follow-up upload timestamp must be preserved");
    assert.equal(reinvNodeAfter?.reinvestigationMeta?.isResolved, true);
    assert.equal(reinvNodeAfter?.status, "COMPLETED");

    // 5. Verify pending vs completed refund gating on Stage 6
    const proposal = await prisma.resolutionProposal.create({
      data: {
        caseId: created.dbId,
        organizationId: org.id,
        proposedById: merchant.id,
        proposalType: "FULL_REFUND",
        title: "Full Refund Approved",
        description: "Issue full refund upon wrong product verification.",
        amountMinor: 649900,
        currency: "INR",
        reason: "Seller shipping manifest confirms wrong SKU dispatched.",
        status: "AGREED",
      },
    });

    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        buyerId: buyerA.id,
        merchantOrganizationId: org.id,
        currency: "INR",
        totalAmountMinor: 649900,
        status: "CAPTURED",
        caseId: created.dbId,
      },
    });

    const payment = await prisma.payPalPayment.create({
      data: {
        commerceOrderId: order.id,
        providerOrderId: `PP-${Date.now()}`,
        amountMinor: 649900,
        currency: "INR",
        paymentStatus: "COMPLETED",
      },
    });

    const refundTx = await prisma.refundTransaction.create({
      data: {
        paymentId: payment.id,
        resolutionProposalId: proposal.id,
        refundRequestId: `REF-REQ-${Date.now()}`,
        amountMinor: 649900,
        currency: "INR",
        status: "PENDING",
        reason: "Wrong SKU delivered",
        requestedById: merchant.id,
      },
    });

    const refundPendingDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyerA, created.caseNumber);
    assert.equal(refundPendingDetail?.complaint.status, "Refund in progress");
    assert.equal(
      refundPendingDetail?.timeline.find((t) => t.stageKey === "PROBLEM_SOLVED")?.status,
      "CURRENT"
    );

    // Confirm real refund completion -> Problem Solved COMPLETED
    await prisma.refundTransaction.update({
      where: { id: refundTx.id },
      data: { status: "COMPLETED", paypalRefundId: "PP-REF-VERIFIED-1", completedAt: new Date() },
    });
    await prisma.caseRecord.update({
      where: { id: created.dbId },
      data: { status: CaseStatus.RESOLVED, stage: CaseStage.FINALIZED, resolvedAt: new Date() },
    });

    const finalDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyerA, created.caseNumber);
    assert.equal(finalDetail?.complaint.status, "Resolved");
    assert.equal(
      finalDetail?.timeline.find((t) => t.stageKey === "PROBLEM_SOLVED")?.status,
      "COMPLETED"
    );
    assert.equal(finalDetail?.resolutionSummary.refundDetails?.referenceId, "PP-REF-VERIFIED-1");
  } finally {
    await prisma.commerceOrder.deleteMany({ where: { caseId: created.dbId } }).catch(() => {});
    await prisma.caseRecord.delete({ where: { id: created.dbId } }).catch(() => {});
  }
});

test("Replacement tracking shows 'Replacement in progress' when dispatched and 'Resolved' only after delivery/resolution", async () => {
  const buyer = await prisma.user.findFirst({ where: { role: "BUYER" } });
  const merchant = await prisma.user.findFirst({ where: { role: "MERCHANT" } });
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  assert.ok(buyer && merchant && org);

  const authBuyer = {
    id: buyer.id,
    email: buyer.email,
    name: buyer.name || buyer.fullName,
    fullName: buyer.fullName,
    role: UserRole.BUYER,
    isPlatformAdmin: false,
    isActive: true,
    avatarUrl: buyer.avatarUrl,
    organization: buyer.organization,
    orgMemberships: [],
  };

  const created = await CaseService.createCase({
    title: "Damaged product received",
    description: "[Platform: Amazon | Order ID: AMZ-REP-881 | Product: Logitech MX Master 3S]\n\nMouse scroll wheel defective.",
    category: CaseCategory.DAMAGED_GOODS,
    priority: CasePriority.MEDIUM,
    amountMinor: 899900,
    currency: "INR",
    buyerId: buyer.id,
    merchantId: merchant.id,
    organizationId: org.id,
  });

  try {
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `AMZ-REP-${Date.now()}`,
        buyerId: buyer.id,
        merchantOrganizationId: org.id,
        currency: "INR",
        totalAmountMinor: 899900,
        status: "CAPTURED",
        caseId: created.dbId,
      },
    });

    await prisma.resolutionProposal.create({
      data: {
        caseId: created.dbId,
        organizationId: org.id,
        proposedById: merchant.id,
        proposalType: "REPLACEMENT",
        title: "Replacement Unit Approved",
        description: "Send sealed replacement mouse.",
        reason: "Verified defective wheel from unboxing photo.",
        status: "AGREED",
      },
    });

    const passport = await prisma.packagePassport.create({
      data: {
        packageNumber: `PKG-TEST-${Date.now()}`,
        orderId: order.id,
        merchantOrganizationId: org.id,
        carrierName: "BlueDart Express",
        trackingNumber: `BD-${Date.now()}`,
        status: "DISPATCHED",
        qrToken: `qr_${Date.now()}`,
        integrityHash: "sha256_pkg_test",
        dispatchedAt: new Date(),
      },
    });

    const dispatchedDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyer, created.caseNumber);
    assert.equal(dispatchedDetail?.complaint.status, "Replacement in progress");
    assert.equal(
      dispatchedDetail?.timeline.find((t) => t.stageKey === "PROBLEM_SOLVED")?.status,
      "CURRENT"
    );
    assert.equal(dispatchedDetail?.resolutionSummary.replacementDetails?.carrierName, "BlueDart Express");

    // Delivery confirmed + Resolved
    await prisma.packagePassport.update({
      where: { id: passport.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    await prisma.caseRecord.update({
      where: { id: created.dbId },
      data: { status: CaseStatus.RESOLVED, stage: CaseStage.FINALIZED, resolvedAt: new Date() },
    });

    const deliveredDetail = await BuyerTrackingService.getBuyerComplaintDetail(authBuyer, created.caseNumber);
    assert.equal(deliveredDetail?.complaint.status, "Resolved");
    assert.equal(
      deliveredDetail?.timeline.find((t) => t.stageKey === "PROBLEM_SOLVED")?.status,
      "COMPLETED"
    );
  } finally {
    await prisma.packagePassport.deleteMany({ where: { order: { caseId: created.dbId } } }).catch(() => {});
    await prisma.commerceOrder.deleteMany({ where: { caseId: created.dbId } }).catch(() => {});
    await prisma.caseRecord.delete({ where: { id: created.dbId } }).catch(() => {});
  }
});

test("Customer notifications are persisted per buyer, sorted newest-first, isolated across buyers, and support single/bulk mark-read", async () => {
  const buyers = await prisma.user.findMany({ where: { role: UserRole.BUYER }, take: 2 });
  assert.ok(buyers.length >= 2, "Need at least 2 seeded buyers");
  const [buyer, otherBuyer] = buyers;
  const merchant = await prisma.user.findFirst({ where: { role: UserRole.MERCHANT } });
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  assert.ok(merchant && org, "Seeded merchant and org must exist");

  const startSnapshot = await DeliveryReminderService.getUserNotifications(buyer.id);
  const createdCase = await CaseService.createCase({
    title: "Damaged Smart Watch Box",
    description: "[Platform: Amazon | Order ID: AMZ-NTF-1 | Product: SmartWatch Ultra]\n\nGlass cracked.",
    category: CaseCategory.DAMAGED_GOODS,
    priority: CasePriority.MEDIUM,
    amountMinor: 2499900,
    currency: "INR",
    buyerId: buyer.id,
    merchantId: merchant.id,
    organizationId: org.id,
    expectedProduct: "SmartWatch Ultra",
  });

  const beforeTestTime = new Date(Date.now() - 1000);

  try {
    // 1. Trigger genuine status change -> UNDER_ANALYSIS
    await CaseService.updateCase(createdCase.dbId, {
      status: CaseStatus.UNDER_ANALYSIS,
      actorId: merchant.id,
    });

    // 2. Seller uploads evidence -> notifies buyer without leaking internal admin notes
    await CaseService.addEvidence(createdCase.dbId, {
      uploadedById: merchant.id,
      filename: "dispatch-manifest.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      storageKey: "test/dispatch-manifest.pdf",
      sha256: "test_sha_notif_1",
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.MERCHANT_PORTAL,
      verificationStatus: "UNVERIFIED",
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      description: "Merchant dispatch manifest",
    });

    // 3. Trigger EVIDENCE_REQUESTED -> notifies buyer additional evidence is required
    await CaseService.updateCase(createdCase.dbId, {
      status: CaseStatus.EVIDENCE_REQUESTED,
      actorId: merchant.id,
    });

    const buyerFeed = await DeliveryReminderService.getUserNotifications(buyer.id);
    const createdNotifs = buyerFeed.notifications.filter(
      (n) => n.linkUrl?.includes(createdCase.caseNumber)
    );
    assert.ok(createdNotifs.length >= 3, "Expected real backend notifications for buyer events");
    assert.equal(buyerFeed.unreadCount, startSnapshot.unreadCount + createdNotifs.length);

    // Verify newest-first ordering and relationship with complaint ID
    assert.ok(
      new Date(createdNotifs[0].createdAt).getTime() >=
        new Date(createdNotifs[createdNotifs.length - 1].createdAt).getTime()
    );
    assert.equal(extractComplaintIdFromHref(createdNotifs[0].linkUrl), createdCase.caseNumber);
    assert.equal(extractComplaintIdFromHref(`/cases/${createdCase.caseNumber}`), createdCase.caseNumber);

    // Strict buyer isolation: otherBuyer never receives alex's case notifications
    const otherFeed = await DeliveryReminderService.getUserNotifications(otherBuyer.id);
    assert.equal(
      otherFeed.notifications.some((n) => n.linkUrl?.includes(createdCase.caseNumber)),
      false
    );

    // Mark single notification read
    await DeliveryReminderService.markNotificationRead(createdNotifs[0].id, buyer.id);
    const afterSingle = await DeliveryReminderService.getUserNotifications(buyer.id);
    assert.equal(afterSingle.unreadCount, buyerFeed.unreadCount - 1);

    // Mark all read clears unreadCount to 0 (no badge rendered in UI)
    await DeliveryReminderService.markAllNotificationsRead(buyer.id);
    const afterAll = await DeliveryReminderService.getUserNotifications(buyer.id);
    assert.equal(afterAll.unreadCount, 0);
  } finally {
    await prisma.notificationMessage
      .deleteMany({
        where: {
          userId: buyer.id,
          createdAt: { gte: beforeTestTime },
          linkUrl: { contains: createdCase.caseNumber },
        },
      })
      .catch(() => {});
    await prisma.caseRecord.delete({ where: { id: createdCase.dbId } }).catch(() => {});
  }
});

test("Pending/Completed summary counts, search/date filters, and customer ACTION REQUIRED semantics work accurately", async () => {
  const buyer = await prisma.user.findFirst({ where: { role: UserRole.BUYER } });
  const merchant = await prisma.user.findFirst({ where: { role: UserRole.MERCHANT } });
  const org = await prisma.organization.findFirst({ where: { isActive: true } });
  assert.ok(buyer && merchant && org);

  const authBuyer = {
    id: buyer.id,
    email: buyer.email,
    name: buyer.name || buyer.fullName,
    fullName: buyer.fullName,
    role: UserRole.BUYER,
    isPlatformAdmin: false,
    isActive: true,
    avatarUrl: buyer.avatarUrl,
    organization: buyer.organization,
    orgMemberships: [],
  };

  const baseline = await BuyerTrackingService.listBuyerComplaints(authBuyer, { limit: 50 });

  const uniqueProduct = `AeroBudsPro-${Date.now()}`;
  const createdCase = await CaseService.createCase({
    title: "Faulty noise cancelling earbuds",
    description: `[Platform: Flipkart | Order ID: FLP-SUM-1 | Product: ${uniqueProduct}]\n\nLeft earbud silent.`,
    category: CaseCategory.DAMAGED_GOODS,
    priority: CasePriority.MEDIUM,
    amountMinor: 1299900,
    currency: "INR",
    buyerId: buyer.id,
    merchantId: merchant.id,
    organizationId: org.id,
    expectedProduct: uniqueProduct,
  });

  await prisma.caseRecord.update({
    where: { id: createdCase.dbId },
    data: { status: CaseStatus.UNDER_ANALYSIS, stage: CaseStage.INVESTIGATION },
  });

  try {
    // 1. Newly created complaint increments Pending summary count (not Completed)
    const afterCreate = await BuyerTrackingService.listBuyerComplaints(authBuyer, { limit: 50 });
    assert.equal(afterCreate.summary.pendingCount, baseline.summary.pendingCount + 1);
    assert.equal(afterCreate.summary.completedCount, baseline.summary.completedCount);

    // 2. Waiting on seller must NOT show customer ACTION REQUIRED badge
    const sellerReqEvent = await prisma.caseTimelineEvent.create({
      data: {
        caseId: createdCase.dbId,
        actorId: merchant.id,
        eventType: "REINVESTIGATION",
        title: "Waiting for Seller Packaging Logs",
        description: "Awaiting seller serial verification log.",
        occurredAt: new Date(),
        timePrecision: "EXACT_TIMESTAMP",
        timeBasis: "SYSTEM_VERIFIED",
        metadataJson: JSON.stringify({ responsibleParty: "SELLER", reason: "Merchant check" }),
      },
    });

    const whileWaitingSeller = await BuyerTrackingService.listBuyerComplaints(authBuyer, {
      search: uniqueProduct,
    });
    assert.equal(whileWaitingSeller.items.length, 1);
    assert.equal(whileWaitingSeller.items[0].requiresCustomerAction, false);
    assert.equal(whileWaitingSeller.items[0].actionRequiredMessage, null);

    // Replace with Customer-side follow-up request -> ACTION REQUIRED badge appears even while Under investigation
    await prisma.caseTimelineEvent.delete({ where: { id: sellerReqEvent.id } });
    await prisma.aIAnalysisRun.create({
      data: {
        caseId: createdCase.dbId,
        requestedById: buyer.id,
        provider: "deterministic-berr",
        model: "berr-v2-engine",
        analysisType: "FULL_BERR",
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    await prisma.evidence.create({
      data: {
        caseId: createdCase.dbId,
        uploadedById: merchant.id,
        filename: "seller-serial.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        storageKey: "test/seller-serial.png",
        sha256: "test_seller_sha_1",
        evidenceType: EvidenceType.PHOTO,
        sourceType: EvidenceSource.MERCHANT_PORTAL,
        visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      },
    });

    await prisma.caseTimelineEvent.create({
      data: {
        caseId: createdCase.dbId,
        actorId: merchant.id,
        eventType: "REINVESTIGATION",
        title: "Additional Customer Video Requested",
        description: "Please upload a clearer photo/video of the serial label.",
        occurredAt: new Date(Date.now() + 200),
        timePrecision: "EXACT_TIMESTAMP",
        timeBasis: "SYSTEM_VERIFIED",
        metadataJson: JSON.stringify({ responsibleParty: "CUSTOMER", reason: "Clearer serial needed" }),
      },
    });

    const actionReqList = await BuyerTrackingService.listBuyerComplaints(authBuyer, {
      search: createdCase.caseNumber,
      status: "pending",
      dateFilter: "today",
    });
    assert.equal(actionReqList.items.length, 1);
    assert.equal(actionReqList.items[0].status, "Under investigation");
    assert.equal(actionReqList.items[0].requiresCustomerAction, true);
    assert.equal(actionReqList.items[0].actionRequiredMessage, "Additional evidence requested.");

    // Summary invariant: stays unchanged even when filtering by "completed" (0 matching items here)
    const completedFiltered = await BuyerTrackingService.listBuyerComplaints(authBuyer, {
      search: uniqueProduct,
      status: "completed",
    });
    assert.equal(completedFiltered.items.length, 0);
    assert.equal(completedFiltered.summary.pendingCount, baseline.summary.pendingCount + 1);
    assert.equal(completedFiltered.summary.completedCount, baseline.summary.completedCount);

    // 3. Once customer uploads follow-up evidence, ACTION REQUIRED automatically disappears
    await prisma.evidence.create({
      data: {
        caseId: createdCase.dbId,
        uploadedById: buyer.id,
        filename: "customer-serial-clear.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        storageKey: "test/customer-serial-clear.jpg",
        sha256: "test_buyer_followup_sha_1",
        evidenceType: EvidenceType.PHOTO,
        sourceType: EvidenceSource.BUYER_UPLOAD,
        visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
        createdAt: new Date(Date.now() + 5000),
      },
    });

    const afterUpload = await BuyerTrackingService.listBuyerComplaints(authBuyer, {
      search: uniqueProduct,
    });
    assert.equal(afterUpload.items[0].requiresCustomerAction, false);
    assert.equal(afterUpload.items[0].actionRequiredMessage, null);

    // 4. Case with Replacement DISPATCHED counts under Pending, not Completed; RESOLVED + DELIVERED counts under Completed
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `ORD-SUM-${Date.now()}`,
        buyerId: buyer.id,
        caseId: createdCase.dbId,
        merchantOrganizationId: org.id,
        totalAmountMinor: 1299900,
        currency: "INR",
        status: "CAPTURED",
      },
    });
    const passport = await prisma.packagePassport.create({
      data: {
        packageNumber: `PKG-SUM-${Date.now()}`,
        orderId: order.id,
        merchantOrganizationId: org.id,
        status: "DISPATCHED",
        qrToken: `qr_sum_${Date.now()}`,
        integrityHash: "sha_sum_1",
        dispatchedAt: new Date(),
      },
    });
    await prisma.caseRecord.update({
      where: { id: createdCase.dbId },
      data: { status: CaseStatus.RESOLVED, stage: CaseStage.FINALIZED, resolvedAt: new Date() },
    });

    const replacementPending = await BuyerTrackingService.listBuyerComplaints(authBuyer, {
      search: uniqueProduct,
    });
    assert.equal(replacementPending.items[0].status, "Replacement in progress");
    assert.equal(replacementPending.summary.pendingCount, baseline.summary.pendingCount + 1);
    assert.equal(replacementPending.summary.completedCount, baseline.summary.completedCount);

    await prisma.packagePassport.update({
      where: { id: passport.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });

    const nowLocal = new Date();
    const todayStr = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, "0")}-${String(nowLocal.getDate()).padStart(2, "0")}`;
    const finalizedCompleted = await BuyerTrackingService.listBuyerComplaints(authBuyer, {
      search: uniqueProduct,
      status: "completed",
      startDate: todayStr,
      endDate: todayStr,
    });
    assert.equal(finalizedCompleted.items.length, 1);
    assert.equal(finalizedCompleted.items[0].status, "Resolved");
    assert.equal(finalizedCompleted.summary.pendingCount, baseline.summary.pendingCount);
    assert.equal(finalizedCompleted.summary.completedCount, baseline.summary.completedCount + 1);
  } finally {
    await prisma.packagePassport.deleteMany({ where: { order: { caseId: createdCase.dbId } } }).catch(() => {});
    await prisma.commerceOrder.deleteMany({ where: { caseId: createdCase.dbId } }).catch(() => {});
    await prisma.caseRecord.delete({ where: { id: createdCase.dbId } }).catch(() => {});
  }
});


