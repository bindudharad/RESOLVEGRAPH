import { prisma } from '../src/lib/prisma';
async function run() {
  const c = await prisma.caseRecord.findUnique({
    where: { caseNumber: 'RG-1461' },
    include: {
      buyer: true,
      merchant: true,
      organization: true,
      evidence: true,
      claims: true,
      sellerIdentityMatches: true,
      sellerEvidenceRequests: true,
    },
  });
  console.log('RG-1461:', JSON.stringify(c, null, 2));
}
run().finally(() => prisma.$disconnect());
