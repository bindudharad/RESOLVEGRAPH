import { RawExtractedFact } from '../schemas/extraction.schema';
import {
  DiscrepancyBreakdown,
  BilateralFactComparison,
  MissingEvidenceItem,
  BerrFindingOutput
} from '../schemas/berr.schema';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ExtractionRequest {
  documentId: string;
  title: string;
  extractedText: string;
  mimeType?: string;
  imageDataUrl?: string;
  context?: string;
}

export interface ExtractionResponse {
  facts: RawExtractedFact[];
  tokenUsage: TokenUsage;
  executionTimeMs: number;
}

export interface MultimodalAnalysisRequest {
  evidenceId: string;
  title: string;
  mimeType: string;
  imageDataUrl: string;
  associatedText?: string;
}

export interface MultimodalAnalysisResponse {
  facts: RawExtractedFact[];
  visualObservations: string[];
  tokenUsage: TokenUsage;
  executionTimeMs: number;
}

export interface BerrReasoningRequest {
  caseId: string;
  title: string;
  category: string;
  disputeAmountCents: number;
  currency: string;
  buyerClaims: Array<{
    id: string;
    claimType: string;
    statement: string;
    demandedAmountCents?: number | null;
  }>;
  merchantClaims: Array<{
    id: string;
    claimType: string;
    statement: string;
    demandedAmountCents?: number | null;
  }>;
  evidenceFacts: Array<{
    evidenceId: string;
    title: string;
    evidenceType: string;
    facts: RawExtractedFact[];
  }>;
}

export interface BerrReasoningResponse {
  summary: string;
  discrepancy: DiscrepancyBreakdown;
  bilateralMatrix: BilateralFactComparison[];
  missingEvidence: MissingEvidenceItem[];
  findings: BerrFindingOutput[];
  tokenUsage: TokenUsage;
  executionTimeMs: number;
}

export interface AIProvider {
  name: string;
  extractDocument(req: ExtractionRequest): Promise<ExtractionResponse>;
  analyzeMultimodal(req: MultimodalAnalysisRequest): Promise<MultimodalAnalysisResponse>;
  reasonBERR(req: BerrReasoningRequest): Promise<BerrReasoningResponse>;
  healthCheck(): Promise<{ ok: boolean; provider: string; model: string; error?: string }>;
}
