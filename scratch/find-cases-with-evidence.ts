import { prisma } from '../src/lib/prisma';
async function run() {
  const casesWithEvidence = await prisma.caseRecord.findMany({
    where: {
      evidence: { some: {} },
    },
    select: {
      id: true,
      caseNumber: true,
      title: true,
      organizationId: true,
      evidence: { select: { id: true, filename: true, evidenceType: true, verificationStatus: true } },
      sellerEvidenceRequests: { select: { id: true, requestNumber: true, status: true } },
    },
  });
  console.log('CASES WITH EVIDENCE:', JSON.stringify(casesWithEvidence, null, 2));
}
run().finally(() => prisma.$disconnect());
