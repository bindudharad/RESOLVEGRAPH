import { prisma } from '../src/lib/prisma';
async function run() {
  const cases = await prisma.caseRecord.findMany({
    select: { id: true, caseNumber: true, title: true, organizationId: true },
    orderBy: { caseNumber: 'asc' },
  });
  console.log(cases);
}
run().finally(() => prisma.$disconnect());
