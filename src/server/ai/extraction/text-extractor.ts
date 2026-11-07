export interface TextSegment {
  charStart: number;
  charEnd: number;
  text: string;
}

export class TextExtractor {
  /**
   * Finds character range for an excerpt within a source text.
   */
  public static locateExcerpt(sourceText: string, excerpt: string): { charStart: number; charEnd: number } | null {
    if (!sourceText || !excerpt) return null;

    const index = sourceText.indexOf(excerpt);
    if (index !== -1) {
      return {
        charStart: index,
        charEnd: index + excerpt.length
      };
    }

    // Try case-insensitive fallback
    const lowerSource = sourceText.toLowerCase();
    const lowerExcerpt = excerpt.toLowerCase();
    const lowerIndex = lowerSource.indexOf(lowerExcerpt);
    if (lowerIndex !== -1) {
      return {
        charStart: lowerIndex,
        charEnd: lowerIndex + excerpt.length
      };
    }

    return null;
  }
}
