import { prisma } from "@/lib/prisma";
import { AuthenticatedUser } from "@/server/auth/session";
import { canAccessCase, canViewEvidence } from "@/server/auth/permissions";
import { AuthError } from "@/server/auth/require-auth";
import {
  CaseStatus,
  CaseStage,
  EventType,
  Prisma,
} from "@/generated/prisma/client";

export type CustomerComplaintStatus =
  | "Submitted"
  | "Reviewing evidence"
  | "Waiting for seller"
  | "Under investigation"
  | "Additional information required"
  | "Re-investigation"
  | "Decision ready"
  | "Awaiting approval"
  | "Refund in progress"
  | "Replacement in progress"
  | "Resolved"
  | "Escalated"
  | "Closed";

export type TimelineMilestoneStatus = "COMPLETED" | "CURRENT" | "UPCOMING" | "ATTENTION";

export interface CustomerSubEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  actorType: "CUSTOMER" | "RESOLVEGRAPH" | "SELLER" | "RESOLUTION_MANAGER" | "SYSTEM_INTEGRATION";
}

export interface TimelineMilestoneItem {
  id: string;
  stageKey:
    | "COMPLAINT_SUBMITTED"
    | "RESOLVEGRAPH_ANALYSIS"
    | "SELLER_EVIDENCE"
    | "REINVESTIGATION_REQUIRED"
    | "RESOLVEGRAPH_DECISION"
    | "WAITING_FOR_APPROVAL"
    | "PROBLEM_SOLVED";
  title: string;
  description: string;
  status: TimelineMilestoneStatus;
  timestamp: string | null;
  badgeText?: string;
  subEvents: CustomerSubEvent[];
  actionRequired?: {
    type: "UPLOAD_ADDITIONAL_EVIDENCE" | "WAITING_FOR_SELLER" | "REVIEW_PROPOSAL";
    label: string;
    detail?: string;
  } | null;
  reinvestigationMeta?: {
    reason: string;
    missingInformation: string;
    responsibleParty: "CUSTOMER" | "SELLER" | "BOTH";
    requestedAt: string;
    receivedAt: string | null;
    isResolved: boolean;
  } | null;
}

export interface BuyerComplaintSummaryCard {
  id: string;
  dbId: string;
  title: string;
  platform: string;
  orderId: string;
  productName: string;
  category: string;
  amount: number;
  currency: string;
  requestedRemedy: string;
  status: CustomerComplaintStatus;
  rawStatus: string;
  rawStage: string;
  evidenceCount: number;
  requiresCustomerAction: boolean;
  actionRequiredMessage?: string | null;
  latestActivityText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerComplaintDetailModel {
  complaint: BuyerComplaintSummaryCard & {
    purchaseDate: string | null;
    merchantName: string;
    resolvedAt: string | null;
  };
  submissionDetails: {
    orderInformation: {
      platform: string;
      orderId: string;
      productName: string;
      amount: number;
      currency: string;
      purchaseDate: string | null;
    };
    complaintInformation: {
      category: string;
      title: string;
      originalDescription: string;
    };
    preferredResolution: string;
    supportingEvidence: Array<{
      id: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      slotTag: string;
      verificationLabel: string;
      verificationTone: "emerald" | "amber" | "rose" | "slate";
      createdAt: string;
      downloadUrl: string;
    }>;
    activityMetadata: {
      createdAt: string;
      updatedAt: string;
      latestEventTitle: string | null;
      latestEventAt: string | null;
    };
  };
  timeline: TimelineMilestoneItem[];
  resolutionSummary: {
    hasDecision: boolean;
    headline: string;
    recommendedRemedy: string | null;
    decisionDate: string | null;
    reasoningSummary: string | null;
    approvalStatus: string | null;
    awaitingParty: string | null;
    approvedRemedy: string | null;
    approvedAt: string | null;
    refundDetails: {
      status: string;
      amount: number;
      currency: string;
      referenceId: string | null;
      initiatedAt: string | null;
      completedAt: string | null;
    } | null;
    replacementDetails: {
      status: string;
      itemName: string;
      referenceNumber: string | null;
      carrierName: string | null;
      trackingNumber: string | null;
      dispatchedAt: string | null;
      deliveredAt: string | null;
    } | null;
    pendingBuyerProposal: {
      id: string;
      title: string;
      proposalType: string;
      description: string;
      amount: number | null;
      currency: string;
      reason: string;
      createdAt: string;
    } | null;
    isCompleted: boolean;
    completedAt: string | null;
  };
  sellerOutreach?: {
    requestId: string | null;
    requestNumber: string | null;
    identifiedSellerName: string | null;
    identifiedSellerGstin: string | null;
    registrationStatus: string | null;
    matchOutcome: string | null;
    requiresHumanReview: boolean;
    channel: string | null;
    requestStatus: string | null;
    marketplace: string | null;
    marketplaceSupportUrl: string | null;
    preparedMessageForBuyer: string | null;
    customerReportedSubmissionAt: string | null;
    customerSubmissionNote: string | null;
    dispatchedAt: string | null;
    viewedAt: string | null;
    respondedAt: string | null;
    requestedItemsCount: number;
  } | null;
}

export interface ListBuyerComplaintsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFilter?: string; // "all" | "today" | "7d" | "30d" | "YYYY-MM-DD"
  startDate?: string;  // "YYYY-MM-DD"
  endDate?: string;    // "YYYY-MM-DD"
}

function safeJsonParse(raw?: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function formatCategoryLabel(raw?: string | null): string {
  if (!raw) return "Other issue";
  switch (raw.toUpperCase()) {
    case "NOT_AS_DESCRIBED":
      return "Product specifications differ";
    case "DAMAGED_GOODS":
      return "Damaged product received";
    case "NON_DELIVERY":
      return "Item missing from package";
    case "BILLING_ERROR":
    case "UNAUTHORIZED_TRANSACTION":
      return "Payment problem";
    case "REFUND_DISPUTE":
      return "Refund not received";
    case "OTHER":
      return "Other issue";
    default:
      return raw;
  }
}

export function formatRemedyLabel(remedy?: string | null): string {
  if (!remedy) return "Either is acceptable";
  switch (remedy.toUpperCase()) {
    case "REPLACEMENT":
      return "Replacement";
    case "FULL_REFUND":
      return "Full refund";
    case "PARTIAL_REFUND":
      return "Partial refund";
    case "RETURN_FOR_REFUND":
      return "Return for refund";
    case "STORE_CREDIT":
      return "Store credit";
    case "EITHER":
      return "Either is acceptable";
    case "REJECT_CLAIM":
      return "Claim not eligible";
    default:
      return remedy.replace(/_/g, " ");
  }
}

function extractOrderMetadata(caseRecord: {
  caseNumber: string;
  title: string;
  description: string;
  category: string;
  claims?: Array<{ partyRole: string; statement: string; requestedRemedy?: string | null }>;
  events?: Array<{ eventType: EventType; metadataJson: string | null; description: string; createdAt: Date }>;
  orders?: Array<{
    orderNumber: string;
    createdAt: Date;
    items: Array<{ title: string }>;
  }>;
}) {
  let platform = "Online Marketplace";
  let orderId = caseRecord.caseNumber;
  let productName = caseRecord.title;
  let originalCategory = formatCategoryLabel(caseRecord.category);
  let requestedRemedy = "Either is acceptable";
  let purchaseDate: string | null = null;

  // 1. Check linked CommerceOrder if available
  const linkedOrder = caseRecord.orders?.[0];
  if (linkedOrder) {
    orderId = linkedOrder.orderNumber;
    purchaseDate = linkedOrder.createdAt.toISOString();
    if (linkedOrder.items?.[0]?.title) {
      productName = linkedOrder.items[0].title;
    }
  }

  // 2. Check structured metadata in CASE_CREATED event
  const createdEvt = caseRecord.events?.find((e) => e.eventType === EventType.CASE_CREATED && e.metadataJson);
  const createdMeta = safeJsonParse(createdEvt?.metadataJson);
  if (createdMeta) {
    if (typeof createdMeta.platform === "string" && createdMeta.platform.trim()) {
      platform = createdMeta.platform.trim();
    }
    if (typeof createdMeta.orderId === "string" && createdMeta.orderId.trim()) {
      orderId = createdMeta.orderId.trim();
    }
    if (typeof createdMeta.productName === "string" && createdMeta.productName.trim()) {
      productName = createdMeta.productName.trim();
    }
    if (typeof createdMeta.originalCategory === "string" && createdMeta.originalCategory.trim()) {
      originalCategory = createdMeta.originalCategory.trim();
    }
    if (typeof createdMeta.requestedRemedy === "string" && createdMeta.requestedRemedy.trim()) {
      requestedRemedy = formatRemedyLabel(createdMeta.requestedRemedy);
    }
    if (typeof createdMeta.purchaseDate === "string" && createdMeta.purchaseDate.trim()) {
      purchaseDate = createdMeta.purchaseDate.trim();
    }
  }

  // 3. Fallback parsing from structured description prefix
  const desc = caseRecord.description || "";
  const platformMatch = desc.match(/\[Platform:\s*([^|\]]+)/i);
  if (platformMatch && platform === "Online Marketplace") platform = platformMatch[1].trim();
  else {
    // Also detect common marketplace names in existing descriptions if no prefix
    if (platform === "Online Marketplace") {
      if (/\bflipkart\b/i.test(desc)) platform = "Flipkart";
      else if (/\bamazon\b/i.test(desc)) platform = "Amazon";
      else if (/\bmeesho\b/i.test(desc)) platform = "Meesho";
      else if (/\bmyntra\b/i.test(desc)) platform = "Myntra";
      else if (/\bolx\b/i.test(desc)) platform = "OLX";
    }
  }

  const orderIdMatch = desc.match(/Order ID:\s*([^|\]]+)/i) || desc.match(/Order\s+#([A-Z0-9-]+)/i);
  if (orderIdMatch && orderId === caseRecord.caseNumber) {
    orderId = orderIdMatch[1].trim();
  }

  const productMatch = desc.match(/Product:\s*([^|\]]+)/i);
  if (productMatch) {
    productName = productMatch[1].trim();
  }

  const buyerClaim = caseRecord.claims?.find((c) => c.partyRole === "BUYER");
  if (!createdMeta?.requestedRemedy && buyerClaim?.requestedRemedy) {
    requestedRemedy = formatRemedyLabel(buyerClaim.requestedRemedy);
  }

  const cleanDescription =
    buyerClaim?.statement ||
    desc.replace(/^\[[^\]]+\]\s*/i, "").trim() ||
    desc;

  return {
    platform,
    orderId,
    productName,
    originalCategory,
    requestedRemedy,
    purchaseDate,
    cleanDescription,
  };
}

