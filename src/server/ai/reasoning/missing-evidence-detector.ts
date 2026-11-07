import { MissingEvidenceItem } from '../schemas/berr.schema';

export class MissingEvidenceDetector {
  /**
   * Analyzes dispute category and attached evidence types to pinpoint missing evidentiary documentation.
   */
  public static detectMissingEvidence(params: {
    category: string;
    existingEvidenceTypes: string[];
    hasCarrierTracking: boolean;
    hasSignatureProof: boolean;
    hasPackagingPhotos: boolean;
    hasReturnLabel: boolean;
  }): MissingEvidenceItem[] {
    const missing: MissingEvidenceItem[] = [];
    const cat = params.category.toUpperCase();

    // 1. NON_DELIVERY
    if (cat === 'NON_DELIVERY') {
      if (!params.hasCarrierTracking) {
        missing.push({
          party: 'MERCHANT',
          evidenceType: 'CARRIER_TRACKING_REPORT',
          importance: 'CRITICAL',
          reason: 'No formal carrier tracking scan or report has been submitted by the merchant.',
          suggestedAction: 'Request formal courier tracking log with destination address.'
        });
      }
      if (!params.hasSignatureProof) {
        missing.push({
          party: 'MERCHANT',
          evidenceType: 'PROOF_OF_DELIVERY_SIGNATURE',
          importance: 'RECOMMENDED',
          reason: 'Carrier tracking shows delivered status but lacks signed proof-of-delivery or GPS delivery coordinates.',
          suggestedAction: 'Obtain certified carrier proof-of-delivery document with recipient sign-off.'
        });
      }
    }

    // 2. NOT_AS_DESCRIBED
    if (cat === 'NOT_AS_DESCRIBED') {
      if (!params.existingEvidenceTypes.includes('RECEIPT')) {
        missing.push({
          party: 'MERCHANT',
          evidenceType: 'ITEMIZED_MERCHANT_INVOICE',
          importance: 'CRITICAL',
          reason: 'Original itemized invoice or order confirmation showing advertised SKU and specifications is missing.',
          suggestedAction: 'Request merchant order confirmation with technical specifications.'
        });
      }
      if (!params.existingEvidenceTypes.includes('PHOTO')) {
        missing.push({
          party: 'BUYER',
          evidenceType: 'PRODUCT_SERIAL_PHOTO',
          importance: 'CRITICAL',
          reason: 'No clear photograph of received item serial number or capacity label has been provided by the buyer.',
          suggestedAction: 'Request buyer upload high-resolution photo of device settings or product label.'
        });
      }
    }

    // 3. DAMAGED_GOODS
    if (cat === 'DAMAGED_GOODS') {
      if (!params.hasPackagingPhotos) {
        missing.push({
          party: 'BUYER',
          evidenceType: 'EXTERNAL_PACKAGING_PHOTO',
          importance: 'CRITICAL',
          reason: 'Photographs of the external shipping box and protective cushioning are required to determine transit liability.',
          suggestedAction: 'Request buyer provide clear images of outer parcel with shipping label visible.'
        });
      }
    }

    // 4. REFUND_DISPUTE
    if (cat === 'REFUND_DISPUTE' || cat === 'RETURN_ISSUE') {
      if (!params.hasReturnLabel) {
        missing.push({
          party: 'BUYER',
          evidenceType: 'RETURN_CARRIER_RECEIPT',
          importance: 'CRITICAL',
          reason: 'Proof of return parcel handover or carrier drop-off receipt is missing.',
          suggestedAction: 'Request buyer upload return shipping carrier drop-off receipt.'
        });
      }
    }

    return missing;
  }
}
