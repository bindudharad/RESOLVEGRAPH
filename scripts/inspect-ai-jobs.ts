import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function main() {
  const counts = await prisma.aIAnalysisRun.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('--- AI ANALYSIS RUNS BY STATUS ---');
  console.log(counts);

  const total = await prisma.aIAnalysisRun.count();
  console.log('Total aIAnalysisRun records:', total);

  const sampleQueued = await prisma.aIAnalysisRun.findMany({
    where: { status: 'QUEUED' },
    take: 5,
    select: {
      id: true,
      caseId: true,
      provider: true,
      model: true,
      analysisType: true,
      createdAt: true,
      attemptCount: true,
      case: {
        select: {
          caseNumber: true,
          title: true,
          status: true
        }
      }
    }
  });
  console.log('\n--- SAMPLE QUEUED JOBS ---');
  console.log(JSON.stringify(sampleQueued, null, 2));

  // Check oldest and newest queued jobs
  const oldest = await prisma.aIAnalysisRun.findFirst({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, createdAt: true }
  });
  const newest = await prisma.aIAnalysisRun.findFirst({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true }
  });
  console.log('\nOldest queued job:', oldest);
  console.log('Newest queued job:', newest);
}

main().catch(console.error).finally(() => prisma.$disconnect());
