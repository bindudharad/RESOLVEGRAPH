import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

async function inspectCase(caseNumber: string) {
  const c = await prisma.caseRecord.findFirst({
    where: { caseNumber },
    include: {
      buyer: { select: { id: true, fullName: true, email: true, role: true } },
      merchant: { select: { id: true, fullName: true, email: true, role: true } },
      organization: { select: { id: true, name: true, slug: true } },
      assignedManager: { select: { id: true, fullName: true, email: true } },
      evidence: {
        select: {
          id: true,
          filename: true,
          storageKey: true,
          mimeType: true,
          sizeBytes: true,
          sha256: true,
          sourceType: true,
          verificationStatus: true,
        }
      },
      sellerEvidenceRequests: {
        include: {
          evidenceItems: true,
          responses: true
        }
      },
      resolutionProposals: {
        include: {
          responses: true
        }
      },
      berrFindings: true,
      begNodes: true,
      timelineEvents: {
        take: 10,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  return c;
}

async function main() {
  console.log('=== INVESTIGATING CANDIDATE SSD CASES ===\n');

  const targets = ['RG-1001', 'RG-1493', 'RG-2026-0412'];
  for (const num of targets) {
    const c = await inspectCase(num);
    if (!c) {
      console.log(`[CASE ${num}]: NOT FOUND IN DATABASE`);
      continue;
    }

    console.log(`------------------------------------------------------------------------`);
    console.log(`CASE NUMBER:            ${c.caseNumber} (ID: ${c.id})`);
    console.log(`TITLE:                  ${c.title}`);
    console.log(`STATUS / STAGE:         ${c.status} / ${c.stage}`);
    console.log(`CATEGORY:               ${c.category}`);
    console.log(`DISPUTED AMOUNT:        ₹${(((c as any).disputedAmountMinor || 0) / 100).toFixed(2)} ${c.currency}`);
    console.log(`BUYER:                  ${c.buyer?.fullName} (${c.buyer?.email}) [ID: ${c.buyerId}]`);
    console.log(`MERCHANT / ORG:         ${c.merchant?.fullName || 'N/A'} | Org: ${c.organization?.name || 'N/A'} [OrgID: ${c.organizationId}]`);
    console.log(`ASSIGNED MANAGER:       ${c.assignedManager?.fullName || 'Unassigned'}`);
    console.log(`EVIDENCE ATTACHED:      ${c.evidence.length} files`);
    c.evidence.forEach(e => console.log(`   - [${e.id}] ${e.filename} (${e.mimeType}, ${e.sizeBytes}b, status: ${e.verificationStatus})`));
    console.log(`SELLER REQUESTS:        ${c.sellerEvidenceRequests.length} requests`);
    c.sellerEvidenceRequests.forEach(r => {
      console.log(`   - Req [${r.id}] status: ${r.status}, items: ${r.evidenceItems.length}, responses: ${r.responses.length}`);
    });
    console.log(`BERR FINDINGS:          ${c.berrFindings.length} findings`);
    console.log(`BEG NODES:              ${c.begNodes.length} nodes`);
    console.log(`PROPOSALS:              ${c.resolutionProposals.length} proposals`);
    c.resolutionProposals.forEach(p => {
      console.log(`   - Prop [${p.id}] type: ${(p as any).remedyType || (p as any).proposalType}, status: ${p.status}, amount: ₹${(((p as any).refundAmountMinor || 0) / 100).toFixed(2)}, approvals: ${p.responses.length}`);
    });
    console.log(`TIMELINE EVENTS:        ${c.timelineEvents.length} events logged`);
    console.log(`DESCRIPTION EXCERPT:    ${c.description.slice(0, 150).replace(/\n/g, ' ')}...`);
    console.log(`------------------------------------------------------------------------\n`);
  }

  // Also search for any other SSD cases in the DB
  const otherSsd = await prisma.caseRecord.findMany({
    where: {
      OR: [
        { title: { contains: 'SSD' } },
        { description: { contains: 'SSD' } },
        { description: { contains: 'UltraFast' } },
      ],
      caseNumber: { notIn: targets }
    },
    select: { caseNumber: true, title: true, status: true, buyer: { select: { fullName: true } } }
  });

  console.log(`OTHER SSD CASES IN DB:   ${otherSsd.length} cases found`);
  otherSsd.slice(0, 10).forEach(o => console.log(`  - ${o.caseNumber}: ${o.title} (${o.status}, Buyer: ${o.buyer?.fullName})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
