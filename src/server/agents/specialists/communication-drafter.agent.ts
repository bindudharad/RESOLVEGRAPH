/**
 * Communication Drafter Specialist Agent
 * 
 * Drafts objective, evidence-grounded communications for buyers or merchants.
 * Never dispatches messages autonomously. All outputs remain draft artifacts
 * requiring explicit operator action to send.
 */

import { AgentExecutionContext, DraftMessageResult } from '../types/agent.types';
import { ToolRegistry } from '../tools/tool-registry';

export class CommunicationDrafterAgent {
  public static readonly ROLE = 'CommunicationDrafterAgent';

  public static async execute(
    ctx: AgentExecutionContext,
    stepId?: string,
    recipientRole: 'BUYER' | 'MERCHANT' = 'BUYER'
  ): Promise<DraftMessageResult> {
    if (!ctx.caseId) {
      throw new Error('[CommunicationDrafterAgent] caseId is required.');
    }

    const registry = ToolRegistry.getInstance();

    // 1. Fetch case summary, claims, and findings for grounding
    const [summaryRes, findingsRes, evidenceRes] = await Promise.all([
      registry.executeTool('get_case_summary', { caseId: ctx.caseId }, ctx, stepId),
      registry.executeTool('get_case_findings', { caseId: ctx.caseId }, ctx, stepId),
      registry.executeTool('get_case_evidence_metadata', { caseId: ctx.caseId }, ctx, stepId)
    ]);

    interface CaseSummaryInfo {
      caseNumber?: string;
      title?: string;
      status?: string;
      stage?: string;
      category?: string;
      disputeAmountCents?: number;
      currency?: string;
      buyer?: { fullName?: string };
    }
    interface FindingsInfo {
      findings?: unknown[];
    }
    interface EvidenceMetadataItem {
      id: string;
    }

    const caseSummary = (summaryRes.data as CaseSummaryInfo) || {};
    const findings = (findingsRes.data as FindingsInfo) || {};
    const evidenceList = (evidenceRes.data as EvidenceMetadataItem[]) || [];

    const caseNumber = caseSummary.caseNumber || 'RG-CASE';
    const caseTitle = caseSummary.title || 'Purchase Dispute';

    // Collect valid evidence IDs for citations
    const citations = evidenceList.map((e) => e.id);

    let subject = '';
    let body = '';

    if (recipientRole === 'BUYER') {
      subject = `Update regarding your dispute #${caseNumber}: ${caseTitle}`;
      body = [
        `Dear ${caseSummary?.buyer?.fullName || 'Customer'},`,
        '',
        `We are actively investigating your case (${caseNumber}). Our objective evidence review has cross-referenced your submitted claims against the merchant's fulfillment records.`,
        '',
        `Status: ${caseSummary?.status}`,
        `Current Stage: ${caseSummary?.stage}`,
        '',
        (findings?.findings && findings.findings.length > 0)
          ? `Our verification engine noted ${findings.findings.length} key reconciliation points under active review.`
          : 'All submitted documentation has been indexed for bilateral resolution.',
        '',
        'A proposed resolution will be presented in your case portal shortly. You will have full opportunity to review and accept the terms.',
        '',
        'Sincerely,',
        'ResolveGraph Case Resolution Team'
      ].join('\n');

      await registry.executeTool(
        'create_draft_buyer_message',
        {
          caseId: ctx.caseId,
          subject,
          body,
          factualCitations: citations
        },
        ctx,
        stepId
      );
    } else {
      subject = `Action Required: Investigation Update on Dispute #${caseNumber}`;
      body = [
        `Merchant Resolution Advisory for #${caseNumber} (${caseTitle}):`,
        '',
        `Category: ${caseSummary?.category}`,
        `Disputed Amount: $${((caseSummary?.disputeAmountCents || 0) / 100).toFixed(2)} ${caseSummary?.currency || 'USD'}`,
        '',
        `Evidence items logged: ${evidenceList.length}`,
        `BERR Findings logged: ${findings?.findings?.length || 0}`,
        '',
        'Recommended Next Steps: Review the draft resolution proposal in your merchant portal and confirm settlement terms.',
        '',
        'ResolveGraph AI Copilot'
      ].join('\n');

      await registry.executeTool(
        'create_draft_merchant_message',
        {
          caseId: ctx.caseId,
          subject,
          body,
          factualCitations: citations
        },
        ctx,
        stepId
      );
    }

    return {
      recipient: recipientRole,
      subject,
      body,
      factualGroundingCitations: citations,
      disclaimer: 'Draft communication only. Operator action required for dispatch.'
    };
  }
}
