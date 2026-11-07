/**
 * Evidence Investigator Specialist Agent
 * 
 * Conducts objective forensic examination of case evidence, extracted facts,
 * and BERR contradiction findings without re-running completed extraction pipelines.
 */

import { AgentExecutionContext, InvestigationSummaryResult } from '../types/agent.types';
import { ToolRegistry } from '../tools/tool-registry';

export class EvidenceInvestigatorAgent {
  public static readonly ROLE = 'EvidenceInvestigatorAgent';

  public static async execute(
    ctx: AgentExecutionContext,
    stepId?: string
  ): Promise<InvestigationSummaryResult> {
    if (!ctx.caseId) {
      throw new Error('[EvidenceInvestigatorAgent] caseId is required for investigation.');
    }

    const registry = ToolRegistry.getInstance();

    // 1. Fetch claims & findings in parallel
    const [findingsRes, claimsRes, metadataRes] = await Promise.all([
      registry.executeTool('get_case_findings', { caseId: ctx.caseId }, ctx, stepId),
      registry.executeTool('get_case_claims', { caseId: ctx.caseId }, ctx, stepId),
      registry.executeTool('get_case_evidence_metadata', { caseId: ctx.caseId }, ctx, stepId)
    ]);

    interface FactItem {
      name?: string;
      fieldKey?: string;
      factType?: string;
      rawValue?: string;
      normalizedValue?: string;
      sourceExcerpt?: string;
      confidence?: number;
      isSubjective?: boolean;
    }
    interface FindingItem {
      discrepancyScore?: number;
    }
    interface EvidenceItem {
      evidenceType?: string;
      mimeType?: string;
    }

    const findingsData = (findingsRes.data as { facts?: FactItem[]; findings?: FindingItem[] }) || { facts: [], findings: [] };
    const claimsData = (claimsRes.data as unknown[]) || [];
    const metadataData = (metadataRes.data as EvidenceItem[]) || [];

    // 2. Identify key facts and contradictions
    const facts = findingsData.facts || [];
    const berrFindings = findingsData.findings || [];

    const keyFacts = facts.slice(0, 10).map((f) => ({
      name: f.name || f.fieldKey || 'Fact',
      value: String(f.normalizedValue || f.rawValue || ''),
      source: f.sourceExcerpt || 'Case Evidence',
      confidence: f.confidence || 0.9,
      isVerified: !f.isSubjective
    }));

    const coreContradictionFound = berrFindings.some((f) => (f.discrepancyScore || 0) > 0.4);
    const maxDiscrepancy = berrFindings.reduce((max: number, f) => Math.max(max, f.discrepancyScore || 0), 0);

    // 3. Compute missing evidence checklist
    const missingEvidenceItems: string[] = [];
    const hasTracking = facts.some((f) => f.factType === 'TRACKING_NUMBER');
    const hasInvoice = metadataData.some((e) => e.evidenceType === 'INVOICE');
    const hasPhoto = metadataData.some((e) => e.mimeType?.startsWith('image/'));

    if (!hasTracking) {
      missingEvidenceItems.push('Carrier tracking confirmation or proof of delivery');
    }
    if (!hasInvoice) {
      missingEvidenceItems.push('Itemized merchant invoice or order receipt');
    }
    if (!hasPhoto && coreContradictionFound) {
      missingEvidenceItems.push('Photographic evidence of item condition or packaging');
    }

    // 4. Synthesize investigation summary
    const summaryText = coreContradictionFound
      ? `Forensic analysis identified significant discrepancy (score: ${(maxDiscrepancy * 100).toFixed(0)}%) across ${claimsData.length} claim(s) and ${metadataData.length} evidence file(s). Key contradiction detected in BERR findings.`
      : `Forensic analysis complete across ${claimsData.length} claim(s) and ${metadataData.length} evidence file(s). No severe contradiction identified; facts are largely consistent.`;

    // 5. Persist investigation summary tool call
    await registry.executeTool(
      'create_investigation_summary',
      {
        caseId: ctx.caseId,
        coreContradictionFound,
        discrepancyScore: maxDiscrepancy,
        summary: summaryText,
        keyFacts
      },
      ctx,
      stepId
    );

    // If missing items exist, create structured checklist artifact
    if (missingEvidenceItems.length > 0) {
      await registry.executeTool(
        'create_missing_evidence_checklist',
        {
          caseId: ctx.caseId,
          missingItems: missingEvidenceItems.map(item => ({
            item,
            reason: 'Essential to corroborate party assertions under bilateral evidence rules.',
            party: item.includes('tracking') ? 'MERCHANT' : 'BUYER'
          }))
        },
        ctx,
        stepId
      );
    }

    return {
      caseId: ctx.caseId,
      coreContradictionFound,
      discrepancyScore: maxDiscrepancy,
      keyFacts,
      missingEvidenceItems,
      investigatorNotes: summaryText
    };
  }
}
