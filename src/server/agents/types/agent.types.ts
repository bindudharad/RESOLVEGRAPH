/**
 * ResolveGraph Step 8: Multi-Agent AI Orchestration & Case Copilot Types
 */

import { z } from 'zod';
import { UserRole, OrganizationRole } from '@/lib/prisma';

export type AgentRoleName =
  | 'Orchestrator'
  | 'CaseTriageAgent'
  | 'EvidenceInvestigatorAgent'
  | 'PolicyRemedyAgent'
  | 'CommunicationDrafterAgent'
  | 'QualityReviewAgent';

export type AgentRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_FOR_APPROVAL'
  | 'WAITING_FOR_INPUT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AgentStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type ToolCategory =
  | 'READ'
  | 'DRAFT'
  | 'REVIEW'
  | 'SENSITIVE';

export type ToolExecutionStatus =
  | 'SUCCEEDED'
  | 'FAILED'
  | 'BLOCKED_GUARDRAIL';

export type HighRiskActionType =
  | 'REFUND_PROPOSAL'
  | 'CAPTURE_PAYMENT'
  | 'ESCALATE_DISPUTE'
  | 'ACCEPT_DISPUTE'
  | 'CLOSE_CASE'
  | 'EXTERNAL_MESSAGE';

export type ActionRiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type QualityReviewVerdict =
  | 'APPROVED_FOR_DISPLAY'
  | 'NEEDS_CORRECTION'
  | 'NEEDS_MORE_EVIDENCE'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'BLOCKED_BY_POLICY';

export type ArtifactType =
  | 'DRAFT_MESSAGE'
  | 'DRAFT_PROPOSAL'
  | 'INVESTIGATION_SUMMARY'
  | 'EVIDENCE_CHECKLIST'
  | 'QUALITY_REPORT';

export interface AgentUserContext {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  organizationId?: string;
  orgRole?: OrganizationRole;
}

export interface AgentExecutionContext {
  runId: string;
  caseId?: string;
  organizationId: string;
  actor: AgentUserContext;
  currentStep: number;
  maxSteps: number;
  totalTokens: number;
  costEstimateUsd: number;
  startTime: number;
  status: AgentRunStatus;
  waitingForApprovalId?: string;
  abortSignal?: AbortSignal;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  category: ToolCategory;
  requiredRole?: UserRole[];
  requiredOrgRole?: OrganizationRole[];
  parametersSchema?: z.ZodTypeAny;
  execute: (args: TInput, ctx: AgentExecutionContext) => Promise<TOutput>;
}

export interface AgentStepPlan {
  stepNumber: number;
  agentName: AgentRoleName;
  goal: string;
  toolNames?: string[];
}

export interface TriageResult {
  intent: string; // INVESTIGATE_DISCREPANCIES, EVALUATE_POLICY, DRAFT_COMMUNICATION, PREPARE_DISPUTE_DOSSIER, GENERAL_ASSIST
  summary: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  caseSummarySnippet?: string;
  plan: AgentStepPlan[];
}

export interface InvestigationSummaryResult {
  caseId: string;
  coreContradictionFound: boolean;
  discrepancyScore: number;
  keyFacts: Array<{
    name: string;
    value: string;
    source: string;
    confidence: number;
    isVerified: boolean;
  }>;
  missingEvidenceItems: string[];
  investigatorNotes: string;
}

export interface PolicyEvaluationResult {
  caseId: string;
  policyFound: boolean;
  policyName?: string;
  eligibleRemedies: Array<{
    remedyType: string;
    maxAmountMinor?: number;
    currency?: string;
    confidence: number;
    conditionsMet: string[];
    conditionsUnmet: string[];
  }>;
  recommendedRemedy?: {
    remedyType: string;
    amountMinor?: number;
    currency?: string;
    reasoning: string;
  };
  requiresHumanApproval: boolean;
}

export interface DraftMessageResult {
  recipient: 'BUYER' | 'MERCHANT' | 'CARRIER' | 'INTERNAL_NOTE';
  subject: string;
  body: string;
  factualGroundingCitations: string[];
  disclaimer: string;
}

export interface QualityReviewResult {
  verdict: QualityReviewVerdict;
  confidenceScore: number; // 0.0 - 1.0
  citationsValid: boolean;
  missingCitations: string[];
  policyCompliant: boolean;
  complianceNotes: string;
  hallucinationDetected: boolean;
  criticisms: string[];
  humanReviewReason?: string;
}
