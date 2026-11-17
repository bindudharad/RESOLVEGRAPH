import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function extractAllPdfText(pdfPath: string): { pages: number; extractedText: string[] } {
  const buf = fs.readFileSync(pdfPath);
  const binary = buf.toString('binary');
  const pageMatches = binary.match(/\/Type\s*\/Page[^s]/g);
  const countMatch = binary.match(/\/Count\s+(\d+)/);
  let pages = pageMatches ? pageMatches.length : 1;
  if (countMatch && parseInt(countMatch[1], 10) > pages) {
    pages = parseInt(countMatch[1], 10);
  }

  const extractedText: string[] = [];

  // 1. Search for FlateDecode streams and decompress them
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let m;
  let streamIndex = 0;
  while ((m = streamRegex.exec(binary)) !== null) {
    streamIndex++;
    const rawStream = Buffer.from(m[1], 'binary');
    try {
      const decompressed = zlib.inflateSync(rawStream);
      const decStr = decompressed.toString('utf8');
      // Extract text in parentheses (Tj / TJ / etc)
      const tjRegex = /\((.*?)\)\s*T[jJ]/g;
      let tjMatch;
      const streamWords: string[] = [];
      while ((tjMatch = tjRegex.exec(decStr)) !== null) {
        if (tjMatch[1].trim()) streamWords.push(tjMatch[1]);
      }
      if (streamWords.length > 0) {
        extractedText.push(`[Decompressed Stream ${streamIndex}]: ` + streamWords.join(' '));
      } else {
        // Raw printable
        const clean = decStr.replace(/[^a-zA-Z0-9\s.,:\-₹$#/@&]/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 30) {
          extractedText.push(`[Stream ${streamIndex} text]: ` + clean);
        }
      }
    } catch (e) {
      // not compressed or not flate
      const clean = rawStream.toString('utf8').replace(/[^a-zA-Z0-9\s.,:\-₹$#/@&]/g, ' ').replace(/\s+/g, ' ').trim();
      if (clean.length > 30) {
        extractedText.push(`[Raw Stream ${streamIndex}]: ` + clean);
      }
    }
  }

  // 2. Also search for readable strings in uncompressed binary
  const generalPrintable = buf.toString('utf8').match(/[A-Z0-9\s.,:\-₹$#/]{15,}/gi) || [];
  if (extractedText.length === 0 && generalPrintable.length > 0) {
    extractedText.push('[Direct ASCII Strings]: ' + generalPrintable.slice(0, 20).join(' | '));
  }

  return { pages, extractedText };
}

async function run() {
  const pdf1 = '.private/evidence/ev_0c900e39-dce1-43d2-a109-59112ce30453.pdf';
  console.log('=== PDF 1: OD438897692023711100.pdf (RG-1462) ===');
  const res1 = extractAllPdfText(pdf1);
  console.log(`Page count: ${res1.pages}`);
  console.log(`Extracted streams (${res1.extractedText.length}):`);
  res1.extractedText.slice(0, 10).forEach(t => console.log(t.slice(0, 300)));

  const pdf2 = '.private/evidence/ev_22d29b89-8bda-4be1-8dd7-7e6bc456c3c9.pdf';
  console.log('\n=== PDF 2: OD438890793307262100.pdf (RG-1469) ===');
  const res2 = extractAllPdfText(pdf2);
  console.log(`Page count: ${res2.pages}`);
  console.log(`Extracted streams (${res2.extractedText.length}):`);
  res2.extractedText.slice(0, 10).forEach(t => console.log(t.slice(0, 300)));
}

run();
