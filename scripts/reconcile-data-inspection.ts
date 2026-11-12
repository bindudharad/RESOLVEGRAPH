import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('================================================================================');
  console.log('RECONCILING HISTORICAL CASES: RG-1462, RG-1001, RG-1463, RG-1464, RG-1465');
  console.log('================================================================================\n');

  const cases = await prisma.caseRecord.findMany({
    where: { caseNumber: { in: ['RG-1462', 'RG-1001', 'RG-1463', 'RG-1464', 'RG-1465'] } },
    include: {
      buyer: true,
      merchant: true,
      organization: true,
      claims: true,
      evidence: true,
      resolutionProposals: { include: { replacementFulfillment: true, responses: true } },
      sellerEvidenceRequests: {
        include: {
          seller: true,
          organization: true,
          responses: { include: { evidenceItems: true } }
        }
      },
      sellerIdentityMatches: true,
      events: { orderBy: { createdAt: 'desc' } }
    }
  });

  for (const c of cases) {
    console.log(`\n----------------- Case: ${c.caseNumber} (DB ID: ${c.id}) -----------------`);
    console.log(`Title: ${c.title}`);
    console.log(`Category: ${c.category} | Status: ${c.status} | Stage: ${c.stage}`);
    console.log(`Amount: ${c.amountMinor} minor units (${c.currency} ${(c.amountMinor / 100).toFixed(2)})`);
    console.log(`Buyer: ${c.buyer?.name} (${c.buyer?.email})`);
    console.log(`Merchant User: ${c.merchant?.name} (${c.merchant?.email})`);
    console.log(`Organization: ${c.organization?.name} (ID: ${c.organizationId})`);
    console.log(`Recommended Remedy: ${c.recommendedRemedy}`);
    console.log(`Evidence items (${c.evidence.length}):`);
    for (const ev of c.evidence) {
      console.log(`  - [${ev.evidenceType}] ${ev.filename} (${ev.mimeType}, ${ev.sizeBytes} bytes, SHA256: ${ev.sha256?.substring(0, 16)}...)`);
    }
    console.log(`Seller Identity Matches (${c.sellerIdentityMatches.length}):`);
    for (const sim of c.sellerIdentityMatches) {
      console.log(`  - Extracted: "${sim.extractedLegalName}" | MatchedSellerId: ${sim.matchedSellerId} | MatchOutcome: ${sim.matchOutcome} | Status: ${(sim as any).sellerRegistrationStatus || (sim as any).registrationStatus}`);
    }
    console.log(`Seller Evidence Requests (${c.sellerEvidenceRequests.length}):`);
    for (const req of c.sellerEvidenceRequests) {
      console.log(`  - Req ${req.requestNumber} (ID: ${req.id}) -> Seller: ${req.seller?.legalName} | Org: ${req.organization?.name} | Status: ${req.status} | Channel: ${(req as any).selectedChannel || (req as any).channel}`);
      for (const resp of req.responses) {
        console.log(`    * Response ${resp.id}: Stance=${resp.stance}, Summary="${resp.summary?.substring(0, 50)}...", EvidenceItems=${resp.evidenceItems.length}`);
      }
    }
    console.log(`Proposals (${c.resolutionProposals.length}):`);
    for (const prop of c.resolutionProposals) {
      console.log(`  - Proposal ${prop.id}: Type=${prop.proposalType}, Status=${prop.status}, Auth=${prop.authorizationStatus}, Amount=${prop.amountMinor} ${prop.currency}`);
      if (prop.replacementFulfillment) {
        console.log(`    * Fulfillment: Status=${prop.replacementFulfillment.status}, Carrier=${prop.replacementFulfillment.carrierName}, Tracking=${prop.replacementFulfillment.trackingNumber}`);
      }
    }
    console.log(`Total Events: ${c.events.length}`);
  }

  console.log('\n================================================================================');
  console.log('RECONCILING TECHSTORE SELLER DIRECTORY & ORGANIZATION ENTITIES');
  console.log('================================================================================\n');

  const sellers = await prisma.sellerDirectoryEntry.findMany({
    where: {
      OR: [
        { legalName: { contains: 'TechStore' } },
        { displayName: { contains: 'TechStore' } },
        { legalName: { contains: 'DigitalMart' } }
      ]
    },
    include: {
      marketplaceAccounts: true,
      linkedOrganization: { include: { members: { include: { user: true } } } },
      linkedMerchantUser: true
    }
  });

  for (const s of sellers) {
    console.log(`\nSeller Entry: ${s.id}`);
    console.log(`  Legal Name: "${s.legalName}"`);
    console.log(`  Display Name: "${s.displayName}"`);
    console.log(`  GSTIN: "${s.gstin}" | State: "${s.state}"`);
    console.log(`  Identity Status: ${s.identityStatus} | Registration Status: ${s.registrationStatus} | Verification: ${s.verificationStatus}`);
    console.log(`  Linked Org: ${s.linkedOrganization?.name} (ID: ${s.linkedOrganizationId}, Slug: ${s.linkedOrganization?.slug})`);
    console.log(`  Linked User: ${s.linkedMerchantUser?.name} (${s.linkedMerchantUser?.email})`);
    console.log(`  Marketplace Accounts (${s.marketplaceAccounts.length}):`);
    for (const m of s.marketplaceAccounts) {
      console.log(`    - Marketplace: ${m.marketplace} | SellerId: "${m.marketplaceSellerId}" | Store: "${m.storefrontName}" | Verified: ${m.isVerified}`);
    }
    if (s.linkedOrganization) {
      console.log(`  Org Members (${s.linkedOrganization.members.length}):`);
      for (const mem of s.linkedOrganization.members) {
        console.log(`    * Member: ${mem.user?.name} (${mem.user?.email}) | Role: ${mem.role}`);
      }
    }
  }

  const allOrgs = await prisma.organization.findMany({
    include: { members: { include: { user: true } } }
  });
  console.log('\n================================================================================');
  console.log('ALL ORGANIZATIONS IN DATABASE:');
  console.log('================================================================================');
  for (const o of allOrgs) {
    console.log(`Org: ${o.id} | Slug: "${o.slug}" | Name: "${o.name}" | Members: ${o.members.map(m => `${m.user?.email} (${m.role})`).join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
