import path from 'node:path';
import fs from 'node:fs/promises';
import { prisma } from '@/lib/prisma';
import { getAIProvider } from '../providers/provider-factory';
import { PdfExtractor } from './pdf-extractor';
import { ImageExtractor } from './image-extractor';
import { TextExtractor } from './text-extractor';
import { DataRedactor } from '../security/data-redactor';
import { ContentSanitizer } from '../security/content-sanitizer';
import { FactNormalizer } from '../normalization/fact-normalizer';
import { RawExtractedFact } from '../schemas/extraction.schema';

export interface ExtractedEvidenceRecord {
  evidenceId: string;
  title: string;
  extractedText: string;
  facts: RawExtractedFact[];
  redactedCount: number;
  isFlaggedForInjection: boolean;
  tokensUsed: number;
}

export class EvidenceExtractor {
  /**
   * Processes an evidence record, extracts facts, normalizes values, and saves to database.
   */
  public static async processEvidence(params: {
    evidenceId: string;
    analysisRunId: string;
    caseId: string;
    forceTestProvider?: boolean;
  }): Promise<ExtractedEvidenceRecord> {
    const evidence = await prisma.evidence.findUnique({
      where: { id: params.evidenceId }
    });

    if (!evidence) {
      throw new Error(`Evidence ${params.evidenceId} not found`);
    }

    const provider = getAIProvider(params.forceTestProvider);
    let rawText = '';
    let pageCount = 1;
    let isScanned = false;
    let imageDataUrl: string | undefined;

    // Resolve file path
    const storageKey = evidence.storageKey;
    if (storageKey) {
      const fullPath = path.isAbsolute(storageKey)
        ? storageKey
        : path.resolve(/*turbopackIgnore: true*/ process.cwd(), storageKey);

      try {
        const fileExists = await fs.stat(fullPath).then(() => true).catch(() => false);
        if (fileExists) {
          const ext = path.extname(fullPath).toLowerCase();
          if (ext === '.pdf') {
            const pdfOut = await PdfExtractor.extract(fullPath);
            rawText = pdfOut.fullText;
            pageCount = pdfOut.pageCount;
            isScanned = pdfOut.isScanned;
          } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            const imgOut = await ImageExtractor.prepareImageForVision(fullPath);
            imageDataUrl = imgOut.base64DataUrl;
            rawText = `[Image Artifact: ${evidence.filename}] File size: ${imgOut.fileSizeBytes} bytes`;
          } else {
            rawText = await fs.readFile(fullPath, 'utf-8');
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[EvidenceExtractor] Could not read file at ${storageKey}:`, msg);
      }
    }

    if (!rawText) {
      rawText = `Evidence: ${evidence.filename}\nCategory: ${evidence.evidenceType}\nSource: ${evidence.sourceType}`;
    }

    // 1. Redact sensitive data
    const redaction = DataRedactor.redact(rawText);
    const safeText = redaction.redactedText;

    // 2. Sanitize against prompt injection
    const sanitization = ContentSanitizer.sanitize(safeText, `evidence_${evidence.id}`);

    let extractedFacts: RawExtractedFact[] = [];
    let tokensUsed = 0;

    // 3. Dispatch to AI Provider
    if (imageDataUrl) {
      const imgRes = await provider.analyzeMultimodal({
        evidenceId: evidence.id,
        title: evidence.filename,
        mimeType: evidence.mimeType || 'image/jpeg',
        imageDataUrl,
        associatedText: safeText
      });
      extractedFacts = imgRes.facts;
      tokensUsed = imgRes.tokenUsage.totalTokens;
    } else {
      const docRes = await provider.extractDocument({
        documentId: evidence.id,
        title: evidence.filename,
        extractedText: sanitization.sanitizedContent,
        mimeType: evidence.mimeType || 'application/pdf',
        context: `Case evidence item ${evidence.filename} of type ${evidence.evidenceType} (pages: ${pageCount}, scanned: ${isScanned})`
      });
      extractedFacts = docRes.facts;
      tokensUsed = docRes.tokenUsage.totalTokens;
    }

    // 4. Validate provenance & normalize facts
    const processedFacts: RawExtractedFact[] = [];
    for (const f of extractedFacts) {
      let charStart = f.charStart;
      let charEnd = f.charEnd;
      if (charStart === null || charStart === undefined) {
        const loc = TextExtractor.locateExcerpt(safeText, f.sourceExcerpt || f.rawValue);
        if (loc) {
          charStart = loc.charStart;
          charEnd = loc.charEnd;
        }
      }

      const norm = FactNormalizer.normalize(f.rawValue, f.factType);
      const confidenceBand = f.confidence >= 0.88 ? 'HIGH' : f.confidence >= 0.65 ? 'MEDIUM' : 'LOW';

      processedFacts.push({
        ...f,
        normalizedValue: norm.normalizedValue || f.normalizedValue || f.rawValue,
        charStart: charStart ?? null,
        charEnd: charEnd ?? null
      });

      // Persist ExtractedFact in DB
      await prisma.extractedFact.create({
        data: {
          caseId: params.caseId,
          analysisRunId: params.analysisRunId,
          evidenceId: evidence.id,
          factType: f.factType,
          fieldKey: f.name,
          rawValue: f.rawValue,
          normalizedValue: norm.normalizedValue || f.normalizedValue || f.rawValue,
          currency: norm.currency || null,
          sourceExcerpt: f.sourceExcerpt || f.rawValue,
          sourceLocatorType: imageDataUrl ? 'IMAGE_REGION' : 'TEXT_RANGE',
          pageNumber: f.pageNumber || 1,
          characterStart: charStart ?? null,
          characterEnd: charEnd ?? null,
          boundingBoxJson: f.boundingBox ? JSON.stringify(f.boundingBox) : null,
          extractionConfidenceBand: confidenceBand,
          reviewStatus: 'UNREVIEWED'
        }
      });
    }

    return {
      evidenceId: evidence.id,
      title: evidence.filename,
      extractedText: safeText,
      facts: processedFacts,
      redactedCount: redaction.redactionCount,
      isFlaggedForInjection: sanitization.isFlaggedForInjection,
      tokensUsed
    };
  }
}
