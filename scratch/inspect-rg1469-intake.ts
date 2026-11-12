import { prisma } from '../src/lib/prisma';

async function main() {
  const caseItem = await prisma.caseRecord.findFirst({
    where: { caseNumber: 'RG-1469' },
    include: {
      claims: true,
      evidence: true,
      orders: true,
      events: true,
      timelineEvents: true,
      agentRuns: true
    }
  });

  if (!caseItem) return;

  console.log('--- CLAIMS ---');
  for (const c of caseItem.claims) {
    console.log(JSON.stringify(c, null, 2));
  }

  console.log('--- EVIDENCE ---');
  for (const e of caseItem.evidence) {
    console.log({
      id: e.id,
      originalFilename: e.originalFilename,
      evidenceType: e.evidenceType,
      extractedDataJson: e.extractedDataJson,
      metadataJson: e.metadataJson,
      ocrText: e.ocrText?.slice(0, 300)
    });
  }

  console.log('--- ORDERS ---');
  for (const o of caseItem.orders) {
    console.log(JSON.stringify(o, null, 2));
  }

  console.log('--- TIMELINE EVENTS ---');
  for (const t of caseItem.timelineEvents) {
    console.log(t.type, t.title, t.description);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
