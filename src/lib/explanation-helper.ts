/**
 * RESOLVEGRAPH — Consumer Plain-Language Explanation Helper
 * 
 * Translates complex technical reasoning, BERR discrepancy matrices,
 * and policy constraints into clear, empathetic, jargon-free language
 * designed for consumers and buyers.
 */

export interface ConsumerStatusExplanation {
  headline: string;
  summary: string;
  evidenceHighlights: string[];
  recommendedNextStep: string;
  humanSignOffNote: string;
}

export class PlainLanguageExplanationHelper {
  /**
   * Generates a plain-language explanation for a dispute case.
   */
  public static explainCaseStatus(params: {
    category: string;
    totalDiscrepancyScore: number;
    hasContradiction: boolean;
    missingEvidenceTypes?: string[];
    recommendedRemedy?: string;
    partyRole?: 'BUYER' | 'MERCHANT' | 'NEUTRAL';
  }): ConsumerStatusExplanation {
    const { category, totalDiscrepancyScore, hasContradiction, missingEvidenceTypes, recommendedRemedy } = params;

    let headline = 'Your case is currently being reviewed';
    let summary = 'Our bilateral evidence system is actively comparing order records and claims.';
    const evidenceHighlights: string[] = [];
    let recommendedNextStep = 'No action needed at this time.';

    // 1. Evaluate Discrepancy & Evidence
    if (totalDiscrepancyScore >= 0.6 || hasContradiction) {
      headline = 'Factual Discrepancy Identified';
      summary = `The evidence indicates a clear difference between the item ordered and the item received (${category.toLowerCase()}).`;
      evidenceHighlights.push('Order documentation and customer photos demonstrate a specification or condition mismatch.');
    } else if (totalDiscrepancyScore >= 0.25) {
      headline = 'Partial Evidence Alignment';
      summary = 'Both parties have submitted valid points. A fair partial settlement or exchange is being considered.';
      evidenceHighlights.push('Carrier delivery timestamps and merchant packaging slips align on dispatch details.');
    } else {
      headline = 'Records Align with Standard Fulfillment';
      summary = 'Documentation shows the transaction proceeded according to standard store policies.';
      evidenceHighlights.push('Order checkout itemization matches the delivered tracking records.');
    }

    // 2. Handle Missing Evidence
    if (missingEvidenceTypes && missingEvidenceTypes.length > 0) {
      recommendedNextStep = `Please upload: ${missingEvidenceTypes.join(', ').toLowerCase()}.`;
      evidenceHighlights.push(`Additional proof needed: ${missingEvidenceTypes.join(', ')}.`);
    } else if (recommendedRemedy) {
      switch (recommendedRemedy) {
        case 'FULL_REFUND':
          recommendedNextStep = 'A full refund has been proposed and is awaiting merchant sign-off.';
          break;
        case 'PARTIAL_REFUND':
          recommendedNextStep = 'A proportional partial refund has been drafted to cover the discrepancy.';
          break;
        case 'REPLACEMENT':
          recommendedNextStep = 'A direct item replacement has been recommended at no additional cost.';
          break;
        case 'STORE_CREDIT':
          recommendedNextStep = 'Store credit has been recommended to resolve the policy exception.';
          break;
        case 'REQUEST_MORE_EVIDENCE':
          recommendedNextStep = 'More documentation is required before a final decision can be made.';
          break;
        default:
          recommendedNextStep = 'A senior dispute specialist has been assigned to conduct human review.';
          break;
      }
    }

    return {
      headline,
      summary,
      evidenceHighlights,
      recommendedNextStep,
      humanSignOffNote: 'All financial actions (refunds, credits) require explicit human operator approval before funds move.',
    };
  }

  /**
   * Formats technical evidence badges into consumer-friendly labels.
   */
  public static formatEvidenceLabel(evidenceType: string, filename?: string): string {
    switch (evidenceType.toUpperCase()) {
      case 'INVOICE':
        return 'Official Checkout Sales Invoice';
      case 'TRACKING_PROOF':
        return 'Carrier Delivery & Tracking Scan';
      case 'DAMAGE_PHOTO':
        return 'Customer Unboxing Photo';
      case 'PACKAGING_PHOTO':
        return 'Warehouse Packaging Photo';
      case 'RETURN_RECEIPT':
        return 'Carrier Return Drop-off Receipt';
      case 'CUSTOMER_CHAT':
        return 'Support Chat Transcript';
      default:
        return filename || 'Supporting Document';
    }
  }
}
