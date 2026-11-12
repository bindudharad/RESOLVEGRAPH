import { prisma } from '../src/lib/prisma';

async function main() {
  const cases = await prisma.caseRecord.findMany({
    where: { caseNumber: { in: ['RG-1462', 'RG-1463'] } },
    include: {
      claims: true,
      evidence: true,
      sellerIdentityMatches: true,
      sellerEvidenceRequests: true,
      resolutionProposals: true
    }
  });

  for (const c of cases) {
    console.log(`=== Case ${c.caseNumber} ===`);
    console.log(`ID: ${c.id}`);
    console.log(`Title: ${c.title}`);
    console.log(`Description: ${c.description}`);
    console.log(`Amount: ${c.amountMinor} minor (${c.currency} ${c.amountMinor/100})`);
    console.log(`Status: ${c.status}`);
    console.log(`OrganizationId: ${c.organizationId}`);
    console.log(`SellerIdentityMatches:`, c.sellerIdentityMatches);
    console.log(`Evidence:`, c.evidence.map(e => ({ id: e.id, filename: e.filename, mime: e.mimeType, size: e.sizeBytes, hash: e.sha256 })));
    console.log(`SellerRequests:`, c.sellerEvidenceRequests);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
