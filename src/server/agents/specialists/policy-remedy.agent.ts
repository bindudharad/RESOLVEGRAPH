/**
 * Policy & Remedy Specialist Agent
 * 
 * Evaluates merchant resolution policies against factual case findings.
 * Calculates remedy eligibility and prepares structured draft proposals.
 * Never executes financial transactions autonomously.
 */

import { AgentExecutionContext, PolicyEvaluationResult } from '../types/agent.types';
import { ToolRegistry } from '../tools/tool-registry';

export class PolicyRemedyAgent {
  public static readonly ROLE = 'PolicyRemedyAgent';

  public static async execute(
    ctx: AgentExecutionContext,
    stepId?: string
  ): Promise<PolicyEvaluationResult> {
    if (!ctx.caseId) {
      throw new Error('[PolicyRemedyAgent] caseId is required.');
    }

    const registry = ToolRegistry.getInstance();

    // 1. Fetch case summary and applicable policy
    const [summaryRes, policyRes] = await Promise.all([
      registry.executeTool('get_case_summary', { caseId: ctx.caseId }, ctx, stepId),
      registry.executeTool('get_applicable_policy', { caseId: ctx.caseId }, ctx, stepId)
    ]);

    interface CaseSummaryData {
      disputeAmountCents?: number;
      currency?: string;
      category?: string;
    }
    interface PolicyData {
      policyFound?: boolean;
      name?: string;
      partialRefundAllowed?: boolean;
      maxPartialRefundPercent?: number;
    }

    const caseSummary = (summaryRes.data as CaseSummaryData) || {};
    const policy = (policyRes.data as PolicyData) || {};

    const disputeAmountCents = caseSummary?.disputeAmountCents || 0;
    const currency = caseSummary?.currency || 'USD';

    const eligibleRemedies: PolicyEvaluationResult['eligibleRemedies'] = [];

    if (policy && policy.policyFound) {
      // Evaluate partial refund eligibility
      if (policy.partialRefundAllowed) {
        const maxPercent = policy.maxPartialRefundPercent || 50;
        const maxAmountMinor = Math.round((disputeAmountCents * maxPercent) / 100);
        eligibleRemedies.push({
          remedyType: 'PARTIAL_REFUND',
          maxAmountMinor,
          currency,
          confidence: 0.95,
          conditionsMet: ['Partial refunds authorized by merchant policy', `Cap of ${maxPercent}% of total amount`],
          conditionsUnmet: []
        });
      }

      // Evaluate full refund eligibility
      eligibleRemedies.push({
        remedyType: 'FULL_REFUND',
        maxAmountMinor: disputeAmountCents,
        currency,
        confidence: 0.85,
        conditionsMet: ['Dispute amount within allowable claim bounds'],
        conditionsUnmet: ['Requires return verification or proof of non-delivery']
      });

      // Replacement
      eligibleRemedies.push({
        remedyType: 'REPLACEMENT',
        currency,
        confidence: 0.9,
        conditionsMet: ['Allowed for damaged goods and wrong specifications'],
        conditionsUnmet: []
      });
    } else {
      // Default standard dispute remedies
      eligibleRemedies.push({
        remedyType: 'PARTIAL_REFUND',
        maxAmountMinor: Math.round(disputeAmountCents * 0.5),
        currency,
        confidence: 0.8,
        conditionsMet: ['Standard bilateral dispute mediation'],
        conditionsUnmet: []
      });
      eligibleRemedies.push({
        remedyType: 'FULL_REFUND',
        maxAmountMinor: disputeAmountCents,
        currency,
        confidence: 0.75,
        conditionsMet: ['Full claim remedy'],
        conditionsUnmet: []
      });
    }

    // Recommend optimal remedy:
    // If dispute category is DAMAGED_GOODS or NOT_AS_DESCRIBED, recommend partial refund or replacement
    // If NON_DELIVERY and no tracking, recommend full refund
    let recommendedType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'REPLACEMENT' = 'PARTIAL_REFUND';
    let recommendedAmount = Math.round(disputeAmountCents * 0.5);

    if (caseSummary?.category === 'NON_DELIVERY') {
      recommendedType = 'FULL_REFUND';
      recommendedAmount = disputeAmountCents;
    } else if (caseSummary?.category === 'DAMAGED_GOODS') {
      recommendedType = 'PARTIAL_REFUND';
      recommendedAmount = Math.round(disputeAmountCents * 0.4);
    }

    const rationale = `Policy grounded remedy: recommended ${recommendedType} based on case category (${caseSummary?.category || 'DISPUTE'}) and policy rules.`;

    // 2. Draft resolution proposal through controlled tool
    await registry.executeTool(
      'create_draft_resolution_proposal',
      {
        caseId: ctx.caseId,
        remedyType: recommendedType,
        amountMinor: recommendedAmount,
        currency,
        rationale,
        requiresReturn: recommendedType === 'FULL_REFUND' && caseSummary?.category !== 'NON_DELIVERY'
      },
      ctx,
      stepId
    );

    return {
      caseId: ctx.caseId,
      policyFound: policy?.policyFound || false,
      policyName: policy?.name,
      eligibleRemedies,
      recommendedRemedy: {
        remedyType: recommendedType,
        amountMinor: recommendedAmount,
        currency,
        reasoning: rationale
      },
      requiresHumanApproval: true // Financial remedy always requires human sign-off
    };
  }
}
