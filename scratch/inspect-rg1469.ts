import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';

async function main() {
  const caseId = 'cmwdm5wad028im8vjwr52fzay';
  
  const c = await prisma.caseRecord.findUnique({
    where: { id: caseId },
    include: {
      buyer: true,
      merchant: true,
      organization: true,
      claims: true,
      evidence: true,
      sellerIdentityMatches: true,
      sellerEvidenceRequests: {
        include: {
          communicationAttempts: true
        }
      },
      sellerEvidenceResponses: {
        include: {
          evidenceItems: true
        }
      },
      begGraph: {
        include: {
          nodes: true,
          edges: true,
          revisions: true
        }
      },
      berrAssessments: {
        include: {
          findings: true,
          recommendedActions: true
        },
        orderBy: { version: 'desc' }
      },
      resolutionProposals: {
        include: {
          responses: true
        }
      },
      events: true,
      timelineEvents: true,
      orders: {
        include: {
          items: true
        }
      },
      replacementFulfillments: true,
      aiAnalysisRuns: true
    }
  });

  const audits = await prisma.securityAuditEvent.findMany({
    where: { targetId: caseId },
    orderBy: { createdAt: 'desc' }
  });

  const chainedAudits = await prisma.hashChainedAuditRecord.findMany({
    where: {
      OR: [
        { detailsJson: { contains: 'RG-1469' } },
        { detailsJson: { contains: caseId } },
        { resourceId: caseId }
      ]
    },
    orderBy: { sequenceNumber: 'desc' }
  });

  const data = {
    case: c,
    securityAudits: audits,
    chainedAudits
  };

  fs.writeFileSync('scratch/rg1469-audit.json', JSON.stringify(data, null, 2));
  console.log('Successfully wrote scratch/rg1469-audit.json! Size:', fs.statSync('scratch/rg1469-audit.json').size);
}

main().catch(console.error).finally(() => prisma.$disconnect());
