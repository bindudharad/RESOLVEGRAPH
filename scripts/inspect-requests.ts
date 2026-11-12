import { prisma } from '../src/lib/prisma';

async function main() {
  const reqs = await prisma.sellerEvidenceRequest.findMany({
    include: {
      seller: true,
      organization: true,
      responses: true,
    }
  });
  console.log(`--- TOTAL SELLER EVIDENCE REQUESTS: ${reqs.length} ---`);
  for (const r of reqs) {
    console.log(`Req: ${r.id} | Num: ${r.requestNumber} | Case: ${r.caseId} | Org: ${r.organization?.name} (${r.organizationId}) | Status: ${r.status} | Responses: ${r.responses.length}`);
  }

  const cases = await prisma.caseRecord.findMany({
    select: { id: true, caseNumber: true, title: true, status: true, buyerId: true, organizationId: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(`\n--- RECENT 10 CASES ---`);
  for (const c of cases) {
    console.log(`Case: ${c.id} (${c.caseNumber}) | "${c.title}" | Status: ${c.status} | Org: ${c.organizationId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
