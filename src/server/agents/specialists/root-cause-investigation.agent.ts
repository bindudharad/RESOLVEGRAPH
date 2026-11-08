/**
 * Root Cause Investigation Specialist Agent
 * 
 * Conducts 12-stage forensic investigation across 18 payment incident categories:
 * - Rigorously separates VERIFIED_FACT, SOURCE_SUPPORTED_CLAIM, HYPOTHESIS, CONTRADICTION, MISSING_INFORMATION
 * - Evaluates statutory RBI/NPCI turnaround times and next steps
 */

import { AgentExecutionContext } from '../types/agent.types';
import { RootCauseInvestigationService, InvestigationResult } from '../../services/root-cause-investigation.service';

export interface RootCauseAgentResult {
  agentRole: string;
  caseId: string;
  incidentCategory: string;
  primaryProvider: string;
  probableRootCause: string;
  statutoryTatGuidance: string;
  findings: InvestigationResult['findings'];
  summary: InvestigationResult['summary'];
  recommendedNextActions: string[];
}

export class RootCauseInvestigationAgent {
  public static readonly ROLE = 'RootCauseInvestigationAgent';

  public static async execute(
    ctx: AgentExecutionContext
  ): Promise<RootCauseAgentResult> {
    if (!ctx.caseId) {
      throw new Error('[RootCauseInvestigationAgent] caseId is required.');
    }

    const investigation = await RootCauseInvestigationService.investigateCase(ctx.caseId);

    const recommendedNextActions: string[] = [];
    for (const f of investigation.findings) {
      if (f.recommendedAction && !recommendedNextActions.includes(f.recommendedAction)) {
        recommendedNextActions.push(f.recommendedAction);
      }
    }

    if (recommendedNextActions.length === 0) {
      recommendedNextActions.push('Request bilateral merchant/provider confirmation and proceed to Resolution Room.');
    }

    return {
      agentRole: this.ROLE,
      caseId: ctx.caseId,
      incidentCategory: investigation.incident.incidentCategory,
      primaryProvider: investigation.incident.primaryProvider,
      probableRootCause: investigation.incident.rootCauseHypothesis,
      statutoryTatGuidance: investigation.incident.statutoryTatGuidance,
      findings: investigation.findings,
      summary: investigation.summary,
      recommendedNextActions,
    };
  }
}
