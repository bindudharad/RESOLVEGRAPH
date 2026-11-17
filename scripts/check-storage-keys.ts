import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function run() {
  const evs = await prisma.evidence.findMany({
    take: 20,
    select: { id: true, caseId: true, filename: true, storageKey: true, sizeBytes: true, sha256: true }
  });
  console.log('Sample evidence in DB:');
  console.log(JSON.stringify(evs, null, 2));

  console.log('\nSample files in .private/evidence:');
  const files = fs.readdirSync(path.resolve(process.cwd(), '.private/evidence')).slice(0, 20);
  console.log(files);
}

run().catch(console.error).finally(() => prisma.$disconnect());
