/**
 * RESOLVEGRAPH — Role-Aware Seller Identity Extraction Service
 *
 * Extracts seller identity from buyer-submitted purchase documents (PDF invoices,
 * order confirmations, OCR text) while strictly separating:
 * - Actual product seller (Sold By / Seller / Supplier / Seller GSTIN)
 * - Marketplace platform (Flipkart, Amazon, etc.)
 * - Transportation / Logistics / Platform Fee billing entity (e.g. Flipkart India Private Limited)
 * - Buyer / Consignee
 *
 * Never forces an entity from a transportation/billing section as the product seller.
 */

import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { PdfExtractor } from '@/server/ai/extraction/pdf-extractor';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { DataRedactor } from '@/server/ai/security/data-redactor';
import { ContentSanitizer } from '@/server/ai/security/content-sanitizer';
import {
  normalizeMarketplaceName,
  type DocumentEntityDetection,
  type ExtractedSellerIdentity,
  type NormalizedMarketplace,
} from './seller.types';

const GSTIN_REGEX = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/g;
const PAN_REGEX = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g;

const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
};

const NON_SELLER_TRANSPORT_OR_MARKETPLACE_PATTERNS = [
  /flipkart\s+india\s+private\s+limited/i,
  /flipkart\s+internet\s+private\s+limited/i,
  /amazon\s+seller\s+services/i,
  /amazon\s+transportation/i,
  /ekart\s+logistics/i,
  /instakart\s+services/i,
  /delhivery/i,
  /blue\s*dart/i,
  /shadowfax/i,
  /xpressbees/i,
  /ecom\s+express/i,
  /meesho\s+logistics/i,
  /valmo/i,
];

const TRANSPORT_OR_BILLING_SECTION_KEYWORDS = [
  'bill of supply',
  'transportation',
  'shipping charges',
  'delivery charges',
  'handling charges',
  'platform fee',
  'logistics provider',
  'logistics',
  'courier',
  'carrier',
  'billed to',
  'billing address',
  'shipping address',
  'shipped to',
  'consignee',
  'customer address',
];

const SELLER_LABEL_REGEX =
  /^(?:sold\s*by|seller\s*(?:name|legal\s*name|details)?|supplier(?:\s*name)?|merchant(?:\s*name)?|vendor(?:\s*name)?)\s*[:\-–]?\s*(.*)$/i;

const KNOWN_COMPANY_SUFFIX_REGEX =
  /\b(?:private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|inc\.?|llc|enterprises|traders|retail|electronics|consumers?|solutions|impex|exports|industries|corp\.?|corporation)\b/i;

export interface SellerExtractionSourceDocument {
  evidenceId?: string;
  filename: string;
  mimeType: string;
  storageKey?: string;
  rawText?: string;
}

export interface SellerOcrProvider {
  extractTextFromImage(params: {
    evidenceId?: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<string | null>;
}

export interface ExtractSellerInput {
  caseId: string;
  marketplaceHint?: string;
  orderIdHint?: string;
  productNameHint?: string;
  documents: SellerExtractionSourceDocument[];
  ocrProvider?: SellerOcrProvider;
}

function maskPan(rawPan: string): { panMasked: string; panHash: string } {
  const upper = rawPan.trim().toUpperCase();
  const masked = `${upper.slice(0, 2)}XXX${upper.slice(5, 9)}${upper.slice(9)}`;
  const hash = createHash('sha256').update(upper).digest('hex');
  return { panMasked: masked, panHash: hash };
}

function isNonSellerPlatformOrLogistics(name: string, contextText: string): boolean {
  const lowerContext = contextText.toLowerCase();
  const isKnownPlatformOrLogistics = NON_SELLER_TRANSPORT_OR_MARKETPLACE_PATTERNS.some((p) =>
    p.test(name)
  );
  if (!isKnownPlatformOrLogistics) return false;

  // Even if it appears near "Bill of Supply", "Transportation", "Logistics", or "Marketplace"
  if (
    TRANSPORT_OR_BILLING_SECTION_KEYWORDS.some((kw) => lowerContext.includes(kw)) ||
    /tax\s+invoice/i.test(lowerContext) === false ||
    /sold\s*by/i.test(lowerContext)
  ) {
    return true;
  }
  return true;
}

function cleanCompanyName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[:\-–|,\s]+|[:\-–|,\s]+$/g, '')
    .trim();
}

