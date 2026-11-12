import { prisma } from '../src/lib/prisma';

async function main() {
  const caseId = 'cmwdm5wad028im8vjwr52fzay';
  const runs = await prisma.aIAnalysisRun.findMany({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
    include: {
      findings: true,
      extractedFacts: true
    }
  });

  console.log('AI Analysis Runs for case:', runs.length);
  for (const r of runs) {
    console.log({
      id: r.id,
      status: r.status,
      model: r.model,
      findingsCount: r.findings.length,
      factsCount: r.extractedFacts.length,
      discrepancyTotal: r.discrepancyTotal,
      createdAt: r.createdAt
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
