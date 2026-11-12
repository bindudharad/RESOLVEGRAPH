/**
 * RESOLVEGRAPH — Seller Identification, Directory & Communication Gateway Types
 */

export type SellerIdentityStatus =
  | 'IDENTIFIED'
  | 'CANDIDATE'
  | 'UNVERIFIED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'REGISTERED'
  | 'INACTIVE'
  | 'REVIEW_REQUIRED';

export type SellerRegistrationStatus =
  | 'REGISTERED_VERIFIED'
  | 'IDENTIFIED_UNREGISTERED'
  | 'REQUIRES_REVIEW'
  | 'INACTIVE';

export type SellerMatchOutcome =
  | 'EXACT_MATCH'
  | 'VERIFIED_MATCH'
  | 'POSSIBLE_MATCH'
  | 'MULTIPLE_MATCHES'
  | 'NO_MATCH'
  | 'INSUFFICIENT_INFORMATION';

export type SellerCommunicationChannel =
  | 'SELLER_PORTAL'
  | 'MARKETPLACE_API'
  | 'CUSTOMER_ASSISTED_HELP_CENTRE'
  | 'REVIEW_REQUIRED';

export type SellerEvidenceRequestStatus =
  | 'DRAFT'
  | 'READY_TO_SEND'
  | 'SENT_TO_SELLER_PORTAL'
  | 'DELIVERY_PENDING'
  | 'DELIVERED'
  | 'VIEWED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_SELLER'
  | 'SELLER_RESPONDED'
  | 'ADDITIONAL_EVIDENCE_REQUIRED'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'MARKETPLACE_SUPPORT_PENDING'
  | 'NO_RESPONSE'
  | 'CANCELLED'
  | 'FAILED';

export type SellerCommunicationExecutionStatus =
  | 'SENT'
  | 'DELIVERED'
  | 'PENDING'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'CUSTOMER_REPORTED_SUBMISSION'
  | 'FAILED'
  | 'UNSUPPORTED';

export type RequestedItemResponseStatus =
  | 'PENDING'
  | 'PROVIDED'
  | 'NOT_AVAILABLE'
  | 'NOT_APPLICABLE'
  | 'EXPLANATION_REQUIRED';

export type SellerResponseStance =
  | 'AGREE'
  | 'DISAGREE'
  | 'CLARIFICATION_ONLY'
  | 'PARTIAL_AGREEMENT';

export type NormalizedMarketplace =
  | 'AMAZON'
  | 'FLIPKART'
  | 'OLX'
  | 'MEESHO'
  | 'MYNTRA'
  | 'SHOPIFY'
  | 'DIRECT'
  | 'OTHER';

export interface MarketplaceHelpCentreConfig {
  marketplace: NormalizedMarketplace;
  displayName: string;
  helpCentreUrl: string;
  supportChannelDescription: string;
}

export const MARKETPLACE_HELP_CENTRES: Record<NormalizedMarketplace, MarketplaceHelpCentreConfig> = {
  FLIPKART: {
    marketplace: 'FLIPKART',
    displayName: 'Flipkart',
    helpCentreUrl: 'https://www.flipkart.com/helpcentre',
    supportChannelDescription: 'Flipkart Order Support & Help Centre',
  },
  AMAZON: {
    marketplace: 'AMAZON',
    displayName: 'Amazon',
    helpCentreUrl: 'https://www.amazon.in/gp/help/customer/display.html',
    supportChannelDescription: 'Amazon Customer Service & Order Support',
  },
  OLX: {
    marketplace: 'OLX',
    displayName: 'OLX',
    helpCentreUrl: 'https://help.olx.in/',
    supportChannelDescription: 'OLX Help & Safety Centre',
  },
  MEESHO: {
    marketplace: 'MEESHO',
    displayName: 'Meesho',
    helpCentreUrl: 'https://www.meesho.com/help',
    supportChannelDescription: 'Meesho Help & Order Support',
  },
  MYNTRA: {
    marketplace: 'MYNTRA',
    displayName: 'Myntra',
    helpCentreUrl: 'https://www.myntra.com/contactus',
    supportChannelDescription: 'Myntra Customer Care & Order Support',
  },
  SHOPIFY: {
    marketplace: 'SHOPIFY',
    displayName: 'Online Store',
    helpCentreUrl: 'https://help.shopify.com/en/manual/orders',
    supportChannelDescription: 'Merchant Order Support Portal',
  },
  DIRECT: {
    marketplace: 'DIRECT',
    displayName: 'Direct Merchant',
    helpCentreUrl: '',
    supportChannelDescription: 'Direct Merchant Support',
  },
  OTHER: {
    marketplace: 'OTHER',
    displayName: 'Marketplace Support',
    helpCentreUrl: '',
    supportChannelDescription: 'Marketplace Official Order Support',
  },
};

