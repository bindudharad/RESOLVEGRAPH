import { extractText, getDocumentProxy } from 'unpdf';
import fs from 'node:fs/promises';

export interface PdfPageText {
  pageNumber: number;
  text: string;
  charStart: number;
  charEnd: number;
  lineCount: number;
}

export interface PdfExtractionOutput {
  pageCount: number;
  fullText: string;
  pages: PdfPageText[];
  isScanned: boolean;
  fileSizeBytes: number;
}

export class PdfExtractor {
  /**
   * Extracts text, page divisions, and character offset ranges from a PDF buffer or file path.
   */
  public static async extract(source: string | Buffer): Promise<PdfExtractionOutput> {
    let buffer: Uint8Array;
    let size = 0;

    if (typeof source === 'string') {
      const fileBuffer = await fs.readFile(source);
      buffer = new Uint8Array(fileBuffer);
      size = fileBuffer.byteLength;
    } else {
      buffer = new Uint8Array(source);
      size = source.byteLength;
    }

    const doc = await getDocumentProxy(buffer);
    const pageCount = doc.numPages;

    const { text: pagesArray } = await extractText(buffer, { mergePages: false });

    const pages: PdfPageText[] = [];
    let cumulativeChars = 0;
    let fullText = '';
    let totalTextLength = 0;

    const pageTexts = Array.isArray(pagesArray) ? pagesArray : [pagesArray];

    for (let i = 0; i < pageCount; i++) {
      const pageText = (pageTexts[i] || '').trim();
      const length = pageText.length;
      totalTextLength += length;

      const charStart = cumulativeChars;
      const charEnd = cumulativeChars + length;
      cumulativeChars = charEnd + 1; // account for newline delimiter between pages

      pages.push({
        pageNumber: i + 1,
        text: pageText,
        charStart,
        charEnd,
        lineCount: pageText ? pageText.split('\n').length : 0
      });

      fullText += (i > 0 ? '\n' : '') + pageText;
    }

    // A PDF is flagged as scanned/image-only if average characters per page is less than 30
    const isScanned = pageCount > 0 && totalTextLength / pageCount < 30;

    return {
      pageCount,
      fullText,
      pages,
      isScanned,
      fileSizeBytes: size
    };
  }
}
