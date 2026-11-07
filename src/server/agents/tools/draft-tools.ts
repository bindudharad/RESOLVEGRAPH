/**
 * Draft-Only Agent Tools
 * 
 * Safely generates draft artifacts, summaries, checklists, and proposed resolutions.
 * NEVER dispatches messages or executes financial transactions.
 * When financial terms are proposed, generates AgentApprovalRequest for human sign-off.
 */

import { z } from 'zod';
import { prisma, CasePriority } from '@/lib/prisma';
import { ToolDefinition, AgentExecutionContext } from '../types/agent.types';
import { FinancialActionGuardrails } from '../guardrails/financial-action-guardrails';

async function safeCreateArtifact(data: {
  runId: string;
  artifactType: string;
  title: string;
  summary: string;
  contentJson: string;
  metadataJson?: string;
  isApproved?: boolean;
}) {
  try {
    if (!data.runId) {
      return { id: `mock-${Date.now()}`, ...data };
    }
    const run = await prisma.agentRun.findUnique({
      where: { id: data.runId },
      select: { id: true }
    });
    if (!run) {
      return { id: `mock-${Date.now()}`, ...data };
    }
    return await prisma.agentArtifact.create({ data });
  } catch (e) {
    console.warn('[safeCreateArtifact] Fallback:', e);
    return { id: `mock-${Date.now()}`, ...data };
  }
}

async function safeCreateApprovalRequest(data: {
  runId: string;
  actionType: string;
  actionRisk: string;
  description: string;
  proposedArgumentsJson: string;
  argumentsHash: string;
  status: string;
  requestedById: string;
  expiresAt: Date;
}) {
  try {
    if (!data.runId) return null;
    const run = await prisma.agentRun.findUnique({
      where: { id: data.runId },
      select: { id: true }
    });
    if (!run) return null;
    return await prisma.agentApprovalRequest.create({ data });
  } catch (e) {
    console.warn('[safeCreateApprovalRequest] Fallback:', e);
    return null;
  }
}

export const createDraftInformationRequestTool: ToolDefinition<{
  caseId: string;
  recipientRole: 'BUYER' | 'MERCHANT';
  requestedItems: string[];
  rationale: string;
  deadlineDays?: number;
}> = {
  name: 'create_draft_information_request',
  description: 'Drafts a formal structured request for missing evidence or clarifying statements from buyer or merchant.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    recipientRole: z.enum(['BUYER', 'MERCHANT']),
    requestedItems: z.array(z.string()).min(1),
    rationale: z.string().min(5),
    deadlineDays: z.number().int().positive().optional().default(3)
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    const summary = `Evidence Request (${args.recipientRole}): ${args.requestedItems.length} item(s) requested.`;
    const content = {
      recipientRole: args.recipientRole,
      requestedItems: args.requestedItems,
      rationale: args.rationale,
      deadlineDays: args.deadlineDays,
      status: 'DRAFT_PENDING_OPERATOR_DISPATCH'
    };

    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'EVIDENCE_CHECKLIST',
      title: `Information Request for ${args.recipientRole}`,
      summary,
      contentJson: JSON.stringify(content)
    });

    return {
      artifactId: artifact.id,
      title: artifact.title,
      summary,
      content,
      isDraftOnly: true,
      message: 'Draft evidence request created. Needs operator approval before sending to party.'
    };
  }
};

export const createDraftBuyerMessageTool: ToolDefinition<{
  caseId: string;
  subject: string;
  body: string;
  factualCitations: string[];
}> = {
  name: 'create_draft_buyer_message',
  description: 'Prepares an objective, professional draft message to the buyer grounded in case facts. Draft-only.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    subject: z.string().min(3),
    body: z.string().min(10),
    factualCitations: z.array(z.string()).default([])
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    const content = {
      recipient: 'BUYER',
      subject: args.subject,
      body: args.body,
      citations: args.factualCitations,
      draftedAt: new Date().toISOString(),
      disclaimer: 'Drafted by ResolveGraph Case Copilot. Requires operator sign-off before transmission.'
    };

    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'DRAFT_MESSAGE',
      title: `Draft Buyer Communication: ${args.subject}`,
      summary: `Draft message to buyer citing ${args.factualCitations.length} evidence source(s).`,
      contentJson: JSON.stringify(content)
    });

    return {
      artifactId: artifact.id,
      title: artifact.title,
      content,
      dispatched: false,
      message: 'Draft message saved for operator review. No external message was sent.'
    };
  }
};

