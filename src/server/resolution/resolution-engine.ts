/**
 * RESOLVEGRAPH — Step 5: Resolution Intelligence & Policy Evaluation Engine
 * Evaluates active merchant/platform resolution policies, checks rule constraints, and generates explainable remedy proposals.
 */

import { prisma } from "@/lib/prisma";
import {
  PolicyValidator,
  RequiredEvidenceConfig,
  ReturnWindowConfig,
  RefundLimitConfig,
  RemedyEligibilityConfig,
  HumanReviewRequiredConfig,
} from "./policy-validator";
import { ResolutionRule } from "@/generated/prisma/client";
import { calculateRemainingRefundable } from "@/server/paypal/utils/money";

export interface CandidateResolutionOption {
  proposalType:
    | "REPLACEMENT"
    | "FULL_REFUND"
    | "PARTIAL_REFUND"
    | "RETURN_AND_REFUND"
    | "INFORMATION_REQUEST"
    | "HUMAN_REVIEW";
  title: string;
  recommendedAmountMinor?: number;
  currency: string;
  isEligible: boolean;
  requiresEscalation: boolean;
  policyId?: string;
  policyVersion: string;
  reason: string;
  justificationNotes: string[];
  groundingFindings: string[];
}

export interface PolicyEvaluationResult {
  caseId: string;
  policyName: string;
  policyVersion: string;
  isCompliant: boolean;
  violations: string[];
  candidateOptions: CandidateResolutionOption[];
  recommendedOption: CandidateResolutionOption;
  berrSummary?: {
    assessmentId: string | null;
    version: number | null;
    overallStatus: string | null;
    status: string | null;
    isStale: boolean;
    hasUnresolvedConflicts: boolean;
    hasMissingEvidence: boolean;
    buyerEvidenceBlocked: boolean;
    sellerEvidenceMissing: boolean;
  };
  activeRefund?: {
    hasCompletedFullRefund: boolean;
    hasActivePendingRefund: boolean;
    completedRefundMinor: number;
    pendingRefundMinor: number;
    remainingRefundableMinor: number | null;
  };
  marketplaceContext?: {
    marketplace: string | null;
    hasCapturedGatewayPayment: boolean;
    requiresMarketplaceOrManualSettlement: boolean;
  };
  requiresAuthorization?: boolean;
}

