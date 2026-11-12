import { prisma } from '../src/lib/prisma';

async function main() {
  const assessments = await prisma.berrAssessmentRecord.findMany({
    where: { caseId: 'cmwdm5wad028im8vjwr52fzay' },
    orderBy: { createdAt: 'asc' }
  });
  console.log(JSON.stringify(assessments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
