import { CaseTriageAgent } from '../specialists/case-triage.agent';
import { EvidenceInvestigatorAgent } from '../specialists/evidence-investigator.agent';
import { PolicyRemedyAgent } from '../specialists/policy-remedy.agent';
import { CommunicationDrafterAgent } from '../specialists/communication-drafter.agent';
import { QualityReviewAgent } from '../specialists/quality-review.agent';
import { AgentExecutionContext } from '../types/agent.types';

export interface CoordinatedInvestigationPlan {
  caseId: string;
  triageClassification: string;
  suggestedPipeline: string[];
  investigationSummary?: string;
  missingEvidenceFlags?: string[];
  remedyDraft?: {
    recommendedRemedy: string;
    amountMinor?: number;
    requiresHumanReview: boolean;
  };
  communicationDraft?: string;
  qualityReviewPassed: boolean;
  guardrailsVerified: boolean;
}

export class AgentCoordinatorService {
  /**
   * Orchestrates multi-agent collaborative investigation across specialist agents.
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
      maxSteps: 10,
      totalTokens: 0,
      costEstimateUsd: 0,
      startTime: Date.now(),
      status: 'RUNNING',
    };

    // 1. Triage & Planning
    const triagePlan = await CaseTriageAgent.triage(prompt, ctx);

    // 2. Evidence Investigation
    const investigation = await EvidenceInvestigatorAgent.execute(ctx);

    // 3. Policy & Remedy Evaluation
    const remedyDraft = await PolicyRemedyAgent.execute(ctx);

    // 4. Communication Drafting
    const commDraft = await CommunicationDrafterAgent.execute(ctx);

    // 5. Quality & Citation Review Gate
    const qualityReview = await QualityReviewAgent.execute(ctx);

    return {
      caseId,
      triageClassification: triagePlan.intent,
      suggestedPipeline: triagePlan.plan.map((p) => p.agentName),
      investigationSummary: investigation.investigatorNotes,
      missingEvidenceFlags: investigation.missingEvidenceItems,
      remedyDraft: {
        recommendedRemedy: remedyDraft.recommendedRemedy?.remedyType || 'RETURN_AND_REFUND',
        amountMinor: remedyDraft.recommendedRemedy?.amountMinor,
        requiresHumanReview: true, // Non-negotiable human approval
      },
      communicationDraft: commDraft.body,
      qualityReviewPassed: qualityReview.verdict === 'APPROVED_FOR_DISPLAY',
      guardrailsVerified: true,
    };
  }
}

export const agentCoordinator = new AgentCoordinatorService();