export class ResolutionEngine {
  /**
   * Evaluates available resolution options for a given dispute case,
   * consuming persisted BERR v2 findings, order/refund balances, and merchant policy rules.
   */
  public static async evaluateCase(caseIdOrNumber: string): Promise<PolicyEvaluationResult> {
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
      },
      include: {
        organization: true,
        claims: true,
        evidence: {
          include: { analysisResults: { orderBy: { createdAt: "desc" }, take: 1 } },
        },
        berrFindings: true,
        berrAssessments: {
          orderBy: { version: "desc" },
          take: 3,
          include: { findings: true },
        },
        orders: {
          include: {
            payments: {
              include: { refunds: true },
            },
          },
        },
        purchaseMemory: true,
        packagePassport: true,
        sellerEvidenceRequests: {
          include: { responses: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!caseRecord) {
      throw new Error(`Case not found: ${caseIdOrNumber}`);
    }

    // Find active policy for this organization (or default active policy)
    const policy = caseRecord.organizationId
      ? await prisma.resolutionPolicy.findFirst({
          where: {
            organizationId: caseRecord.organizationId,
            isActive: true,
          },
          include: {
            rules: {
              where: { isEnabled: true },
              orderBy: { priority: "asc" },
            },
          },
        })
      : await prisma.resolutionPolicy.findFirst({
          where: { isActive: true },
          include: {
            rules: {
              where: { isEnabled: true },
              orderBy: { priority: "asc" },
            },
          },
        });

    const policyName = policy?.name || "Standard Commerce Resolution Policy (Default)";
    const policyVersion = policy?.version || "1.0";
    const rules: ResolutionRule[] = policy?.rules || [];

    const violations: string[] = [];
    let requiresHumanEscalation = false;

    // 0. Inspect BERR v2 Assessment, Payment/Refund Ledger, Seller Response & Buyer Forensics
    const latestBerr =
      caseRecord.berrAssessments.find((a) => !a.isStale) ||
      caseRecord.berrAssessments[0] ||
      null;

    const latestBerrFindings = latestBerr?.findings || [];
    const unresolvedContested = latestBerrFindings.filter(
      (f) =>
        f.classification === "CONTESTED" &&
        f.humanReviewStatus !== "ACCEPTED" &&
        f.humanReviewStatus !== "CORRECTED"
    );
    const unresolvedMissing = latestBerrFindings.filter(
      (f) => f.classification === "MISSING" && f.humanReviewStatus === "UNREVIEWED"
    );

    const berrInsufficientBegData =
      latestBerr?.status === "INSUFFICIENT_BEG_DATA" ||
      (!latestBerr && caseRecord.evidence.length === 0 && !caseRecord.orders.length && !caseRecord.purchaseMemory);

    const buyerUploads = caseRecord.evidence.filter((e) => e.sourceType === "BUYER_UPLOAD");
    const suspiciousOrRejectedBuyerDocs = buyerUploads.filter(
      (e) =>
        e.verificationStatus === "REJECTED" ||
        e.verificationStatus === "SUSPICIOUS" ||
        e.scanStatus === "INFECTED" ||
        e.analysisResults[0]?.assessmentState === "SUSPICIOUS"
    );
    const usableBuyerDocs = buyerUploads.filter(
      (e) =>
        e.verificationStatus !== "REJECTED" &&
        e.scanStatus !== "INFECTED" &&
        e.analysisResults[0]?.assessmentState !== "SUSPICIOUS"
    );
    const buyerEvidenceBlocked =
      (buyerUploads.length > 0 &&
        usableBuyerDocs.length === 0 &&
        suspiciousOrRejectedBuyerDocs.length > 0) ||
      Boolean(
        caseRecord.status === "EVIDENCE_REQUESTED" &&
          buyerUploads.length === 0 &&
          latestBerr?.status === "INSUFFICIENT_BEG_DATA"
      );

    const activeSellerRequests = caseRecord.sellerEvidenceRequests.filter(
      (r) => r.status !== "CANCELLED"
    );
    const hasMerchantClaim = caseRecord.claims.some((c) => c.partyRole === "MERCHANT");
    const hasSellerSubmission =
      hasMerchantClaim ||
      caseRecord.evidence.some((e) => e.sourceType === "MERCHANT_PORTAL") ||
      activeSellerRequests.some((r) => r.responses.length > 0);
    const sellerEvidenceMissing =
      activeSellerRequests.length > 0 && !hasSellerSubmission;

    // Inspect Payment / Refund balances across linked CommerceOrders
    const completedPayments = caseRecord.orders.flatMap((o) =>
      o.payments.filter((p) => p.paymentStatus === "COMPLETED")
    );
    const allRefunds = caseRecord.orders.flatMap((o) =>
      o.payments.flatMap((p) => p.refunds)
    );
    const completedRefundMinor = allRefunds
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + r.amountMinor, 0);
    const pendingRefundMinor = allRefunds
      .filter((r) => r.status === "PENDING" || r.status === "PROCESSING")
      .reduce((sum, r) => sum + r.amountMinor, 0);
    const primaryPayment = completedPayments[0] || null;
    const remainingRefundableMinor = primaryPayment
      ? calculateRemainingRefundable(primaryPayment.amountMinor, primaryPayment.refunds)
      : null;
    const hasActivePendingRefund = pendingRefundMinor > 0;
    const hasCompletedFullRefund =
      primaryPayment !== null && remainingRefundableMinor !== null && remainingRefundableMinor <= 0 && !hasActivePendingRefund;

    if (hasActivePendingRefund || hasCompletedFullRefund) {
      violations.push(
        hasActivePendingRefund
          ? "A refund transaction is already initiated/pending on this order."
          : "This order's captured payment has already been fully refunded."
      );
      requiresHumanEscalation = true;
    }

    if (berrInsufficientBegData) {
      violations.push("Insufficient verified evidence in BEG to evaluate final remedy eligibility.");
    }
    if (buyerEvidenceBlocked) {
      violations.push("Customer submitted evidence failed screening or verification and requires valid upload.");
    }
    if (sellerEvidenceMissing) {
      violations.push("Seller evidence request is still pending response or missing verification.");
    }
    if (unresolvedMissing.length > 0) {
      violations.push(
        `BERR v${latestBerr?.version ?? 1} reports ${unresolvedMissing.length} unresolved MISSING fact(s).`
      );
    }

    // 1. Evaluate Return Window against transaction/delivery date (fallback to caseRecord.createdAt)
    const referenceDate =
      caseRecord.packagePassport?.deliveredAt ||
      caseRecord.orders[0]?.createdAt ||
      caseRecord.purchaseMemory?.purchaseDate ||
      caseRecord.createdAt;
    const returnWindowRule = rules.find((r: ResolutionRule) => r.ruleType === "RETURN_WINDOW");
    if (returnWindowRule) {
      const validation = PolicyValidator.validateRuleConfig(
        "RETURN_WINDOW",
        returnWindowRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as ReturnWindowConfig;
        const daysElapsed =
          (Date.now() - referenceDate.getTime()) / (1000 * 3600 * 24);
        if (daysElapsed > config.maxDays) {
          violations.push(
            `Complaint opened ${Math.round(daysElapsed)} days after reference date, exceeding ${config.maxDays}-day return window.`
          );
        }
      }
    }

    // 2. Evaluate Required Evidence
    const evidenceTypesPresent = new Set<string>(caseRecord.evidence.map((e) => e.evidenceType));
    const requiredEvidenceRule = rules.find((r: ResolutionRule) => r.ruleType === "REQUIRED_EVIDENCE");
    if (requiredEvidenceRule && (caseRecord.evidence.length > 0 || berrInsufficientBegData)) {
      const validation = PolicyValidator.validateRuleConfig(
        "REQUIRED_EVIDENCE",
        requiredEvidenceRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as RequiredEvidenceConfig;
        for (const req of config.requiredTypes) {
          if (!evidenceTypesPresent.has(req)) {
            violations.push(`Required evidence '${req}' is missing from case documentation.`);
          }
        }
      }
    }

    // 3. Evaluate Discrepancy & Human Review threshold (combining legacy berrFindings and BERR v2)
    const humanReviewRule = rules.find((r: ResolutionRule) => r.ruleType === "HUMAN_REVIEW_REQUIRED");
    const hasCriticalContradiction =
      unresolvedContested.length > 0 ||
      caseRecord.berrFindings.some(
        (f) => f.findingType === "CONTRADICTION" && f.severity === "CRITICAL"
      );

    if (humanReviewRule) {
      const validation = PolicyValidator.validateRuleConfig(
        "HUMAN_REVIEW_REQUIRED",
        humanReviewRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as HumanReviewRequiredConfig;
        if (hasCriticalContradiction && config.triggerOnDiscrepancyThreshold <= 0.6) {
          requiresHumanEscalation = true;
          violations.push("Material contradiction between buyer and seller evidence triggers mandatory human review.");
        }
      }
    } else if (hasCriticalContradiction) {
      requiresHumanEscalation = true;
      violations.push("Unresolved CONTESTED finding requires Resolution Manager review.");
    }

    // 4. Evaluate Refund Limit
    const refundLimitRule = rules.find((r: ResolutionRule) => r.ruleType === "REFUND_LIMIT");
    let maxRefundAllowedMinor = remainingRefundableMinor ?? caseRecord.amountMinor;
    if (refundLimitRule) {
      const validation = PolicyValidator.validateRuleConfig(
        "REFUND_LIMIT",
        refundLimitRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as RefundLimitConfig;
        if (caseRecord.amountMinor > config.maxAmountMinor) {
          maxRefundAllowedMinor = Math.min(maxRefundAllowedMinor, config.maxAmountMinor);
          violations.push(
            `Disputed amount exceeds automated refund ceiling ($${(config.maxAmountMinor / 100).toFixed(2)}).`
          );
          requiresHumanEscalation = true;
        }
      }
    }

    // 5. Evaluate Remedy Eligibility Rule & Marketplace constraints
    const remedyEligibilityRule = rules.find((r: ResolutionRule) => r.ruleType === "REMEDY_ELIGIBILITY");
    let allowedRemedies: Array<CandidateResolutionOption["proposalType"]> = [
      "FULL_REFUND",
      "PARTIAL_REFUND",
      "REPLACEMENT",
      "RETURN_AND_REFUND",
      "INFORMATION_REQUEST",
      "HUMAN_REVIEW",
    ];

    if (remedyEligibilityRule) {
      const validation = PolicyValidator.validateRuleConfig(
        "REMEDY_ELIGIBILITY",
        remedyEligibilityRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as RemedyEligibilityConfig;
        allowedRemedies = config.eligibleRemedies;
      }
    }

    const buyerClaim = caseRecord.claims.find((c) => c.partyRole === "BUYER");
    const requestedRemedy = buyerClaim?.requestedRemedy || null;
    const marketplace = caseRecord.purchaseMemory?.marketplace || null;
    const hasCapturedGatewayPayment = completedPayments.length > 0;
    const requiresMarketplaceOrManualSettlement =
      Boolean(marketplace && !["DIRECT", "PAYPAL"].includes(marketplace.toUpperCase())) &&
      !hasCapturedGatewayPayment;

    const evidenceReadyForFinancialRemedy =
      !berrInsufficientBegData &&
      !buyerEvidenceBlocked &&
      !sellerEvidenceMissing &&
      unresolvedMissing.length === 0 &&
      !hasActivePendingRefund &&
      !hasCompletedFullRefund;

    const candidateOptions: CandidateResolutionOption[] = [];
    const findingTitles = [
      ...latestBerrFindings.map((f) => `[${f.classification}] ${f.claim}`),
      ...caseRecord.berrFindings.map((f) => f.title),
    ];

    // Option: Information Request (if evidence insufficient, missing, or buyer/seller gaps)
    if (
      berrInsufficientBegData ||
      buyerEvidenceBlocked ||
      sellerEvidenceMissing ||
      unresolvedMissing.length > 0 ||
      violations.some((v) => v.includes("missing"))
    ) {
      candidateOptions.push({
        proposalType: "INFORMATION_REQUEST",
        title: "Bilateral Evidence Request",
        currency: caseRecord.currency,
        isEligible: !hasActivePendingRefund && !hasCompletedFullRefund,
        requiresEscalation: false,
        policyId: policy?.id,
        policyVersion,
        reason: sellerEvidenceMissing
          ? "Seller response/evidence is still missing before a final remedy can be authorized."
          : buyerEvidenceBlocked
          ? "Buyer uploaded evidence did not pass verification and requires valid documentation."
          : "Core fulfillment or verification evidence in BEG is incomplete.",
        justificationNotes: violations.filter(
          (v) =>
            v.includes("missing") ||
            v.includes("Insufficient") ||
            v.includes("pending") ||
            v.includes("verification")
        ),
        groundingFindings: findingTitles,
      });
    }

    // Option: Full Refund
    if (allowedRemedies.includes("FULL_REFUND")) {
      const fullRefundEligible =
        evidenceReadyForFinancialRemedy &&
        !hasCriticalContradiction &&
        !requiresHumanEscalation &&
        maxRefundAllowedMinor >= caseRecord.amountMinor;
      candidateOptions.push({
        proposalType: "FULL_REFUND",
        title: "Full Refund of Disputed Amount",
        recommendedAmountMinor: Math.min(caseRecord.amountMinor, maxRefundAllowedMinor),
        currency: caseRecord.currency,
        isEligible: fullRefundEligible,
        requiresEscalation: hasCriticalContradiction || requiresHumanEscalation,
        policyId: policy?.id,
        policyVersion,
        reason: fullRefundEligible
          ? "Verified bilateral evidence supports full monetary refund subject to human authorization."
          : hasActivePendingRefund || hasCompletedFullRefund
          ? "Full refund blocked: an active or completed refund already exists for this payment."
          : "Full refund is not eligible until missing/contested findings and policy checks clear.",
        justificationNotes: fullRefundEligible
          ? ["All evidence verification and balance safeguards satisfied."]
          : violations,
        groundingFindings: findingTitles,
      });
    }

    // Option: Partial Refund
    if (allowedRemedies.includes("PARTIAL_REFUND")) {
      const partialEligible =
        evidenceReadyForFinancialRemedy &&
        !hasCriticalContradiction &&
        caseRecord.amountMinor > 0;
      candidateOptions.push({
        proposalType: "PARTIAL_REFUND",
        title: "Partial Settlement Refund",
        recommendedAmountMinor: Math.min(Math.round(caseRecord.amountMinor / 2), maxRefundAllowedMinor),
        currency: caseRecord.currency,
        isEligible: partialEligible,
        requiresEscalation: hasCriticalContradiction || requiresHumanEscalation,
        policyId: policy?.id,
        policyVersion,
        reason: partialEligible
          ? "Proportional settlement supported by verified order amount and case policy."
          : "Partial settlement cannot proceed while evidence is missing, blocked, contested, or refund is active.",
        justificationNotes: partialEligible
          ? ["Requires explicit authorization before execution."]
          : violations,
        groundingFindings: findingTitles,
      });
    }

    // Option: Return and Full Refund
    if (allowedRemedies.includes("RETURN_AND_REFUND")) {
      const returnRefundEligible =
        evidenceReadyForFinancialRemedy &&
        !hasCriticalContradiction &&
        !requiresHumanEscalation;
      candidateOptions.push({
        proposalType: "RETURN_AND_REFUND",
        title: "Return Item for 100% Refund",
        recommendedAmountMinor: maxRefundAllowedMinor,
        currency: caseRecord.currency,
        isEligible: returnRefundEligible,
        requiresEscalation: requiresHumanEscalation || hasCriticalContradiction,
        policyId: policy?.id,
        policyVersion,
        reason: returnRefundEligible
          ? "Full merchant refund contingent on verified return shipment receipt."
          : "Return-and-refund requires resolved BEG verification and policy compliance.",
        justificationNotes: ["Requires merchant return shipping label and carrier tracking."],
        groundingFindings: findingTitles,
      });
    }

    // Option: Replacement
    if (allowedRemedies.includes("REPLACEMENT")) {
      const categoryAllowsReplacement =
        requestedRemedy === "REPLACEMENT" ||
        ["NOT_AS_DESCRIBED", "DAMAGED_GOODS", "NON_DELIVERY", "OTHER"].includes(caseRecord.category);
      const replacementEligible =
        evidenceReadyForFinancialRemedy &&
        !hasCriticalContradiction &&
        categoryAllowsReplacement;

      candidateOptions.push({
        proposalType: "REPLACEMENT",
        title: "Authorized Replacement Fulfillment",
        currency: caseRecord.currency,
        isEligible: replacementEligible,
        requiresEscalation: hasCriticalContradiction || requiresHumanEscalation,
        policyId: policy?.id,
        policyVersion,
        reason: replacementEligible
          ? "Evidence supports verified replacement unit dispatch tracked to delivery confirmation."
          : "Replacement is not eligible until missing/conflicting evidence or active refund checks clear.",
        justificationNotes: replacementEligible
          ? ["Requires authorized seller confirmation, PackagePassport dispatch tracking, and delivery confirmation."]
          : violations,
        groundingFindings: findingTitles,
      });
    }

    // Option: Human Review Escalation
    if (
      requiresHumanEscalation ||
      hasCriticalContradiction ||
      hasActivePendingRefund ||
      hasCompletedFullRefund ||
      violations.length > 0
    ) {
      candidateOptions.push({
        proposalType: "HUMAN_REVIEW",
        title: "Escalate to Resolution Manager",
        currency: caseRecord.currency,
        isEligible: true,
        requiresEscalation: true,
        policyId: policy?.id,
        policyVersion,
        reason: "Case constraints, contradictions, or existing payment/refund activity require Resolution Manager review.",
        justificationNotes: violations,
        groundingFindings: findingTitles,
      });
    }

    // Ensure at least one fallback option exists
    if (candidateOptions.length === 0) {
      candidateOptions.push({
        proposalType: "HUMAN_REVIEW",
        title: "Investigator Assessment Review",
        currency: caseRecord.currency,
        isEligible: true,
        requiresEscalation: true,
        policyId: policy?.id,
        policyVersion,
        reason: "No automated remedy selected; route to Resolution Manager for authorization decision.",
        justificationNotes: [],
        groundingFindings: findingTitles,
      });
    }

    // Select primary recommendation aligned with BERR, Policy, and Customer Requested Remedy
    let recommended: CandidateResolutionOption | undefined;
    if (hasActivePendingRefund || hasCompletedFullRefund || hasCriticalContradiction || requiresHumanEscalation) {
      recommended =
        candidateOptions.find((o) => o.proposalType === "HUMAN_REVIEW") ||
        candidateOptions.find((o) => o.proposalType === "INFORMATION_REQUEST");
    } else if (!evidenceReadyForFinancialRemedy) {
      recommended =
        candidateOptions.find((o) => o.proposalType === "INFORMATION_REQUEST") ||
        candidateOptions.find((o) => o.proposalType === "HUMAN_REVIEW");
    } else if (requestedRemedy === "REPLACEMENT") {
      recommended =
        candidateOptions.find((o) => o.proposalType === "REPLACEMENT" && o.isEligible) ||
        candidateOptions.find((o) => o.isEligible);
    } else if (requestedRemedy === "RETURN_FOR_REFUND") {
      recommended =
        candidateOptions.find((o) => o.proposalType === "RETURN_AND_REFUND" && o.isEligible) ||
        candidateOptions.find((o) => o.proposalType === "FULL_REFUND" && o.isEligible) ||
        candidateOptions.find((o) => o.isEligible);
    } else if (requestedRemedy === "PARTIAL_REFUND") {
      recommended =
        candidateOptions.find((o) => o.proposalType === "PARTIAL_REFUND" && o.isEligible) ||
        candidateOptions.find((o) => o.isEligible);
    } else {
      recommended =
        candidateOptions.find((o) => o.proposalType === "FULL_REFUND" && o.isEligible) ||
        candidateOptions.find((o) => o.proposalType === "REPLACEMENT" && o.isEligible) ||
        candidateOptions.find((o) => o.proposalType === "PARTIAL_REFUND" && o.isEligible) ||
        candidateOptions[0];
    }

    if (!recommended) {
      recommended = candidateOptions[0];
    }

    return {
      caseId: caseRecord.id,
      policyName,
      policyVersion,
      isCompliant: violations.length === 0,
      violations,
      candidateOptions,
      recommendedOption: recommended,
      berrSummary: {
        assessmentId: latestBerr?.id || null,
        version: latestBerr?.version ?? null,
        overallStatus: latestBerr?.overallStatus || null,
        status: latestBerr?.status || null,
        isStale: Boolean(latestBerr?.isStale),
        hasUnresolvedConflicts: hasCriticalContradiction,
        hasMissingEvidence: unresolvedMissing.length > 0,
        buyerEvidenceBlocked,
        sellerEvidenceMissing,
      },
      activeRefund: {
        hasCompletedFullRefund,
        hasActivePendingRefund,
        completedRefundMinor,
        pendingRefundMinor,
        remainingRefundableMinor,
      },
      marketplaceContext: {
        marketplace,
        hasCapturedGatewayPayment,
        requiresMarketplaceOrManualSettlement,
      },
      requiresAuthorization: true,
    };
  }
}
