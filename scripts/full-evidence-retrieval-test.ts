import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { evidenceStorage } from '../src/server/storage/evidence-storage';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });
const EVIDENCE_DIR = path.resolve(process.cwd(), '.private/evidence');

async function main() {
  console.log('=== FULL EVIDENCE RETRIEVAL & INSPECTION TEST ===');

  const evidenceRecords = await prisma.evidence.findMany({
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          category: true,
          status: true,
          amountMinor: true
        }
      },
      uploadedBy: {
        select: {
          fullName: true,
          role: true
        }
      },
      fieldExtractions: true,
      extractedFacts: true,
      findingLinks: {
        include: {
          finding: true
        }
      }
    },
    orderBy: { caseId: 'asc' }
  });

  console.log(`Auditing all ${evidenceRecords.length} evidence records in database...`);

  const results: any[] = [];
  let retrievalSuccess = 0;
  let retrievalFailed = 0;
  let originalUploadsRetrieved = 0;
  let syntheticFixturesRetrieved = 0;
  let totalBytesStreamed = 0;

  for (let i = 0; i < evidenceRecords.length; i++) {
    const ev = evidenceRecords[i];
    let streamSuccess = false;
    let streamError: string | null = null;
    let buffer: Buffer | null = null;
    let recordProvenance = 'UNKNOWN';
    let recordIsSynthetic = false;

    try {
      const streamRes = evidenceStorage.getFileStream(ev.storageKey);
      recordProvenance = streamRes.provenance;
      recordIsSynthetic = streamRes.isSynthetic;

      buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        streamRes.stream.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        streamRes.stream.on('end', () => resolve(Buffer.concat(chunks)));
        streamRes.stream.on('error', err => reject(err));
      });
      streamSuccess = true;
      retrievalSuccess++;
      if (recordIsSynthetic) {
        syntheticFixturesRetrieved++;
      } else {
        originalUploadsRetrieved++;
      }
      totalBytesStreamed += buffer.length;
    } catch (err: any) {
      streamSuccess = false;
      streamError = err.message || 'Stream failed';
      retrievalFailed++;
    }

    let fileInspection: any = {
      format: 'UNKNOWN',
      readability: 'UNREADABLE',
      details: ''
    };

    if (buffer) {
      const isPdf = buffer.slice(0, 4).toString() === '%PDF';
      const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      const isJpg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

      if (isPdf) {
        const str = buffer.toString('binary');
        const pageMatches = str.match(/\/Type\s*\/Page[^s]/g);
        const countMatch = str.match(/\/Count\s+(\d+)/);
        let pages = pageMatches ? pageMatches.length : 1;
        if (countMatch && parseInt(countMatch[1], 10) > pages) {
          pages = parseInt(countMatch[1], 10);
        }
        fileInspection = {
          format: 'PDF',
          pageCount: pages,
          readability: 'READABLE',
          details: `Valid PDF document with ${pages} page(s). Size: ${buffer.length} bytes.`
        };
      } else if (isPng) {
        let dim = '1x1';
        if (buffer.length >= 24) {
          dim = `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
        }
        fileInspection = {
          format: 'PNG',
          dimensions: dim,
          readability: 'READABLE',
          details: `Valid PNG image raster (${dim}). Size: ${buffer.length} bytes.`
        };
      } else if (isJpg) {
        fileInspection = {
          format: 'JPEG',
          readability: 'READABLE',
          details: `Valid JPEG photograph. Size: ${buffer.length} bytes.`
        };
      } else {
        const text = buffer.toString('utf8');
        if (/^[\x20-\x7E\s\u00A0-\uFFFF]*$/.test(text.slice(0, 500))) {
          fileInspection = {
            format: 'TEXT/CSV',
            readability: 'READABLE',
            details: `Plain text/CSV record. ${text.split('\n').length} lines.`
          };
        } else {
          fileInspection = {
            format: 'BINARY',
            readability: 'BINARY_PAYLOAD',
            details: `Binary asset (${buffer.length} bytes).`
          };
        }
      }
    }

    results.push({
      evidenceId: ev.id,
      caseNumber: ev.case?.caseNumber || 'N/A',
      caseTitle: ev.case?.title || 'Untitled',
      filename: ev.filename,
      storageKey: ev.storageKey,
      mimeType: ev.mimeType,
      dbSizeBytes: ev.sizeBytes,
      streamSizeBytes: buffer ? buffer.length : 0,
      streamSuccess,
      streamError,
      fileInspection,
      sourceType: ev.sourceType,
      verificationStatus: ev.verificationStatus,
      extractionsCount: ev.fieldExtractions.length + ev.extractedFacts.length,
      findingLinksCount: ev.findingLinks.length
    });
  }

  console.log(`Stream Retrieval: ${retrievalSuccess} succeeded (${originalUploadsRetrieved} original uploads, ${syntheticFixturesRetrieved} synthetic fixtures), ${retrievalFailed} missing original files.`);
  console.log(`Total Bytes Streamed: ${(totalBytesStreamed / 1024).toFixed(1)} KB`);

  // Now audit all 422 files on disk in .private/evidence directly!
  console.log('\n--- AUDITING ALL 422 FILES ON DISK IN .private/evidence ---');
  const diskFiles = fs.readdirSync(EVIDENCE_DIR);
  let diskPdfCount = 0;
  let diskPngCount = 0;
  let diskOtherCount = 0;
  let diskTotalPages = 0;
  let diskCorruptedCount = 0;

  const diskFileAudits: any[] = [];

  for (const filename of diskFiles) {
    const fullPath = path.join(EVIDENCE_DIR, filename);
    const buf = fs.readFileSync(fullPath);
    const ext = path.extname(filename).toLowerCase();
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

    let type = 'OTHER';
    let pages = 0;
    let status = 'CORRUPTED';

    if (ext === '.pdf') {
      diskPdfCount++;
      if (buf.slice(0, 4).toString() === '%PDF') {
        type = 'PDF';
        status = 'VALID';
        const str = buf.toString('binary');
        const pageMatches = str.match(/\/Type\s*\/Page[^s]/g);
        pages = pageMatches ? pageMatches.length : 1;
        diskTotalPages += pages;
      } else {
        diskCorruptedCount++;
      }
    } else if (ext === '.png') {
      diskPngCount++;
      if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) {
        type = 'PNG';
        status = 'VALID';
      } else {
        diskCorruptedCount++;
      }
    } else {
      diskOtherCount++;
      status = 'VALID';
    }

    diskFileAudits.push({
      filename,
      sizeBytes: buf.length,
      type,
      pages,
      sha256,
      status
    });
  }

  console.log(`Disk Files Audit: ${diskFiles.length} files inspected.`);
  console.log(`PDFs: ${diskPdfCount} (Total Pages: ${diskTotalPages}), PNGs: ${diskPngCount}, Other: ${diskOtherCount}, Corrupted: ${diskCorruptedCount}`);

  fs.writeFileSync(
    path.resolve(process.cwd(), '.private/full_evidence_inspection_dump.json'),
    JSON.stringify({
      totalDbEvidenceRecords: evidenceRecords.length,
      retrievalSuccess,
      retrievalFailed,
      totalBytesStreamed,
      diskFilesStats: {
        totalFiles: diskFiles.length,
        pdfCount: diskPdfCount,
        totalPages: diskTotalPages,
        pngCount: diskPngCount,
        otherCount: diskOtherCount,
        corruptedCount: diskCorruptedCount
      },
      dbEvidenceResults: results,
      diskFileAudits: diskFileAudits.slice(0, 50)
    }, null, 2)
  );

  console.log('Saved dump to .private/full_evidence_inspection_dump.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
