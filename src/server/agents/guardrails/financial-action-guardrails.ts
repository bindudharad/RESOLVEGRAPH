/**
 * Financial Action Guardrails (Human-in-the-Loop)
 * 
 * Strict non-negotiable financial security boundary:
 * Multi-agent systems can NEVER autonomously execute financial transactions,
 * PayPal refunds, captures, dispute acceptances/escalations, or external messaging.
 * Any proposed financial or high-risk operation MUST create an AgentApprovalRequest
 * and pause execution until signed off by an authorized human operator.
 */

import crypto from 'crypto';
import { HighRiskActionType, ActionRiskLevel, AgentUserContext } from '../types/agent.types';
import { UserRole, OrganizationRole } from '@/lib/prisma';

export interface FinancialActionInspectionResult {
  isSensitive: boolean;
  actionType?: HighRiskActionType;
  riskLevel: ActionRiskLevel;
  requiresHumanApproval: boolean;
  permittedRoles: UserRole[];
  permittedOrgRoles: OrganizationRole[];
  reason: string;
  argumentsHash: string;
}

export class FinancialActionGuardrails {
  private static readonly DISALLOWED_AUTONOMOUS_OPERATIONS = new Set<string>([
    'execute_refund',
    'capture_paypal_order',
    'accept_paypal_dispute',
    'escalate_paypal_dispute',
    'send_live_customer_email',
    'close_case_unilaterally'
  ]);

  /**
   * Generates a deterministic SHA-256 hash of proposed action arguments
   * to ensure arguments cannot be tampered with between proposal and human sign-off.
   */
  public static computeArgumentsHash(proposedArguments: Record<string, unknown>): string {
    const canonicalJson = JSON.stringify(proposedArguments, Object.keys(proposedArguments).sort());
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
  }

  /**
   * Verifies that the proposed action arguments match the signed hash.
   */
  public static verifyArgumentsHash(proposedArguments: Record<string, unknown>, hash: string): boolean {
    const currentHash = this.computeArgumentsHash(proposedArguments);
    return crypto.timingSafeEqual(Buffer.from(currentHash, 'hex'), Buffer.from(hash, 'hex'));
  }

  /**
   * Inspects a requested tool or planned action for financial and high-risk operations.
   */
  public static inspectAction(
    actionName: string,
    proposedArguments: Record<string, unknown>
  ): FinancialActionInspectionResult {
    const argsHash = this.computeArgumentsHash(proposedArguments);

    // Direct check for autonomous execution attempts
    if (this.DISALLOWED_AUTONOMOUS_OPERATIONS.has(actionName.toLowerCase())) {
      throw new Error(
        `[Financial Action Guardrail Violation] Autonomous execution of "${actionName}" is strictly forbidden. ` +
        `Agents may only generate draft proposals or submit approval requests for human sign-off.`
      );
    }

    // Inspect if creating a draft resolution proposal with financial remedies
    if (actionName === 'create_draft_resolution_proposal' || actionName === 'prepare_refund_proposal') {
      const remedyType = String(proposedArguments.remedyType || 'FULL_REFUND').toUpperCase();
      const isFinancial = remedyType === 'FULL_REFUND' || remedyType === 'PARTIAL_REFUND' || actionName === 'prepare_refund_proposal';

      if (isFinancial) {
        return {
          isSensitive: true,
          actionType: 'REFUND_PROPOSAL',
          riskLevel: 'HIGH',
          requiresHumanApproval: true,
          permittedRoles: [UserRole.MERCHANT, UserRole.ADMIN],
          permittedOrgRoles: [OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN],
          reason: `Proposal involves financial settlement (${remedyType}) of ${proposedArguments.amountMinor || 0} minor units.`,
          argumentsHash: argsHash
        };
      }

      return {
        isSensitive: false,
        actionType: 'REFUND_PROPOSAL',
        riskLevel: 'LOW',
        requiresHumanApproval: false,
        permittedRoles: [UserRole.MERCHANT, UserRole.RESOLUTION_MANAGER, UserRole.ADMIN],
        permittedOrgRoles: [OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN, OrganizationRole.MERCHANT_AGENT],
        reason: 'Proposal specifies non-financial remedy (e.g. Replacement or Store Credit).',
        argumentsHash: argsHash
      };
    }

    // Inspect PayPal dispute response preparations
    if (actionName.includes('dispute') || actionName === 'prepare_dispute_response') {
      return {
        isSensitive: true,
        actionType: 'ESCALATE_DISPUTE',
        riskLevel: 'HIGH',
        requiresHumanApproval: true,
        permittedRoles: [UserRole.MERCHANT, UserRole.ADMIN],
        permittedOrgRoles: [OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN],
        reason: 'Preparing formal PayPal dispute response requires human review prior to submission.',
        argumentsHash: argsHash
      };
    }

    // Default safe check
    return {
      isSensitive: false,
      riskLevel: 'LOW',
      requiresHumanApproval: false,
      permittedRoles: [UserRole.BUYER, UserRole.MERCHANT, UserRole.RESOLUTION_MANAGER, UserRole.ADMIN],
      permittedOrgRoles: [OrganizationRole.OWNER, OrganizationRole.ORG_ADMIN, OrganizationRole.MERCHANT_AGENT, OrganizationRole.VIEWER],
      reason: 'Read or draft operation with zero financial side-effects.',
      argumentsHash: argsHash
    };
  }

  /**
   * Asserts whether a given user is authorized to sign off on an approval request.
   */
  public static canUserSignApproval(
    actor: AgentUserContext,
    actionType: HighRiskActionType,
    actionOrgId?: string
  ): { authorized: boolean; reason?: string } {
    if (actor.isPlatformAdmin || actor.role === UserRole.ADMIN) {
      return { authorized: true };
    }

    // If case has organization isolation, verify actor belongs to organization
    if (actionOrgId && actor.organizationId !== actionOrgId) {
      return {
        authorized: false,
        reason: 'User does not belong to the organization owning this case.'
      };
    }

    if (actionType === 'REFUND_PROPOSAL' || actionType === 'CAPTURE_PAYMENT') {
      // Must be Merchant Owner or Org Admin
      if (
        actor.role === UserRole.MERCHANT &&
        (actor.orgRole === OrganizationRole.OWNER || actor.orgRole === OrganizationRole.ORG_ADMIN)
      ) {
        return { authorized: true };
      }
      return {
        authorized: false,
        reason: 'Only merchant organization Owners or Org Admins can approve financial refunds or payments.'
      };
    }

    if (actionType === 'ACCEPT_DISPUTE' || actionType === 'ESCALATE_DISPUTE' || actionType === 'CLOSE_CASE') {
      if (
        actor.role === UserRole.MERCHANT &&
        (actor.orgRole === OrganizationRole.OWNER || actor.orgRole === OrganizationRole.ORG_ADMIN || actor.orgRole === OrganizationRole.MERCHANT_AGENT)
      ) {
        return { authorized: true };
      }
      return {
        authorized: false,
        reason: 'Insufficient permissions to sign dispute or case closure approvals.'
      };
    }

    return { authorized: true };
  }
}
