import { prisma } from '../src/lib/prisma';

async function main() {
  const sellers = await prisma.sellerDirectoryEntry.findMany({
    include: {
      marketplaceAccounts: true,
      linkedOrganization: {
        include: {
          members: {
            include: { user: true }
          }
        }
      }
    }
  });
  console.log('\n--- DETAILED SELLER DIRECTORY ENTRIES ---');
  for (const s of sellers) {
    console.log(`ID: ${s.id}`);
    console.log(`  legalName: "${s.legalName}"`);
    console.log(`  normalizedLegalName: "${s.normalizedLegalName}"`);
    console.log(`  displayName: "${s.displayName}"`);
    console.log(`  gstin: "${s.gstin}"`);
    console.log(`  identityStatus: "${s.identityStatus}"`);
    console.log(`  registrationStatus: "${s.registrationStatus}"`);
    console.log(`  verificationStatus: "${s.verificationStatus}"`);
    console.log(`  linkedOrgId: "${s.linkedOrganizationId}"`);
    if (s.linkedOrganization) {
      console.log(`  linkedOrg: ${s.linkedOrganization.name} (${s.linkedOrganization.id})`);
      for (const m of s.linkedOrganization.members) {
        console.log(`    Member: ${m.user.email} (${m.user.fullName}) | Role: ${m.role}`);
      }
    }
    for (const m of s.marketplaceAccounts) {
      console.log(`    Marketplace: ${m.marketplace} | SellerId: "${m.marketplaceSellerId}" | Store: "${m.storefrontName}" | Verified: ${m.isVerified}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
