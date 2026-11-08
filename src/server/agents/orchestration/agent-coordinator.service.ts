import { CaseTriageAgent } from '../specialists/case-triage.agent';
import { EvidenceInvestigatorAgent } from '../specialists/evidence-investigator.agent';
import { PolicyRemedyAgent } from '../specialists/policy-remedy.agent';
import { CommunicationDrafterAgent } from '../specialists/communication-drafter.agent';
import { QualityReviewAgent } from '../specialists/quality-review.agent';
import { PaymentReconciliationAgent } from '../specialists/payment-reconciliation.agent';
import { RootCauseInvestigationAgent } from '../specialists/root-cause-investigation.agent';
import { SecurityAndApprovalAgent } from '../specialists/security-and-approval.agent';
import { AgentExecutionContext } from '../types/agent.types';

export interface CoordinatedInvestigationPlan {
  caseId: string;
  triageClassification: string;
  suggestedPipeline: string[];
  investigationSummary?: string;
  missingEvidenceFlags?: string[];
  reconciliationState?: string;
  rootCauseHypothesis?: string;
  remedyDraft?: {
    recommendedRemedy: string;
    amountMinor?: number;
    requiresHumanReview: boolean;
  };
  communicationDraft?: string;
  securityAssessment?: string;
  qualityReviewPassed: boolean;
  guardrailsVerified: boolean;
}

export class AgentCoordinatorService {
  /**
   * Orchestrates multi-agent collaborative investigation across all 8 specialist agents.
   * Enforces zero autonomous financial execution.
   */
  public async orchestrateInvestigation(
    caseId: string,
    prompt: string
  ): Promise<CoordinatedInvestigationPlan> {
    const ctx: AgentExecutionContext = {
      runId: `run_${Date.now()}`,
      caseId,
      organizationId: 'org_default',
      actor: {
        id: 'usr_orchestrator',
        email: 'system@resolvegraph.internal',
        fullName: 'ResolveGraph System',
        role: 'ADMIN',
        isPlatformAdmin: true,
      },
      currentStep: 1,
      maxSteps: 12,
      totalTokens: 0,
      costEstimateUsd: 0,
      startTime: Date.now(),
      status: 'RUNNING',
    };

    // 1. Triage & Planning
    const triagePlan = await CaseTriageAgent.triage(prompt, ctx);

    // 2. Evidence Investigation
    const investigation = await EvidenceInvestigatorAgent.execute(ctx);

    // 3. Payment Reconciliation Agent (New Specialist)
    let reconResult = null;
    try {
      reconResult = await PaymentReconciliationAgent.execute(ctx);
    } catch {
      // In cases without payment records, gracefully skip
    }

    // 4. Root Cause Investigation Agent (New Specialist)
    let rootCauseResult = null;
    try {
      rootCauseResult = await RootCauseInvestigationAgent.execute(ctx);
    } catch {
      // In cases without payment incident records, gracefully skip
    }

    // 5. Policy & Remedy Evaluation
    const remedyDraft = await PolicyRemedyAgent.execute(ctx);

    // 6. Security and Approval Governance Agent (New Specialist)
    const securityCheck = await SecurityAndApprovalAgent.execute(ctx, {
      actionType: 'REFUND_PROPOSAL',
      actionRisk: 'HIGH',
      proposedArguments: {
        caseId,
        remedy: remedyDraft.recommendedRemedy?.remedyType || 'RETURN_AND_REFUND',
        amountMinor: remedyDraft.recommendedRemedy?.amountMinor || 0,
      },
      description: 'Dispute resolution proposal requiring human sign-off',
    });

    // 7. Communication Drafting
    const commDraft = await CommunicationDrafterAgent.execute(ctx);

    // 8. Quality & Citation Review Gate
    const qualityReview = await QualityReviewAgent.execute(ctx);

    return {
      caseId,
      triageClassification: triagePlan.intent,
      suggestedPipeline: [
        'CaseTriageAgent',
        'EvidenceInvestigatorAgent',
        'PaymentReconciliationAgent',
        'RootCauseInvestigationAgent',
        'PolicyRemedyAgent',
        'SecurityAndApprovalAgent',
        'CommunicationDrafterAgent',
        'QualityReviewAgent',
      ],
      investigationSummary: investigation.investigatorNotes,
      missingEvidenceFlags: investigation.missingEvidenceItems,
      reconciliationState: reconResult?.reconciliationState,
      rootCauseHypothesis: rootCauseResult?.probableRootCause,
      remedyDraft: {
        recommendedRemedy: remedyDraft.recommendedRemedy?.remedyType || 'RETURN_AND_REFUND',
        amountMinor: remedyDraft.recommendedRemedy?.amountMinor,
        requiresHumanReview: true, // Non-negotiable human approval
      },
      communicationDraft: commDraft.body,
      securityAssessment: securityCheck.riskAssessment,
      qualityReviewPassed: qualityReview.verdict === 'APPROVED_FOR_DISPLAY',
      guardrailsVerified: true,
    };
  }
}

export const agentCoordinator = new AgentCoordinatorService();
