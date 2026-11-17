import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl, timeout: 30000 });
const prisma = new PrismaClient({ adapter });

const EVIDENCE_DIR = path.resolve(process.cwd(), '.private/evidence');

function resolveExistingPath(storageKey: string): string | null {
  if (!storageKey || !storageKey.trim()) return null;
  const safeBase = path.basename(storageKey);
  const directPrivate = path.resolve(EVIDENCE_DIR, storageKey);
  if (directPrivate.startsWith(EVIDENCE_DIR) && fs.existsSync(directPrivate)) {
    return directPrivate;
  }
  const basePrivate = path.resolve(EVIDENCE_DIR, safeBase);
  if (basePrivate.startsWith(EVIDENCE_DIR) && fs.existsSync(basePrivate)) {
    return basePrivate;
  }
  if (path.isAbsolute(storageKey) && fs.existsSync(storageKey)) {
    return storageKey;
  }
  const repoRoot = path.resolve(process.cwd());
  const repoRelative = path.resolve(repoRoot, storageKey);
  if (repoRelative.startsWith(repoRoot) && fs.existsSync(repoRelative)) {
    return repoRelative;
  }
  return null;
}

interface EvidenceAuditRecord {
  id: string;
  caseId: string;
  caseNumber: string;
  filename: string;
  storageKey: string;
  dbMimeType: string;
  detectedMimeType: string;
  dbSizeBytes: number;
  diskSizeBytes: number;
  dbSha256: string;
  computedSha256: string;
  sha256Match: boolean;
  fileExists: boolean;
  sourceType: string;
  evidenceType: string;
  verificationStatus: string;
  uploaderName: string;
  uploaderRole: string;
  description: string | null;
  extractedTextSample: string;
  extractionsCount: number;
  linkedBerrFindings: string[];
  contentInspection: {
    format: string;
    pageCount?: number;
    dimensions?: string;
    rowCount?: number;
    snippet: string;
    readabilityStatus: string;
  };
  crossVerification: {
    caseProduct: string;
    caseAmount: number;
    discrepancyObserved: string | null;
  };
}

interface CaseAuditRecord {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  disputedAmount: number;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  sellerName: string;
  evidenceCount: number;
  buyerEvidenceCount: number;
  sellerEvidenceCount: number;
  otherEvidenceCount: number;
  evidenceIds: string[];
}

function detectMimeAndInspect(buffer: Buffer, filename: string): {
  detectedMime: string;
  format: string;
  pageCount?: number;
  dimensions?: string;
  rowCount?: number;
  snippet: string;
  readabilityStatus: string;
} {
  const ext = path.extname(filename).toLowerCase();

  // 1. PDF
  if (buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF') {
    const str = buffer.toString('binary');
    // Count pages by matching /Type /Page (standard PDF structure)
    const pageMatches = str.match(/\/Type\s*\/Page[^s]/g);
    const countMatch = str.match(/\/Count\s+(\d+)/);
    let pages = pageMatches ? pageMatches.length : 1;
    if (countMatch && parseInt(countMatch[1], 10) > pages) {
      pages = parseInt(countMatch[1], 10);
    }

    // Extract text streams or readable ASCII text
    const textChunks: string[] = [];
    const streamRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = streamRegex.exec(str)) !== null) {
      const cleaned = match[0].replace(/[^a-zA-Z0-9\s.,:\-₹$]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 5) textChunks.push(cleaned);
    }

    let snippet = textChunks.slice(0, 3).join(' | ');
    if (!snippet) {
      // Fallback: search for strings in raw buffer
      const rawText = buffer.toString('utf8').replace(/[^a-zA-Z0-9\s.,:\-₹$]/g, ' ').replace(/\s+/g, ' ').trim();
      snippet = rawText.slice(0, 200);
    }

    return {
      detectedMime: 'application/pdf',
      format: 'PDF',
      pageCount: Math.max(1, pages),
      snippet: snippet.slice(0, 300),
      readabilityStatus: snippet.length > 10 ? 'Text Readable' : 'Scanned / Compressed Streams'
    };
  }

  // 2. PNG
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    let dimensions = 'Unknown';
    if (buffer.length >= 24) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      dimensions = `${width}x${height}`;
    }
    return {
      detectedMime: 'image/png',
      format: 'PNG',
      dimensions,
      snippet: `PNG image raster (${dimensions})`,
      readabilityStatus: buffer.length > 100 ? 'Valid PNG Image' : 'Micro Placeholder'
    };
  }

  // 3. JPEG
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      detectedMime: 'image/jpeg',
      format: 'JPEG',
      snippet: `JPEG photo raster (${buffer.length} bytes)`,
      readabilityStatus: 'Valid JPEG Image'
    };
  }

  // 4. CSV / Text
  const textContent = buffer.toString('utf8');
  const isPrintable = /^[\x20-\x7E\s\u00A0-\uFFFF]*$/.test(textContent.slice(0, 1000));
  if (isPrintable || ext === '.csv' || ext === '.txt') {
    const lines = textContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    return {
      detectedMime: ext === '.csv' ? 'text/csv' : 'text/plain',
      format: ext === '.csv' ? 'CSV' : 'TEXT',
      rowCount: lines.length,
      snippet: lines.slice(0, 3).join(' \\n '),
      readabilityStatus: 'Plain Text Readable'
    };
  }

  return {
    detectedMime: 'application/octet-stream',
    format: ext.toUpperCase().replace('.', '') || 'BINARY',
    snippet: `Binary data (${buffer.length} bytes)`,
    readabilityStatus: 'Binary Asset'
  };
}

