import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function main() {
  const all = await prisma.evidence.findMany({
    select: {
      id: true,
      caseId: true,
      storageKey: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      sourceType: true,
      metadataJson: true,
      createdAt: true
    }
  });
  console.log('Total evidence records in DB:', all.length);

  const evidenceDir = path.resolve(process.cwd(), '.private/evidence');
  const diskFiles = fs.readdirSync(evidenceDir);
  console.log('Total physical files in .private/evidence:', diskFiles.length);

  const diskFileMap = new Map<string, { size: number; sha256: string; path: string }>();
  for (const f of diskFiles) {
    const fullPath = path.join(evidenceDir, f);
    const buf = fs.readFileSync(fullPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    diskFileMap.set(f, { size: buf.length, sha256: hash, path: fullPath });
  }

  // Classification categories
  let exactMatchCount = 0;
  let hashMatchCount = 0;
  let missingCount = 0;
  let syntheticDummyCount = 0;
  let realUploadCount = 0;

  const recordsByPattern: Record<string, number> = {};

  const analyzedRecords = all.map(ev => {
    const safeBase = path.basename(ev.storageKey);
    let matchedFile = diskFileMap.get(safeBase);

    // Also check if storageKey matches direct relative path
    if (!matchedFile && diskFileMap.has(ev.storageKey)) {
      matchedFile = diskFileMap.get(ev.storageKey);
    }

    const fileExists = Boolean(matchedFile);
    const sha256Match = matchedFile ? matchedFile.sha256 === ev.sha256 : false;

    // Is it a synthetic dummy created by the on-demand generator? (104 bytes dummy PDF or 1x1 png or 118 bytes csv)
    const isSyntheticDummy = matchedFile && (
      (matchedFile.size === 104 && matchedFile.sha256 === 'a7b89eee4a7a43f94fefe413827b720a5295bc06e5446fec4b058dce36720ae1') ||
      (matchedFile.size === 68 && matchedFile.sha256 === '3b0922e374521743788ff3f8319fcf4d440ad84620f498c4309a4d8ae72e2cf5') ||
      (matchedFile.size === 118 && matchedFile.sha256 === '8a6669911e3bce7bfba3e2264c399bf0954b8d7eb80536c4ff55850974cf978a')
    );

    let classification = 'UNKNOWN';
    if (!fileExists) {
      classification = 'MISSING_ORIGINAL';
      missingCount++;
    } else if (isSyntheticDummy) {
      classification = 'SYNTHETIC_GENERATED_PLACEHOLDER';
      syntheticDummyCount++;
    } else if (sha256Match) {
      classification = 'ORIGINAL_UPLOAD_VERIFIED';
      hashMatchCount++;
      exactMatchCount++;
    } else {
      classification = 'REAL_BINARY_HASH_MISMATCH';
      realUploadCount++;
    }

    const prefix = ev.storageKey.split('/')[0] || 'root';
    recordsByPattern[prefix] = (recordsByPattern[prefix] || 0) + 1;

    return {
      id: ev.id,
      caseId: ev.caseId,
      filename: ev.filename,
      storageKey: ev.storageKey,
      mimeType: ev.mimeType,
      dbSizeBytes: ev.sizeBytes,
      diskSizeBytes: matchedFile?.size || 0,
      dbSha256: ev.sha256,
      diskSha256: matchedFile?.sha256 || null,
      classification
    };
  });

  console.log('\n--- STORAGE KEY PATTERNS IN DB ---');
  console.log(recordsByPattern);

  const withMeta = all.filter(e => e.metadataJson);
  console.log('Total with metadataJson:', withMeta.length);
  if (withMeta.length > 0) {
    console.log('Sample metadataJson:', withMeta.slice(0, 3).map(e => ({ id: e.id, meta: e.metadataJson })));
  }

  console.log('\n--- EVIDENCE CLASSIFICATION BREAKDOWN ---');
  console.log({
    totalDbRecords: all.length,
    exactSha256Matches: hashMatchCount,
    syntheticGeneratedPlaceholders: syntheticDummyCount,
    realBinaryHashMismatches: realUploadCount,
    missingFiles: missingCount
  });

  // Check orphaned files on disk
  const referencedKeys = new Set(all.map(e => path.basename(e.storageKey)));
  const orphanFiles = diskFiles.filter(f => !referencedKeys.has(f));
  console.log('\n--- ORPHAN DISK FILES ---');
  console.log('Total orphan files on disk (not referenced in DB evidence records):', orphanFiles.length);
  console.log('Orphan file prefixes:', {
    ev_uuid: orphanFiles.filter(f => f.startsWith('ev_')).length,
    intake: orphanFiles.filter(f => f.startsWith('intake_')).length,
    other: orphanFiles.filter(f => !f.startsWith('ev_') && !f.startsWith('intake_')).length
  });

  // Sample verified records
  const sampleVerified = analyzedRecords.filter(r => r.classification === 'ORIGINAL_UPLOAD_VERIFIED').slice(0, 5);
  console.log('\nSample ORIGINAL_UPLOAD_VERIFIED:', sampleVerified);

  // Sample synthetic placeholders
  const sampleSynthetic = analyzedRecords.filter(r => r.classification === 'SYNTHETIC_GENERATED_PLACEHOLDER').slice(0, 5);
  console.log('\nSample SYNTHETIC_GENERATED_PLACEHOLDER:', sampleSynthetic);

  // Inspect the realBinaryHashMismatches
  const realMismatches = analyzedRecords.filter(r => r.classification === 'REAL_BINARY_HASH_MISMATCH');
  console.log('\n--- REAL BINARY HASH MISMATCHES (COUNT: ' + realMismatches.length + ') ---');
  console.log(realMismatches.slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
