import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });
const EVIDENCE_DIR = path.resolve(process.cwd(), '.private/evidence');

async function main() {
  const diskFiles = fs.readdirSync(EVIDENCE_DIR);
  console.log('Total files on disk:', diskFiles.length);

  const exts: Record<string, number> = {};
  for (const f of diskFiles) {
    const ext = path.extname(f).toLowerCase();
    exts[ext] = (exts[ext] || 0) + 1;
  }
  console.log('File extensions on disk:', exts);

  // Check how many of these files correspond to Evidence records in DB
  const dbRecords = await prisma.evidence.findMany({
    select: { id: true, storageKey: true, filename: true, sha256: true }
  });

  const dbStorageKeys = new Set(dbRecords.map(r => r.storageKey));
  const dbBasenames = new Set(dbRecords.map(r => path.basename(r.storageKey)));
  const dbSha256s = new Set(dbRecords.map(r => r.sha256.toLowerCase()));

  let directKeyMatch = 0;
  let basenameMatch = 0;
  let sha256Match = 0;

  for (const f of diskFiles) {
    if (dbStorageKeys.has(f) || dbStorageKeys.has(`.private/evidence/${f}`) || dbStorageKeys.has(`evidence/${f}`)) {
      directKeyMatch++;
    }
    if (dbBasenames.has(f)) {
      basenameMatch++;
    }
    const buf = fs.readFileSync(path.join(EVIDENCE_DIR, f));
    const hash = crypto.createHash('sha256').update(buf).digest('hex').toLowerCase();
    if (dbSha256s.has(hash)) {
      sha256Match++;
    }
  }

  console.log(`Direct Key matches: ${directKeyMatch}`);
  console.log(`Basename matches: ${basenameMatch}`);
  console.log(`SHA-256 matches: ${sha256Match}`);

  // Also check if other models in Prisma reference these files!
  // e.g. PackagePassport, TransactionSourceRecord, CameraSession, etc.
  const passports = await prisma.packagePassport.findMany({ take: 5 });
  console.log('PackagePassport sample:', passports.length > 0 ? Object.keys(passports[0]) : 'None');

  // Let's sample 10 files from disk and see what they are named
  console.log('\nSample disk filenames:');
  console.log(diskFiles.slice(0, 15));

  // Let's sample what the DB storageKeys look like:
  console.log('\nSample DB storageKeys (first 25):');
  console.log(dbRecords.slice(0, 25).map(r => ({ id: r.id, filename: r.filename, storageKey: r.storageKey })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
