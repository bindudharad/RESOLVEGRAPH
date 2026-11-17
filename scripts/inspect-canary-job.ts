import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function main() {
  const job = await prisma.aIAnalysisRun.findUnique({
    where: { id: 'cmw0pu2n000019ovjg2z4cx2f' },
    include: {
      case: { select: { caseNumber: true, title: true } }
    }
  });
  console.log('--- CANARY JOB AUDIT RECORD ---');
  console.log(JSON.stringify(job, null, 2));

  // Check health endpoint output
  const healthRes = await fetch('http://localhost:3000/api/health');
  const healthJson = await healthRes.json();
  console.log('\n--- LIVE HEALTH ENDPOINT AI & WORKER STATUS ---');
  console.log(JSON.stringify({
    aiEngine: healthJson.aiEngine,
    workerQueue: healthJson.workerQueue
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