export function normalizeMarketplaceName(raw?: string | null): NormalizedMarketplace {
  const val = (raw || '').trim().toUpperCase();
  if (val.includes('FLIPKART')) return 'FLIPKART';
  if (val.includes('AMAZON')) return 'AMAZON';
  if (val.includes('OLX')) return 'OLX';
  if (val.includes('MEESHO')) return 'MEESHO';
  if (val.includes('MYNTRA')) return 'MYNTRA';
  if (val.includes('SHOPIFY')) return 'SHOPIFY';
  if (val.includes('DIRECT')) return 'DIRECT';
  return 'OTHER';
}

/**
 * Configurable business follow-up interval in hours (not a hardcoded legal deadline).
 */
export function getSellerResponseWindowHours(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.SELLER_RESPONSE_WINDOW_HOURS);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 720) {
    return Math.round(raw);
  }
  return 48;
}

export interface RequestedEvidenceRequirement {
  key: string;
  label: string;
  description: string;
  mandatory: boolean;
  status: RequestedItemResponseStatus;
  sellerNote?: string;
}

export interface DocumentEntityDetection {
  name: string;
  role:
    | 'SELLER'
    | 'MARKETPLACE'
    | 'LOGISTICS_PROVIDER'
    | 'BILLING_ENTITY'
    | 'CONSIGNOR'
    | 'CONSIGNEE'
    | 'BUYER'
    | 'AMBIGUOUS';
  gstin?: string;
  address?: string;
  sectionLabel?: string;
  pageNumber?: number;
  confidence: number;
  reason: string;
}

export interface ExtractedSellerIdentity {
  legalName: string | null;
  displayName: string | null;
  gstin: string | null;
  panMasked: string | null;
  panHash: string | null;
  businessAddress: string | null;
  state: string | null;
  marketplace: NormalizedMarketplace;
  marketplaceSellerId: string | null;
  orderId: string | null;
  invoiceNumber: string | null;
  productName: string | null;
  sellerRelationship: string;
  sourceDocumentId: string | null;
  pageNumber: number | null;
  sourceExcerpt: string | null;
  detectedEntities: DocumentEntityDetection[];
  isAmbiguous: boolean;
  ambiguityReasons: string[];
  confidence: number;
  extractionMethod: 'DETERMINISTIC_LAYOUT_OCR' | 'AI_ASSISTED_EXTRACTION' | 'ORDER_METADATA_FALLBACK';
}

export interface DynamicFormFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  helpText?: string;
}

export interface DynamicSellerFormConfig {
  categoryKey: string;
  step2Title: string;
  step2Subtitle: string;
  step2Fields: DynamicFormFieldDef[];
  step2UploadTitle: string;
  step2UploadHints: string[];
  step3Title: string;
  step3Subtitle: string;
  step3Fields: DynamicFormFieldDef[];
  step3UploadTitle: string;
  step3UploadHints: string[];
}

export interface SellerStructuredResponseDetails {
  productAndPacking?: Record<string, string>;
  dispatchAndSettlement?: Record<string, string>;
}

export interface SellerDraftPayload {
  stance: SellerResponseStance;
  summary: string;
  additionalRemarks?: string;
  itemResponses: Array<{
    key: string;
    status: RequestedItemResponseStatus;
    note?: string;
  }>;
  structuredDetails?: SellerStructuredResponseDetails;
  currentStep?: number;
  updatedAt?: string;
}

export type SellerResponseVerificationDisplayStatus =
  | 'Submitted'
  | 'Under Verification'
  | 'Verified for Investigation'
  | 'Additional Information Required'
  | 'Human Review Required'
  | 'Verification Inconclusive';