async function main() {
  console.log('--- STARTING EXHAUSTIVE CASE & EVIDENCE AUDIT ---');

  // 1. Fetch all cases
  const cases = await prisma.caseRecord.findMany({
    include: {
      buyer: { select: { fullName: true, email: true } },
      merchant: { select: { fullName: true, organization: true } },
      organization: { select: { name: true } },
      evidence: {
        select: {
          id: true,
          sourceType: true
        }
      }
    },
    orderBy: { caseNumber: 'asc' }
  });

  console.log(`Discovered ${cases.length} total CaseRecord entries.`);

  const caseAuditList: CaseAuditRecord[] = cases.map(c => {
    const buyerEv = c.evidence.filter(e => (e.sourceType as string) === 'BUYER_UPLOAD').length;
    const sellerEv = c.evidence.filter(e => (e.sourceType as string) === 'SELLER_SUBMISSION' || (e.sourceType as string) === 'CARRIER_MANIFEST').length;
    const otherEv = c.evidence.length - (buyerEv + sellerEv);

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      category: c.category,
      status: c.status,
      priority: c.priority,
      disputedAmount: Number(c.amountMinor) / 100,
      currency: c.currency,
      buyerName: c.buyer?.fullName || 'Alex Morgan',
      buyerEmail: c.buyer?.email || 'buyer@resolvegraph.demo',
      sellerName: c.organization?.name || c.merchant?.organization || c.merchant?.fullName || 'Identified Merchant',
      evidenceCount: c.evidence.length,
      buyerEvidenceCount: buyerEv,
      sellerEvidenceCount: sellerEv,
      otherEvidenceCount: otherEv,
      evidenceIds: c.evidence.map(e => e.id)
    };
  });

  // 2. Fetch all evidence items
  const evidenceList = await prisma.evidence.findMany({
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
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
      },
      berrV2SupportingLinks: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Discovered ${evidenceList.length} total Evidence database entries.`);

  const evidenceAuditList: EvidenceAuditRecord[] = [];

  for (const ev of evidenceList) {
    const resolvedPath = resolveExistingPath(ev.storageKey);
    const fileExists = resolvedPath !== null;
    let diskSizeBytes = 0;
    let computedSha256 = '';
    let sha256Match = false;
    let detectedMime = 'unknown';
    let contentInspection: any = {
      format: 'MISSING',
      snippet: 'File not present in storage directory',
      readabilityStatus: 'Missing on disk'
    };

    if (fileExists && resolvedPath) {
      const buffer = fs.readFileSync(resolvedPath);
      diskSizeBytes = buffer.length;
      computedSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      sha256Match = (computedSha256.toLowerCase() === ev.sha256.toLowerCase());
      
      const insp = detectMimeAndInspect(buffer, ev.filename) as any;
      detectedMime = insp.detectedMime;
      contentInspection = {
        format: insp.format,
        pageCount: insp.pageCount,
        dimensions: insp.dimensions,
        rowCount: insp.rowCount,
        snippet: insp.snippet,
        readabilityStatus: insp.readabilityStatus
      };
    }

    const linkedFindings = [
      ...ev.findingLinks.map(fl => `${(fl.finding as any).factClassification || fl.finding.findingType}: ${(fl.finding as any).findingText || fl.finding.title}`),
      ...ev.berrV2SupportingLinks.map(bl => `BERR-v2 Link`)
    ];

    const extractions = [
      ...ev.fieldExtractions.map(f => `${f.fieldName}: ${f.extractedValue}`),
      ...ev.extractedFacts.map(ef => `${ef.fieldKey}: ${ef.rawValue}`)
    ];

    let discrepancyObserved: string | null = null;
    const desc = (ev.description || '').toLowerCase();
    const title = (ev.case?.title || '').toLowerCase();
    if (desc.includes('512gb') && title.includes('1tb')) {
      discrepancyObserved = 'Discrepancy: Evidence specifies 512GB while case claim specifies 1TB';
    } else if (desc.includes('damage') || desc.includes('dead on arrival')) {
      discrepancyObserved = 'Condition Discrepancy: Physical damage / hardware failure claimed';
    }

    evidenceAuditList.push({
      id: ev.id,
      caseId: ev.caseId,
      caseNumber: ev.case?.caseNumber || 'UNKNOWN',
      filename: ev.filename,
      storageKey: ev.storageKey,
      dbMimeType: ev.mimeType,
      detectedMimeType: detectedMime,
      dbSizeBytes: ev.sizeBytes,
      diskSizeBytes,
      dbSha256: ev.sha256,
      computedSha256,
      sha256Match,
      fileExists,
      sourceType: ev.sourceType,
      evidenceType: ev.evidenceType,
      verificationStatus: ev.verificationStatus,
      uploaderName: ev.uploadedBy?.fullName || 'System',
      uploaderRole: ev.uploadedBy?.role || 'BUYER',
      description: ev.description,
      extractedTextSample: extractions.slice(0, 3).join('; '),
      extractionsCount: extractions.length,
      linkedBerrFindings: linkedFindings,
      contentInspection,
      crossVerification: {
        caseProduct: ev.case?.title || 'Unknown Product',
        caseAmount: Number(ev.case?.amountMinor || 0) / 100,
        discrepancyObserved
      }
    });
  }

  // 3. Summarize Statistics
  const casesWithEvidence = caseAuditList.filter(c => c.evidenceCount > 0);
  const casesWithoutEvidence = caseAuditList.filter(c => c.evidenceCount === 0);
  const totalFilesOnDisk = fs.existsSync(EVIDENCE_DIR) ? fs.readdirSync(EVIDENCE_DIR).length : 0;
  const verifiedHashes = evidenceAuditList.filter(e => e.sha256Match).length;
  const missingFiles = evidenceAuditList.filter(e => !e.fileExists).length;

  const pdfCount = evidenceAuditList.filter(e => e.contentInspection.format === 'PDF').length;
  const imgCount = evidenceAuditList.filter(e => e.contentInspection.format === 'PNG' || e.contentInspection.format === 'JPEG').length;
  const csvCount = evidenceAuditList.filter(e => e.contentInspection.format === 'CSV' || e.contentInspection.format === 'TEXT').length;
  const otherCount = evidenceAuditList.length - (pdfCount + imgCount + csvCount);

  let totalPdfPages = 0;
  for (const e of evidenceAuditList) {
    if (e.contentInspection.pageCount) totalPdfPages += e.contentInspection.pageCount;
  }

  const summary = {
    totalCasesDiscovered: caseAuditList.length,
    casesWithEvidence: casesWithEvidence.length,
    casesWithoutEvidence: casesWithoutEvidence.length,
    totalEvidenceRecords: evidenceAuditList.length,
    totalFilesInStorageDir: totalFilesOnDisk,
    hashIntegrityPassed: verifiedHashes,
    missingFilesCount: missingFiles,
    formatBreakdown: {
      pdfDocuments: pdfCount,
      totalPdfPagesInspected: totalPdfPages,
      imageAssets: imgCount,
      csvTextSpreadsheets: csvCount,
      otherBinaryAssets: otherCount
    }
  };

  console.log('AUDIT SUMMARY:', JSON.stringify(summary, null, 2));

  // Write out comprehensive audit JSON for report compilation
  fs.writeFileSync(
    path.resolve(process.cwd(), '.private/evidence_audit_results.json'),
    JSON.stringify({ summary, caseAuditList, evidenceAuditList }, null, 2)
  );
  console.log('Saved detailed audit dump to .private/evidence_audit_results.json');
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
