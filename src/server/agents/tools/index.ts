/**
 * Tools Export & Registration
 */

import { ToolRegistry } from './tool-registry';
import {
  getCaseSummaryTool,
  getCaseClaimsTool,
  getCaseEvidenceMetadataTool,
  getCaseTimelineTool,
  getCaseFindingsTool,
  getCaseGraphTool,
  getApplicablePolicyTool,
  getResolutionHistoryTool,
  getPaymentStatusTool,
  getPaypalDisputeStatusTool,
  getOrganizationPermissionsTool
} from './read-tools';
import {
  createDraftInformationRequestTool,
  createDraftBuyerMessageTool,
  createDraftMerchantMessageTool,
  createDraftResolutionProposalTool,
  createInvestigationSummaryTool,
  createMissingEvidenceChecklistTool,
  createHumanReviewRequestTool
} from './draft-tools';
import {
  validateClaimEvidenceLinksTool,
  validateSourceCitationsTool,
  validatePolicyConditionsTool,
  validateAgentResultTool
} from './review-tools';

export * from './tool-registry';
export * from './read-tools';
export * from './draft-tools';
export * from './review-tools';

let registered = false;

export function registerAllTools(): ToolRegistry {
  const registry = ToolRegistry.getInstance();
  if (registered) return registry;

  // Read Tools
  registry.registerTool(getCaseSummaryTool);
  registry.registerTool(getCaseClaimsTool);
  registry.registerTool(getCaseEvidenceMetadataTool);
  registry.registerTool(getCaseTimelineTool);
  registry.registerTool(getCaseFindingsTool);
  registry.registerTool(getCaseGraphTool);
  registry.registerTool(getApplicablePolicyTool);
  registry.registerTool(getResolutionHistoryTool);
  registry.registerTool(getPaymentStatusTool);
  registry.registerTool(getPaypalDisputeStatusTool);
  registry.registerTool(getOrganizationPermissionsTool);

  // Draft Tools
  registry.registerTool(createDraftInformationRequestTool);
  registry.registerTool(createDraftBuyerMessageTool);
  registry.registerTool(createDraftMerchantMessageTool);
  registry.registerTool(createDraftResolutionProposalTool);
  registry.registerTool(createInvestigationSummaryTool);
  registry.registerTool(createMissingEvidenceChecklistTool);
  registry.registerTool(createHumanReviewRequestTool);

  // Review Tools
  registry.registerTool(validateClaimEvidenceLinksTool);
  registry.registerTool(validateSourceCitationsTool);
  registry.registerTool(validatePolicyConditionsTool);
  registry.registerTool(validateAgentResultTool);

  registered = true;
  return registry;
}