function detectReinvestigationCycles(params: {
  caseRecord: {
    id: string;
    status: CaseStatus;
    createdAt: Date;
  };
  events: Array<{
    id: string;
    eventType: EventType;
    description: string;
    metadataJson: string | null;
    createdAt: Date;
    actor?: { role?: string | null } | null;
  }>;
  timelineEvents: Array<{
    id: string;
    eventType: string;
    title: string;
    description: string;
    occurredAt: Date | null;
    recordedAt: Date;
    metadataJson: string | null;
  }>;
  evidence: Array<{
    id: string;
    sourceType: string;
    filename: string;
    createdAt: Date;
  }>;
  aiAnalysisRuns: Array<{
    id: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  proposals: Array<{
    id: string;
    status: string;
    createdAt: Date;
    responses: Array<{
      id: string;
      response: string;
      comment: string | null;
      createdAt: Date;
    }>;
  }>;
}) {
  const { caseRecord, events, timelineEvents, evidence, aiAnalysisRuns, proposals } = params;
  const cycles: Array<{
    id: string;
    reason: string;
    missingInformation: string;
    responsibleParty: "CUSTOMER" | "SELLER" | "BOTH";
    requestedAt: Date;
    receivedAt: Date | null;
    isResolved: boolean;
  }> = [];

  // 1. Explicit re-investigation or additional-evidence request events
  for (const evt of events) {
    const meta = safeJsonParse(evt.metadataJson);
    const isReinvestigationEvent =
      meta?.reinvestigation === true ||
      meta?.stage === "REINVESTIGATION_REQUIRED" ||
      meta?.stage === "ADDITIONAL_EVIDENCE_REQUESTED";

    if (isReinvestigationEvent) {
      const party =
        meta?.responsibleParty === "SELLER"
          ? "SELLER"
          : meta?.responsibleParty === "BOTH"
          ? "BOTH"
          : "CUSTOMER";
      cycles.push({
        id: `reinv-${evt.id}`,
        reason:
          typeof meta?.reason === "string"
            ? meta.reason
            : "Additional information or evidence is needed before a final resolution can be reached.",
        missingInformation:
          typeof meta?.missingInformation === "string"
            ? meta.missingInformation
            : evt.description,
        responsibleParty: party,
        requestedAt: evt.createdAt,
        receivedAt: null,
        isResolved: false,
      });
    }
  }

  for (const te of timelineEvents) {
    if (
      te.eventType === "REINVESTIGATION_REQUIRED" ||
      te.eventType === "ADDITIONAL_EVIDENCE_REQUESTED" ||
      te.eventType === "REINVESTIGATION"
    ) {
      const meta = safeJsonParse(te.metadataJson);
      const evtTime = te.occurredAt || te.recordedAt;
      if (!cycles.some((c) => Math.abs(c.requestedAt.getTime() - evtTime.getTime()) < 2000)) {
        cycles.push({
          id: `reinv-te-${te.id}`,
          reason: typeof meta?.reason === "string" ? meta.reason : te.title,
          missingInformation: te.description,
          responsibleParty:
            meta?.responsibleParty === "SELLER"
              ? "SELLER"
              : meta?.responsibleParty === "BOTH"
              ? "BOTH"
              : "CUSTOMER",
          requestedAt: evtTime,
          receivedAt: null,
          isResolved: false,
        });
      }
    }
  }

  // 2. Changes requested on a ResolutionProposal
  for (const prop of proposals) {
    for (const resp of prop.responses) {
      if (resp.response === "REQUESTED_CHANGES" && cycles.length === 0) {
        cycles.push({
          id: `reinv-resp-${resp.id}`,
          reason: "Further review or clarification requested on the proposed resolution.",
          missingInformation: resp.comment || "Updated evidence or clarification required.",
          responsibleParty: "BOTH",
          requestedAt: resp.createdAt,
          receivedAt: null,
          isResolved: false,
        });
      }
    }
  }

  // 3. Explicit EVIDENCE_REQUESTED status transitioning to customer follow-up when analysis had already occurred
  const statusReqEvt = events.find((e) => {
    if (e.eventType !== EventType.STATUS_CHANGED) return false;
    const evtMeta = safeJsonParse(e.metadataJson);
    return (
      evtMeta?.toStatus === CaseStatus.EVIDENCE_REQUESTED ||
      evtMeta?.newStatus === CaseStatus.EVIDENCE_REQUESTED
    );
  });
  if (
    cycles.length === 0 &&
    (caseRecord.status === CaseStatus.EVIDENCE_REQUESTED || statusReqEvt)
  ) {
    const reqMeta = safeJsonParse(statusReqEvt?.metadataJson);
    // Distinguish buyer-facing info requests when no seller evidence exists vs re-investigation
    const hasPriorAnalysis = aiAnalysisRuns.length > 0 || events.some((e) => e.eventType === EventType.AI_ANALYSIS_COMPLETED);
    if (hasPriorAnalysis || reqMeta?.responsibleParty === "CUSTOMER") {
      cycles.push({
        id: `reinv-status-${statusReqEvt?.id || caseRecord.id}`,
        reason:
          typeof reqMeta?.reason === "string"
            ? reqMeta.reason
            : "Additional information or evidence is needed before a final resolution can be reached.",
        missingInformation:
          typeof reqMeta?.missingInformation === "string"
            ? reqMeta.missingInformation
            : statusReqEvt?.description || "Supporting photos or order documentation requested.",
        responsibleParty:
          reqMeta?.responsibleParty === "SELLER" ? "SELLER" : "CUSTOMER",
        requestedAt: statusReqEvt?.createdAt || caseRecord.createdAt,
        receivedAt: null,
        isResolved: false,
      });
    }
  }

  // Resolve receivedAt timestamps based on follow-up evidence or subsequent analysis cycles
  for (const cy of cycles) {
    const followUpEvidence = evidence.find((ev) => {
      if (ev.createdAt.getTime() <= cy.requestedAt.getTime()) return false;
      if (cy.responsibleParty === "SELLER") {
        return ev.sourceType === "MERCHANT_PORTAL" || ev.sourceType === "CARRIER_API";
      }
      if (cy.responsibleParty === "CUSTOMER") {
        return ev.sourceType === "BUYER_UPLOAD";
      }
      return true;
    });

    if (followUpEvidence) {
      cy.receivedAt = followUpEvidence.createdAt;
    }

    const followUpAnalysis = aiAnalysisRuns.find(
      (r) =>
        r.status === "COMPLETED" &&
        (r.completedAt || r.createdAt).getTime() > cy.requestedAt.getTime()
    );

    const followUpAgreedProposal = proposals.find(
      (p) =>
        p.createdAt.getTime() > cy.requestedAt.getTime() &&
        (p.status === "AGREED" || p.status === "COMPLETED") &&
        p.responses.every((r) => r.response !== "REQUESTED_CHANGES")
    );

    if (
      followUpAnalysis ||
      followUpAgreedProposal ||
      caseRecord.status === CaseStatus.RESOLVED ||
      caseRecord.status === CaseStatus.CLOSED
    ) {
      cy.isResolved = true;
    }
  }

  return cycles;
}

export function deriveCustomerComplaintStatus(input: {
  rawStatus: CaseStatus;
  rawStage: CaseStage;
  hasSellerEvidence: boolean;
  hasDecision: boolean;
  latestProposalStatus: string | null;
  latestRefundStatus: string | null;
  latestPackageStatus: string | null;
  hasPendingReinvestigation: boolean;
  pendingReinvestigationParty: "CUSTOMER" | "SELLER" | "BOTH" | null;
  pendingReinvestigationReceived?: boolean;
  hasCompletedAnalysis: boolean;
  sellerRequestChannel?: string | null;
  sellerRequestStatus?: string | null;
}): {
  label: CustomerComplaintStatus;
  requiresCustomerAction: boolean;
  actionRequiredMessage: string | null;
} {
  const {
    rawStatus,
    rawStage,
    hasSellerEvidence,
    hasDecision,
    latestProposalStatus,
    latestRefundStatus,
    latestPackageStatus,
    hasPendingReinvestigation,
    pendingReinvestigationParty,
    pendingReinvestigationReceived = false,
    hasCompletedAnalysis,
    sellerRequestChannel,
    sellerRequestStatus,
  } = input;

  if (rawStatus === CaseStatus.CLOSED || rawStatus === CaseStatus.ARCHIVED) {
    return { label: "Closed", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (
    latestRefundStatus === "PENDING" ||
    latestRefundStatus === "PROCESSING" ||
    latestRefundStatus === "FAILED"
  ) {
    return { label: "Refund in progress", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (
    latestPackageStatus === "REGISTERED" ||
    latestPackageStatus === "PACKING" ||
    latestPackageStatus === "SEALED" ||
    latestPackageStatus === "DISPATCHED" ||
    latestPackageStatus === "IN_TRANSIT" ||
    latestPackageStatus === "OUT_FOR_DELIVERY" ||
    latestPackageStatus === "DELAYED" ||
    latestPackageStatus === "TAMPER_REPORTED"
  ) {
    return { label: "Replacement in progress", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (
    rawStatus === CaseStatus.RESOLVED ||
    latestRefundStatus === "COMPLETED" ||
    latestPackageStatus === "DELIVERED"
  ) {
    return { label: "Resolved", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  // Handle Customer-Assisted Marketplace Communication Channel
  if (sellerRequestChannel === "CUSTOMER_ASSISTED_HELP_CENTRE" && !hasSellerEvidence) {
    if (sellerRequestStatus === "CUSTOMER_ACTION_REQUIRED") {
      return {
        label: "Additional information required",
        requiresCustomerAction: true,
        actionRequiredMessage: "Action Required — Contact Marketplace Support",
      };
    }
    if (sellerRequestStatus === "MARKETPLACE_SUPPORT_PENDING") {
      return {
        label: "Waiting for seller",
        requiresCustomerAction: false,
        actionRequiredMessage: "Waiting for marketplace response",
      };
    }
  }

  if (hasPendingReinvestigation) {
    const isCustomerResponsible =
      pendingReinvestigationParty === "CUSTOMER" || pendingReinvestigationParty === "BOTH";
    if (isCustomerResponsible && !pendingReinvestigationReceived) {
      if (rawStatus === CaseStatus.UNDER_ANALYSIS && hasCompletedAnalysis && hasSellerEvidence) {
        return {
          label: "Under investigation",
          requiresCustomerAction: true,
          actionRequiredMessage: "Additional evidence requested.",
        };
      }
      return {
        label: "Additional information required",
        requiresCustomerAction: true,
        actionRequiredMessage: "Additional evidence requested.",
      };
    }
    return { label: "Re-investigation", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (rawStatus === CaseStatus.EVIDENCE_REQUESTED) {
    if (sellerRequestChannel === "CUSTOMER_ASSISTED_HELP_CENTRE") {
      if (sellerRequestStatus === "CUSTOMER_ACTION_REQUIRED") {
        return {
          label: "Additional information required",
          requiresCustomerAction: true,
          actionRequiredMessage: "Action Required — Contact Marketplace Support",
        };
      }
      return {
        label: "Waiting for seller",
        requiresCustomerAction: false,
        actionRequiredMessage: "Waiting for marketplace response",
      };
    }

    if (hasSellerEvidence && !pendingReinvestigationReceived) {
      return {
        label: "Additional information required",
        requiresCustomerAction: true,
        actionRequiredMessage: "Additional evidence requested.",
      };
    }

    return {
      label: "Waiting for seller",
      requiresCustomerAction: false,
      actionRequiredMessage: sellerRequestChannel === "SELLER_PORTAL" ? "Dispatched to registered seller portal" : null,
    };
  }

  if (latestProposalStatus === "PENDING_BUYER") {
    return {
      label: "Awaiting approval",
      requiresCustomerAction: true,
      actionRequiredMessage: "Your confirmation is requested for a proposed resolution.",
    };
  }

  if (latestProposalStatus === "PENDING_MERCHANT" || latestProposalStatus === "DRAFT") {
    return { label: "Awaiting approval", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (latestProposalStatus === "AGREED") {
    return { label: "Decision ready", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (hasDecision || rawStage === CaseStage.RESOLUTION_PROPOSED) {
    return { label: "Decision ready", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (rawStatus === CaseStatus.IN_REVIEW) {
    return { label: "Escalated", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (rawStatus === CaseStatus.EVIDENCE_SUBMITTED) {
    return { label: "Reviewing evidence", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (rawStatus === CaseStatus.UNDER_ANALYSIS || rawStage === CaseStage.INVESTIGATION) {
    if (!hasSellerEvidence) {
      return { label: "Waiting for seller", requiresCustomerAction: false, actionRequiredMessage: null };
    }
    return { label: "Under investigation", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  if (hasCompletedAnalysis && !hasSellerEvidence) {
    return { label: "Waiting for seller", requiresCustomerAction: false, actionRequiredMessage: null };
  }

  return { label: "Submitted", requiresCustomerAction: false, actionRequiredMessage: null };
}

export class BuyerTrackingService {
  /**
   * Lists complaints belonging exclusively to the authenticated buyer,
   * formatted efficiently for date-wise submission cards with search/filter/pagination.
   */
  public static async listBuyerComplaints(
    user: AuthenticatedUser,
    params: ListBuyerComplaintsParams
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;

    // Strictly scoped to authenticated user's own buyer records
    const where: Prisma.CaseRecordWhereInput = {
      AND: [{ buyerId: user.id }, { status: { not: CaseStatus.ARCHIVED } }],
    };

    // Fetch buyer records sorted newest first so summary counts remain accurate across filters
    const allBuyerCases = await prisma.caseRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        description: true,
        category: true,
        status: true,
        stage: true,
        amountMinor: true,
        currency: true,
        recommendedRemedy: true,
        createdAt: true,
        updatedAt: true,
        claims: {
          select: { partyRole: true, statement: true, requestedRemedy: true },
        },
        evidence: {
          select: { id: true, sourceType: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        events: {
          where: {
            eventType: {
              in: [
                EventType.CASE_CREATED,
                EventType.STATUS_CHANGED,
                EventType.AI_ANALYSIS_COMPLETED,
                EventType.RESOLUTION_PROPOSED,
                EventType.RESOLUTION_AGREED,
                EventType.REFUND_INITIATED,
                EventType.REFUND_COMPLETED,
                EventType.TIMELINE_EVENT_RECORDED,
              ],
            },
          },
          select: {
            id: true,
            eventType: true,
            description: true,
            metadataJson: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        timelineEvents: {
          select: {
            id: true,
            eventType: true,
            title: true,
            description: true,
            metadataJson: true,
            occurredAt: true,
            recordedAt: true,
          },
          orderBy: { occurredAt: "asc" },
        },
        aiAnalysisRuns: {
          select: { id: true, status: true, createdAt: true, completedAt: true },
          orderBy: { createdAt: "desc" },
        },
        resolutionProposals: {
          select: {
            id: true,
            status: true,
            proposalType: true,
            createdAt: true,
            responses: {
              select: { id: true, response: true, comment: true, createdAt: true },
            },
            refunds: {
              select: { status: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        orders: {
          select: {
            orderNumber: true,
            createdAt: true,
            items: { select: { title: true }, take: 1 },
            payments: {
              select: {
                refunds: { select: { status: true } },
              },
            },
            packagePassports: {
              select: { status: true },
              take: 1,
            },
          },
          take: 1,
        },
        sellerEvidenceRequests: {
          select: { deliveryChannel: true, status: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const mappedEntries = allBuyerCases.map((c) => {
      const meta = extractOrderMetadata(c);
      const hasSellerEvidence =
        c.claims.some((cl) => cl.partyRole === "MERCHANT") ||
        c.evidence.some((ev) => ev.sourceType === "MERCHANT_PORTAL" || ev.sourceType === "CARRIER_API");

      const latestProp = c.resolutionProposals[0] || null;
      const allCaseRefunds = [
        ...(latestProp?.refunds || []),
        ...(c.orders?.flatMap((o) => o.payments.flatMap((pm) => pm.refunds)) || []),
      ];
      const completedRefund = allCaseRefunds.find((r) => r.status === "COMPLETED") || null;
      const pendingRefund =
        allCaseRefunds.find((r) => r.status === "PENDING" || r.status === "PROCESSING") || null;
      const failedRefund = allCaseRefunds.find((r) => r.status === "FAILED") || null;
      const latestPassport = c.orders?.[0]?.packagePassports?.[0] || null;

      const reinvestigations = detectReinvestigationCycles({
        caseRecord: { id: c.id, status: c.status, createdAt: c.createdAt },
        events: c.events,
        timelineEvents: c.timelineEvents,
        evidence: c.evidence.map((e) => ({ ...e, filename: "" })),
        aiAnalysisRuns: c.aiAnalysisRuns,
        proposals: c.resolutionProposals,
      });
      const pendingReinv = reinvestigations.find((r) => !r.isResolved) || null;

      const hasCompletedAnalysis =
        c.aiAnalysisRuns.some((a) => a.status === "COMPLETED") ||
        c.events.some((e) => e.eventType === EventType.AI_ANALYSIS_COMPLETED);

      const statusDerived = deriveCustomerComplaintStatus({
        rawStatus: c.status,
        rawStage: c.stage,
        hasSellerEvidence,
        hasDecision: Boolean(c.recommendedRemedy || latestProp),
        latestProposalStatus: latestProp?.status || null,
        latestRefundStatus:
          completedRefund?.status || pendingRefund?.status || failedRefund?.status || null,
        latestPackageStatus: latestPassport?.status || null,
        hasPendingReinvestigation: Boolean(pendingReinv),
        pendingReinvestigationParty: pendingReinv?.responsibleParty || null,
        pendingReinvestigationReceived: Boolean(pendingReinv?.receivedAt),
        hasCompletedAnalysis,
        sellerRequestChannel: c.sellerEvidenceRequests?.[0]?.deliveryChannel || null,
        sellerRequestStatus: c.sellerEvidenceRequests?.[0]?.status || null,
      });

      const card: BuyerComplaintSummaryCard = {
        id: c.caseNumber,
        dbId: c.id,
        title: c.title,
        platform: meta.platform,
        orderId: meta.orderId,
        productName: meta.productName,
        category: meta.originalCategory,
        amount: c.amountMinor / 100,
        currency: c.currency,
        requestedRemedy: meta.requestedRemedy,
        status: statusDerived.label,
        rawStatus: c.status,
        rawStage: c.stage,
        evidenceCount: c.evidence.length,
        requiresCustomerAction: statusDerived.requiresCustomerAction,
        actionRequiredMessage: statusDerived.actionRequiredMessage,
        latestActivityText: c.events[0]?.description || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };

      return { card, rawDescription: c.description || "" };
    });

    const isCompletedCard = (card: BuyerComplaintSummaryCard) =>
      card.status === "Resolved" || card.status === "Closed";

    const summary = {
      pendingCount: mappedEntries.filter((entry) => !isCompletedCard(entry.card)).length,
      completedCount: mappedEntries.filter((entry) => isCompletedCard(entry.card)).length,
    };

    const queryLower = params.search?.trim().toLowerCase() || "";
    const now = new Date();
    const startBound = (() => {
      if (params.startDate && /^\d{4}-\d{2}-\d{2}$/.test(params.startDate)) {
        const [y, m, d] = params.startDate.split("-").map((n) => parseInt(n, 10));
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      if (params.dateFilter === "today") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      }
      if (params.dateFilter === "7d") {
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      if (params.dateFilter === "30d") {
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      if (params.dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(params.dateFilter)) {
        const [y, m, d] = params.dateFilter.split("-").map((n) => parseInt(n, 10));
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      }
      return null;
    })();

    const endBound = (() => {
      if (params.endDate && /^\d{4}-\d{2}-\d{2}$/.test(params.endDate)) {
        const [y, m, d] = params.endDate.split("-").map((n) => parseInt(n, 10));
        return new Date(y, m - 1, d, 23, 59, 59, 999);
      }
      if (params.dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(params.dateFilter)) {
        const [y, m, d] = params.dateFilter.split("-").map((n) => parseInt(n, 10));
        return new Date(y, m - 1, d, 23, 59, 59, 999);
      }
      return null;
    })();

    const statusLower = params.status?.trim().toLowerCase() || "all";

    const filteredCards = mappedEntries
      .filter(({ card, rawDescription }) => {
        if (queryLower) {
          const matchesSearch =
            card.id.toLowerCase().includes(queryLower) ||
            card.productName.toLowerCase().includes(queryLower) ||
            card.title.toLowerCase().includes(queryLower) ||
            card.orderId.toLowerCase().includes(queryLower) ||
            card.platform.toLowerCase().includes(queryLower) ||
            rawDescription.toLowerCase().includes(queryLower);
          if (!matchesSearch) return false;
        }

        if (startBound || endBound) {
          const created = new Date(card.createdAt);
          if (startBound && created < startBound) return false;
          if (endBound && created > endBound) return false;
        }

        if (statusLower && statusLower !== "all") {
          if (statusLower === "pending" || statusLower === "in_progress") {
            return !isCompletedCard(card);
          }
          if (statusLower === "completed" || statusLower === "resolved") {
            return isCompletedCard(card);
          }
          if (statusLower === "action_required") {
            return card.requiresCustomerAction;
          }
          return card.status.toLowerCase() === statusLower;
        }

        return true;
      })
      .map(({ card }) => card);

    const total = filteredCards.length;
    const paginated = filteredCards.slice(skip, skip + limit);

    return {
      items: paginated,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Returns complete server-authorized complaint dossier + chronological Flipkart-style timeline.
   * Rejects any buyer requesting another user's case with 403 AuthError.
   */
  public static async getBuyerComplaintDetail(
    user: AuthenticatedUser,
    caseIdOrNumber: string
  ): Promise<BuyerComplaintDetailModel | null> {
    const trimmed = caseIdOrNumber?.trim();
    if (!trimmed) return null;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ caseNumber: trimmed }, { id: trimmed }],
      },
      include: {
        buyer: { select: { id: true, fullName: true } },
        merchant: { select: { id: true, fullName: true, organization: true } },
        organization: { select: { id: true, name: true } },
        claims: {
          orderBy: { createdAt: "asc" },
        },
        evidence: {
          orderBy: { createdAt: "asc" },
        },
        events: {
          include: {
            actor: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        timelineEvents: {
          include: {
            actor: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { occurredAt: "asc" },
        },
        aiAnalysisRuns: {
          include: {
            findings: { take: 5, orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        berrFindings: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        resolutionProposals: {
          include: {
            responses: {
              include: { responder: { select: { id: true, fullName: true, role: true } } },
              orderBy: { createdAt: "asc" },
            },
            refunds: {
              orderBy: { createdAt: "desc" },
            },
            replacementFulfillment: true,
          },
          orderBy: { createdAt: "asc" },
        },
        replacementFulfillments: {
          include: { packagePassport: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        orders: {
          include: {
            items: true,
            payments: {
              include: { refunds: true },
            },
            packagePassports: {
              include: {
                deliveryEvents: { orderBy: { eventTimestamp: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!caseRecord) return null;

    // Strict server-side authorization: for BUYER role, must be caseRecord.buyerId === user.id
    if (user.role === "BUYER" && !user.isPlatformAdmin && caseRecord.buyerId !== user.id) {
      throw new AuthError("Access denied: You are not authorized to view this complaint.", 403);
    }
    if (!canAccessCase(user, caseRecord)) {
      throw new AuthError("Access denied: You are not authorized to view this complaint.", 403);
    }

    const [latestSellerMatch, latestSellerRequest, latestBerr] = await Promise.all([
      prisma.sellerIdentityMatch.findFirst({
        where: { caseId: caseRecord.id },
        include: {
          matchedSeller: {
            select: { legalName: true, displayName: true, gstin: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sellerEvidenceRequest.findFirst({
        where: { caseId: caseRecord.id, status: { not: "CANCELLED" } },
        include: {
          seller: { select: { legalName: true, displayName: true, gstin: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.berrAssessmentRecord.findFirst({
        where: { caseId: caseRecord.id },
        orderBy: { version: "desc" },
        select: {
          version: true,
          overallStatus: true,
          isStale: true,
          createdAt: true,
        },
      }),
    ]);

    // Filter strictly to buyer-visible evidence using central permissions
    const visibleEvidence = caseRecord.evidence.filter((ev) => canViewEvidence(user, ev, caseRecord));
    const meta = extractOrderMetadata(caseRecord);

    // Filter events strictly to customer-appropriate lifecycle records (exclude internal notes / consent / raw agent traces)
    const customerVisibleEvidenceItems = visibleEvidence.map((ev) => {
      const evMeta = safeJsonParse(ev.metadataJson);
      const slotTag = typeof evMeta?.slotTag === "string" ? evMeta.slotTag : ev.evidenceType.toLowerCase();
      let verificationLabel = "Submitted · Pending review";
      let verificationTone: "emerald" | "amber" | "rose" | "slate" = "slate";
      if (ev.verificationStatus === "VERIFIED") {
        verificationLabel = "Verified record";
        verificationTone = "emerald";
      } else if (ev.verificationStatus === "SUSPICIOUS") {
        verificationLabel = "Under review";
        verificationTone = "amber";
      } else if (ev.verificationStatus === "REJECTED") {
        verificationLabel = "Not accepted";
        verificationTone = "rose";
      }
      return {
        id: ev.id,
        filename: ev.filename,
        mimeType: ev.mimeType,
        sizeBytes: ev.sizeBytes,
        slotTag,
        verificationLabel,
        verificationTone,
        createdAt: ev.createdAt.toISOString(),
        downloadUrl: `/api/evidence/${ev.id}/download`,
      };
    });

    const buyerEvidence = visibleEvidence.filter((e) => e.sourceType === "BUYER_UPLOAD");
    const sellerClaims = caseRecord.claims.filter((c) => c.partyRole === "MERCHANT");
    const sellerEvidence = visibleEvidence.filter(
      (e) => e.sourceType === "MERCHANT_PORTAL" || e.sourceType === "CARRIER_API"
    );
    const hasSellerEvidence = sellerClaims.length > 0 || sellerEvidence.length > 0;

    // Real analysis completion strictly from persisted runs or events/stage
    const completedRuns = caseRecord.aiAnalysisRuns.filter((r) => r.status === "COMPLETED");
    const activeRuns = caseRecord.aiAnalysisRuns.filter(
      (r) => r.status === "QUEUED" || r.status === "PROCESSING" || r.status === "NEEDS_HUMAN_REVIEW"
    );
    const analysisCompletedEvt = caseRecord.events.find((e) => e.eventType === EventType.AI_ANALYSIS_COMPLETED);
    const hasCompletedAnalysis =
      completedRuns.length > 0 ||
      Boolean(analysisCompletedEvt) ||
      caseRecord.berrFindings.length > 0 ||
      caseRecord.stage === CaseStage.RESOLUTION_PROPOSED ||
      caseRecord.stage === CaseStage.FINALIZED ||
      caseRecord.status === CaseStatus.RESOLVED ||
      caseRecord.status === CaseStatus.CLOSED;

    // Proposals, approvals & refunds (deduplicate chronologically keeping latest active/completed for clean view)
    const proposals = caseRecord.resolutionProposals;
    const latestProposal = proposals.length > 0 ? proposals[proposals.length - 1] : null;
    const agreedOrCompletedProposal =
      proposals.slice().reverse().find((p) => p.status === "AGREED" || p.status === "COMPLETED") || null;
    const allRefunds = [
      ...proposals.flatMap((p) => p.refunds),
      ...(caseRecord.orders?.flatMap((o) => o.payments.flatMap((pm) => pm.refunds)) || []),
    ];
    const completedRefund = allRefunds.find((r) => r.status === "COMPLETED") || null;
    const pendingRefund = allRefunds.find((r) => r.status === "PENDING" || r.status === "PROCESSING") || null;
    const failedRefund = allRefunds.find((r) => r.status === "FAILED") || null;
    const refundCompletedEvt = caseRecord.events.find((e) => e.eventType === EventType.REFUND_COMPLETED);
    const refundInitiatedEvt = caseRecord.events.find((e) => e.eventType === EventType.REFUND_INITIATED);
    const activeReplacement = caseRecord.replacementFulfillments?.[0] || null;
    const replacementPassport = activeReplacement?.packagePassport || null;

    const passport = caseRecord.orders?.[0]?.packagePassports?.[0] || null;
    const deliveredDeliveryEvt = passport?.deliveryEvents?.find((d) => d.eventType === "DELIVERED") || null;

    // Detect any re-investigation cycles
    const reinvestigationCycles = detectReinvestigationCycles({
      caseRecord: { id: caseRecord.id, status: caseRecord.status, createdAt: caseRecord.createdAt },
      events: caseRecord.events,
      timelineEvents: caseRecord.timelineEvents,
      evidence: visibleEvidence,
      aiAnalysisRuns: caseRecord.aiAnalysisRuns,
      proposals,
    });
    const activeReinvestigation = reinvestigationCycles.find((r) => !r.isResolved) || null;

    const statusDerived = deriveCustomerComplaintStatus({
      rawStatus: caseRecord.status,
      rawStage: caseRecord.stage,
      hasSellerEvidence,
      hasDecision: Boolean(caseRecord.recommendedRemedy || latestProposal),
      latestProposalStatus: latestProposal?.status || null,
      latestRefundStatus:
        completedRefund?.status || pendingRefund?.status || failedRefund?.status || null,
      latestPackageStatus: passport?.status || null,
      hasPendingReinvestigation: Boolean(activeReinvestigation),
      pendingReinvestigationParty: activeReinvestigation?.responsibleParty || null,
      pendingReinvestigationReceived: Boolean(activeReinvestigation?.receivedAt),
      hasCompletedAnalysis,
      sellerRequestChannel: latestSellerRequest?.deliveryChannel || null,
      sellerRequestStatus: latestSellerRequest?.status || null,
    });

    // =========================================================================
    // BUILD CHRONOLOGICAL VERTICAL INVESTIGATION TIMELINE (6 STAGES + REINV)
    // =========================================================================
    const timeline: TimelineMilestoneItem[] = [];

    // --- STAGE 1: COMPLAINT SUBMITTED ---
    const isPersistedNonDraft = caseRecord.status !== CaseStatus.DRAFT;
    const stage1SubEvents: CustomerSubEvent[] = [
      {
        id: "sub-case-created",
        title: "Complaint registered",
        description: `Complaint ${caseRecord.caseNumber} created for ${meta.platform} (${meta.originalCategory}).`,
        timestamp: caseRecord.createdAt.toISOString(),
        actorType: "CUSTOMER",
      },
    ];

    if (buyerEvidence.length > 0) {
      stage1SubEvents.push({
        id: "sub-initial-evidence",
        title: `${buyerEvidence.length} supporting file(s) attached`,
        description: `Initial customer files received and integrity-hashed.`,
        timestamp: buyerEvidence[0].createdAt.toISOString(),
        actorType: "CUSTOMER",
      });
    }

    timeline.push({
      id: "stage-1-submitted",
      stageKey: "COMPLAINT_SUBMITTED",
      title: "Complaint Submitted",
      description: "Your complaint has been successfully registered with RESOLVEGRAPH.",
      status: isPersistedNonDraft ? "COMPLETED" : "CURRENT",
      timestamp: caseRecord.createdAt.toISOString(),
      subEvents: stage1SubEvents,
    });

    // --- STAGE 2: RESOLVEGRAPH ANALYSIS ---
    const firstAnalysisCompletedAt =
      completedRuns[0]?.completedAt ||
      completedRuns[0]?.createdAt ||
      analysisCompletedEvt?.createdAt ||
      (hasCompletedAnalysis ? caseRecord.updatedAt : null);

    const stage2SubEvents: CustomerSubEvent[] = [];
    if (completedRuns[0] || analysisCompletedEvt) {
      stage2SubEvents.push({
        id: "sub-analysis-done",
        title: "Evidence & claim examination completed",
        description: "Submitted details, purchase records, and attachments cross-referenced.",
        timestamp: (firstAnalysisCompletedAt || caseRecord.createdAt).toISOString(),
        actorType: "RESOLVEGRAPH",
      });
    }
    if (caseRecord.berrFindings.length > 0) {
      const finding = caseRecord.berrFindings[0];
      stage2SubEvents.push({
        id: `sub-finding-${finding.id}`,
        title: finding.title || "Key investigation comparison recorded",
        description: finding.explanation,
        timestamp: finding.createdAt.toISOString(),
        actorType: "RESOLVEGRAPH",
      });
    }

    let stage2Status: TimelineMilestoneStatus = "UPCOMING";
    let stage2Desc = "Our system will examine your complaint and submitted evidence.";
    if (latestBerr) {
      if (latestBerr.overallStatus === "REQUIRES_ADDITIONAL_EVIDENCE") {
        stage2Status = "CURRENT";
        stage2Desc = "Initial evidence check finished; additional supporting documentation or clarification is needed.";
      } else if (latestBerr.overallStatus === "HUMAN_REVIEW_REQUIRED" || latestBerr.overallStatus === "COMPLETED_WITH_CONFLICTS") {
        stage2Status = "COMPLETED";
        stage2Desc = "Evidence examination finished and conflicting details were routed for Resolution Manager review.";
      } else if (latestBerr.overallStatus === "COMPLETED") {
        stage2Status = "COMPLETED";
        stage2Desc = "Evidence examination complete — complaint is ready for decision preparation.";
      }
    } else if (hasCompletedAnalysis) {
      stage2Status = "COMPLETED";
      stage2Desc = "RESOLVEGRAPH examined your complaint details and submitted evidence.";
    } else if (isPersistedNonDraft && (activeRuns.length > 0 || caseRecord.status === CaseStatus.SUBMITTED || caseRecord.status === CaseStatus.UNDER_ANALYSIS || caseRecord.status === CaseStatus.EVIDENCE_SUBMITTED)) {
      stage2Status = "CURRENT";
      stage2Desc = "Our system is examining your complaint and the submitted evidence.";
    }

    timeline.push({
      id: "stage-2-analysis",
      stageKey: "RESOLVEGRAPH_ANALYSIS",
      title: "RESOLVEGRAPH Analysis",
      description: stage2Desc,
      status: stage2Status,
      timestamp: hasCompletedAnalysis && firstAnalysisCompletedAt ? firstAnalysisCompletedAt.toISOString() : null,
      subEvents: stage2SubEvents,
    });

    // --- STAGE 3: SELLER EVIDENCE ---
    const sellerRequestEvt = caseRecord.events.find(
      (e) =>
        (e.eventType === EventType.TIMELINE_EVENT_RECORDED &&
          (safeJsonParse(e.metadataJson)?.stage === "MERCHANT_EVIDENCE_REQUESTED" ||
            /merchant.*requested/i.test(e.description))) ||
        e.eventType === EventType.SELLER_EVIDENCE_REQUESTED ||
        e.eventType === EventType.SELLER_EVIDENCE_DISPATCHED
    );
    const sellerFirstTimestamp =
      sellerEvidence[0]?.createdAt || sellerClaims[0]?.createdAt || null;

    const stage3SubEvents: CustomerSubEvent[] = [];
    if (latestSellerMatch) {
      const identifiedName =
        latestSellerMatch.matchedSeller?.legalName ||
        latestSellerMatch.extractedLegalName ||
        null;
      stage3SubEvents.push({
        id: `sub-seller-match-${latestSellerMatch.id}`,
        title: identifiedName
          ? `Identified seller: ${identifiedName}`
          : "Seller identification recorded",
        description: latestSellerMatch.requiresHumanReview
          ? `Seller match outcome (${latestSellerMatch.matchOutcome}) requires investigator review before outreach.`
          : `Seller matched via ${latestSellerMatch.matchOutcome}${
              latestSellerMatch.extractedGstin
                ? ` (GSTIN ${latestSellerMatch.extractedGstin})`
                : ""
            }.`,
        timestamp: latestSellerMatch.createdAt.toISOString(),
        actorType: "RESOLVEGRAPH",
      });
    }
    if (latestSellerRequest) {
      stage3SubEvents.push({
        id: `sub-seller-req-${latestSellerRequest.id}`,
        title:
          latestSellerRequest.deliveryChannel === "CUSTOMER_ASSISTED_HELP_CENTRE"
            ? `Customer-assisted ${latestSellerRequest.marketplace} Help Centre step prepared`
            : `Evidence request ${latestSellerRequest.requestNumber} dispatched via ${latestSellerRequest.deliveryChannel.replace(/_/g, " ")}`,
        description:
          latestSellerRequest.deliveryChannel === "CUSTOMER_ASSISTED_HELP_CENTRE"
            ? "Seller is not registered on RESOLVEGRAPH. Copy the prepared Help Centre message below to contact marketplace support."
            : `Requested fulfillment and verification records for ${latestSellerRequest.orderId} (status: ${latestSellerRequest.status}).`,
        timestamp: (
          latestSellerRequest.dispatchedAt || latestSellerRequest.createdAt
        ).toISOString(),
        actorType: "SYSTEM_INTEGRATION",
      });
      if (latestSellerRequest.viewedAt) {
        stage3SubEvents.push({
          id: `sub-seller-viewed-${latestSellerRequest.id}`,
          title: "Seller opened evidence request portal",
          description: `Verified seller representative viewed request ${latestSellerRequest.requestNumber}.`,
          timestamp: latestSellerRequest.viewedAt.toISOString(),
          actorType: "SELLER",
        });
      }
      if (latestSellerRequest.customerReportedSubmissionAt) {
        stage3SubEvents.push({
          id: `sub-cust-mkt-${latestSellerRequest.id}`,
          title: "Customer reported contacting marketplace Help Centre",
          description:
            latestSellerRequest.customerSubmissionNote ||
            "Awaiting marketplace support or seller response.",
          timestamp: latestSellerRequest.customerReportedSubmissionAt.toISOString(),
          actorType: "CUSTOMER",
        });
      }
    } else if (sellerRequestEvt) {
      stage3SubEvents.push({
        id: `sub-seller-req-${sellerRequestEvt.id}`,
        title: "Information request sent to seller",
        description: `Requested original order, packing, and delivery verification for ${meta.orderId}.`,
        timestamp: sellerRequestEvt.createdAt.toISOString(),
        actorType: "SYSTEM_INTEGRATION",
      });
    }
    if (sellerEvidence.length > 0) {
      stage3SubEvents.push({
        id: "sub-seller-ev",
        title: `Seller provided ${sellerEvidence.length} supporting record(s)`,
        description: `Documents reviewed include ${sellerEvidence
          .slice(0, 2)
          .map((e) => e.filename)
          .join(", ")}.`,
        timestamp: sellerEvidence[0].createdAt.toISOString(),
        actorType: "SELLER",
      });
    } else if (sellerClaims.length > 0) {
      stage3SubEvents.push({
        id: `sub-seller-claim-${sellerClaims[0].id}`,
        title: "Seller response received",
        description: "The merchant has submitted an official response regarding your purchase.",
        timestamp: sellerClaims[0].createdAt.toISOString(),
        actorType: "SELLER",
      });
    }

    let stage3Status: TimelineMilestoneStatus = "UPCOMING";
    let stage3Desc = "Relevant information has been requested from the seller to help complete the investigation.";
    if (hasSellerEvidence || latestSellerRequest?.status === "SELLER_RESPONDED") {
      stage3Status = "COMPLETED";
      stage3Desc = "The seller has submitted information for review.";
    } else if (latestSellerRequest?.status === "CUSTOMER_ACTION_REQUIRED") {
      stage3Status = "ATTENTION";
      stage3Desc = `Seller is not on RESOLVEGRAPH. Copy the prepared Help Centre message to contact ${latestSellerRequest.marketplace} Support.`;
    } else if (latestSellerRequest?.status === "MARKETPLACE_SUPPORT_PENDING") {
      stage3Status = "CURRENT";
      stage3Desc = `You reported contacting ${latestSellerRequest.marketplace} Help Centre. Upload any marketplace replies received.`;
    } else if (latestSellerRequest?.status === "NO_RESPONSE") {
      stage3Status = "ATTENTION";
      stage3Desc = "Seller did not reply within the response window. Investigators are continuing review.";
    } else if (latestSellerRequest?.status === "ADDITIONAL_EVIDENCE_REQUIRED") {
      stage3Status = "ATTENTION";
      stage3Desc = "Investigators requested additional clarification records from the seller.";
    } else if (caseRecord.status === CaseStatus.EVIDENCE_REQUESTED && sellerClaims.length > 0) {
      stage3Status = "ATTENTION";
      stage3Desc = "Further clarification is being requested from the seller.";
    } else if (
      latestSellerRequest ||
      sellerRequestEvt ||
      caseRecord.status === CaseStatus.SUBMITTED ||
      caseRecord.status === CaseStatus.EVIDENCE_REQUESTED ||
      caseRecord.status === CaseStatus.UNDER_ANALYSIS
    ) {
      stage3Status = "CURRENT";
      stage3Desc = latestSellerRequest?.viewedAt
        ? "Seller opened your case request and is preparing supporting fulfillment records."
        : "RESOLVEGRAPH has requested supporting information from the seller. Awaiting seller response.";
    }

    timeline.push({
      id: "stage-3-seller-evidence",
      stageKey: "SELLER_EVIDENCE",
      title: "Seller Evidence",
      description: stage3Desc,
      status: stage3Status,
      timestamp: sellerFirstTimestamp
        ? sellerFirstTimestamp.toISOString()
        : latestSellerRequest
        ? (latestSellerRequest.dispatchedAt || latestSellerRequest.createdAt).toISOString()
        : sellerRequestEvt
        ? sellerRequestEvt.createdAt.toISOString()
        : null,
      subEvents: stage3SubEvents,
      actionRequired:
        stage3Status === "CURRENT" && !hasSellerEvidence
          ? {
              type: "WAITING_FOR_SELLER",
              label: "Awaiting seller response",
            }
          : null,
    });

    // --- CONDITIONAL RE-INVESTIGATION EVENTS (ONLY WHEN ACTUALLY TRIGGERED) ---
    for (const cycle of reinvestigationCycles) {
      const cySubEvents: CustomerSubEvent[] = [
        {
          id: `${cycle.id}-req`,
          title: "Additional information requested",
          description: cycle.missingInformation,
          timestamp: cycle.requestedAt.toISOString(),
          actorType: "RESOLVEGRAPH",
        },
      ];
      if (cycle.receivedAt) {
        cySubEvents.push({
          id: `${cycle.id}-recv`,
          title: "Follow-up evidence received",
          description:
            cycle.responsibleParty === "SELLER"
              ? "Seller submitted requested follow-up records."
              : "Customer submitted additional supporting evidence.",
          timestamp: cycle.receivedAt.toISOString(),
          actorType: cycle.responsibleParty === "SELLER" ? "SELLER" : "CUSTOMER",
        });
      }
      const subsequentDecision = caseRecord.events.find(
        (e) =>
          (e.eventType === EventType.AI_ANALYSIS_COMPLETED || e.eventType === EventType.RESOLUTION_PROPOSED) &&
          e.createdAt.getTime() > cycle.requestedAt.getTime()
      );
      if (subsequentDecision) {
        cySubEvents.push({
          id: `${cycle.id}-reeval`,
          title: "Re-evaluation completed",
          description: "RESOLVEGRAPH re-evaluated all combined evidence and updated findings.",
          timestamp: subsequentDecision.createdAt.toISOString(),
          actorType: "RESOLVEGRAPH",
        });
      }

      timeline.push({
        id: cycle.id,
        stageKey: "REINVESTIGATION_REQUIRED",
        title: "Re-investigation Required",
        description: cycle.isResolved
          ? "Additional information was reviewed and investigation resumed."
          : "Additional information or evidence is needed before a final resolution can be reached.",
        status: cycle.isResolved ? "COMPLETED" : "ATTENTION",
        timestamp: cycle.requestedAt.toISOString(),
        subEvents: cySubEvents,
        actionRequired:
          !cycle.receivedAt && !cycle.isResolved && (cycle.responsibleParty === "CUSTOMER" || cycle.responsibleParty === "BOTH")
            ? {
                type: "UPLOAD_ADDITIONAL_EVIDENCE",
                label: "Upload Additional Evidence",
                detail: cycle.missingInformation,
              }
            : !cycle.receivedAt && cycle.responsibleParty === "SELLER"
            ? {
                type: "WAITING_FOR_SELLER",
                label: "Waiting for Seller Evidence",
              }
            : null,
        reinvestigationMeta: {
          reason: cycle.reason,
          missingInformation: cycle.missingInformation,
          responsibleParty: cycle.responsibleParty,
          requestedAt: cycle.requestedAt.toISOString(),
          receivedAt: cycle.receivedAt ? cycle.receivedAt.toISOString() : null,
          isResolved: cycle.isResolved,
        },
      });
    }

    // --- STAGE 4: RESOLVEGRAPH DECISION ---
    const decisionEvt = caseRecord.events.find(
      (e) => e.eventType === EventType.RESOLUTION_PROPOSED || e.eventType === EventType.REMEDY_PROPOSED
    );
    const hasDecision = Boolean(latestProposal || caseRecord.recommendedRemedy || decisionEvt);
    const decisionDate = latestProposal?.createdAt || decisionEvt?.createdAt || (hasDecision ? caseRecord.updatedAt : null);

    let stage4Status: TimelineMilestoneStatus = "UPCOMING";
    let stage4Desc = "Once analysis and seller evidence are reviewed, RESOLVEGRAPH will prepare a resolution assessment.";
    const stage4SubEvents: CustomerSubEvent[] = [];

    if (hasDecision) {
      stage4Status = "COMPLETED";
      const recRemedy = formatRemedyLabel(latestProposal?.proposalType || caseRecord.recommendedRemedy);
      stage4Desc = `${recRemedy} has been recommended based on the available evidence, subject to required approvals.`;
      if (latestProposal?.reason) {
        stage4SubEvents.push({
          id: `sub-dec-${latestProposal.id}`,
          title: `${recRemedy} recommended`,
          description: latestProposal.reason,
          timestamp: latestProposal.createdAt.toISOString(),
          actorType: "RESOLVEGRAPH",
        });
      }
    } else if (caseRecord.status === CaseStatus.IN_REVIEW) {
      stage4Status = "ATTENTION";
      stage4Desc = "This complaint has been escalated for specialist human review.";
    } else if (hasCompletedAnalysis && hasSellerEvidence) {
      stage4Status = "CURRENT";
      stage4Desc = "Evaluating buyer and seller evidence against applicable resolution policies.";
    }

    timeline.push({
      id: "stage-4-decision",
      stageKey: "RESOLVEGRAPH_DECISION",
      title: "RESOLVEGRAPH Decision",
      description: stage4Desc,
      status: stage4Status,
      timestamp: hasDecision && decisionDate ? decisionDate.toISOString() : null,
      subEvents: stage4SubEvents,
    });

    // --- STAGE 5: WAITING FOR APPROVAL ---
    const isResolvedOrClosed =
      caseRecord.status === CaseStatus.RESOLVED || caseRecord.status === CaseStatus.CLOSED;
    const isProposalAuthorized = Boolean(
      agreedOrCompletedProposal &&
        ["AUTHORIZED", "EXECUTION_PENDING", "EXECUTION_FAILED", "COMPLETED"].includes(
          agreedOrCompletedProposal.authorizationStatus || ""
        )
    );
    const isProposalDenied = Boolean(
      latestProposal &&
        (latestProposal.authorizationStatus === "REJECTED" ||
          latestProposal.status === "REJECTED" ||
          latestProposal.status === "BUYER_REJECTED")
    );
    const agreedResp = agreedOrCompletedProposal?.responses?.find((r) => r.response === "ACCEPTED") || null;
    const approvalEvt = caseRecord.events.find(
      (e) =>
        e.eventType === EventType.AUTHORIZATION_GRANTED ||
        e.eventType === EventType.REPLACEMENT_AUTHORIZED
    );

    let stage5Status: TimelineMilestoneStatus = "UPCOMING";
    let stage5Desc = "The proposed resolution is awaiting the required authorization.";
    let stage5Timestamp: string | null = null;
    let awaitingPartyText: string | null = null;
    const stage5SubEvents: CustomerSubEvent[] = [];

    if (isProposalAuthorized || isResolvedOrClosed || approvalEvt) {
      stage5Status = "COMPLETED";
      stage5Timestamp = (
        agreedOrCompletedProposal?.authorizedAt ||
        approvalEvt?.createdAt ||
        agreedResp?.createdAt ||
        agreedOrCompletedProposal?.updatedAt ||
        caseRecord.updatedAt
      ).toISOString();
      stage5Desc = "The proposed resolution has received formal authorization.";
      stage5SubEvents.push({
        id: "sub-approved",
        title: "Resolution authorized",
        description: `Authorized ${formatRemedyLabel(agreedOrCompletedProposal?.proposalType || caseRecord.recommendedRemedy)}.`,
        timestamp: stage5Timestamp,
        actorType: "RESOLUTION_MANAGER",
      });
    } else if (isProposalDenied && latestProposal) {
      stage5Status = "ATTENTION";
      stage5Timestamp = (latestProposal.authorizedAt || latestProposal.updatedAt).toISOString();
      stage5Desc =
        latestProposal.denialReason ||
        "The proposed resolution was declined during authorization review and returned for investigation.";
    } else if (agreedOrCompletedProposal) {
      stage5Status = "CURRENT";
      awaitingPartyText = "Resolution Manager authorization";
      stage5Desc = "Parties agreed; awaiting formal Resolution Manager authorization.";
      stage5Timestamp = agreedOrCompletedProposal.updatedAt.toISOString();
    } else if (latestProposal) {
      if (latestProposal.status === "PENDING_MERCHANT") {
        stage5Status = "CURRENT";
        awaitingPartyText = "Seller / Merchant approval";
        stage5Desc = "Awaiting merchant approval for the proposed resolution.";
      } else if (latestProposal.status === "PENDING_BUYER") {
        stage5Status = "ATTENTION";
        awaitingPartyText = "Customer confirmation";
        stage5Desc = "Your confirmation is required for the proposed resolution.";
      } else {
        stage5Status = "CURRENT";
        awaitingPartyText = "Resolution Manager approval";
        stage5Desc = "Approval requested from an authorized Resolution Manager.";
      }
      stage5Timestamp = latestProposal.createdAt.toISOString();
    } else if (hasDecision) {
      stage5Status = "CURRENT";
      awaitingPartyText = "Resolution Manager authorization";
      stage5Desc = "Awaiting formal authorization of the recommended remedy.";
    }

    timeline.push({
      id: "stage-5-approval",
      stageKey: "WAITING_FOR_APPROVAL",
      title: stage5Status === "COMPLETED" ? "Approval Completed" : isProposalDenied ? "Authorization Denied" : "Waiting for Approval",
      description: stage5Desc,
      status: stage5Status,
      timestamp: stage5Timestamp,
      subEvents: stage5SubEvents,
    });

    // --- STAGE 6: PROBLEM SOLVED ---
    const isReplacementCase =
      Boolean(activeReplacement) ||
      (agreedOrCompletedProposal?.proposalType || caseRecord.recommendedRemedy || meta.requestedRemedy)
        .toUpperCase()
        .includes("REPLACE");

    let stage6Status: TimelineMilestoneStatus = "UPCOMING";
    let stage6Desc = "Your complaint will be marked resolved once the refund or replacement is confirmed.";
    let stage6Timestamp: string | null = null;
    const stage6SubEvents: CustomerSubEvent[] = [];

    if (completedRefund) {
      stage6Status = "COMPLETED";
      stage6Timestamp = (completedRefund.completedAt || completedRefund.updatedAt).toISOString();
      stage6Desc = `Refund of ${caseRecord.currency} ${(completedRefund.amountMinor / 100).toFixed(2)} has been completed.`;
      stage6SubEvents.push({
        id: `sub-ref-done-${completedRefund.id}`,
        title: "Refund confirmed by payment provider",
        description: `Reference: ${completedRefund.paypalRefundId || completedRefund.refundRequestId}`,
        timestamp: stage6Timestamp,
        actorType: "SYSTEM_INTEGRATION",
      });
    } else if (pendingRefund || failedRefund) {
      stage6Status = failedRefund && !pendingRefund ? "ATTENTION" : "CURRENT";
      const activeRef = pendingRefund || failedRefund;
      stage6Timestamp = (activeRef?.createdAt || refundInitiatedEvt?.createdAt || caseRecord.updatedAt).toISOString();
      stage6Desc = failedRefund && !pendingRefund
        ? "Refund execution failed and requires retry or manual resolution follow-up."
        : "Refund has been initiated and is currently being processed by the payment provider.";
    } else if (
      activeReplacement &&
      activeReplacement.status !== "COMPLETED" &&
      activeReplacement.status !== "DELIVERED" &&
      caseRecord.status !== CaseStatus.RESOLVED &&
      caseRecord.status !== CaseStatus.CLOSED
    ) {
      stage6Status = "CURRENT";
      stage6Timestamp = (
        activeReplacement.dispatchedAt ||
        activeReplacement.sellerConfirmedAt ||
        activeReplacement.authorizedAt ||
        activeReplacement.createdAt
      ).toISOString();
      stage6Desc =
        activeReplacement.status === "DISPATCHED" || activeReplacement.status === "IN_TRANSIT"
          ? `Replacement has been dispatched${activeReplacement.carrierName ? ` via ${activeReplacement.carrierName}` : ""}${activeReplacement.trackingNumber ? ` (Tracking #${activeReplacement.trackingNumber})` : ""}. Tracking delivery confirmation.`
          : activeReplacement.status === "SELLER_CONFIRMED"
          ? "Seller confirmed stock for your replacement; preparing dispatch tracking."
          : "Replacement has been authorized and requested from the seller.";
    } else if (
      !activeReplacement &&
      isReplacementCase &&
      passport &&
      passport.status !== "DELIVERED" &&
      caseRecord.status !== CaseStatus.RESOLVED &&
      caseRecord.status !== CaseStatus.CLOSED
    ) {
      stage6Status = "CURRENT";
      stage6Timestamp = (passport.dispatchedAt || passport.updatedAt).toISOString();
      stage6Desc =
        passport.status === "DISPATCHED" ||
        passport.status === "IN_TRANSIT" ||
        passport.status === "OUT_FOR_DELIVERY"
          ? `Replacement has been dispatched${passport.carrierName ? ` via ${passport.carrierName}` : ""}${passport.trackingNumber ? ` (Tracking #${passport.trackingNumber})` : ""}. Tracking delivery confirmation.`
          : "Replacement fulfillment is in progress.";
    } else if (
      (activeReplacement &&
        (activeReplacement.status === "COMPLETED" || activeReplacement.status === "DELIVERED")) ||
      (isReplacementCase && passport?.status === "DELIVERED" && agreedOrCompletedProposal)
    ) {
      stage6Status = "COMPLETED";
      stage6Timestamp = (
        activeReplacement?.completedAt ||
        activeReplacement?.deliveredAt ||
        deliveredDeliveryEvt?.eventTimestamp ||
        passport?.deliveredAt ||
        caseRecord.resolvedAt ||
        caseRecord.updatedAt
      ).toISOString();
      const deliveredTrack = activeReplacement?.trackingNumber || passport?.trackingNumber;
      stage6Desc = `Replacement delivery confirmed${deliveredTrack ? ` (Tracking #${deliveredTrack})` : ""}.`;
    } else if (isResolvedOrClosed) {
      stage6Status = "COMPLETED";
      stage6Timestamp = (
        deliveredDeliveryEvt?.eventTimestamp ||
        passport?.deliveredAt ||
        refundCompletedEvt?.createdAt ||
        caseRecord.resolvedAt ||
        caseRecord.updatedAt
      ).toISOString();
      stage6Desc =
        caseRecord.resolutionSummary ||
        (isReplacementCase
          ? "Replacement has been completed and confirmed."
          : "Your complaint has been resolved.");
    } else if (refundInitiatedEvt && caseRecord.status === CaseStatus.EXECUTING_REFUND) {
      stage6Status = "CURRENT";
      stage6Timestamp = (refundInitiatedEvt.createdAt || caseRecord.updatedAt).toISOString();
      stage6Desc = "Refund has been initiated and is currently being processed by the payment provider.";
    } else if (stage5Status === "COMPLETED") {
      stage6Status = "CURRENT";
      stage6Desc = "Authorization completed. Coordinating final refund execution or replacement shipment.";
    }

    timeline.push({
      id: "stage-6-solved",
      stageKey: "PROBLEM_SOLVED",
      title: "Problem Solved",
      description: stage6Desc,
      status: stage6Status,
      timestamp: stage6Timestamp,
      subEvents: stage6SubEvents,
    });

    // Latest visible event timestamp
    const lastStageEvent = timeline
      .slice()
      .reverse()
      .find((t) => t.timestamp !== null);

    // =========================================================================
    // RESOLUTION SUMMARY SECTION DATA (PART 11)
    // =========================================================================
    const recommendedRemedyLabel = hasDecision
      ? formatRemedyLabel(latestProposal?.proposalType || caseRecord.recommendedRemedy)
      : null;
    const approvedRemedyLabel =
      isProposalAuthorized || isResolvedOrClosed
        ? formatRemedyLabel(agreedOrCompletedProposal?.proposalType || caseRecord.recommendedRemedy)
        : null;

    let resHeadline = "Your complaint is currently being investigated.";
    if (stage6Status === "COMPLETED") {
      resHeadline = "Your complaint has been resolved.";
    } else if (failedRefund && !pendingRefund) {
      resHeadline = "Authorized refund encountered an execution failure and is pending retry.";
    } else if (pendingRefund || (refundInitiatedEvt && caseRecord.status === CaseStatus.EXECUTING_REFUND)) {
      resHeadline = "Authorized refund is currently in progress.";
    } else if (
      activeReplacement?.dispatchedAt ||
      (isReplacementCase &&
        (passport?.dispatchedAt ||
          passport?.status === "DISPATCHED" ||
          passport?.status === "IN_TRANSIT" ||
          passport?.status === "OUT_FOR_DELIVERY"))
    ) {
      resHeadline = "Authorized replacement has been dispatched.";
    } else if (activeReplacement) {
      resHeadline = "Authorized replacement has been requested from the seller.";
    } else if (isProposalDenied) {
      resHeadline = "Proposed resolution was denied during authorization review and returned to investigation.";
    } else if (approvedRemedyLabel) {
      resHeadline = `${approvedRemedyLabel} has been authorized.`;
    } else if (hasDecision) {
      resHeadline = `${recommendedRemedyLabel} has been recommended and is awaiting approval.`;
    }

    return {
      complaint: {
        id: caseRecord.caseNumber,
        dbId: caseRecord.id,
        title: caseRecord.title,
        platform: meta.platform,
        orderId: meta.orderId,
        productName: meta.productName,
        category: meta.originalCategory,
        amount: caseRecord.amountMinor / 100,
        currency: caseRecord.currency,
        requestedRemedy: meta.requestedRemedy,
        status: statusDerived.label,
        rawStatus: caseRecord.status,
        rawStage: caseRecord.stage,
        evidenceCount: customerVisibleEvidenceItems.length,
        requiresCustomerAction: statusDerived.requiresCustomerAction,
        actionRequiredMessage: statusDerived.actionRequiredMessage,
        latestActivityText: lastStageEvent?.description || null,
        createdAt: caseRecord.createdAt.toISOString(),
        updatedAt: caseRecord.updatedAt.toISOString(),
        purchaseDate: meta.purchaseDate,
        merchantName: caseRecord.organization?.name || caseRecord.merchant.fullName,
        resolvedAt: caseRecord.resolvedAt ? caseRecord.resolvedAt.toISOString() : null,
      },
      submissionDetails: {
        orderInformation: {
          platform: meta.platform,
          orderId: meta.orderId,
          productName: meta.productName,
          amount: caseRecord.amountMinor / 100,
          currency: caseRecord.currency,
          purchaseDate: meta.purchaseDate,
        },
        complaintInformation: {
          category: meta.originalCategory,
          title: caseRecord.title,
          originalDescription: meta.cleanDescription,
        },
        preferredResolution: meta.requestedRemedy,
        supportingEvidence: customerVisibleEvidenceItems,
        activityMetadata: {
          createdAt: caseRecord.createdAt.toISOString(),
          updatedAt: caseRecord.updatedAt.toISOString(),
          latestEventTitle: lastStageEvent?.title || null,
          latestEventAt: lastStageEvent?.timestamp || null,
        },
      },
      timeline,
      resolutionSummary: {
        hasDecision,
        headline: resHeadline,
        recommendedRemedy: recommendedRemedyLabel,
        decisionDate: hasDecision && decisionDate ? decisionDate.toISOString() : null,
        reasoningSummary:
          latestProposal?.reason ||
          caseRecord.berrFindings[0]?.explanation ||
          caseRecord.resolutionSummary ||
          null,
        approvalStatus:
          isProposalAuthorized || isResolvedOrClosed
            ? "Approved"
            : isProposalDenied
            ? "Authorization denied"
            : latestProposal
            ? awaitingPartyText || "Approval requested"
            : null,
        awaitingParty: awaitingPartyText,
        approvedRemedy: approvedRemedyLabel,
        approvedAt: stage5Status === "COMPLETED" ? stage5Timestamp : null,
        refundDetails:
          completedRefund || pendingRefund || failedRefund
            ? {
                status: (completedRefund || pendingRefund || failedRefund)!.status,
                amount: (completedRefund || pendingRefund || failedRefund)!.amountMinor / 100,
                currency: (completedRefund || pendingRefund || failedRefund)!.currency,
                referenceId:
                  (completedRefund || pendingRefund || failedRefund)!.paypalRefundId ||
                  (completedRefund || pendingRefund || failedRefund)!.refundRequestId ||
                  null,
                initiatedAt: (completedRefund || pendingRefund || failedRefund)!.createdAt.toISOString(),
                completedAt:
                  (completedRefund || pendingRefund || failedRefund)!.completedAt?.toISOString() ||
                  null,
              }
            : null,
        replacementDetails:
          activeReplacement
            ? {
                status: activeReplacement.status,
                itemName: activeReplacement.productName || meta.productName,
                referenceNumber:
                  replacementPassport?.packageNumber || activeReplacement.id,
                carrierName:
                  activeReplacement.carrierName || replacementPassport?.carrierName || null,
                trackingNumber:
                  activeReplacement.trackingNumber || replacementPassport?.trackingNumber || null,
                dispatchedAt:
                  activeReplacement.dispatchedAt?.toISOString() ||
                  replacementPassport?.dispatchedAt?.toISOString() ||
                  null,
                deliveredAt:
                  activeReplacement.deliveredAt?.toISOString() ||
                  replacementPassport?.deliveredAt?.toISOString() ||
                  null,
              }
            : isReplacementCase && passport && agreedOrCompletedProposal
            ? {
                status: passport.status,
                itemName: meta.productName,
                referenceNumber: passport.packageNumber,
                carrierName: passport.carrierName,
                trackingNumber: passport.trackingNumber,
                dispatchedAt: passport.dispatchedAt?.toISOString() || null,
                deliveredAt: passport.deliveredAt?.toISOString() || null,
              }
            : null,
        pendingBuyerProposal:
          latestProposal && latestProposal.status === "PENDING_BUYER"
            ? {
                id: latestProposal.id,
                title: latestProposal.title,
                proposalType: latestProposal.proposalType,
                description: latestProposal.description,
                amount: latestProposal.amountMinor != null ? latestProposal.amountMinor / 100 : null,
                currency: latestProposal.currency || caseRecord.currency || "USD",
                reason: latestProposal.reason,
                createdAt: latestProposal.createdAt.toISOString(),
              }
            : null,
        isCompleted: stage6Status === "COMPLETED",
        completedAt: stage6Status === "COMPLETED" ? stage6Timestamp : null,
      },
      sellerOutreach:
        latestSellerRequest || latestSellerMatch
          ? {
              requestId: latestSellerRequest?.id ?? null,
              requestNumber: latestSellerRequest?.requestNumber ?? null,
              identifiedSellerName:
                latestSellerRequest?.seller?.legalName ??
                latestSellerMatch?.matchedSeller?.legalName ??
                latestSellerMatch?.extractedLegalName ??
                null,
              identifiedSellerGstin:
                latestSellerRequest?.seller?.gstin ??
                latestSellerMatch?.matchedSeller?.gstin ??
                latestSellerMatch?.extractedGstin ??
                null,
              registrationStatus: latestSellerRequest?.registrationStatus ?? null,
              matchOutcome: latestSellerMatch?.matchOutcome ?? null,
              requiresHumanReview: Boolean(latestSellerMatch?.requiresHumanReview),
              channel: latestSellerRequest?.deliveryChannel ?? null,
              requestStatus: latestSellerRequest?.status ?? null,
              marketplace:
                latestSellerRequest?.marketplace ??
                latestSellerMatch?.extractedMarketplace ??
                null,
              marketplaceSupportUrl: latestSellerRequest?.marketplaceSupportUrl ?? null,
              preparedMessageForBuyer: latestSellerRequest?.preparedMessageForBuyer ?? null,
              customerReportedSubmissionAt:
                latestSellerRequest?.customerReportedSubmissionAt?.toISOString() ?? null,
              customerSubmissionNote: latestSellerRequest?.customerSubmissionNote ?? null,
              dispatchedAt: latestSellerRequest?.dispatchedAt?.toISOString() ?? null,
              viewedAt: latestSellerRequest?.viewedAt?.toISOString() ?? null,
              respondedAt: latestSellerRequest?.respondedAt?.toISOString() ?? null,
              requestedItemsCount: (() => {
                if (!latestSellerRequest?.requestedItemsJson) return 0;
                try {
                  return JSON.parse(latestSellerRequest.requestedItemsJson).length;
                } catch {
                  return 0;
                }
              })(),
            }
          : null,
    };
  }
}
