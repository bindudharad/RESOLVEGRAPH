import { prisma } from '../src/lib/prisma';
import fs from 'node:fs/promises';
import path from 'node:path';

async function extractTrace() {
  const caseRecord = await prisma.caseRecord.findUnique({
    where: { caseNumber: 'RG-1465' },
    include: {
      buyer: true,
      merchant: true,
      assignedManager: true,
      organization: true,
      claims: true,
      evidence: true,
      events: { orderBy: { createdAt: 'asc' } },
      timelineEvents: { orderBy: { recordedAt: 'asc' } },
      sellerIdentityMatches: true,
      sellerEvidenceRequests: {
        include: {
          seller: true,
          organization: true,
          responses: { include: { evidenceItems: true } },
          communicationAttempts: true,
        },
      },
      begGraph: {
        include: {
          nodes: true,
          edges: true,
          revisions: true,
        },
      },
      berrAssessments: {
        include: {
          findings: true,
          recommendedActions: true,
        },
      },
      resolutionProposals: {
        include: {
          responses: true,
          replacementFulfillment: true,
        },
      },
      replacementFulfillments: true,
    },
  });

  const outPath = path.join(process.cwd(), 'scratch', 'rg-1465-full-trace.json');
  await fs.writeFile(outPath, JSON.stringify(caseRecord, null, 2));
  console.log(`Saved full data trace for RG-1465 to ${outPath}`);
  console.log({
    caseNumber: caseRecord?.caseNumber,
    status: caseRecord?.status,
    remedy: caseRecord?.recommendedRemedy,
    eventsCount: caseRecord?.events.length,
    timelineCount: caseRecord?.timelineEvents.length,
    evidenceCount: caseRecord?.evidence.length,
    sellerRequestsCount: caseRecord?.sellerEvidenceRequests.length,
    proposalsCount: caseRecord?.resolutionProposals.length,
    fulfillmentStatus: caseRecord?.replacementFulfillments[0]?.status,
  });
}

extractTrace().catch(console.error).finally(() => prisma.$disconnect());
