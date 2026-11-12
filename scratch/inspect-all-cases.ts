import { prisma } from '../src/lib/prisma';

async function main() {
  const cases = await prisma.caseRecord.findMany({
    select: {
      id: true,
      caseNumber: true,
      status: true,
      title: true,
      description: true,
      organizationId: true,
      evidence: { select: { id: true, filename: true, evidenceType: true } },
      sellerIdentityMatches: { select: { id: true, matchOutcome: true, matchedSellerId: true } },
      sellerEvidenceRequests: { select: { id: true, requestNumber: true, status: true } },
    },
    take: 15,
  });
  console.log(JSON.stringify(cases, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());