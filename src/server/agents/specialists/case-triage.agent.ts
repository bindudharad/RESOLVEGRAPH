/**
 * Case Triage Specialist Agent
 * 
 * Analyzes user prompts and case context.
 * Identifies intent, assesses dispute urgency, and formulates an orchestrated step plan.
 */

import { AgentExecutionContext, TriageResult, AgentStepPlan } from '../types/agent.types';
import { ToolRegistry } from '../tools/tool-registry';
import { InputGuardrails } from '../guardrails/input-guardrails';

interface CaseSummaryData {
  caseNumber?: string;
  title?: string;
  status?: string;
  priority?: string;
  amountMinor?: number;
  disputeAmountCents?: number;
}

export class CaseTriageAgent {
  public static readonly ROLE = 'CaseTriageAgent';

  public static async triage(
    prompt: string,
    ctx: AgentExecutionContext
  ): Promise<TriageResult> {
    const registry = ToolRegistry.getInstance();
    const sanitized = InputGuardrails.sanitizeInput(prompt);

    // 1. Gather initial context if caseId is present
    let caseSummary: CaseSummaryData | null = null;
    if (ctx.caseId) {
      const summaryResult = await registry.executeTool('get_case_summary', { caseId: ctx.caseId }, ctx);
      if (summaryResult.status === 'SUCCEEDED' && summaryResult.data) {
        caseSummary = summaryResult.data as CaseSummaryData;
      }
    }

    const lowerPrompt = sanitized.sanitizedText.toLowerCase();

    // 2. Classify intent
    let intent = 'GENERAL_ASSIST';
    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';

    if (lowerPrompt.includes('payment') || lowerPrompt.includes('what happened') || lowerPrompt.includes('capture')) {
      intent = 'INVESTIGATE_PAYMENT';
    } else if (lowerPrompt.includes('discrepan') || lowerPrompt.includes('investigat') || lowerPrompt.includes('contradict') || lowerPrompt.includes('evidence')) {
      intent = 'INVESTIGATE_DISCREPANCIES';
    } else if (lowerPrompt.includes('policy') || lowerPrompt.includes('remedy') || lowerPrompt.includes('refund') || lowerPrompt.includes('settle')) {
      intent = 'EVALUATE_POLICY';
    } else if (lowerPrompt.includes('draft') || lowerPrompt.includes('message') || lowerPrompt.includes('email') || lowerPrompt.includes('write')) {
      intent = 'DRAFT_COMMUNICATION';
    } else if (lowerPrompt.includes('dispute') || lowerPrompt.includes('paypal') || lowerPrompt.includes('chargeback') || lowerPrompt.includes('dossier')) {
      intent = 'PREPARE_DISPUTE_DOSSIER';
    }

    if (caseSummary) {
      const amount = caseSummary.disputeAmountCents ?? caseSummary.amountMinor ?? 0;
      if (caseSummary.priority === 'URGENT' || amount > 100000) {
        urgency = 'HIGH';
      }
    }

    // 3. Formulate Specialist Step Plan
    const plan: AgentStepPlan[] = [];

    switch (intent) {
      case 'INVESTIGATE_PAYMENT':
        plan.push({
          stepNumber: 1,
          agentName: 'PaymentInvestigationAgent',
          goal: 'Investigate cross-source payment records, PayPal captures, cancellation evidence, and BERR findings.',
          toolNames: [
            'get_case_details',
            'get_canonical_transaction',
            'get_paypal_capture',
            'search_related_transactions',
            'run_berr_investigation',
            'prepare_refund_proposal'
          ]
        });
        plan.push({
          stepNumber: 2,
          agentName: 'PolicyRemedyAgent',
          goal: 'Evaluate merchant policies, compute remedy eligibility, and prepare draft proposal.',
          toolNames: ['get_applicable_policy', 'create_draft_resolution_proposal']
        });
        plan.push({
          stepNumber: 3,
          agentName: 'QualityReviewAgent',
          goal: 'Verify policy bounds, financial constraints, and check human approval requirements.',
          toolNames: ['validate_policy_conditions', 'validate_agent_result']
        });
        break;

      case 'INVESTIGATE_DISCREPANCIES':
        plan.push({
          stepNumber: 1,
          agentName: 'EvidenceInvestigatorAgent',
          goal: 'Investigate bilateral evidence, extracted facts, and BERR contradiction findings.',
          toolNames: ['get_case_claims', 'get_case_findings', 'get_case_graph', 'create_investigation_summary']
        });
        plan.push({
          stepNumber: 2,
          agentName: 'QualityReviewAgent',
          goal: 'Adversarially audit factual findings, evidence grounding, and source citations.',
          toolNames: ['validate_claim_evidence_links', 'validate_source_citations', 'validate_agent_result']
        });
        break;

      case 'EVALUATE_POLICY':
        plan.push({
          stepNumber: 1,
          agentName: 'EvidenceInvestigatorAgent',
          goal: 'Extract core verified facts to evaluate against merchant dispute policies.',
          toolNames: ['get_case_claims', 'get_case_findings']
        });
        plan.push({
          stepNumber: 2,
          agentName: 'PolicyRemedyAgent',
          goal: 'Evaluate merchant policies, compute remedy eligibility, and prepare draft proposal.',
          toolNames: ['get_applicable_policy', 'create_draft_resolution_proposal']
        });
        plan.push({
          stepNumber: 3,
          agentName: 'QualityReviewAgent',
          goal: 'Verify policy bounds, financial constraints, and check human approval requirements.',
          toolNames: ['validate_policy_conditions', 'validate_agent_result']
        });
        break;

      case 'DRAFT_COMMUNICATION':
        plan.push({
          stepNumber: 1,
          agentName: 'EvidenceInvestigatorAgent',
          goal: 'Identify cited evidence and verifiable facts to ground communication.',
          toolNames: ['get_case_findings', 'get_case_claims']
        });
        plan.push({
          stepNumber: 2,
          agentName: 'CommunicationDrafterAgent',
          goal: 'Draft objective, factual message citing verified evidence items.',
          toolNames: ['create_draft_buyer_message', 'create_draft_merchant_message']
        });
        plan.push({
          stepNumber: 3,
          agentName: 'QualityReviewAgent',
          goal: 'Verify citation integrity and confirm no autonomous dispatch occurs.',
          toolNames: ['validate_source_citations', 'validate_agent_result']
        });
        break;

      case 'PREPARE_DISPUTE_DOSSIER':
        plan.push({
          stepNumber: 1,
          agentName: 'EvidenceInvestigatorAgent',
          goal: 'Compile bilateral evidence matrix and identify missing buyer/merchant documentation.',
          toolNames: ['get_case_evidence_metadata', 'get_case_findings', 'create_missing_evidence_checklist']
        });
        plan.push({
          stepNumber: 2,
          agentName: 'PolicyRemedyAgent',
          goal: 'Check PayPal dispute deadlines, terms, and draft remedy strategy.',
          toolNames: ['get_paypal_dispute_status', 'get_applicable_policy']
        });
        plan.push({
          stepNumber: 3,
          agentName: 'QualityReviewAgent',
          goal: 'Perform complete adversarial readiness check before dispute escalation.',
          toolNames: ['validate_claim_evidence_links', 'validate_agent_result']
        });
        break;

      default:
        plan.push({
          stepNumber: 1,
          agentName: 'EvidenceInvestigatorAgent',
          goal: 'Perform holistic case examination and summarize current evidence state.',
          toolNames: ['get_case_summary', 'get_case_findings', 'create_investigation_summary']
        });
        plan.push({
          stepNumber: 2,
          agentName: 'QualityReviewAgent',
          goal: 'Review case health and recommend next steps.',
          toolNames: ['validate_claim_evidence_links', 'validate_agent_result']
        });
        break;
    }

    return {
      intent,
      summary: `Triage complete: classified intent as ${intent} (Urgency: ${urgency}). Formulated ${plan.length}-step specialist plan.`,
      urgency,
      caseSummarySnippet: caseSummary ? `${caseSummary.caseNumber}: ${caseSummary.title} (${caseSummary.status})` : undefined,
      plan
    };
  }
}
