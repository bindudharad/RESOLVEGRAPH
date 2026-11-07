/**
 * RESOLVEGRAPH — Step 5: Resolution Policy Validator
 * Strict Zod schemas validating configuration JSON for resolution rules.
 */

import { z } from "zod";

export const RequiredEvidenceConfigSchema = z.object({
  requiredTypes: z.array(z.string()).min(1),
  condition: z.string().optional(),
});

export const ReturnWindowConfigSchema = z.object({
  maxDays: z.number().int().positive(),
  basis: z.enum(["DELIVERY_DATE", "ORDER_DATE", "PURCHASE_DATE"]).default("DELIVERY_DATE"),
});

export const RefundLimitConfigSchema = z.object({
  maxAmountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3).default("USD"),
  allowOverrideWithApproval: z.boolean().default(true),
});

export const RemedyEligibilityConfigSchema = z.object({
  eligibleRemedies: z
    .array(
      z.enum([
        "REPLACEMENT",
        "FULL_REFUND",
        "PARTIAL_REFUND",
        "RETURN_AND_REFUND",
        "INFORMATION_REQUEST",
        "HUMAN_REVIEW",
      ])
    )
    .min(1),
  conditionOutcome: z.array(z.string()).optional(),
});

export const ApprovalRequiredConfigSchema = z.object({
  roles: z.array(z.string()).min(1),
  thresholdMinor: z.number().int().optional(),
});

export const HumanReviewRequiredConfigSchema = z.object({
  triggerOnDiscrepancyThreshold: z.number().min(0).max(1).default(0.5),
});

export type RequiredEvidenceConfig = z.infer<typeof RequiredEvidenceConfigSchema>;
export type ReturnWindowConfig = z.infer<typeof ReturnWindowConfigSchema>;
export type RefundLimitConfig = z.infer<typeof RefundLimitConfigSchema>;
export type RemedyEligibilityConfig = z.infer<typeof RemedyEligibilityConfigSchema>;
export type ApprovalRequiredConfig = z.infer<typeof ApprovalRequiredConfigSchema>;
export type HumanReviewRequiredConfig = z.infer<typeof HumanReviewRequiredConfigSchema>;

export class PolicyValidator {
  /**
   * Validates configurationJson based on ruleType
   */
  public static validateRuleConfig(ruleType: string, jsonString: string): { isValid: boolean; parsed?: unknown; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      switch (ruleType) {
        case "REQUIRED_EVIDENCE":
          return { isValid: true, parsed: RequiredEvidenceConfigSchema.parse(parsed) };
        case "RETURN_WINDOW":
          return { isValid: true, parsed: ReturnWindowConfigSchema.parse(parsed) };
        case "REFUND_LIMIT":
          return { isValid: true, parsed: RefundLimitConfigSchema.parse(parsed) };
        case "REMEDY_ELIGIBILITY":
          return { isValid: true, parsed: RemedyEligibilityConfigSchema.parse(parsed) };
        case "APPROVAL_REQUIRED":
          return { isValid: true, parsed: ApprovalRequiredConfigSchema.parse(parsed) };
        case "HUMAN_REVIEW_REQUIRED":
          return { isValid: true, parsed: HumanReviewRequiredConfigSchema.parse(parsed) };
        default:
          return { isValid: true, parsed };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { isValid: false, error: msg };
    }
  }
}
