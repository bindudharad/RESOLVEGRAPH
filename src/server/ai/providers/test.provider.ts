import {
  AIProvider,
  ExtractionRequest,
  ExtractionResponse,
  MultimodalAnalysisRequest,
  MultimodalAnalysisResponse,
  BerrReasoningRequest,
  BerrReasoningResponse,
  TokenUsage
} from './ai-provider.interface';
import { RawExtractedFact } from '../schemas/extraction.schema';
import { FactNormalizer } from '../normalization/fact-normalizer';
import { BilateralFactComparison, MissingEvidenceItem, BerrFindingOutput } from '../schemas/berr.schema';

export class TestAIProvider implements AIProvider {
  public name = 'test-deterministic';

  private defaultTokens(inputLength: number): TokenUsage {
    const promptTokens = Math.max(10, Math.round(inputLength / 4));
    const completionTokens = 45;
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  public async extractDocument(req: ExtractionRequest): Promise<ExtractionResponse> {
    const start = Date.now();
    const facts: RawExtractedFact[] = [];
    const text = req.extractedText || '';

    // 1. Capacity pattern
    const capMatch = text.match(/(\d+\s*(?:TB|GB|MB))/i);
    if (capMatch) {
      const raw = capMatch[1];
      const norm = FactNormalizer.normalizeCapacity(raw) || raw;
      const idx = text.indexOf(raw);
      facts.push({
        factType: 'PRODUCT_SPECIFICATION',
        name: 'Storage Capacity',
        rawValue: raw,
        normalizedValue: norm,
        confidence: 0.98,
        sourceExcerpt: raw,
        pageNumber: 1,
        charStart: idx >= 0 ? idx : 0,
        charEnd: idx >= 0 ? idx + raw.length : raw.length,
        isSubjective: false
      });
    }

    // 2. Price pattern
    const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
    if (priceMatch) {
      const raw = priceMatch[0];
      const norm = FactNormalizer.normalizeMonetary(raw);
      const idx = text.indexOf(raw);
      facts.push({
        factType: 'PRICE_PAID',
        name: 'Transaction Amount',
        rawValue: raw,
        normalizedValue: norm ? norm.formatted : raw,
        confidence: 0.95,
        sourceExcerpt: raw,
        pageNumber: 1,
        charStart: idx >= 0 ? idx : 0,
        charEnd: idx >= 0 ? idx + raw.length : raw.length,
        isSubjective: false
      });
    }

    // 3. Tracking number pattern
    const trackMatch = text.match(/\b(1Z[0-9A-Z]{16}|9\d{21}|[A-Z]{2}\d{9}[A-Z]{2})\b/i);
    if (trackMatch) {
      const raw = trackMatch[1];
      const idx = text.indexOf(raw);
      facts.push({
        factType: 'TRACKING_NUMBER',
        name: 'Carrier Tracking Number',
        rawValue: raw,
        normalizedValue: raw.toUpperCase(),
        confidence: 0.99,
        sourceExcerpt: raw,
        pageNumber: 1,
        charStart: idx >= 0 ? idx : 0,
        charEnd: idx >= 0 ? idx + raw.length : raw.length,
        isSubjective: false
      });
    }

    // 4. Delivery Date pattern
    const dateMatch = text.match(/\b(202[4-9]-\d{2}-\d{2}|[A-Za-z]+ \d{1,2}, 202[4-9])\b/);
    if (dateMatch) {
      const raw = dateMatch[0];
      const norm = FactNormalizer.normalizeDate(raw) || raw;
      const idx = text.indexOf(raw);
      facts.push({
        factType: 'DELIVERY_DATE',
        name: 'Delivery Date',
        rawValue: raw,
        normalizedValue: norm,
        confidence: 0.92,
        sourceExcerpt: raw,
        pageNumber: 1,
        charStart: idx >= 0 ? idx : 0,
        charEnd: idx >= 0 ? idx + raw.length : raw.length,
        isSubjective: false
      });
    }

    // 5. Serial number pattern
    const snMatch = text.match(/\b(?:SN|Serial|S\/N)[:\s]+([A-Z0-9]{8,20})\b/i);
    if (snMatch) {
      const raw = snMatch[1];
      const norm = FactNormalizer.normalizeSkuOrSerial(raw);
      const idx = text.indexOf(snMatch[0]);
      facts.push({
        factType: 'SERIAL_NUMBER',
        name: 'Device Serial Number',
        rawValue: raw,
        normalizedValue: norm,
        confidence: 0.97,
        sourceExcerpt: snMatch[0],
        pageNumber: 1,
        charStart: idx >= 0 ? idx : 0,
        charEnd: idx >= 0 ? idx + snMatch[0].length : raw.length,
        isSubjective: false
      });
    }

    return {
      facts,
      tokenUsage: this.defaultTokens(text.length),
      executionTimeMs: Date.now() - start
    };
  }

  public async analyzeMultimodal(req: MultimodalAnalysisRequest): Promise<MultimodalAnalysisResponse> {
    const start = Date.now();
    const titleLower = req.title.toLowerCase();
    const facts: RawExtractedFact[] = [];
    const observations: string[] = [];

    if (titleLower.includes('damage') || titleLower.includes('crack') || titleLower.includes('broken')) {
      facts.push({
        factType: 'CONDITION_DESCRIPTION',
        name: 'Visual Damage Detected',
        rawValue: 'Visible physical impact damage on outer casing and display',
        normalizedValue: 'DAMAGED',
        confidence: 0.91,
        sourceExcerpt: 'Image inspection: screen cracking visible',
        boundingBox: { ymin: 150, xmin: 200, ymax: 650, xmax: 800, label: 'Cracked screen' },
        isSubjective: false
      });
      observations.push('Diagonal fracture line across lower quadrant of glass display');
      observations.push('Packaging shows corner crushing consistent with drop during transit');
    } else if (titleLower.includes('serial') || titleLower.includes('label')) {
      facts.push({
        factType: 'SERIAL_NUMBER',
        name: 'Label Serial Number',
        rawValue: 'C02ZX999MD6T',
        normalizedValue: 'C02ZX999MD6T',
        confidence: 0.96,
        sourceExcerpt: 'Barcode and serial label on retail packaging',
        boundingBox: { ymin: 700, xmin: 300, ymax: 850, xmax: 700, label: 'Serial label' },
        isSubjective: false
      });
      observations.push('Crisp barcode and legible alphanumeric serial stamp');
    } else {
      facts.push({
        factType: 'CONDITION_DESCRIPTION',
        name: 'Delivered Item Appearance',
        rawValue: 'Item matches standard packaging and exterior dimensions',
        normalizedValue: 'LIKE_NEW',
        confidence: 0.88,
        sourceExcerpt: 'Product photograph',
        isSubjective: false
      });
      observations.push('No obvious exterior blemishes detected on primary surfaces');
    }

    return {
      facts,
      visualObservations: observations,
      tokenUsage: { promptTokens: 250, completionTokens: 60, totalTokens: 310 },
      executionTimeMs: Date.now() - start
    };
  }

  public async reasonBERR(req: BerrReasoningRequest): Promise<BerrReasoningResponse> {
    const start = Date.now();
    const category = req.category.toUpperCase();

    // Collect all facts
    const allFacts: RawExtractedFact[] = [];
    for (const ef of req.evidenceFacts) {
      allFacts.push(...ef.facts);
    }

    // Analyze buyer vs merchant claim statements
    const buyerText = req.buyerClaims.map((c) => c.statement).join(' ');
    const merchantText = req.merchantClaims.map((c) => c.statement).join(' ');

    let exactDiscrepancy = 0;
    let semanticDiscrepancy = 0;
    let temporalDiscrepancy = 0;

    // Detect specification discrepancy
    const buyerCapMatch = buyerText.match(/(\d+\s*(?:TB|GB))/i);
    const merchantCapMatch = merchantText.match(/(\d+\s*(?:TB|GB))/i);

    const buyerCap = buyerCapMatch ? FactNormalizer.normalizeCapacity(buyerCapMatch[1]) : null;
    const merchantCap = merchantCapMatch ? FactNormalizer.normalizeCapacity(merchantCapMatch[1]) : null;

    if (buyerCap && merchantCap && buyerCap !== merchantCap) {
      exactDiscrepancy = 0.9;
      semanticDiscrepancy = 0.8;
    } else if (category === 'NOT_AS_DESCRIBED') {
      exactDiscrepancy = 0.7;
      semanticDiscrepancy = 0.6;
    } else if (category === 'NON_DELIVERY') {
      temporalDiscrepancy = 0.8;
      semanticDiscrepancy = 0.7;
    } else if (category === 'DAMAGED_GOODS') {
      semanticDiscrepancy = 0.85;
      exactDiscrepancy = 0.3;
    } else {
      exactDiscrepancy = 0.2;
      semanticDiscrepancy = 0.2;
    }

    const alpha = 0.4;
    const beta = 0.4;
    const gamma = 0.2;
    const totalScore = Number((alpha * exactDiscrepancy + beta * semanticDiscrepancy + gamma * temporalDiscrepancy).toFixed(3));

    const bilateralMatrix: BilateralFactComparison[] = [
      {
        factKey: 'product_specification',
        factType: 'PRODUCT_SPECIFICATION',
        buyerValue: buyerCap || 'Item received differs from advertised specification',
        merchantValue: merchantCap || 'Item shipped matches standard inventory listing',
        isMatch: buyerCap ? buyerCap === merchantCap : false,
        discrepancyType: (buyerCap && buyerCap !== merchantCap ? 'SPECIFICATION' : 'NONE'),
        severity: (buyerCap && buyerCap !== merchantCap ? 'HIGH' : 'LOW'),
        explanation: 'Comparison between buyer-reported item and merchant listing record.'
      },
      {
        factKey: 'transaction_amount',
        factType: 'PRICE_PAID',
        buyerValue: `$${(req.disputeAmountCents / 100).toFixed(2)}`,
        merchantValue: `$${(req.disputeAmountCents / 100).toFixed(2)}`,
        isMatch: true,
        discrepancyType: 'NONE',
        severity: 'LOW',
        explanation: 'Both parties agree on the billed transaction total.'
      }
    ];

    const missingEvidence: MissingEvidenceItem[] = [];
    if (category === 'NON_DELIVERY') {
      missingEvidence.push({
        party: 'MERCHANT',
        evidenceType: 'CARRIER_POD_SIGNATURE',
        importance: 'CRITICAL',
        reason: 'Merchant provided tracking number but no carrier signed proof-of-delivery or GPS scan.',
        suggestedAction: 'Request carrier delivery confirmation receipt with recipient signature.'
      });
    } else if (category === 'NOT_AS_DESCRIBED') {
      missingEvidence.push({
        party: 'MERCHANT',
        evidenceType: 'INVENTORY_SPEC_SHEET',
        importance: 'RECOMMENDED',
        reason: 'Merchant claims 1TB variant was dispatched; warehouse scan record not attached.',
        suggestedAction: 'Request merchant warehouse outbound barcode scan record.'
      });
    }

    const findings: BerrFindingOutput[] = [];
    if (totalScore >= 0.5) {
      findings.push({
        findingType: category === 'NON_DELIVERY' ? 'DELIVERY_NON_RECEIPT' : 'SPECIFICATION_MISMATCH',
        title: category === 'NON_DELIVERY' ? 'Delivery Discrepancy: Non-receipt reported' : 'Specification Discrepancy Detected',
        description: `Bilateral evidence analysis reveals a discrepancy score of ${totalScore}. Stated claims conflict on primary product or fulfillment attributes.`,
        severity: totalScore > 0.65 ? 'HIGH' : 'MEDIUM',
        confidence: 0.92,
        conflictType: 'BILATERAL_FACT_CONFLICT',
        involvedParties: ['BUYER', 'MERCHANT'],
        recommendedNextSteps: [
          'Request certified warehouse outbound dispatch scan from merchant',
          'Review high-resolution photograph of product serial/capacity label',
          'Await response within 48 hours before issuing escalation determination'
        ],
        supportingFactNames: ['Storage Capacity', 'Transaction Amount'],
        relatedEvidenceIds: req.evidenceFacts.map((e) => e.evidenceId)
      });
    } else {
      findings.push({
        findingType: 'CONSISTENT_ALIGNMENT',
        title: 'Core Case Facts Show Substantial Alignment',
        description: 'Both parties agree on transaction value and fulfillment schedule with low discrepancy.',
        severity: 'LOW',
        confidence: 0.89,
        involvedParties: ['BUYER', 'MERCHANT'],
        recommendedNextSteps: ['Proceed with standard claim reconciliation protocol'],
        supportingFactNames: ['Transaction Amount'],
        relatedEvidenceIds: req.evidenceFacts.map((e) => e.evidenceId)
      });
    }

    return {
      summary: `Automated BERR reasoning evaluated ${req.buyerClaims.length} buyer claims and ${req.merchantClaims.length} merchant claims across ${req.evidenceFacts.length} evidence artifacts. Discrepancy index: ${totalScore}.`,
      discrepancy: {
        exactDiscrepancy,
        semanticDiscrepancy,
        temporalDiscrepancy,
        weights: { alpha, beta, gamma },
        totalDiscrepancyScore: totalScore
      },
      bilateralMatrix,
      missingEvidence,
      findings,
      tokenUsage: { promptTokens: 650, completionTokens: 180, totalTokens: 830 },
      executionTimeMs: Date.now() - start
    };
  }

  public async healthCheck(): Promise<{ ok: boolean; provider: string; model: string }> {
    return {
      ok: true,
      provider: 'test-deterministic',
      model: 'deterministic-mock-v1'
    };
  }
}
