/**
 * Content Sanitizer protects against Prompt Injection and adversarial document exploits.
 * Wraps untrusted text in isolated block delimiters and warns on injection signatures.
 */

export interface SanitizationResult {
  sanitizedContent: string;
  isFlaggedForInjection: boolean;
  injectionWarnings: string[];
}

export class ContentSanitizer {
  private static readonly INJECTION_PATTERNS = [
    { name: 'SYSTEM_OVERRIDE', regex: /(?:ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions|system\s+(?:prompt|instruction)\s+override|system\s+override|disregard\s+(?:the\s+above|all\s+rules))/i },
    { name: 'DAN_JAILBREAK', regex: /(?:do\s+anything\s+now|jailbreak|developer\s+mode\s+enabled|dan\s+mode)/i },
    { name: 'FORCE_REMEDY', regex: /(?:(?:immediately\s+grant|award)\s+(?:full\s+)?refund|declare\s+buyer\s+100%\s+winner|100%\s+in\s+favor\s+of\s+buyer|disregard\s+seller\s+evidence|do\s+not\s+read\s+merchant\s+evidence)/i },
    { name: 'TOOL_CALL_HIJACK', regex: /(?:call_function|tool_call|execute_payment|eval\(|window\.location)/i },
    { name: 'DELIMITER_ESCAPE', regex: /(?:<\/?untrusted_document_content>|<\/?prompt_boundary>)/i }
  ];

  /**
   * Sanitizes text by checking for injection signatures, escaping dangerous tags,
   * and wrapping in structured isolation delimiters.
   */
  public static sanitize(text: string, contextLabel = 'evidence_document'): SanitizationResult {
    if (!text || typeof text !== 'string') {
      return {
        sanitizedContent: `<untrusted_${contextLabel}>\n</untrusted_${contextLabel}>`,
        isFlaggedForInjection: false,
        injectionWarnings: []
      };
    }

    const warnings: string[] = [];

    // Check for injection signatures
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.regex.test(text)) {
        warnings.push(`Detected prompt injection pattern: ${pattern.name}`);
      }
    }

    // Neutralize delimiter spoofing
    let safeText = text.replace(/<\/?untrusted_[a-zA-Z0-9_\-]+>/gi, (m) => `[ESCAPED_TAG: ${m}]`);

    // Remove null bytes and non-printable control characters (except newline, carriage return, tab)
    safeText = safeText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    const sanitizedContent = `<!-- BEGIN UNTRUSTED DATA (${contextLabel}) -->\n<untrusted_${contextLabel}>\n${safeText}\n</untrusted_${contextLabel}>\n<!-- END UNTRUSTED DATA (${contextLabel}) -->`;

    return {
      sanitizedContent,
      isFlaggedForInjection: warnings.length > 0,
      injectionWarnings: warnings
    };
  }
}
