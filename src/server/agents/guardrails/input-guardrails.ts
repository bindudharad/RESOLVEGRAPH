/**
 * Input Guardrails for Agentic Execution
 * 
 * Protects against prompt injection, privilege escalation attempts,
 * delimiter escaping, and unsafe user instructions.
 */

export interface InputSanitizationResult {
  isSafe: boolean;
  sanitizedText: string;
  injectionDetected: boolean;
  detectedPatterns: string[];
}

export class InputGuardrails {
  private static readonly MAX_INPUT_LENGTH = 8000;

  private static readonly INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, label: 'Instruction Override' },
    { pattern: /disregard\s+(all\s+)?(previous|prior|system)\s+prompts?/i, label: 'Prompt Disregard' },
    { pattern: /system\s*override/i, label: 'System Override' },
    { pattern: /you\s+are\s+now\s+in\s+developer\s+mode/i, label: 'Developer Mode Attempt' },
    { pattern: /dan\s+mode|jailbreak/i, label: 'Jailbreak Keyword' },
    { pattern: /<\s*\/?\s*(system|instruction|prompt|guardrail)\s*>/i, label: 'Delimiter Injection' },
    { pattern: /unrestricted\s+mode|bypass\s+all\s+filters/i, label: 'Filter Bypass Attempt' },
    { pattern: /exfiltrate|send\s+api\s+keys?|print\s+env\s+variables/i, label: 'Credential Exfiltration Attempt' }
  ];

  /**
   * Sanitizes untrusted user prompt before passing it to any agent.
   */
  public static sanitizeInput(input: string): InputSanitizationResult {
    if (!input || typeof input !== 'string') {
      return {
        isSafe: true,
        sanitizedText: '',
        injectionDetected: false,
        detectedPatterns: []
      };
    }

    let text = input.trim();
    if (text.length > this.MAX_INPUT_LENGTH) {
      text = text.substring(0, this.MAX_INPUT_LENGTH);
    }

    const detectedPatterns: string[] = [];
    for (const check of this.INJECTION_PATTERNS) {
      if (check.pattern.test(text)) {
        detectedPatterns.push(check.label);
      }
    }

    // Neutralize dangerous XML tags if present
    const neutralized = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return {
      isSafe: detectedPatterns.length === 0,
      sanitizedText: neutralized,
      injectionDetected: detectedPatterns.length > 0,
      detectedPatterns
    };
  }

  /**
   * Wraps an untrusted text block inside structured XML tags with explicit boundary delimiters.
   */
  public static wrapInSafeBoundary(tag: string, content: string): string {
    const safeTag = tag.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanContent = content.replace(new RegExp(`</?${safeTag}>`, 'gi'), '');
    return `<${safeTag}>\n${cleanContent}\n</${safeTag}>`;
  }
}