function looksUnreadableOrGarbled(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return true;
  const alnumCount = (trimmed.match(/[A-Za-z0-9]/g) || []).length;
  const questionOrReplacement = (trimmed.match(/[?□]/g) || []).length;
  if (alnumCount < 2) return true;
  if (questionOrReplacement >= 2 && questionOrReplacement / trimmed.length > 0.15) return true;
  return false;
}

function detectMarketplaceFromText(text: string, hint?: string): NormalizedMarketplace {
  if (/flipkart/i.test(text)) return 'FLIPKART';
  if (/amazon(?:\.in|\.com|\s+seller|\s+pay)?/i.test(text)) return 'AMAZON';
  if (/\bmeesho\b/i.test(text)) return 'MEESHO';
  if (/\bmyntra\b/i.test(text)) return 'MYNTRA';
  if (/\bolx\b/i.test(text)) return 'OLX';
  if (/\bshopify\b/i.test(text)) return 'SHOPIFY';
  return normalizeMarketplaceName(hint);
}

function extractStateFromTextOrGstin(text: string, gstin: string | null): string | null {
  if (gstin && gstin.length >= 2) {
    const code = gstin.slice(0, 2);
    if (INDIAN_STATE_CODES[code]) return INDIAN_STATE_CODES[code];
  }

  for (const stateName of Object.values(INDIAN_STATE_CODES)) {
    const regex = new RegExp(`\\b${stateName.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(text)) return stateName;
  }
  return null;
}

function extractOrderIdFromText(text: string, hint?: string): string | null {
  const cleanHint = hint?.trim() || null;
  const patterns = [
    /\bOrder\s*(?:ID|No\.?|Number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{5,30})/i,
    /\b(OD[0-9]{12,24})\b/i,
    /\b([0-9]{3}-[0-9]{7}-[0-9]{7})\b/, // Amazon order ID format
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const extracted = m[1].trim();
      if (
        cleanHint &&
        (extracted.endsWith('-') ||
          (cleanHint.toLowerCase().startsWith(extracted.toLowerCase()) &&
            extracted.length < cleanHint.length))
      ) {
        return cleanHint;
      }
      if (!extracted.endsWith('-')) return extracted;
    }
  }
  return cleanHint;
}

function extractInvoiceNumberFromText(text: string): string | null {
  const match = text.match(
    /\bInvoice\s*(?:Number|No\.?|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,32})/i
  );
  return match?.[1]?.trim() || null;
}

function extractMarketplaceSellerId(text: string): string | null {
  const match = text.match(
    /\b(?:Seller\s*ID|Merchant\s*ID|Store\s*ID|FSN\s*Seller|Seller\s*Code)\s*[:\-]?\s*([A-Z0-9_\-]{4,32})/i
  );
  return match?.[1]?.trim() || null;
}

export class SellerExtractionService {
  /**
   * Reads text from a buyer document (raw text, PDF via PdfExtractor, or optional OCR provider).
   */
  public static async loadDocumentText(
    doc: SellerExtractionSourceDocument,
    ocrProvider?: SellerOcrProvider
  ): Promise<{ text: string; pageCount: number; isScanned: boolean }> {
    if (doc.rawText && doc.rawText.trim().length > 0) {
      return { text: doc.rawText, pageCount: 1, isScanned: false };
    }

    if (!doc.storageKey) {
      return { text: '', pageCount: 0, isScanned: false };
    }

    const fullPath = evidenceStorage.resolveExistingPath(doc.storageKey);
    if (!fullPath) {
      return { text: '', pageCount: 0, isScanned: false };
    }

    const ext = path.extname(fullPath).toLowerCase();
    const mime = doc.mimeType.toLowerCase();

    if (mime === 'application/pdf' || ext === '.pdf') {
      try {
        const pdfOut = await PdfExtractor.extract(fullPath);
        return {
          text: pdfOut.fullText,
          pageCount: pdfOut.pageCount,
          isScanned: pdfOut.isScanned,
        };
      } catch {
        return { text: '', pageCount: 1, isScanned: true };
      }
    }

    if (mime.startsWith('image/') && ocrProvider) {
      const buf = await fs.readFile(fullPath);
      const ocrText = await ocrProvider.extractTextFromImage({
        evidenceId: doc.evidenceId,
        filename: doc.filename,
        mimeType: doc.mimeType,
        buffer: buf,
      });
      return { text: ocrText || '', pageCount: 1, isScanned: true };
    }

    if (mime.startsWith('text/') || ['.txt', '.csv', '.json'].includes(ext)) {
      const raw = await fs.readFile(fullPath, 'utf-8');
      return { text: raw, pageCount: 1, isScanned: false };
    }

    return { text: '', pageCount: 1, isScanned: false };
  }

  /**
   * Deterministic role-aware seller extraction from invoice / order text.
   * Separates product sellers from transportation/marketplace billing entities.
   */
  public static extractFromText(params: {
    text: string;
    sourceDocumentId?: string | null;
    pageNumber?: number | null;
    marketplaceHint?: string;
    orderIdHint?: string;
    productNameHint?: string;
  }): ExtractedSellerIdentity {
    // Redact sensitive credentials/cards first while preserving business identifiers (GSTIN/names)
    const redacted = DataRedactor.redact(params.text || '');
    const cleanText = ContentSanitizer.sanitize(redacted.redactedText, 'invoice_ocr')
      .sanitizedContent.replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\/?untrusted_invoice_ocr>/g, '')
      .trim();

    const lines = cleanText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const detectedEntities: DocumentEntityDetection[] = [];
    const sellerCandidates: Array<{
      name: string;
      gstin: string | null;
      address: string | null;
      sectionLabel: string;
      excerpt: string;
      confidence: number;
      unreadable: boolean;
    }> = [];

    // 1. Scan for explicit "Sold By / Seller / Supplier" blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Inline "Sold By: XYZ, Address... GSTIN: ..." or multi-line block
      const labelMatch = line.match(SELLER_LABEL_REGEX);
      if (labelMatch) {
        const inlineRest = cleanCompanyName(labelMatch[1] || '');
        const windowLines = [line, ...lines.slice(i + 1, Math.min(lines.length, i + 7))];
        const windowText = windowLines.join('\n');

        let candidateName = '';
        if (inlineRest && !/^[:\-–]?$/.test(inlineRest) && !/^gstin/i.test(inlineRest)) {
          // Strip trailing comma address or GSTIN on same line if separated cleanly
          candidateName = cleanCompanyName(
            inlineRest.split(/\b(?:GSTIN|Address|PAN|State|PIN)\b/i)[0].split(',')[0]
          );
        } else if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!/^(?:GSTIN|PAN|Order|Invoice|Billed|Shipped)/i.test(nextLine)) {
            candidateName = cleanCompanyName(
              nextLine.split(/\b(?:GSTIN|Address|PAN)\b/i)[0].split(',')[0]
            );
          }
        }

        const gstinMatches = windowText.match(GSTIN_REGEX) || [];
        const sellerGstinMatch = windowText.match(
          /\b(?:Seller\s*)?GSTIN(?:\s*(?:No\.?|Number))?\s*[:\-]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i
        );
        const blockGstin = sellerGstinMatch?.[1] || gstinMatches[0] || null;

        // Gather address lines inside this block (excluding GSTIN/PAN/Order/SoldBy header)
        const addressParts: string[] = [];
        for (let k = 1; k < windowLines.length; k++) {
          const wl = windowLines[k];
          if (
            /^(?:sold\s*by|billed\s*to|shipped\s*to|order\s*id|invoice|tax\s*invoice|description|qty|total|bill\s*of\s*supply)/i.test(
              wl
            )
          ) {
            break;
          }
          if (!/^(?:GSTIN|PAN)\s*[:\-]/i.test(wl) && wl !== candidateName) {
            addressParts.push(wl);
          }
        }

        if (candidateName) {
          const unreadable = looksUnreadableOrGarbled(candidateName);
          if (isNonSellerPlatformOrLogistics(candidateName, windowText)) {
            detectedEntities.push({
              name: candidateName,
              role: 'LOGISTICS_PROVIDER',
              gstin: blockGstin || undefined,
              sectionLabel: line.slice(0, 40),
              pageNumber: params.pageNumber || 1,
              confidence: 0.9,
              reason:
                'Matched known marketplace/logistics entity inside shipping or billing context rather than product seller.',
            });
          } else {
            sellerCandidates.push({
              name: candidateName,
              gstin: blockGstin,
              address: addressParts.join(', ') || null,
              sectionLabel: line.split(/[:\-]/)[0].trim(),
              excerpt: windowLines.slice(0, 4).join(' | '),
              confidence: unreadable ? 0.35 : blockGstin ? 0.96 : 0.84,
              unreadable,
            });
            detectedEntities.push({
              name: candidateName,
              role: unreadable ? 'AMBIGUOUS' : 'SELLER',
              gstin: blockGstin || undefined,
              address: addressParts.join(', ') || undefined,
              sectionLabel: line.split(/[:\-]/)[0].trim(),
              pageNumber: params.pageNumber || 1,
              confidence: unreadable ? 0.35 : blockGstin ? 0.96 : 0.84,
              reason: unreadable
                ? 'Seller name appears partially unreadable or corrupted by OCR.'
                : 'Explicitly labeled in Sold By / Seller / Supplier section.',
            });
          }
        }
      }

      // 2. Detect transportation / Bill of Supply / Billing entities separately
      const lowerLine = line.toLowerCase();
      if (
        TRANSPORT_OR_BILLING_SECTION_KEYWORDS.some((kw) => lowerLine.includes(kw)) ||
        NON_SELLER_TRANSPORT_OR_MARKETPLACE_PATTERNS.some((p) => p.test(line))
      ) {
        const windowText = lines.slice(i, Math.min(lines.length, i + 4)).join(' ');
        for (const pat of NON_SELLER_TRANSPORT_OR_MARKETPLACE_PATTERNS) {
          const m = windowText.match(pat);
          if (m && !detectedEntities.some((e) => e.name.toLowerCase() === m[0].toLowerCase())) {
            const role: DocumentEntityDetection['role'] =
              /bill of supply|transportation|logistics|courier|shipping/i.test(windowText)
                ? 'LOGISTICS_PROVIDER'
                : 'MARKETPLACE';
            const gst = windowText.match(GSTIN_REGEX)?.[0];
            detectedEntities.push({
              name: m[0],
              role,
              gstin: gst,
              sectionLabel: line.slice(0, 50),
              pageNumber: params.pageNumber || 1,
              confidence: 0.93,
              reason:
                role === 'LOGISTICS_PROVIDER'
                  ? 'Appears in transportation / Bill of Supply / logistics billing section, not product seller.'
                  : 'Appears as marketplace platform operator.',
            });
          }
        }

        // Capture Consignor / Consignee / Billed To names for provenance
        const roleMatch = line.match(
          /^(consignor|consignee|billed\s*to|shipped\s*to|billed\s*from|shipped\s*from)\s*[:\-]?\s*(.+)$/i
        );
        if (roleMatch) {
          const roleKey = roleMatch[1].toUpperCase().replace(/\s+/g, '_');
          const entityVal = cleanCompanyName(roleMatch[2]);
          if (entityVal) {
            const mappedRole: DocumentEntityDetection['role'] =
              roleKey === 'CONSIGNOR'
                ? 'CONSIGNOR'
                : roleKey === 'CONSIGNEE' || roleKey === 'BILLED_TO' || roleKey === 'SHIPPED_TO'
                ? 'CONSIGNEE'
                : 'BILLING_ENTITY';
            detectedEntities.push({
              name: entityVal,
              role: mappedRole,
              sectionLabel: roleMatch[1],
              pageNumber: params.pageNumber || 1,
              confidence: 0.8,
              reason: `Labeled under ${roleMatch[1]} section.`,
            });
          }
        }
      }
    }

    // 3. Fallback scan for standalone company names ONLY if no explicit Seller candidate found
    if (sellerCandidates.length === 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!KNOWN_COMPANY_SUFFIX_REGEX.test(line)) continue;
        const contextSlice = lines
          .slice(Math.max(0, i - 2), Math.min(lines.length, i + 3))
          .join(' ');
        if (isNonSellerPlatformOrLogistics(line, contextSlice)) continue;
        if (TRANSPORT_OR_BILLING_SECTION_KEYWORDS.some((kw) => contextSlice.toLowerCase().includes(kw))) {
          detectedEntities.push({
            name: cleanCompanyName(line),
            role: 'BILLING_ENTITY',
            sectionLabel: 'Billing/Transport context',
            pageNumber: params.pageNumber || 1,
            confidence: 0.55,
            reason: 'Entity with corporate suffix found only inside billing or transport context.',
          });
          continue;
        }
        const candName = cleanCompanyName(line.split(',')[0]);
        if (candName) {
          const blockGst = contextSlice.match(GSTIN_REGEX)?.[0] || null;
          sellerCandidates.push({
            name: candName,
            gstin: blockGst,
            address: null,
            sectionLabel: 'Unlabeled Corporate Entity',
            excerpt: line,
            confidence: blockGst ? 0.65 : 0.48,
            unreadable: looksUnreadableOrGarbled(candName),
          });
          detectedEntities.push({
            name: candName,
            role: 'AMBIGUOUS',
            gstin: blockGst || undefined,
            pageNumber: params.pageNumber || 1,
            confidence: 0.5,
            reason: 'Corporate name found without explicit Sold By / Seller label.',
          });
        }
      }
    }

    // Deduplicate candidates by normalized name
    const uniqueCandidates = new Map<string, (typeof sellerCandidates)[number]>();
    for (const c of sellerCandidates) {
      const key = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const existing = uniqueCandidates.get(key);
      if (!existing || c.confidence > existing.confidence) {
        uniqueCandidates.set(key, c);
      }
    }
    const deduped = Array.from(uniqueCandidates.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    const ambiguityReasons: string[] = [];
    if (deduped.length > 1) {
      const top = deduped[0];
      const second = deduped[1];
      if (Math.abs(top.confidence - second.confidence) < 0.15 || (top.gstin && second.gstin && top.gstin !== second.gstin)) {
        ambiguityReasons.push(
          `Multiple distinct seller candidates found in document: "${top.name}" and "${second.name}".`
        );
      }
    }

    const primary = deduped[0] || null;
    if (primary?.unreadable) {
      ambiguityReasons.push('Primary extracted seller name appears partially unreadable / OCR-degraded.');
    }
    if (!primary) {
      ambiguityReasons.push('No clear Sold By / Seller entity identified in source document.');
    }

    // Extract PAN only if explicitly present in input text, and mask/hash immediately
    let panMasked: string | null = null;
    let panHash: string | null = null;
    const explicitPanMatch = (params.text || '').match(
      /\bPAN\s*(?:No\.?|Number)?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])\b/i
    );
    if (explicitPanMatch?.[1]) {
      const masked = maskPan(explicitPanMatch[1]);
      panMasked = masked.panMasked;
      panHash = masked.panHash;
    } else if (primary?.gstin && primary.gstin.length === 15) {
      const inlinePan = primary.excerpt.match(PAN_REGEX);
      if (inlinePan?.[0]) {
        const masked = maskPan(inlinePan[0]);
        panMasked = masked.panMasked;
        panHash = masked.panHash;
      }
    }

    const marketplace = detectMarketplaceFromText(cleanText, params.marketplaceHint);
    const extractedGstin = primary?.gstin || null;
    const state = extractStateFromTextOrGstin(primary?.address || cleanText, extractedGstin);
    const orderId = extractOrderIdFromText(cleanText, params.orderIdHint);
    const invoiceNumber = extractInvoiceNumberFromText(cleanText);
    const marketplaceSellerId = extractMarketplaceSellerId(cleanText);

    let sellerRelationship = 'UNKNOWN';
    if (primary) {
      sellerRelationship =
        marketplace === 'DIRECT' || marketplace === 'OTHER'
          ? 'DIRECT_SELLER'
          : 'MARKETPLACE_THIRD_PARTY_SELLER';
    }

    const isAmbiguous =
      ambiguityReasons.length > 0 || !primary || primary.unreadable || primary.confidence < 0.6;

    return {
      legalName: primary?.name || null,
      displayName: primary?.name || null,
      gstin: extractedGstin,
      panMasked,
      panHash,
      businessAddress: primary?.address || null,
      state,
      marketplace,
      marketplaceSellerId,
      orderId,
      invoiceNumber,
      productName: params.productNameHint?.trim() || null,
      sellerRelationship,
      sourceDocumentId: params.sourceDocumentId ?? null,
      pageNumber: params.pageNumber ?? 1,
      sourceExcerpt: primary?.excerpt || null,
      detectedEntities,
      isAmbiguous,
      ambiguityReasons,
      confidence: primary ? primary.confidence : 0,
      extractionMethod: 'DETERMINISTIC_LAYOUT_OCR',
    };
  }

  /**
   * Runs extraction across all buyer-submitted documents for a case, prioritizing
   * invoices and receipts over photos or generic attachments.
   */
  public static async extractForCase(
    input: ExtractSellerInput
  ): Promise<ExtractedSellerIdentity> {
    const prioritized = [...input.documents].sort((a, b) => {
      const score = (d: SellerExtractionSourceDocument) => {
        const n = d.filename.toLowerCase();
        if (n.includes('invoice') || d.mimeType === 'application/pdf') return 3;
        if (n.includes('receipt') || n.includes('order')) return 2;
        return 1;
      };
      return score(b) - score(a);
    });

    let bestResult: ExtractedSellerIdentity | null = null;

    for (const doc of prioritized) {
      const loaded = await this.loadDocumentText(doc, input.ocrProvider);
      if (!loaded.text || loaded.text.trim().length < 5) continue;

      const extracted = this.extractFromText({
        text: loaded.text,
        sourceDocumentId: doc.evidenceId ?? null,
        pageNumber: 1,
        marketplaceHint: input.marketplaceHint,
        orderIdHint: input.orderIdHint,
        productNameHint: input.productNameHint,
      });

      if (
        !bestResult ||
        (extracted.legalName && !bestResult.legalName) ||
        extracted.confidence > bestResult.confidence
      ) {
        bestResult = extracted;
      }

      if (extracted.legalName && extracted.gstin && !extracted.isAmbiguous) {
        return extracted;
      }
    }

    if (bestResult) {
      return bestResult;
    }

    return {
      legalName: null,
      displayName: null,
      gstin: null,
      panMasked: null,
      panHash: null,
      businessAddress: null,
      state: null,
      marketplace: normalizeMarketplaceName(input.marketplaceHint),
      marketplaceSellerId: null,
      orderId: input.orderIdHint?.trim() || null,
      invoiceNumber: null,
      productName: input.productNameHint?.trim() || null,
      sellerRelationship: 'UNKNOWN',
      sourceDocumentId: prioritized[0]?.evidenceId ?? null,
      pageNumber: null,
      sourceExcerpt: null,
      detectedEntities: [],
      isAmbiguous: true,
      ambiguityReasons: ['No readable invoice or order text available for seller identity extraction.'],
      confidence: 0,
      extractionMethod: 'ORDER_METADATA_FALLBACK',
    };
  }
}
