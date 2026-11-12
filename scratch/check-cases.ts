import { prisma } from '../src/lib/prisma';

async function main() {
  const cases = await prisma.caseRecord.findMany({
    select: {
      id: true,
      caseNumber: true,
      status: true,
      category: true,
      title: true,
      description: true,
      organizationId: true,
      merchantId: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          items: {
            select: {
              id: true,
              title: true,
              sku: true,
            },
          },
        },
      },
      sellerEvidenceRequests: {
        select: {
          id: true,
          requestNumber: true,
          status: true,
          organizationId: true,
          deliveryChannel: true,
        },
      },
    },
  });
  console.log('CASES:', JSON.stringify(cases, null, 2));

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      sellerDirectoryEntries: {
        select: {
          id: true,
          legalName: true,
          registrationStatus: true,
          verificationStatus: true,
        },
      },
      members: {
        select: {
          id: true,
          userId: true,
          role: true,
          user: { select: { email: true, fullName: true, role: true } },
        },
      },
    },
  });
  console.log('ORGS:', JSON.stringify(orgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
