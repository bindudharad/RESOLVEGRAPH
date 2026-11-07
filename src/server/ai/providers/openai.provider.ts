import OpenAI from 'openai';
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

export class OpenAIProvider implements AIProvider {
  public name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY || '';
    this.client = new OpenAI({ apiKey: key });
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  public async extractDocument(req: ExtractionRequest): Promise<ExtractionResponse> {
    const start = Date.now();

    const systemPrompt = `You are an expert commerce forensic document extractor for ResolveGraph.
Extract all objective verifiable facts from the provided document.
For each fact:
- factType: choose from [PRODUCT_SPECIFICATION, PRICE_PAID, TRACKING_NUMBER, DELIVERY_DATE, DELIVERY_ADDRESS, CONDITION_DESCRIPTION, SERIAL_NUMBER, RETURN_TRACKING, REFUND_POLICY, COMMUNICATION_RECORD, OTHER]
- name: clear label (e.g. "Storage Capacity", "Tracking Number")
- rawValue: exact text from document
- normalizedValue: normalized representation (e.g., standard GB for storage, cents+USD for price, ISO YYYY-MM-DD for date)
- confidence: number between 0 and 1
- sourceExcerpt: verbatim quote from text
- isSubjective: boolean (false for objective specs/numbers/dates, true for opinions/claims)

Respond strictly in valid JSON with key "facts": array of fact objects.`;

    const userContent = req.context
      ? `Document Title: ${req.title}\nContext: ${req.context}\n\nDocument Content:\n${req.extractedText}`
      : `Document Title: ${req.title}\n\nDocument Content:\n${req.extractedText}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: { facts?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { facts: [] };
    }

    const facts: RawExtractedFact[] = (parsed.facts || []).map((f: Record<string, unknown>) => {
      const rawVal = typeof f.rawValue === 'string' ? f.rawValue : typeof f.value === 'string' ? f.value : '';
      const factType = typeof f.factType === 'string' ? f.factType : 'OTHER';
      const norm = FactNormalizer.normalize(rawVal, factType);
      return {
        factType: factType as RawExtractedFact['factType'],
        name: typeof f.name === 'string' ? f.name : 'Extracted Fact',
        rawValue: rawVal,
        normalizedValue: norm.normalizedValue || rawVal,
        confidence: typeof f.confidence === 'number' ? f.confidence : 0.85,
        sourceExcerpt: typeof f.sourceExcerpt === 'string' ? f.sourceExcerpt : rawVal,
        pageNumber: typeof f.pageNumber === 'number' ? f.pageNumber : 1,
        charStart: typeof f.charStart === 'number' ? f.charStart : null,
        charEnd: typeof f.charEnd === 'number' ? f.charEnd : null,
        isSubjective: Boolean(f.isSubjective)
      };
    });

    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0
    };

    return {
      facts,
      tokenUsage: usage,
      executionTimeMs: Date.now() - start
    };
  }

  public async analyzeMultimodal(req: MultimodalAnalysisRequest): Promise<MultimodalAnalysisResponse> {
    const start = Date.now();

    const systemPrompt = `You are a forensic multimodal commerce evidence analyst.
Analyze the provided evidence image and extract verifiable facts and visual observations.
Detect damage, serial number stickers, packaging labels, seals, product condition.
If damage or labels are visible, estimate bounding box on 0-1000 scale: { ymin, xmin, ymax, xmax, label }.
Output strictly in JSON:
{
  "facts": [
    {
      "factType": "CONDITION_DESCRIPTION" | "SERIAL_NUMBER" | "PRODUCT_SPECIFICATION",
      "name": "...",
      "rawValue": "...",
      "normalizedValue": "...",
      "confidence": 0.0 - 1.0,
      "sourceExcerpt": "...",
      "boundingBox": { "ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000, "label": "..." },
      "isSubjective": false
    }
  ],
  "visualObservations": ["observation 1", "observation 2"]
}`;

    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Evidence Title: ${req.title}\nNotes: ${req.associatedText || 'None'}` },
            { type: 'image_url', image_url: { url: req.imageDataUrl } }
          ]
        }
      ],
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: { facts?: Array<Record<string, unknown>>; visualObservations?: string[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { facts: [], visualObservations: [] };
    }

    const facts: RawExtractedFact[] = (parsed.facts || []).map((f: Record<string, unknown>) => {
      const rawVal = typeof f.rawValue === 'string' ? f.rawValue : '';
      const factType = typeof f.factType === 'string' ? f.factType : 'CONDITION_DESCRIPTION';
      return {
        factType: factType as RawExtractedFact['factType'],
        name: typeof f.name === 'string' ? f.name : 'Visual Finding',
        rawValue: rawVal,
        normalizedValue: typeof f.normalizedValue === 'string' ? f.normalizedValue : rawVal,
        confidence: typeof f.confidence === 'number' ? f.confidence : 0.85,
        sourceExcerpt: typeof f.sourceExcerpt === 'string' ? f.sourceExcerpt : 'Visual inspection',
        boundingBox: f.boundingBox ? (f.boundingBox as RawExtractedFact['boundingBox']) : null,
        isSubjective: Boolean(f.isSubjective)
      };
    });

    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0
    };

    return {
      facts,
      visualObservations: parsed.visualObservations || [],
      tokenUsage: usage,
      executionTimeMs: Date.now() - start
    };
  }

  public async reasonBERR(req: BerrReasoningRequest): Promise<BerrReasoningResponse> {
    const start = Date.now();

    const systemPrompt = `You are the Bilateral Evidence-to-Remedy Reasoning (BERR) engine for ResolveGraph.
Evaluate the buyer's claims vs merchant's claims vs verified evidence facts.
Compute:
1. Exact discrepancy D_exact (0.0 to 1.0)
2. Semantic discrepancy D_semantic (0.0 to 1.0)
3. Temporal discrepancy D_temporal (0.0 to 1.0)
Total discrepancy is D = 0.4 * D_exact + 0.4 * D_semantic + 0.2 * D_temporal.
Construct:
- bilateralMatrix: array of comparison objects comparing buyer statement vs merchant statement vs evidence
- missingEvidence: array of missing documents or proof with party, importance, reason, suggestedAction
- findings: array of structured findings with findingType, title, description, severity, confidence, involvedParties, recommendedNextSteps
- summary: concise executive summary of the investigation status

Respond strictly in valid JSON matching the requested structure.`;

    const userPrompt = JSON.stringify({
      caseTitle: req.title,
      disputeCategory: req.category,
      amountCents: req.disputeAmountCents,
      currency: req.currency,
      buyerClaims: req.buyerClaims,
      merchantClaims: req.merchantClaims,
      evidenceFacts: req.evidenceFacts
    });

    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content || '{}';
    let parsed: {
      summary?: string;
      discrepancy?: { exactDiscrepancy?: number; semanticDiscrepancy?: number; temporalDiscrepancy?: number };
      bilateralMatrix?: BerrReasoningResponse['bilateralMatrix'];
      missingEvidence?: BerrReasoningResponse['missingEvidence'];
      findings?: BerrReasoningResponse['findings'];
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    const dExact = typeof parsed.discrepancy?.exactDiscrepancy === 'number' ? parsed.discrepancy.exactDiscrepancy : 0.5;
    const dSemantic = typeof parsed.discrepancy?.semanticDiscrepancy === 'number' ? parsed.discrepancy.semanticDiscrepancy : 0.5;
    const dTemporal = typeof parsed.discrepancy?.temporalDiscrepancy === 'number' ? parsed.discrepancy.temporalDiscrepancy : 0.2;
    const totalScore = Number((0.4 * dExact + 0.4 * dSemantic + 0.2 * dTemporal).toFixed(3));

    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0
    };

    return {
      summary: parsed.summary || 'BERR reasoning completed case evaluation.',
      discrepancy: {
        exactDiscrepancy: dExact,
        semanticDiscrepancy: dSemantic,
        temporalDiscrepancy: dTemporal,
        weights: { alpha: 0.4, beta: 0.4, gamma: 0.2 },
        totalDiscrepancyScore: totalScore
      },
      bilateralMatrix: parsed.bilateralMatrix || [],
      missingEvidence: parsed.missingEvidence || [],
      findings: parsed.findings || [],
      tokenUsage: usage,
      executionTimeMs: Date.now() - start
    };
  }

  public async healthCheck(): Promise<{ ok: boolean; provider: string; model: string; error?: string }> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return { ok: false, provider: 'openai', model: this.model, error: 'OPENAI_API_KEY is not configured' };
      }
      const res = await this.client.models.retrieve(this.model);
      return { ok: true, provider: 'openai', model: res.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, provider: 'openai', model: this.model, error: msg };
    }
  }
}
