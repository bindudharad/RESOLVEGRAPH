import { prisma } from '../src/lib/prisma';
async function run() {
  const cases = await prisma.caseRecord.findMany({
    where: {
      OR: [
        { title: { contains: 'SSD' } },
        { description: { contains: 'SSD' } },
        { description: { contains: '512' } },
        { description: { contains: '1 TB' } },
      ],
    },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      description: true,
      organizationId: true,
      sellerEvidenceRequests: {
        select: { id: true, requestNumber: true, status: true },
      },
    },
  });
  console.log('MATCHED CASES:', JSON.stringify(cases, null, 2));
}
run().finally(() => prisma.$disconnect());
