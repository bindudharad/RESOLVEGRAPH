/**
 * RESOLVEGRAPH 2.0 — PayPal & Payment Investigation Agent Tools
 * 
 * Implements strongly typed tools conforming to the PayPal Agent Toolkit architecture:
 * - Read & Inspection Tools: Orders, Captures, Refunds, Disputes, Canonical Transactions, BEG Graph, BERR Findings
 * - Proposal Tools: Refund Proposals, Dispute Responses, Merchant Enquiries, Customer Updates
 * - Strict Financial Safeguards: Consequential execution is strictly separated and requires human approval
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ToolDefinition } from '../types/agent.types';
import { PayPalProviderFactory } from '@/server/paypal/paypal-provider.factory';
import { GraphBuilder } from '@/server/graph/graph-builder';
import { BerrV2Service } from '@/server/ai/reasoning/berr-v2.service';
import { MissingEvidenceDetector } from '@/server/ai/reasoning/missing-evidence-detector';
import { FinancialActionGuardrails } from '../guardrails/financial-action-guardrails';
import { InvestigationReportService } from '@/server/services/investigation-report.service';

async function resolveCaseRecord(identifier: string) {
  return prisma.caseRecord.findFirst({
    where: { OR: [{ id: identifier }, { caseNumber: identifier }] },
  });
}

// ============================================================================
// 1. READ & INSPECTION TOOLS
// ============================================================================

export const getCaseDetailsTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_case_details',
  description: 'Retrieves complete case details, user complaint, incident category, parties, amount, and current stage.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
  }),
  execute: async (args) => {
    const c = await prisma.caseRecord.findFirst({
      where: { OR: [{ id: args.caseId }, { caseNumber: args.caseId }] },
      include: {
        buyer: { select: { id: true, fullName: true, email: true } },
        merchant: { select: { id: true, fullName: true, email: true, organization: true } },
        organization: { select: { id: true, name: true, slug: true } },
        claims: { select: { id: true, claimType: true, statement: true, status: true, partyRole: true } },
        evidence: { select: { id: true, filename: true, evidenceType: true, verificationStatus: true, sha256: true } },
        paymentIncident: { include: { findings: true } },
        _count: { select: { claims: true, evidence: true, canonicalTransactions: true, resolutionProposals: true } },
      },
    });

    if (!c) throw new Error(`Case ${args.caseId} not found.`);

    return {
      caseId: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      description: c.description,
      category: c.category,
      status: c.status,
      stage: c.stage,
      priority: c.priority,
      amountMinor: c.amountMinor,
      currency: c.currency,
      buyer: c.buyer,
      merchant: c.merchant,
      organization: c.organization,
      claims: c.claims,
      evidenceList: c.evidence,
      incident: c.paymentIncident,
      counts: c._count,
      createdAt: c.createdAt.toISOString(),
    };
  },
};

export const getCanonicalTransactionTool: ToolDefinition<{
  transactionId?: string;
  referenceId?: string;
  providerTxId?: string;
}> = {
  name: 'get_canonical_transaction',
  description: 'Retrieves normalized canonical transaction record, provider values, minor amounts, and linked source records.',
  category: 'READ',
  parametersSchema: z.object({
    transactionId: z.string().optional(),
    referenceId: z.string().optional(),
    providerTxId: z.string().optional(),
  }),
  execute: async (args) => {
    const tx = await prisma.canonicalTransaction.findFirst({
      where: {
        OR: [
          ...(args.transactionId ? [{ id: args.transactionId }] : []),
          ...(args.referenceId ? [{ externalReference: args.referenceId }, { orderReference: args.referenceId }] : []),
          ...(args.providerTxId ? [{ providerTxId: args.providerTxId }] : []),
        ],
      },
      include: {
        sourceRecords: true,
        matchingDecisions: true,
        mismatches: true,
      },
    });

    if (!tx) {
      return { found: false, message: 'No matching canonical transaction found.' };
    }

    return {
      found: true,
      transactionId: tx.id,
      provider: tx.provider,
      providerTxId: tx.providerTxId,
      externalReference: tx.externalReference,
      orderReference: tx.orderReference,
      payerReference: tx.payerReference,
      payeeReference: tx.payeeReference,
      grossAmountMinor: tx.grossAmountMinor,
      feeAmountMinor: tx.feeAmountMinor,
      netAmountMinor: tx.netAmountMinor,
      currency: tx.currency,
      originalStatus: tx.originalStatus,
      normalizedStatus: tx.normalizedStatus,
      reconciliationState: tx.reconciliationState,
      transactionTimestamp: tx.transactionTimestamp.toISOString(),
      sourceRecords: tx.sourceRecords,
      matchingDecisions: tx.matchingDecisions,
      mismatches: tx.mismatches,
    };
  },
};

export const getPaypalOrderTool: ToolDefinition<{ orderId: string }> = {
  name: 'get_paypal_order',
  description: 'Retrieves live PayPal Order details from PayPal v2 REST APIs or Sandbox ledger.',
  category: 'READ',
  parametersSchema: z.object({
    orderId: z.string().min(1, 'PayPal orderId is required'),
  }),
  execute: async (args) => {
    const provider = PayPalProviderFactory.getProvider();
    try {
      const order = await provider.getOrder(args.orderId);
      const internalOrder = await prisma.payPalPayment.findUnique({
        where: { providerOrderId: args.orderId },
        include: {
          commerceOrder: { include: { items: true, buyer: true } },
          refunds: true,
          disputes: true,
        },
      });

      return {
        providerOrderId: order.id,
        status: order.status,
        intent: order.intent,
        purchaseUnits: order.purchase_units,
        links: order.links,
        internalOrder: internalOrder
          ? {
              orderNumber: internalOrder.commerceOrder.orderNumber,
              amountMinor: internalOrder.amountMinor,
              currency: internalOrder.currency,
              paymentStatus: internalOrder.paymentStatus,
              captureId: internalOrder.captureId,
              refundCount: internalOrder.refunds.length,
            }
          : null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Failed to retrieve PayPal Order: ${msg}` };
    }
  },
};

export const getPaypalCaptureTool: ToolDefinition<{ captureId: string }> = {
  name: 'get_paypal_capture',
  description: 'Retrieves PayPal Capture details, verified amount, currency, status, fee breakdown, and seller protection.',
  category: 'READ',
  parametersSchema: z.object({
    captureId: z.string().min(1, 'captureId is required'),
  }),
  execute: async (args) => {
    const provider = PayPalProviderFactory.getProvider();
    try {
      const capture = await provider.getCapture(args.captureId);
      const internal = await prisma.payPalPayment.findUnique({
        where: { captureId: args.captureId },
        include: {
          commerceOrder: { select: { orderNumber: true, caseId: true } },
          refunds: true,
        },
      });

      return {
        captureId: capture.id,
        status: capture.status,
        amount: capture.amount,
        finalCapture: capture.final_capture,
        sellerProtection: capture.seller_protection,
        receivableBreakdown: capture.seller_receivable_breakdown,
        createTime: capture.create_time,
        updateTime: capture.update_time,
        internalPayment: internal
          ? {
              paymentId: internal.id,
              orderNumber: internal.commerceOrder.orderNumber,
              caseId: internal.commerceOrder.caseId,
              totalRefundsIssuedMinor: internal.refunds.reduce((acc, r) => acc + (r.status === 'COMPLETED' ? r.amountMinor : 0), 0),
            }
          : null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Failed to retrieve PayPal Capture: ${msg}` };
    }
  },
};

export const getPaypalRefundTool: ToolDefinition<{ refundId: string }> = {
  name: 'get_paypal_refund',
  description: 'Retrieves verified PayPal Refund details, status, amount, and note to payer.',
  category: 'READ',
  parametersSchema: z.object({
    refundId: z.string().min(1, 'refundId is required'),
  }),
  execute: async (args) => {
    const provider = PayPalProviderFactory.getProvider();
    try {
      const refund = await provider.getRefund(args.refundId);
      const internal = await prisma.refundTransaction.findFirst({
        where: {
          OR: [{ paypalRefundId: args.refundId }, { refundRequestId: args.refundId }],
        },
        include: {
          requestedBy: { select: { fullName: true, email: true } },
          approvedBy: { select: { fullName: true, email: true } },
        },
      });

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount,
        noteToPayer: refund.note_to_payer,
        createTime: refund.create_time,
        internalRecord: internal
          ? {
              status: internal.status,
              amountMinor: internal.amountMinor,
              reason: internal.reason,
              requestedBy: internal.requestedBy?.fullName,
              approvedBy: internal.approvedBy?.fullName,
            }
          : null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Failed to retrieve PayPal Refund: ${msg}` };
    }
  },
};

export const getPaypalDisputeTool: ToolDefinition<{ disputeId: string }> = {
  name: 'get_paypal_dispute',
  description: 'Retrieves PayPal Dispute details, status, reason, lifecycle stage, response due date, and history.',
  category: 'READ',
  parametersSchema: z.object({
    disputeId: z.string().min(1, 'disputeId is required'),
  }),
  execute: async (args) => {
    const provider = PayPalProviderFactory.getProvider();
    try {
      const dispute = await provider.getDispute(args.disputeId);
      const internal = await prisma.payPalDispute.findUnique({
        where: { paypalDisputeId: args.disputeId },
        include: { linkedCase: { select: { id: true, caseNumber: true, status: true } } },
      });

      return {
        disputeId: dispute.dispute_id,
        status: dispute.status,
        disputeReason: dispute.dispute_reason,
        lifecycleStage: dispute.dispute_life_cycle_stage,
        disputeAmount: dispute.dispute_amount,
        sellerResponseDueDate: dispute.seller_response_due_date,
        allowedResponseActions: dispute.allowed_response_actions,
        messages: dispute.messages,
        linkedCase: internal?.linkedCase || null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Failed to retrieve PayPal Dispute: ${msg}` };
    }
  },
};

export const listPaypalDisputesTool: ToolDefinition<{ disputeState?: string; page?: number }> = {
  name: 'list_paypal_disputes',
  description: 'Lists active and resolved PayPal disputes for the organization.',
  category: 'READ',
  parametersSchema: z.object({
    disputeState: z.string().optional(),
    page: z.number().optional(),
  }),
  execute: async (args) => {
    const provider = PayPalProviderFactory.getProvider();
    try {
      return await provider.listDisputes({ disputeState: args.disputeState, page: args.page });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Failed to list PayPal Disputes: ${msg}`, items: [] };
    }
  },
};

export const searchRelatedTransactionsTool: ToolDefinition<{
  caseId?: string;
  orderReference?: string;
  externalReference?: string;
  provider?: string;
}> = {
  name: 'search_related_transactions',
  description: 'Searches all Canonical Transactions and payment attempts matching case, order reference, or external IDs.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().optional(),
    orderReference: z.string().optional(),
    externalReference: z.string().optional(),
    provider: z.string().optional(),
  }),
  execute: async (args) => {
    const transactions = await prisma.canonicalTransaction.findMany({
      where: {
        AND: [
          ...(args.caseId ? [{ caseId: args.caseId }] : []),
          ...(args.orderReference ? [{ orderReference: { contains: args.orderReference } }] : []),
          ...(args.externalReference ? [{ externalReference: { contains: args.externalReference } }] : []),
          ...(args.provider ? [{ provider: args.provider }] : []),
        ],
      },
      include: {
        sourceRecords: true,
        matchingDecisions: true,
      },
      orderBy: { transactionTimestamp: 'desc' },
      take: 20,
    });

    return transactions.map((t) => ({
      transactionId: t.id,
      provider: t.provider,
      providerTxId: t.providerTxId,
      externalReference: t.externalReference,
      orderReference: t.orderReference,
      grossAmountMinor: t.grossAmountMinor,
      currency: t.currency,
      normalizedStatus: t.normalizedStatus,
      reconciliationState: t.reconciliationState,
      timestamp: t.transactionTimestamp.toISOString(),
      sourceRecordCount: t.sourceRecords.length,
      matchingDecisionsCount: t.matchingDecisions.length,
    }));
  },
};

export const getEvidenceDetailsTool: ToolDefinition<{ evidenceId: string }> = {
  name: 'get_evidence_details',
  description: 'Retrieves uploaded evidence item metadata, SHA-256 hash, OCR layout extractions, and verification state.',
  category: 'READ',
  parametersSchema: z.object({
    evidenceId: z.string().min(1, 'evidenceId is required'),
  }),
  execute: async (args) => {
    const ev = await prisma.evidence.findUnique({
      where: { id: args.evidenceId },
      include: {
        fieldExtractions: true,
        extractedFacts: true,
        uploadedBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!ev) throw new Error(`Evidence item ${args.evidenceId} not found.`);

    return {
      evidenceId: ev.id,
      filename: ev.filename,
      mimeType: ev.mimeType,
      sizeBytes: ev.sizeBytes,
      sha256: ev.sha256,
      evidenceType: ev.evidenceType,
      sourceType: ev.sourceType,
      verificationStatus: ev.verificationStatus,
      scanStatus: ev.scanStatus,
      uploadedBy: ev.uploadedBy,
      fieldExtractions: ev.fieldExtractions.map((f) => ({
        fieldName: f.fieldName,
        value: f.userCorrectedValue || f.extractedValue,
        confidence: f.confidence,
        method: f.extractionMethod,
      })),
      extractedFactsCount: ev.extractedFacts.length,
      createdAt: ev.createdAt.toISOString(),
    };
  },
};

export const getEvidenceGraphTool: ToolDefinition<{ caseId: string }> = {
  name: 'get_evidence_graph',
  description: 'Builds and returns the full Bilateral Evidence Graph with nodes, edges, verification states, and provenance.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
  }),
  execute: async (args) => {
    const graph = await GraphBuilder.buildGraph(args.caseId);
    return {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        sublabel: n.sublabel,
        party: n.party,
        status: n.status,
        confidence: n.confidence,
        timestamp: n.timestamp,
      })),
      edges: graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        label: e.label,
        confidenceBand: e.confidenceBand,
        provenance: e.provenance,
        reviewStatus: e.reviewStatus,
      })),
    };
  },
};

export const runBerrInvestigationTool: ToolDefinition<{ caseId: string }> = {
  name: 'run_berr_investigation',
  description: 'Executes BERR v2 reasoning engine comparing buyer and merchant claims against verified evidence.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
  }),
  execute: async (args) => {
    const berrResult = await BerrV2Service.evaluateCase(args.caseId);
    return {
      caseId: args.caseId,
      quadrants: {
        agreed: berrResult.classifiedFacts.filter((f) => f.classification === 'AGREED'),
        verified: berrResult.classifiedFacts.filter((f) => f.classification === 'VERIFIED'),
        contested: berrResult.classifiedFacts.filter((f) => f.classification === 'CONTESTED'),
        missing: berrResult.classifiedFacts.filter((f) => f.classification === 'MISSING'),
      },
      factCounts: berrResult.factCounts,
      objectiveUncertainty: berrResult.uncertaintyAnalysis.objectiveUncertaintyScore,
      divergenceScore: berrResult.uncertaintyAnalysis.riskScore,
      requiresHumanReview: berrResult.uncertaintyAnalysis.requiresHumanReview,
      recommendedRemedy: berrResult.recommendedRemedy,
      lifecycleSummary: berrResult.lifecycleSummary,
    };
  },
};

export const retrieveMissingEvidenceTool: ToolDefinition<{ caseId: string }> = {
  name: 'retrieve_missing_evidence',
  description: 'Identifies missing evidence items required to establish certainty for this dispute category.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
  }),
  execute: async (args) => {
    const caseRecord = await resolveCaseRecord(args.caseId);

    if (!caseRecord) throw new Error(`Case ${args.caseId} not found.`);

    const existingEvidence = await prisma.evidence.findMany({
      where: { caseId: caseRecord.id },
      select: { evidenceType: true },
    });
    const existingTypes = existingEvidence.map((e) => e.evidenceType);
    const missing = MissingEvidenceDetector.detectMissingEvidence({
      category: caseRecord.category,
      existingEvidenceTypes: existingTypes,
      hasCarrierTracking: existingTypes.includes('TRACKING_INFO'),
      hasSignatureProof: false,
      hasPackagingPhotos: existingTypes.includes('PHOTO'),
      hasReturnLabel: existingTypes.includes('RETURN_LABEL'),
    });

    return {
      caseId: args.caseId,
      disputeCategory: caseRecord.category,
      missingItems: missing,
      count: missing.length,
    };
  },
};

export const generateInvestigationReportTool: ToolDefinition<{ caseId: string }> = {
  name: 'generate_investigation_report',
  description: 'Synthesizes all case evidence, transactions, graph, and BERR findings into an authoritative report.',
  category: 'READ',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
  }),
  execute: async (args) => {
    return await InvestigationReportService.generateReport(args.caseId);
  },
};

// ============================================================================
// 2. PROPOSAL TOOLS (Human Approval Required for Financial Actions)
// ============================================================================

export const prepareRefundProposalTool: ToolDefinition<{
  caseId: string;
  paymentId?: string;
  captureId?: string;
  amountMinor: number;
  currency: string;
  reason: string;
  evidenceCitations: string[];
}> = {
  name: 'prepare_refund_proposal',
  description: 'Prepares a formal PayPal refund proposal with cryptographic argument hashing, queued for human operator approval.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
    paymentId: z.string().optional(),
    captureId: z.string().optional(),
    amountMinor: z.number().int().positive('Amount must be positive minor units'),
    currency: z.string().default('USD'),
    reason: z.string().min(5, 'Reason must be detailed'),
    evidenceCitations: z.array(z.string()).default([]),
  }),
  execute: async (args, ctx) => {
    const caseRecord = await resolveCaseRecord(args.caseId);
    const dbCaseId = caseRecord ? caseRecord.id : args.caseId;

    // Locate payment
    const payment = await prisma.payPalPayment.findFirst({
      where: {
        OR: [
          ...(args.paymentId ? [{ id: args.paymentId }] : []),
          ...(args.captureId ? [{ captureId: args.captureId }] : []),
          { commerceOrder: { caseId: dbCaseId } },
          { commerceOrder: { orderNumber: args.caseId } },
        ],
      },
      include: { commerceOrder: true },
    });

    const isFullRefund = payment ? args.amountMinor >= payment.amountMinor : false;
    const remedyType = isFullRefund ? 'FULL_REFUND' : 'PARTIAL_REFUND';

    // Verify through Financial Action Guardrails
    const proposedArgs = {
      caseId: args.caseId,
      paymentId: payment?.id,
      captureId: payment?.captureId,
      amountMinor: args.amountMinor,
      currency: args.currency,
      remedyType,
      reason: args.reason,
      evidenceCitations: args.evidenceCitations,
    };

    const inspection = FinancialActionGuardrails.inspectAction('create_draft_resolution_proposal', proposedArgs);

    // Create AgentApprovalRequest
    const approvalRequest = await prisma.agentApprovalRequest.create({
      data: {
        runId: ctx.runId,
        actionType: 'REFUND_PROPOSAL',
        actionRisk: inspection.riskLevel,
        description: `Propose ${args.currency} ${(args.amountMinor / 100).toFixed(2)} refund for case ${args.caseId}: ${args.reason}`,
        proposedArgumentsJson: JSON.stringify(proposedArgs),
        argumentsHash: inspection.argumentsHash,
        status: 'PENDING',
        requestedById: ctx.actor.id,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000), // 48-hour approval window
      },
    });

    // Create Draft ResolutionProposal
    const proposal = await prisma.resolutionProposal.create({
      data: {
        caseId: args.caseId,
        organizationId: ctx.organizationId || payment?.commerceOrder.merchantOrganizationId || 'org_default',
        proposedById: ctx.actor.id,
        proposalType: remedyType,
        title: `${remedyType === 'FULL_REFUND' ? 'Full' : 'Partial'} Refund Proposal: ${args.currency} ${(args.amountMinor / 100).toFixed(2)}`,
        description: args.reason,
        amountMinor: args.amountMinor,
        currency: args.currency,
        reason: args.reason,
        status: 'DRAFT',
      },
    });

    return {
      proposalId: proposal.id,
      approvalRequestId: approvalRequest.id,
      argumentsHash: inspection.argumentsHash,
      status: 'PENDING_HUMAN_APPROVAL',
      message: 'Refund proposal prepared and securely locked. Awaiting authorized merchant/manager digital signature.',
      proposedDetails: proposedArgs,
    };
  },
};

export const prepareDisputeResponseTool: ToolDefinition<{
  disputeId: string;
  caseId?: string;
  responseNotes: string;
  evidenceIds?: string[];
}> = {
  name: 'prepare_dispute_response',
  description: 'Prepares formal evidence submission and rebuttal for an open PayPal dispute without autonomous submission.',
  category: 'DRAFT',
  parametersSchema: z.object({
    disputeId: z.string().min(1, 'disputeId is required'),
    caseId: z.string().optional(),
    responseNotes: z.string().min(10, 'Response notes must be detailed'),
    evidenceIds: z.array(z.string()).default([]),
  }),
  execute: async (args, ctx) => {
    const proposedArgs = {
      disputeId: args.disputeId,
      caseId: args.caseId,
      responseNotes: args.responseNotes,
      evidenceIds: args.evidenceIds,
    };
    const argsHash = FinancialActionGuardrails.computeArgumentsHash(proposedArgs);

    const approval = await prisma.agentApprovalRequest.create({
      data: {
        runId: ctx.runId,
        actionType: 'ACCEPT_DISPUTE',
        actionRisk: 'HIGH',
        description: `Submit response to PayPal dispute ${args.disputeId}: "${args.responseNotes.slice(0, 80)}..."`,
        proposedArgumentsJson: JSON.stringify(proposedArgs),
        argumentsHash: argsHash,
        status: 'PENDING',
        requestedById: ctx.actor.id,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });

    return {
      approvalRequestId: approval.id,
      argumentsHash: argsHash,
      status: 'PENDING_HUMAN_APPROVAL',
      message: 'PayPal dispute response draft prepared. Requires operator sign-off before transmission to PayPal.',
    };
  },
};

export const prepareMerchantEnquiryTool: ToolDefinition<{
  caseId: string;
  subject: string;
  message: string;
  requestedItems: string[];
}> = {
  name: 'prepare_merchant_enquiry',
  description: 'Drafts structured inquiry to merchant requesting proof of dispatch, tracking numbers, or warehouse records.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
    subject: z.string().min(3),
    message: z.string().min(10),
    requestedItems: z.array(z.string()).default([]),
  }),
  execute: async (args) => {
    return {
      status: 'DRAFT_CREATED',
      subject: args.subject,
      body: args.message,
      requestedItems: args.requestedItems,
      recipient: 'Merchant Fulfillment Team',
      preview: `Subject: ${args.subject}\n\n${args.message}\n\nRequested Verification Items:\n- ${args.requestedItems.join('\n- ')}`,
    };
  },
};

export const prepareCustomerResponseTool: ToolDefinition<{
  caseId: string;
  explanation: string;
  statutoryTatNotes?: string;
}> = {
  name: 'prepare_customer_response',
  description: 'Drafts clear, empathetic plain-language explanation to consumer citing verified facts and TAT timeline.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
    explanation: z.string().min(10),
    statutoryTatNotes: z.string().optional(),
  }),
  execute: async (args) => {
    return {
      status: 'DRAFT_CREATED',
      recipient: 'Consumer Buyer',
      content: args.explanation,
      statutoryNotes: args.statutoryTatNotes || 'Standard Turnaround Time: T+1 for UPI / T+2 for PayPal merchant settlements.',
      preview: `${args.explanation}\n\nStatutory TAT Notice: ${args.statutoryTatNotes || 'None'}`,
    };
  },
};

export const prepareEvidenceRequestTool: ToolDefinition<{
  caseId: string;
  targetRole: 'BUYER' | 'MERCHANT';
  requestedEvidenceTypes: string[];
  rationale: string;
}> = {
  name: 'prepare_evidence_request',
  description: 'Prepares formal evidence request checklist for missing documentation.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
    targetRole: z.enum(['BUYER', 'MERCHANT']),
    requestedEvidenceTypes: z.array(z.string()).min(1),
    rationale: z.string().min(5),
  }),
  execute: async (args) => {
    return {
      status: 'EVIDENCE_REQUEST_PREPARED',
      targetRole: args.targetRole,
      requestedEvidenceTypes: args.requestedEvidenceTypes,
      rationale: args.rationale,
      instructions: `Please upload the following required documents to advance your investigation:\n${args.requestedEvidenceTypes.map((t) => `• ${t}`).join('\n')}`,
    };
  },
};

export const prepareResolutionSummaryTool: ToolDefinition<{
  caseId: string;
  confirmedFacts: string[];
  divergenceSummary: string;
  recommendedRemedy: string;
}> = {
  name: 'prepare_resolution_summary',
  description: 'Drafts final bilateral resolution dossier summarizing confirmed facts, divergence, and recommended remedy.',
  category: 'DRAFT',
  parametersSchema: z.object({
    caseId: z.string().min(1, 'caseId is required'),
    confirmedFacts: z.array(z.string()).min(1),
    divergenceSummary: z.string().min(10),
    recommendedRemedy: z.string().min(5),
  }),
  execute: async (args) => {
    return {
      caseId: args.caseId,
      status: 'SUMMARY_PREPARED',
      dossier: {
        confirmedFacts: args.confirmedFacts,
        divergenceSummary: args.divergenceSummary,
        recommendedRemedy: args.recommendedRemedy,
        nextStep: 'Submit to Bilateral Shared Resolution Room for human party agreement.',
      },
    };
  },
};
