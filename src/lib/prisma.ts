import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const createPrismaClient = () => {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
  if (dbUrl.startsWith('file:')) {
    const rawPath = dbUrl.replace(/^file:/, '');
    const dir = path.dirname(
      path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(/*turbopackIgnore: true*/ process.cwd(), rawPath)
    );
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.warn(`[prisma] Could not create database directory ${dir}:`, e);
      }
    }
  }
  const adapter = new PrismaBetterSqlite3({ url: dbUrl, timeout: 30000 });
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof createPrismaClient>;
}

export const prisma = globalThis.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export * from '@/generated/prisma/client';
