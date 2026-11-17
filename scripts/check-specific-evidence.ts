import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function check() {
  const records = await prisma.evidence.findMany({
    where: {
      filename: {
        in: ['buds.png', 'OD438897692023711100.pdf', 'c04e750c-7195-42d3-9ffd-3c2f6f1faa71.png', 'OD438890793307262100.pdf']
      }
    },
    select: {
      id: true,
      caseId: true,
      filename: true,
      storageKey: true,
      sizeBytes: true,
      sha256: true,
      case: { select: { caseNumber: true, title: true } }
    }
  });

  console.log(JSON.stringify(records, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
