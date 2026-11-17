import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function findEvFiles() {
  const diskFiles = fs.readdirSync('.private/evidence');
  const sampleUuid = diskFiles[0].replace('ev_', '').replace(/\.[^.]+$/, '');
  console.log('Sample UUID from disk:', sampleUuid);

  // Search across all tables in sqlite for this UUID
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';
  `);
  console.log(`Searching across ${tables.length} tables...`);

  for (const t of tables) {
    try {
      // Find text columns
      const cols = await prisma.$queryRawUnsafe<Array<{ name: string, type: string }>>(`PRAGMA table_info("${t.name}");`);
      const textCols = cols.filter(c => c.type.includes('CHAR') || c.type.includes('TEXT') || c.type === '');
      for (const col of textCols) {
        const found = await prisma.$queryRawUnsafe<any[]>(`
          SELECT "${col.name}" FROM "${t.name}" WHERE "${col.name}" LIKE '%${sampleUuid}%' LIMIT 1;
        `);
        if (found.length > 0) {
          console.log(`FOUND in table ${t.name}, column ${col.name}! Value:`, found[0][col.name]);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Also search for 'ev_'
  for (const t of tables) {
    try {
      const cols = await prisma.$queryRawUnsafe<Array<{ name: string, type: string }>>(`PRAGMA table_info("${t.name}");`);
      const textCols = cols.filter(c => c.type.includes('CHAR') || c.type.includes('TEXT') || c.type === '');
      for (const col of textCols) {
        const found = await prisma.$queryRawUnsafe<any[]>(`
          SELECT "${col.name}" FROM "${t.name}" WHERE "${col.name}" LIKE '%ev_%' LIMIT 1;
        `);
        if (found.length > 0) {
          console.log(`FOUND 'ev_' in table ${t.name}, column ${col.name}! Value:`, found[0][col.name]);
        }
      }
    } catch (e) {}
  }
}

findEvFiles().catch(console.error).finally(() => prisma.$disconnect());
