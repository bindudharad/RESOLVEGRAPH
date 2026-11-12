import { prisma } from '../src/lib/prisma';

async function main() {
  const run1 = await prisma.aIAnalysisRun.findUnique({
    where: { id: 'cmwdm5wne02a6m8vj3gse3sdp' },
    include: {
      extractedFacts: true,
      assessments: true,
      findings: true,
      inputs: true
    }
  });
  console.log('Run 1 full details:', JSON.stringify(run1, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
