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
}

export class ResolutionEngine {
  /**
   * Evaluates available resolution options for a given dispute case.
   */
  public static async evaluateCase(caseIdOrNumber: string): Promise<PolicyEvaluationResult> {
    const caseRecord = await prisma.caseRecord.findFirst({
      where: {
        OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }],
      },
      include: {
        organization: true,
        claims: true,
        evidence: true,
        berrFindings: true,
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

    // 1. Evaluate Return Window
    const returnWindowRule = rules.find((r: ResolutionRule) => r.ruleType === "RETURN_WINDOW");
    if (returnWindowRule) {
      const validation = PolicyValidator.validateRuleConfig(
        "RETURN_WINDOW",
        returnWindowRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as ReturnWindowConfig;
        const daysElapsed =
          (new Date().getTime() - caseRecord.createdAt.getTime()) / (1000 * 3600 * 24);
        if (daysElapsed > config.maxDays) {
          violations.push(
            `Case opened ${Math.round(daysElapsed)} days after transaction, exceeding ${config.maxDays}-day return window.`
          );
        }
      }
    }

    // 2. Evaluate Required Evidence
    const evidenceTypesPresent = new Set<string>(caseRecord.evidence.map((e) => e.evidenceType));
    const requiredEvidenceRule = rules.find((r: ResolutionRule) => r.ruleType === "REQUIRED_EVIDENCE");
    if (requiredEvidenceRule) {
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

    // 3. Evaluate Discrepancy & Human Review threshold
    const humanReviewRule = rules.find((r: ResolutionRule) => r.ruleType === "HUMAN_REVIEW_REQUIRED");
    const hasCriticalContradiction = caseRecord.berrFindings.some(
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
          violations.push("Critical contradiction triggers mandatory human manager review.");
        }
      }
    } else if (hasCriticalContradiction) {
      requiresHumanEscalation = true;
    }

    // 4. Evaluate Refund Limit
    const refundLimitRule = rules.find((r: ResolutionRule) => r.ruleType === "REFUND_LIMIT");
    let maxRefundAllowedMinor = caseRecord.amountMinor;
    if (refundLimitRule) {
      const validation = PolicyValidator.validateRuleConfig(
        "REFUND_LIMIT",
        refundLimitRule.configurationJson
      );
      if (validation.isValid) {
        const config = validation.parsed as RefundLimitConfig;
        if (caseRecord.amountMinor > config.maxAmountMinor) {
          maxRefundAllowedMinor = config.maxAmountMinor;
          violations.push(
            `Disputed amount exceeds automated refund ceiling ($${(config.maxAmountMinor / 100).toFixed(2)}).`
          );
          requiresHumanEscalation = true;
        }
      }
    }

    // 5. Evaluate Remedy Eligibility Rule
    const remedyEligibilityRule = rules.find((r: ResolutionRule) => r.ruleType === "REMEDY_ELIGIBILITY");
    let allowedRemedies: Array<CandidateResolutionOption["proposalType"]> = [
      "PARTIAL_REFUND",
      "FULL_REFUND",
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

    const candidateOptions: CandidateResolutionOption[] = [];
    const findingTitles = caseRecord.berrFindings.map((f) => f.title);

    // Option: Information Request (if evidence missing)
    if (violations.some((v) => v.includes("missing"))) {
      candidateOptions.push({
        proposalType: "INFORMATION_REQUEST",
        title: "Bilateral Evidence Request",
        currency: caseRecord.currency,
        isEligible: true,
        requiresEscalation: false,
        policyId: policy?.id,
        policyVersion,
        reason: "Core fulfillment or condition evidence is incomplete.",
        justificationNotes: violations.filter((v) => v.includes("missing")),
        groundingFindings: findingTitles,
      });
    }

    // Option: Partial Refund (compromise remedy)
    if (allowedRemedies.includes("PARTIAL_REFUND")) {
      candidateOptions.push({
        proposalType: "PARTIAL_REFUND",
        title: "50% Goodwill Partial Settlement",
        recommendedAmountMinor: Math.round(caseRecord.amountMinor / 2),
        currency: caseRecord.currency,
        isEligible: true,
        requiresEscalation: false,
        policyId: policy?.id,
        policyVersion,
        reason: "Fair split resolution where both parties share partial documentation gaps.",
        justificationNotes: ["Enables rapid bilateral settlement without goods return friction."],
        groundingFindings: findingTitles,
      });
    }

    // Option: Return and Full Refund
    if (allowedRemedies.includes("RETURN_AND_REFUND")) {
      candidateOptions.push({
        proposalType: "RETURN_AND_REFUND",
        title: "Return Item for 100% Refund",
        recommendedAmountMinor: maxRefundAllowedMinor,
        currency: caseRecord.currency,
        isEligible: violations.length === 0,
        requiresEscalation: requiresHumanEscalation,
        policyId: policy?.id,
        policyVersion,
        reason: "Full merchant refund contingent on verified receipt of returned goods.",
        justificationNotes: ["Requires merchant return shipping label and carrier tracking."],
        groundingFindings: findingTitles,
      });
    }

    // Option: Replacement
    if (allowedRemedies.includes("REPLACEMENT")) {
      candidateOptions.push({
        proposalType: "REPLACEMENT",
        title: "Defect Replacement Order",
        currency: caseRecord.currency,
        isEligible: true,
        requiresEscalation: false,
        policyId: policy?.id,
        policyVersion,
        reason: "Merchant ships identical replacement unit under standard warranty.",
        justificationNotes: ["Valid for damaged or defective product complaints."],
        groundingFindings: findingTitles,
      });
    }

    // Option: Human Review Escalation
    if (requiresHumanEscalation || violations.length > 1) {
      candidateOptions.push({
        proposalType: "HUMAN_REVIEW",
        title: "Escalate to Resolution Manager",
        currency: caseRecord.currency,
        isEligible: true,
        requiresEscalation: true,
        policyId: policy?.id,
        policyVersion,
        reason: "Case constraints or contradictions exceed automated settlement criteria.",
        justificationNotes: violations,
        groundingFindings: findingTitles,
      });
    }

    // Select primary recommendation
    let recommended = candidateOptions.find((o) => o.proposalType === "HUMAN_REVIEW");
    if (!requiresHumanEscalation || !recommended) {
      recommended =
        candidateOptions.find((o) => o.proposalType === "INFORMATION_REQUEST") ||
        candidateOptions.find((o) => o.proposalType === "PARTIAL_REFUND") ||
        candidateOptions[0];
    }

    return {
      caseId: caseRecord.id,
      policyName,
      policyVersion,
      isCompliant: violations.length === 0,
      violations,
      candidateOptions,
      recommendedOption: recommended,
    };
  }
}
