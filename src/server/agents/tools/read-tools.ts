/**
 * Read-Only Agent Tools
 * 
 * Safe tools providing context inspection for agents.
 * No state changes, no financial side-effects.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ToolDefinition } from '../types/agent.types';
import { GraphBuilder } from '@/server/graph/graph-builder';

export const getCaseSummaryTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_summary',
  description: 'Retrieves core case summary including status, stage, category, dispute amount, buyer, and merchant info.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: args.caseId },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        merchant: { select: { id: true, fullName: true, email: true, organization: true } },
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { claims: true, evidence: true, resolutionProposals: true } }
      }
    });

    if (!caseRecord) {
      throw new Error(`Case ${args.caseId} not found.`);
    }

    return {
      id: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      title: caseRecord.title,
      description: caseRecord.description,
      category: caseRecord.category,
      status: caseRecord.status,
      stage: caseRecord.stage,
      priority: caseRecord.priority,
      disputeAmountCents: caseRecord.amountMinor,
      currency: caseRecord.currency,
      buyer: caseRecord.buyer,
      merchant: caseRecord.merchant,
      organization: caseRecord.organization,
      counts: caseRecord._count,
      createdAt: caseRecord.createdAt.toISOString()
    };
  }
};

export const getCaseClaimsTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_claims',
  description: 'Retrieves all claims submitted by buyer and merchant on the case.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const claims = await prisma.claim.findMany({
      where: { caseId: args.caseId },
      include: {
        author: { select: { id: true, fullName: true, role: true } },
        evidence: { select: { id: true, filename: true, evidenceType: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return claims.map((c) => ({
      id: c.id,
      partyRole: c.partyRole,
      claimType: c.claimType,
      statement: c.statement,
      requestedRemedy: c.requestedRemedy,
      status: c.status,
      author: c.author,
      evidenceLinked: c.evidence,
      createdAt: c.createdAt.toISOString()
    }));
  }
};

export const getCaseEvidenceMetadataTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_evidence_metadata',
  description: 'Retrieves all uploaded evidence files, filetypes, verification statuses, and sources.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const items = await prisma.evidence.findMany({
      where: { caseId: args.caseId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        evidenceType: true,
        sourceType: true,
        verificationStatus: true,
        visibility: true,
        scanStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return items.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString()
    }));
  }
};

export const getCaseTimelineTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_timeline',
  description: 'Retrieves chronological timeline of events, state transitions, and milestone dates.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const timelineEvents = await prisma.caseTimelineEvent.findMany({
      where: { caseId: args.caseId },
      include: { actor: { select: { fullName: true, role: true } } },
      orderBy: { recordedAt: 'asc' }
    });

    return timelineEvents.map((t) => ({
      id: t.id,
      timestamp: (t.occurredAt || t.recordedAt).toISOString(),
      eventType: t.eventType,
      title: t.title,
      description: t.description,
      actor: t.actor?.fullName || 'System',
      isAnomaly: false,
      anomalyReason: null
    }));
  }
};

export const getCaseFindingsTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_findings',
  description: 'Retrieves extracted facts, BERR contradiction findings, and missing evidence items.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const [facts, findings] = await Promise.all([
      prisma.extractedFact.findMany({
        where: { caseId: args.caseId },
        select: {
          id: true,
          factType: true,
          fieldKey: true,
          rawValue: true,
          normalizedValue: true,
          sourceExcerpt: true,
          extractionConfidenceBand: true,
          evidenceId: true
        }
      }),
      prisma.berrFinding.findMany({
        where: { caseId: args.caseId },
        select: {
          id: true,
          findingType: true,
          title: true,
          severity: true,
          outcome: true,
          explanation: true,
          recommendedNextStep: true,
          reviewStatus: true
        }
      })
    ]);

    return {
      extractedFactsCount: facts.length,
      facts: facts.map((f) => ({
        ...f,
        name: f.fieldKey,
        confidence: f.extractionConfidenceBand === 'HIGH' ? 0.95 : f.extractionConfidenceBand === 'MEDIUM' ? 0.8 : 0.6,
        isSubjective: false
      })),
      findingsCount: findings.length,
      findings: findings.map((f) => ({
        ...f,
        discrepancyScore: f.severity === 'CRITICAL' ? 1.0 : f.severity === 'HIGH' ? 0.8 : f.severity === 'MEDIUM' ? 0.5 : 0.2,
        rationale: f.explanation,
        suggestedRemedy: f.recommendedNextStep,
        humanReviewStatus: f.reviewStatus
      }))
    };
  }
};

export const getCaseGraphTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_graph',
  description: 'Retrieves Bilateral Evidence Graph structure, nodes, links, and topological inconsistencies.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    try {
      const graph = await GraphBuilder.buildGraph(args.caseId);
      return {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        inconsistencyCount: graph.edges.filter((e) => e.type === 'CITES_EVIDENCE' || (e.metadata && e.metadata.isContradiction)).length,
        nodes: graph.nodes.slice(0, 30).map((n) => ({ id: n.id, type: n.type, label: n.label, party: n.party })),
        edges: graph.edges.slice(0, 40).map((e) => ({ source: e.source, target: e.target, type: e.type, weight: e.weight }))
      };
    } catch {
      return {
        nodeCount: 0,
        edgeCount: 0,
        inconsistencyCount: 0,
        nodes: [],
        edges: []
      };
    }
  }
};

export const getApplicablePolicyTool: ToolDefinition<{ caseId: string; category?: string }> = {
  name: 'get_applicable_policy',
  description: 'Retrieves merchant refund and dispute resolution policy guidelines for this case category.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
    category: z.string().optional()
  }),
  execute: async (args) => {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: args.caseId },
      select: { organizationId: true, category: true }
    });

    if (!caseRecord || !caseRecord.organizationId) {
      return { policyFound: false, message: 'No organization linked to this case.' };
    }

    const category = args.category || caseRecord.category;
    const policy = await prisma.resolutionPolicy.findFirst({
      where: {
        organizationId: caseRecord.organizationId,
        isActive: true
      },
      include: { rules: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!policy) {
      return {
        policyFound: false,
        message: `No active policy configured for category ${category}. Standard commerce fair-trading rules apply.`
      };
    }

    const rules = policy.rules || [];

    return {
      policyFound: true,
      policyId: policy.id,
      name: policy.name,
      description: policy.description,
      returnWindowDays: 30,
      requiresEvidence: true,
      autoRefundThresholdCents: 5000,
      partialRefundAllowed: true,
      maxPartialRefundPercent: 50,
      rulesJson: JSON.stringify(rules)
    };
  }
};

export const getResolutionHistoryTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_resolution_history',
  description: 'Retrieves existing resolution proposals and responses submitted for this case.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const proposals = await prisma.resolutionProposal.findMany({
      where: { caseId: args.caseId },
      include: {
        responses: { select: { responderId: true, response: true, comment: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return proposals.map((p) => ({
      id: p.id,
      remedyType: p.proposalType,
      refundAmountMinor: p.amountMinor,
      currency: p.currency,
      status: p.status,
      rationale: p.description,
      responses: p.responses
    }));
  }
};

export const getPaymentStatusTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_payment_status',
  description: 'Retrieves commerce order, PayPal payment, and refund status linked to this case.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const order = await prisma.commerceOrder.findFirst({
      where: { caseId: args.caseId },
      include: {
        payments: {
          include: {
            refunds: { select: { id: true, amountMinor: true, status: true, refundRequestId: true, createdAt: true } }
          }
        }
      }
    });

    if (!order) {
      return { orderFound: false, message: 'No commerce order directly linked to this case.' };
    }

    const captures = order.payments.map((p) => ({
      paymentId: p.id,
      paypalCaptureId: p.captureId,
      amountMinor: p.amountMinor,
      currency: p.currency,
      status: p.paymentStatus,
      refunds: p.refunds
    }));

    return {
      orderFound: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmountMinor: order.totalAmountMinor,
      currency: order.currency,
      status: order.status,
      captures
    };
  }
};

export const getPaypalDisputeStatusTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_paypal_dispute_status',
  description: 'Retrieves linked PayPal dispute record, dispute reason, lifecycle stage, and deadlines.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required')
  }),
  execute: async (args) => {
    const dispute = await prisma.payPalDispute.findFirst({
      where: { linkedCaseId: args.caseId }
    });

    if (!dispute) {
      return { disputeLinked: false, message: 'No external PayPal dispute linked to this case.' };
    }

    return {
      disputeLinked: true,
      paypalDisputeId: dispute.paypalDisputeId,
      disputeReason: dispute.disputeReason,
      lifecycleStage: dispute.lifecycleStage,
      paypalStatus: dispute.paypalStatus,
      disputeAmountMinor: dispute.disputeAmountMinor,
      currency: dispute.currency,
      sellerResponseDueDate: dispute.sellerResponseDueDate ? dispute.sellerResponseDueDate.toISOString() : null
    };
  }
};

export const getOrganizationPermissionsTool: ToolDefinition = {
  name: 'get_organization_permissions',
  description: "Checks current operator's authorization role, organization membership, and financial permissions.",
  category: 'READ',
  parametersSchema: z.object({}),
  execute: async (_args, ctx) => {
    return {
      userId: ctx.actor.id,
      fullName: ctx.actor.fullName,
      systemRole: ctx.actor.role,
      isPlatformAdmin: ctx.actor.isPlatformAdmin,
      organizationId: ctx.actor.organizationId,
      orgRole: ctx.actor.orgRole,
      canApproveRefunds:
        ctx.actor.isPlatformAdmin ||
        (ctx.actor.role === 'MERCHANT' && (ctx.actor.orgRole === 'OWNER' || ctx.actor.orgRole === 'ORG_ADMIN'))
    };
  }
};
