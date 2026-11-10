/**
 * Tools Export & Registration — RESOLVEGRAPH 2.0
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
  getOrganizationPermissionsTool,
} from './read-tools';
import {
  createDraftInformationRequestTool,
  createDraftBuyerMessageTool,
  createDraftMerchantMessageTool,
  createDraftResolutionProposalTool,
  createInvestigationSummaryTool,
  createMissingEvidenceChecklistTool,
  createHumanReviewRequestTool,
} from './draft-tools';
import {
  validateClaimEvidenceLinksTool,
  validateSourceCitationsTool,
  validatePolicyConditionsTool,
  validateAgentResultTool,
} from './review-tools';
import {
  getCaseDetailsTool,
  getCanonicalTransactionTool,
  getPaypalOrderTool,
  getPaypalCaptureTool,
  getPaypalRefundTool,
  getPaypalDisputeTool,
  listPaypalDisputesTool,
  searchRelatedTransactionsTool,
  getEvidenceDetailsTool,
  getEvidenceGraphTool,
  runBerrInvestigationTool,
  retrieveMissingEvidenceTool,
  generateInvestigationReportTool,
  prepareRefundProposalTool,
  prepareDisputeResponseTool,
  prepareMerchantEnquiryTool,
  prepareCustomerResponseTool,
  prepareEvidenceRequestTool,
  prepareResolutionSummaryTool,
} from './paypal-investigation-tools';

export * from './tool-registry';
export * from './read-tools';
export * from './draft-tools';
export * from './review-tools';
export * from './paypal-investigation-tools';

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

  // PayPal Investigation Read Tools
  registry.registerTool(getCaseDetailsTool);
  registry.registerTool(getCanonicalTransactionTool);
  registry.registerTool(getPaypalOrderTool);
  registry.registerTool(getPaypalCaptureTool);
  registry.registerTool(getPaypalRefundTool);
  registry.registerTool(getPaypalDisputeTool);
  registry.registerTool(listPaypalDisputesTool);
  registry.registerTool(searchRelatedTransactionsTool);
  registry.registerTool(getEvidenceDetailsTool);
  registry.registerTool(getEvidenceGraphTool);
  registry.registerTool(runBerrInvestigationTool);
  registry.registerTool(retrieveMissingEvidenceTool);
  registry.registerTool(generateInvestigationReportTool);

  // Draft Tools
  registry.registerTool(createDraftInformationRequestTool);
  registry.registerTool(createDraftBuyerMessageTool);
  registry.registerTool(createDraftMerchantMessageTool);
  registry.registerTool(createDraftResolutionProposalTool);
  registry.registerTool(createInvestigationSummaryTool);
  registry.registerTool(createMissingEvidenceChecklistTool);
  registry.registerTool(createHumanReviewRequestTool);

  // PayPal Proposal Tools (Human Approval Required)
  registry.registerTool(prepareRefundProposalTool);
  registry.registerTool(prepareDisputeResponseTool);
  registry.registerTool(prepareMerchantEnquiryTool);
  registry.registerTool(prepareCustomerResponseTool);
  registry.registerTool(prepareEvidenceRequestTool);
  registry.registerTool(prepareResolutionSummaryTool);

  // Review Tools
  registry.registerTool(validateClaimEvidenceLinksTool);
  registry.registerTool(validateSourceCitationsTool);
  registry.registerTool(validatePolicyConditionsTool);
  registry.registerTool(validateAgentResultTool);

  registered = true;
  return registry;
}
