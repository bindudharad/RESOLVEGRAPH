/**
 * RESOLVEGRAPH — Seller Evidence Upload & Verification Pipeline
 *
 * Never trusts seller uploads automatically. Runs 10 verification checks and
 * outputs separate structured dimensions:
 * 1. File usability
 * 2. Document extraction
 * 3. Evidence relevance
 * 4. Information consistency
 * 5. Suspicious signals
 * 6. Human-review requirement
 */

import { prisma } from '@/lib/prisma';
import { detectMagicBytes } from '@/server/storage/evidence-storage';
import { EvidenceGuardService } from '@/server/services/evidenceguard.service';
import { PdfExtractor } from '@/server/ai/extraction/pdf-extractor';
import { VerificationStatus } from '@/generated/prisma/client';

export interface SellerEvidenceVerificationBreakdown {
  evidenceId: string;
  filename: string;
  sha256: string;
  fileUsability: {
    usable: boolean;
    detectedMimeType: string | null;
    declaredMimeType: string;
    sizeBytes: number;
    signatureValid: boolean;
    scanStatus: string;
    notes: string[];
  };
  documentExtraction: {
    performed: boolean;
    method: 'PDF_TEXT_EXTRACTOR' | 'IMAGE_HEADER_INSPECTION' | 'TEXT_READ' | 'NONE';
    pageCount: number;
    isScanned: boolean;
    extractedTextLength: number;
    excerpt: string;
    detectedOrderRefs: string[];
    detectedDates: string[];
  };
  evidenceRelevance: {
    relevant: boolean;
    score: number;
    matchedTerms: string[];
    reason: string;
  };
  informationConsistency: {
    consistent: boolean;
    orderIdMatched: boolean;
    productMatched: boolean;
    amountMatched: boolean;
    dateConsistent: boolean;
    notes: string[];
  };
  suspiciousSignals: Array<{
    code: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    detail: string;
  }>;
  humanReviewRequired: boolean;
  recommendedVerificationStatus: VerificationStatus;
  integrityDisclaimer: string;
}

export class SellerVerificationService {
  /**
   * Executes verification over a single persisted seller evidence item and its buffer.
   */
  public static async verifySellerEvidenceItem(params: {
    evidenceId: string;
    caseId: string;
    buffer: Buffer;
    filename: string;
    declaredMimeType: string;
    sha256: string;
    orderId: string;
    productName: string;
    amountMinor: number;
    caseCreatedAt: Date;
    scanStatus?: string;
  }): Promise<SellerEvidenceVerificationBreakdown> {
    const { buffer, filename, declaredMimeType, sha256 } = params;
    const usabilityNotes: string[] = [];
    const suspiciousSignals: SellerEvidenceVerificationBreakdown['suspiciousSignals'] = [];

    // 1. File signature & MIME validation
    const detectedSignatureMime = detectMagicBytes(buffer);
    const isTextFallback =
      declaredMimeType.startsWith('text/') || /\.(txt|csv|json)$/i.test(filename);
    const signatureValid = Boolean(detectedSignatureMime) || isTextFallback;
    const scanStatus = params.scanStatus || 'NOT_CONFIGURED';

    if (!signatureValid) {
      usabilityNotes.push('Binary file magic bytes did not match an accepted PDF/image/video signature.');
      suspiciousSignals.push({
        code: 'MAGIC_BYTE_MISMATCH',
        severity: 'HIGH',
        detail: `Declared MIME "${declaredMimeType}" could not be verified from file header bytes.`,
      });
    }
    if (scanStatus === 'INFECTED') {
      usabilityNotes.push('Malware scanner flagged file as INFECTED.');
      suspiciousSignals.push({
        code: 'MALWARE_INFECTED',
        severity: 'HIGH',
        detail: 'Upload blocked due to positive malware scan status.',
      });
    }

    // 2. Run EvidenceGuardService (SHA-256 check, duplicate dHash, EXIF, invoice cross-check)
    const guardResult = await EvidenceGuardService.analyzeEvidence(params.evidenceId, buffer);
    if (guardResult.isDuplicateImage) {
      suspiciousSignals.push({
        code: 'DUPLICATE_PERCEPTUAL_HASH',
        severity: 'MEDIUM',
        detail: `Image matches existing evidence item ${guardResult.duplicateEvidenceId || 'on record'}.`,
      });
    }
    for (const sig of guardResult.signals) {
      if (sig.status === 'FAIL') {
        suspiciousSignals.push({
          code: sig.type,
          severity: 'HIGH',
          detail: sig.detail,
        });
      }
    }

    // 3. Image quality sanity check
    if (declaredMimeType.startsWith('image/')) {
      if (buffer.byteLength < 64) {
        usabilityNotes.push('Image payload is unusually tiny (<64 bytes) and may lack readable detail.');
        suspiciousSignals.push({
          code: 'LOW_IMAGE_PAYLOAD',
          severity: 'MEDIUM',
          detail: 'Image byte size is too small for reliable visual inspection.',
        });
      }
    }

    // 4. Document OCR / Text Extraction
    let extractedText = '';
    let extractionMethod: SellerEvidenceVerificationBreakdown['documentExtraction']['method'] =
      'NONE';
    let pageCount = 1;
    let isScanned = false;

    if (declaredMimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfOut = await PdfExtractor.extract(buffer);
        extractedText = pdfOut.fullText || '';
        pageCount = pdfOut.pageCount;
        isScanned = pdfOut.isScanned;
        extractionMethod = 'PDF_TEXT_EXTRACTOR';
        if (isScanned && extractedText.trim().length < 20) {
          usabilityNotes.push('PDF appears to be a scanned image without an embedded text layer.');
        }
      } catch {
        extractedText = buffer.toString('utf8');
        extractionMethod = 'TEXT_READ';
      }
    } else if (isTextFallback) {
      extractedText = buffer.toString('utf8');
      extractionMethod = 'TEXT_READ';
    } else if (declaredMimeType.startsWith('image/')) {
      extractionMethod = 'IMAGE_HEADER_INSPECTION';
    }

