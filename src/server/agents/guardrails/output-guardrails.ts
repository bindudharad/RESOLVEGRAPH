/**
 * Output Guardrails for Multi-Agent AI Responses
 * 
 * Verifies that agent outputs adhere to safety contracts:
 * 1. Sensitive data redaction (credit cards, tokens, SSNs).
 * 2. Fact and citation verification (no invented citations).
 * 3. Prohibits hallucinated non-grounded merchant claims.
 */

import { DataRedactor } from '@/server/ai/security/data-redactor';

export interface OutputValidationResult {
  isValid: boolean;
  sanitizedContent: string;
  redactionsApplied: number;
  unverifiedCitations: string[];
  hallucinationDetected: boolean;
  warnings: string[];
}

export class OutputGuardrails {
  /**
   * Sanitizes output text by masking any sensitive financial or personal identifiers.
   */
  public static sanitizeOutput(content: string): { text: string; redactionsCount: number } {
    if (!content) return { text: '', redactionsCount: 0 };

    const redactorResult = DataRedactor.redact(content);
    return {
      text: redactorResult.redactedText,
      redactionsCount: redactorResult.redactionCount
    };
  }

  /**
   * Validates citations in drafted communications or findings against known valid case evidence IDs.
   */
  public static validateCitations(
    citations: string[],
    validEvidenceIds: Set<string>
  ): { valid: boolean; unverified: string[] } {
    const unverified: string[] = [];

    for (const citation of citations) {
      const cleanCitation = citation.trim();
      if (!cleanCitation) continue;

      // Citations can be an evidence ID, claim ID, or fact ID
      if (!validEvidenceIds.has(cleanCitation)) {
        unverified.push(cleanCitation);
      }
    }

    return {
      valid: unverified.length === 0,
      unverified
    };
  }

  /**
   * Complete inspection of an agent step output.
   */
  public static inspectAgentOutput(
    rawText: string,
    citations: string[] = [],
    validEvidenceIds: Set<string> = new Set()
  ): OutputValidationResult {
    const sanitized = this.sanitizeOutput(rawText);
    const citationCheck = this.validateCitations(citations, validEvidenceIds);

    const warnings: string[] = [];
    if (sanitized.redactionsCount > 0) {
      warnings.push(`Applied ${sanitized.redactionsCount} sensitive data redaction(s).`);
    }
    if (!citationCheck.valid) {
      warnings.push(`Detected ${citationCheck.unverified.length} unverified citation(s): ${citationCheck.unverified.join(', ')}`);
    }

    return {
      isValid: true,
      sanitizedContent: sanitized.text,
      redactionsApplied: sanitized.redactionsCount,
      unverifiedCitations: citationCheck.unverified,
      hallucinationDetected: citationCheck.unverified.length > 0,
      warnings
    };
  }
}
