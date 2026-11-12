import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, isPlatformAdmin: true, isActive: true },
  });
  console.log('--- ALL USERS ---');
  for (const u of users) {
    console.log(`User: ${u.id} | ${u.email} | ${u.fullName} | Role: ${u.role} | Admin: ${u.isPlatformAdmin} | Active: ${u.isActive}`);
  }

  const orgs = await prisma.organization.findMany({
    include: {
      members: {
        include: { user: { select: { email: true, role: true } } }
      }
    }
  });
  console.log('\n--- ALL ORGANIZATIONS ---');
  for (const o of orgs) {
    console.log(`Org: ${o.id} | Name: "${o.name}" | Slug: "${o.slug}" | Active: ${o.isActive}`);
    for (const m of o.members) {
      console.log(`   Member: ${m.userId} (${m.user.email}) | Role: ${m.role} | Active: ${m.isActive}`);
    }
  }

  const sellers = await prisma.sellerDirectoryEntry.findMany({
    include: {
      marketplaceAccounts: true,
      linkedOrganization: true
    }
  });
  console.log('\n--- ALL SELLER DIRECTORY ENTRIES ---');
  for (const s of sellers) {
    console.log(`Seller: ${s.id} | Name: "${s.legalName}" | Display: "${s.displayName}" | GSTIN: ${s.gstin} | Status: ${s.verificationStatus} | LinkedOrgId: ${s.linkedOrganizationId}`);
    if (s.linkedOrganization) {
      console.log(`   Linked Org: ${s.linkedOrganization.name} (${s.linkedOrganization.id})`);
    }
    for (const m of s.marketplaceAccounts) {
      console.log(`   Marketplace: ${m.marketplace} | SellerID: "${m.marketplaceSellerId}" | Store: "${m.storefrontName}" | Verified: ${m.isVerified}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