    const detectedOrderRefs = Array.from(
      new Set(
        (extractedText.match(/\b(?:OD[0-9]{10,24}|[0-9]{3}-[0-9]{7}-[0-9]{7}|ORD-[A-Z0-9-]+|INV-[A-Z0-9-]+)\b/gi) ||
          [])
      )
    );
    const detectedDates = Array.from(
      new Set(
        (extractedText.match(/\b(202[0-9]-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/202[0-9])\b/g) ||
          [])
      )
    );

    // 5. Product & Order Relevance + Consistency Checks
    const lowerText = `${filename} ${extractedText}`.toLowerCase();
    const productTokens = params.productName
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);
    const matchedTerms = productTokens.filter((t) => lowerText.includes(t));

    const orderIdMatched =
      Boolean(params.orderId) && lowerText.includes(params.orderId.toLowerCase());
    const amountMajor = (params.amountMinor / 100).toFixed(2);
    const amountInt = String(Math.round(params.amountMinor / 100));
    const amountMatched =
      extractedText.includes(amountMajor) ||
      (amountInt.length >= 3 && extractedText.includes(amountInt));

    const consistencyNotes: string[] = [];
    let dateConsistent = true;

    for (const rawDate of detectedDates) {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        // Check for unrealistic future dates (> 7 days ahead)
        if (parsed.getTime() > Date.now() + 7 * 86400 * 1000) {
          dateConsistent = false;
          consistencyNotes.push(`Document contains a future date (${rawDate}).`);
          suspiciousSignals.push({
            code: 'FUTURE_TIMESTAMP_IN_DOCUMENT',
            severity: 'MEDIUM',
            detail: `Detected future date ${rawDate} inside uploaded seller document.`,
          });
        }
      }
    }

    if (orderIdMatched) {
      consistencyNotes.push(`Order reference ${params.orderId} corroborated in seller document.`);
    } else if (extractedText.length > 40) {
      consistencyNotes.push(`Order reference ${params.orderId} was not explicitly detected in extracted text.`);
    }

    if (amountMatched) {
      consistencyNotes.push(`Transaction amount corroborated in document.`);
    }

    const relevant =
      orderIdMatched ||
      matchedTerms.length > 0 ||
      /(packing|dispatch|waybill|awb|serial|sku|invoice|qc|inspection|weight|photo|slip|refund)/i.test(
        lowerText
      );
    const relevanceScore = orderIdMatched
      ? 0.95
      : matchedTerms.length > 0
      ? Math.min(0.9, 0.55 + matchedTerms.length * 0.1)
      : relevant
      ? 0.68
      : 0.35;

    const hasHighSuspicion = suspiciousSignals.some((s) => s.severity === 'HIGH');
    const usable = signatureValid && scanStatus !== 'INFECTED' && buffer.byteLength > 0;
    const humanReviewRequired =
      !usable ||
      hasHighSuspicion ||
      suspiciousSignals.length > 0 ||
      !relevant ||
      !dateConsistent ||
      guardResult.humanReviewRecommended;

    let recommendedVerificationStatus: VerificationStatus = VerificationStatus.UNVERIFIED;
    if (!usable || hasHighSuspicion) {
      recommendedVerificationStatus = VerificationStatus.SUSPICIOUS;
    } else if (guardResult.assessmentState === 'VERIFIED_SOURCE' && !humanReviewRequired) {
      recommendedVerificationStatus = VerificationStatus.VERIFIED;
    }

    await prisma.evidence.update({
      where: { id: params.evidenceId },
      data: { verificationStatus: recommendedVerificationStatus },
    });

    return {
      evidenceId: params.evidenceId,
      filename,
      sha256,
      fileUsability: {
        usable,
        detectedMimeType: detectedSignatureMime,
        declaredMimeType,
        sizeBytes: buffer.byteLength,
        signatureValid,
        scanStatus,
        notes: usabilityNotes,
      },
      documentExtraction: {
        performed: extractionMethod !== 'NONE',
        method: extractionMethod,
        pageCount,
        isScanned,
        extractedTextLength: extractedText.length,
        excerpt: extractedText.slice(0, 240),
        detectedOrderRefs,
        detectedDates,
      },
      evidenceRelevance: {
        relevant,
        score: Number(relevanceScore.toFixed(2)),
        matchedTerms,
        reason: relevant
          ? 'Uploaded artifact aligns with order/fulfillment context.'
          : 'No clear order or product terms matched; investigator review recommended.',
      },
      informationConsistency: {
        consistent: dateConsistent && !hasHighSuspicion,
        orderIdMatched,
        productMatched: matchedTerms.length > 0,
        amountMatched,
        dateConsistent,
        notes: consistencyNotes,
      },
      suspiciousSignals,
      humanReviewRequired,
      recommendedVerificationStatus,
      integrityDisclaimer:
        'SHA-256 verifies byte-for-byte file integrity since upload only and is not proof of source authenticity. Absent AI-generation markers do not prove genuineness.',
    };
  }
}
