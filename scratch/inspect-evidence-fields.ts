import { prisma } from '../src/lib/prisma';

async function main() {
  const ev = await prisma.evidence.findMany({
    where: { caseId: 'cmwdm5wad028im8vjwr52fzay' }
  });
  console.log(JSON.stringify(ev, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
