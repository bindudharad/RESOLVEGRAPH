import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { evidenceStorage } from '../src/server/storage/evidence-storage';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function inspectContents() {
  console.log('=== DEEP CONTENT INSPECTION OF REAL EVIDENCE ASSETS ===\n');

  // Query specific high-value evidence items
  const highValueEvidence = await prisma.evidence.findMany({
    where: {
      filename: {
        in: [
          'OD438897692023711100.pdf',
          'OD438890793307262100.pdf',
          'c04e750c-7195-42d3-9ffd-3c2f6f1faa71.png',
          'buds.png',
          'tax-invoice-digitalmart.pdf',
          'tax-invoice-refund.pdf',
          'TechStore_Order_Cancellation_Notice.pdf'
        ]
      }
    },
    include: {
      case: {
        select: {
          caseNumber: true,
          title: true,
          category: true,
          amountMinor: true,
          currency: true
        }
      },
      fieldExtractions: true,
      extractedFacts: true,
      analysisResults: true
    }
  });

  console.log(`Found ${highValueEvidence.length} real evidence records for deep inspection.`);

  for (const ev of highValueEvidence) {
    console.log(`\n--------------------------------------------------`);
    console.log(`EVIDENCE: ${ev.filename} (ID: ${ev.id})`);
    console.log(`CASE: ${ev.case?.caseNumber} — "${ev.case?.title}"`);
    console.log(`CASE AMOUNT: ${ev.case?.currency} ${(Number(ev.case?.amountMinor || 0)/100).toFixed(2)} | CATEGORY: ${ev.case?.category}`);
    console.log(`STORAGE KEY: ${ev.storageKey} | MIME: ${ev.mimeType} | SIZE: ${ev.sizeBytes} bytes`);
    console.log(`SHA-256: ${ev.sha256}`);

    // Read file bytes
    try {
      const { stream } = evidenceStorage.getFileStream(ev.storageKey);
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

      console.log(`ACTUAL STREAMED SIZE: ${buffer.length} bytes`);

      if (ev.filename.endsWith('.pdf')) {
        const binary = buffer.toString('binary');
        // Page analysis
        const pageCount = (binary.match(/\/Type\s*\/Page[^s]/g) || []).length;
        console.log(`PDF PAGE COUNT: ${pageCount}`);

        // Extract text streams
        const streams: string[] = [];
        const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
        let m;
        while ((m = streamRegex.exec(binary)) !== null) {
          const raw = m[1];
          // Simple ASCII filter
          const printable = raw.replace(/[^a-zA-Z0-9\s.,:\-₹$#/@&]/g, ' ').replace(/\s+/g, ' ').trim();
          if (printable.length > 20) streams.push(printable);
        }

        console.log(`EXTRACTED READABLE TEXT STREAMS (${streams.length} streams found):`);
        streams.slice(0, 5).forEach((s, idx) => {
          console.log(`  [Stream ${idx + 1}]: ${s.slice(0, 200)}...`);
        });
      } else if (ev.filename.endsWith('.png')) {
        const w = buffer.readUInt32BE(16);
        const h = buffer.readUInt32BE(20);
        console.log(`IMAGE DIMENSIONS: ${w} x ${h} pixels`);
        console.log(`COLOR TYPE: ${buffer[25]} | BIT DEPTH: ${buffer[24]}`);
      }
    } catch (err: any) {
      console.log(`STREAM ERROR: ${err.message}`);
    }

    // Inspect Field Extractions stored in database
    console.log(`DATABASE FIELD EXTRACTIONS (${ev.fieldExtractions.length}):`);
    for (const fe of ev.fieldExtractions) {
      console.log(`  - ${fe.fieldName}: "${fe.extractedValue}" (Confidence: ${fe.confidence})`);
    }

    // Inspect Extracted Facts
    console.log(`DATABASE EXTRACTED FACTS (${ev.extractedFacts.length}):`);
    for (const ef of ev.extractedFacts) {
      console.log(`  - [${ef.factType}] ${ef.fieldKey}: "${ef.rawValue}"`);
    }
  }
}

inspectContents().catch(console.error).finally(() => prisma.$disconnect());