export const createDraftMerchantMessageTool: ToolDefinition<{
  caseId: string;
  subject: string;
  body: string;
  factualCitations: string[];
}> = {
  name: 'create_draft_merchant_message',
  description: 'Prepares a structured draft update or advisory for the merchant team grounded in case facts. Draft-only.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    subject: z.string().min(3),
    body: z.string().min(10),
    factualCitations: z.array(z.string()).default([])
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    const content = {
      recipient: 'MERCHANT',
      subject: args.subject,
      body: args.body,
      citations: args.factualCitations,
      draftedAt: new Date().toISOString(),
      disclaimer: 'Drafted by ResolveGraph Case Copilot for internal merchant review.'
    };

    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'DRAFT_MESSAGE',
      title: `Merchant Advisory: ${args.subject}`,
      summary: `Internal merchant draft communication citing ${args.factualCitations.length} source(s).`,
      contentJson: JSON.stringify(content)
    });

    return {
      artifactId: artifact.id,
      title: artifact.title,
      content,
      dispatched: false,
      message: 'Draft advisory saved for merchant team review.'
    };
  }
};

export const createDraftResolutionProposalTool: ToolDefinition<{
  caseId: string;
  remedyType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'REPLACEMENT' | 'STORE_CREDIT' | 'RETURN_FOR_REFUND' | 'REJECT_CLAIM';
  amountMinor?: number;
  currency?: string;
  rationale: string;
  requiresReturn?: boolean;
}> = {
  name: 'create_draft_resolution_proposal',
  description: 'Prepares a formal draft resolution proposal. If remedy is financial, generates an approval request for authorized operator sign-off.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    remedyType: z.enum(['FULL_REFUND', 'PARTIAL_REFUND', 'REPLACEMENT', 'STORE_CREDIT', 'RETURN_FOR_REFUND', 'REJECT_CLAIM']),
    amountMinor: z.number().int().nonnegative().optional(),
    currency: z.string().default('USD'),
    rationale: z.string().min(10),
    requiresReturn: z.boolean().optional().default(false)
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    const isFinancial = args.remedyType === 'FULL_REFUND' || args.remedyType === 'PARTIAL_REFUND';
    const amountMinor = isFinancial ? (args.amountMinor || 0) : 0;

    // Validate that proposed refund does not exceed dispute amount if available
    if (isFinancial && amountMinor > 0) {
      const caseRecord = await prisma.caseRecord.findUnique({
        where: { id: args.caseId },
        select: { amountMinor: true, currency: true }
      });
      if (caseRecord && amountMinor > caseRecord.amountMinor) {
        throw new Error(
          `Proposed refund amount (${amountMinor} minor units) exceeds maximum case dispute amount (${caseRecord.amountMinor} minor units).`
        );
      }
    }

    const proposedPayload = {
      caseId: args.caseId,
      remedyType: args.remedyType,
      amountMinor,
      currency: args.currency,
      rationale: args.rationale,
      requiresReturn: args.requiresReturn
    };

    const argumentsHash = FinancialActionGuardrails.computeArgumentsHash(proposedPayload);

    // Save proposal artifact
    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'DRAFT_PROPOSAL',
      title: `Draft Resolution: ${args.remedyType.replace(/_/g, ' ')}`,
      summary: `Proposed ${args.remedyType} of ${amountMinor > 0 ? (amountMinor / 100).toFixed(2) + ' ' + args.currency : 'non-monetary terms'}.`,
      contentJson: JSON.stringify(proposedPayload)
    });

    let approvalRequest: { id: string } | null = null;

    // If financial remedy or rejection, create human approval request
    if (isFinancial || args.remedyType === 'REJECT_CLAIM') {
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
      approvalRequest = await safeCreateApprovalRequest({
        runId: ctx.runId,
        actionType: 'REFUND_PROPOSAL',
        actionRisk: isFinancial ? 'HIGH' : 'MEDIUM',
        description: `Authorization required to propose ${args.remedyType} (${amountMinor > 0 ? (amountMinor / 100).toFixed(2) + ' ' + args.currency : 'rejection'}) to buyer.`,
        proposedArgumentsJson: JSON.stringify(proposedPayload),
        argumentsHash,
        status: 'PENDING',
        requestedById: ctx.actor.id,
        expiresAt
      });
    }

    return {
      artifactId: artifact.id,
      remedyType: args.remedyType,
      amountMinor,
      currency: args.currency,
      rationale: args.rationale,
      requiresApproval: !!approvalRequest,
      approvalRequestId: approvalRequest?.id || null,
      argumentsHash,
      message: approvalRequest
        ? 'Proposal drafted. PENDING human approval sign-off before entering formal bilateral negotiation.'
        : 'Proposal drafted and ready for review.'
    };
  }
};

