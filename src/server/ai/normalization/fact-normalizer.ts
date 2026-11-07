/**
 * Normalizes extracted and claim facts for exact & semantic discrepancy comparison.
 */

export interface NormalizedFactValue {
  originalValue: string;
  normalizedValue: string;
  category: 'CAPACITY' | 'MONETARY' | 'DATE' | 'SKU_SERIAL' | 'CONDITION' | 'TEXT';
  parsedNumeric?: number;
  currency?: string;
}

export class FactNormalizer {
  /**
   * Normalizes capacity strings into standard Gigabytes (GB).
   * e.g., "1 TB", "1024GB", "512 GB", "2TB" -> "1024 GB", "512 GB", "2048 GB"
   */
  public static normalizeCapacity(value: string): string | null {
    const match = value.match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb)\b/i);
    if (!match) return null;

    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    if (unit === 'TB') {
      return `${Math.round(num * 1024)} GB`;
    } else if (unit === 'GB') {
      return `${Math.round(num)} GB`;
    } else if (unit === 'MB') {
      return `${(num / 1024).toFixed(2)} GB`;
    }

    return null;
  }

  /**
   * Normalizes monetary amounts into standard minor units (cents) and currency code.
   * e.g. "$1,299.99" -> "129999 USD", "€45.50" -> "4550 EUR", "1299.00" -> "129900 USD"
   */
  public static normalizeMonetary(value: string): { cents: number; currency: string; formatted: string } | null {
    // Detect currency symbol
    let currency = 'USD';
    if (value.includes('€') || /EUR/i.test(value)) currency = 'EUR';
    else if (value.includes('£') || /GBP/i.test(value)) currency = 'GBP';
    else if (value.includes('CAD') || /CAD/i.test(value)) currency = 'CAD';

    // Extract numbers
    const clean = value.replace(/[^0-9\.]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return null;

    const cents = Math.round(num * 100);
    return {
      cents,
      currency,
      formatted: `${cents} ${currency}`
    };
  }

  /**
   * Normalizes dates into ISO 8601 YYYY-MM-DD.
   */
  public static normalizeDate(value: string): string | null {
    if (!value || typeof value !== 'string') return null;
    const isoMatch = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const mdyMatch = value.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/);
    if (mdyMatch) {
      const monthPrefix = mdyMatch[1].toLowerCase().slice(0, 3);
      const mm = monthNames[monthPrefix];
      if (mm) {
        const dd = mdyMatch[2].padStart(2, '0');
        const yyyy = mdyMatch[3];
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  /**
   * Normalizes SKU or Serial Number: uppercase, stripped of spaces and dashes.
   * e.g., "SN: AB-123 456-XY" -> "AB123456XY"
   */
  public static normalizeSkuOrSerial(value: string): string {
    return value
      .replace(/^(?:sn|sku|serial|model)[:#\s]+/i, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
  }

  /**
   * Normalizes condition keywords.
   */
  public static normalizeCondition(value: string): string {
    const lower = value.toLowerCase().trim();
    if (/(?:brand\s+new|sealed|unopened|mint)/i.test(lower)) return 'BRAND_NEW';
    if (/(?:like\s+new|open\s+box|refurbished)/i.test(lower)) return 'LIKE_NEW';
    if (/(?:damaged|broken|scratched|cracked|defective|shattered)/i.test(lower)) return 'DAMAGED';
    if (/(?:used|pre-owned|good\s+condition|fair)/i.test(lower)) return 'USED';
    return lower.toUpperCase();
  }

  /**
   * Auto-detects and normalizes any fact value.
   */
  public static normalize(value: string, factTypeHint?: string): NormalizedFactValue {
    if (!value || typeof value !== 'string') {
      return { originalValue: '', normalizedValue: '', category: 'TEXT' };
    }

    const trimmed = value.trim();

    // 1. Capacity
    if (factTypeHint === 'PRODUCT_SPECIFICATION' || /(?:tb|gb|mb)\b/i.test(trimmed)) {
      const cap = this.normalizeCapacity(trimmed);
      if (cap) {
        return { originalValue: trimmed, normalizedValue: cap, category: 'CAPACITY' };
      }
    }

    // 2. Monetary
    if (factTypeHint === 'PRICE_PAID' || /[\$€£]|USD|EUR|GBP/i.test(trimmed) || /^\d+\.\d{2}$/.test(trimmed)) {
      const mon = this.normalizeMonetary(trimmed);
      if (mon) {
        return {
          originalValue: trimmed,
          normalizedValue: mon.formatted,
          category: 'MONETARY',
          parsedNumeric: mon.cents,
          currency: mon.currency
        };
      }
    }

    // 3. Serial / SKU
    if (factTypeHint === 'SERIAL_NUMBER' || /(?:sku|serial|sn):/i.test(trimmed)) {
      const sku = this.normalizeSkuOrSerial(trimmed);
      return { originalValue: trimmed, normalizedValue: sku, category: 'SKU_SERIAL' };
    }

    // 4. Date
    if (factTypeHint === 'DELIVERY_DATE' || /\b\d{4}[-/]\d{2}[-/]\d{2}\b/.test(trimmed) || /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(trimmed)) {
      const dateStr = this.normalizeDate(trimmed);
      if (dateStr) {
        return { originalValue: trimmed, normalizedValue: dateStr, category: 'DATE' };
      }
    }

    // 5. Condition
    if (factTypeHint === 'CONDITION_DESCRIPTION') {
      return {
        originalValue: trimmed,
        normalizedValue: this.normalizeCondition(trimmed),
        category: 'CONDITION'
      };
    }

    return {
      originalValue: trimmed,
      normalizedValue: trimmed,
      category: 'TEXT'
    };
  }
}
