/**
 * Resolves sensitive data redaction before sending content to AI models.
 * Masks payment card numbers (with Luhn verification), CVVs, passwords,
 * API tokens, and social security / national ID numbers.
 */

export interface RedactionResult {
  redactedText: string;
  redactionCount: number;
  redactedTypes: string[];
}

/**
 * Validates a number string using the Luhn algorithm.
 */
export function passesLuhnCheck(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Mask card number preserving only the last 4 digits: ****-****-****-1234
 */
export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  const last4 = clean.slice(-4);
  return `[REDACTED_CARD_****-****-****-${last4}]`;
}

export class DataRedactor {
  // Regexes for sensitive values
  private static readonly CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
  private static readonly CVV_REGEX = /\b(?:cvv|cvc|security code|cid)\s*[:=]?\s*(\d{3,4})\b/gi;
  private static readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  private static readonly API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|bearer\s+[a-zA-Z0-9_\-\.]{25,})\b/gi;
  private static readonly PASSWORD_REGEX = /\b(?:password|passwd|pwd|pass)\s*[:=]\s*([^\s,;]+)/gi;

  /**
   * Redacts sensitive data from plain text.
   */
  public static redact(text: string): RedactionResult {
    if (!text || typeof text !== 'string') {
      return { redactedText: '', redactionCount: 0, redactedTypes: [] };
    }

    let result = text;
    let count = 0;
    const types: Set<string> = new Set();

    // 1. Payment Cards with Luhn check
    result = result.replace(this.CARD_REGEX, (match) => {
      const cleanDigits = match.replace(/\D/g, '');
      if (cleanDigits.length >= 13 && cleanDigits.length <= 19 && passesLuhnCheck(cleanDigits)) {
        count++;
        types.add('PAYMENT_CARD');
        return maskCardNumber(match);
      }
      return match;
    });

    // 2. CVV / CVC
    result = result.replace(this.CVV_REGEX, (match, cvv) => {
      count++;
      types.add('CARD_SECURITY_CODE');
      return match.replace(cvv, '[REDACTED_CVV]');
    });

    // 3. SSN
    result = result.replace(this.SSN_REGEX, () => {
      count++;
      types.add('SSN_NATIONAL_ID');
      return '[REDACTED_SSN]';
    });

    // 4. API Keys and Bearer Tokens
    result = result.replace(this.API_KEY_REGEX, () => {
      count++;
      types.add('API_CREDENTIAL');
      return '[REDACTED_API_KEY]';
    });

    // 5. Plaintext Passwords
    result = result.replace(this.PASSWORD_REGEX, (match, pwd) => {
      count++;
      types.add('PASSWORD');
      return match.replace(pwd, '[REDACTED_PASSWORD]');
    });

    return {
      redactedText: result,
      redactionCount: count,
      redactedTypes: Array.from(types)
    };
  }
}
