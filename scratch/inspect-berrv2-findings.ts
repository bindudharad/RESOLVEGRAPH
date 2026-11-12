import { prisma } from '../src/lib/prisma';

async function main() {
  const findings = await prisma.berrV2FindingRecord.findMany({
    where: { assessment: { caseId: 'cmwdm5wad028im8vjwr52fzay' } }
  });
  console.log(JSON.stringify(findings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