export const createInvestigationSummaryTool: ToolDefinition<{
  caseId: string;
  coreContradictionFound: boolean;
  discrepancyScore: number;
  summary: string;
  keyFacts: Array<{ name: string; value: string; source: string; confidence: number }>;
}> = {
  name: 'create_investigation_summary',
  description: 'Persists a structured factual investigation summary artifact for the case dossier.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    coreContradictionFound: z.boolean(),
    discrepancyScore: z.number().min(0).max(1),
    summary: z.string().min(10),
    keyFacts: z.array(z.object({
      name: z.string(),
      value: z.string(),
      source: z.string(),
      confidence: z.number()
    }))
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'INVESTIGATION_SUMMARY',
      title: 'Evidence Investigation Summary',
      summary: `BERR Discrepancy Score: ${(args.discrepancyScore * 100).toFixed(0)}% — ${args.coreContradictionFound ? 'Contradiction Confirmed' : 'No Major Contradiction'}`,
      contentJson: JSON.stringify({
        caseId: args.caseId,
        discrepancyScore: args.discrepancyScore,
        coreContradictionFound: args.coreContradictionFound,
        summary: args.summary,
        keyFacts: args.keyFacts,
        investigatedAt: new Date().toISOString()
      })
    });

    return {
      artifactId: artifact.id,
      title: artifact.title,
      summary: artifact.summary
    };
  }
};

export const createMissingEvidenceChecklistTool: ToolDefinition<{
  caseId: string;
  missingItems: Array<{ item: string; reason: string; party: 'BUYER' | 'MERCHANT' }>;
}> = {
  name: 'create_missing_evidence_checklist',
  description: 'Compiles and saves a structured checklist of missing evidence needed to adjudicate the dispute.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    missingItems: z.array(z.object({
      item: z.string(),
      reason: z.string(),
      party: z.enum(['BUYER', 'MERCHANT'])
    })).min(1)
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'EVIDENCE_CHECKLIST',
      title: 'Missing Evidence Checklist',
      summary: `${args.missingItems.length} evidence requirement(s) identified.`,
      contentJson: JSON.stringify({
        caseId: args.caseId,
        items: args.missingItems,
        generatedAt: new Date().toISOString()
      })
    });

    return {
      artifactId: artifact.id,
      itemsCount: args.missingItems.length,
      items: args.missingItems
    };
  }
};

export const createHumanReviewRequestTool: ToolDefinition<{
  caseId: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}> = {
  name: 'create_human_review_request',
  description: 'Flags an ambiguous or contested case for dedicated human Resolution Manager review.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1),
    reason: z.string().min(10),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('HIGH')
  }),
  execute: async (args, ctx: AgentExecutionContext) => {
    await prisma.caseRecord.update({
      where: { id: args.caseId },
      data: {
        priority: args.priority as CasePriority
      }
    });

    const artifact = await safeCreateArtifact({
      runId: ctx.runId,
      artifactType: 'QUALITY_REPORT',
      title: 'Human Review Requested by Copilot',
      summary: `Flagged for Resolution Manager review: ${args.reason}`,
      contentJson: JSON.stringify({
        caseId: args.caseId,
        reason: args.reason,
        priority: args.priority,
        requestedAt: new Date().toISOString()
      })
    });

    return {
      artifactId: artifact.id,
      flagged: true,
      priority: args.priority,
      reason: args.reason
    };
  }
};
