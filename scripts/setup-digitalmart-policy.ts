import { prisma } from '../src/lib/prisma';

async function main() {
  const existing = await prisma.resolutionPolicy.findFirst({
    where: { organizationId: 'org_digitalmart' }
  });
  if (existing) {
    console.log('Policy already exists for org_digitalmart:', existing.id);
    return;
  }

  const policy = await prisma.resolutionPolicy.create({
    data: {
      organization: { connect: { id: 'org_digitalmart' } },
      createdBy: { connect: { id: 'usr_priya_admin' } },
      name: 'DigitalMart Electronics Resolution Policy',
      description: 'Official resolution policy for DigitalMart Commerce Private Limited.',
      version: '1.0',
      isActive: true,
      rules: {
        create: [
          {
            ruleType: 'RETURN_WINDOW',
            priority: 1,
            configurationJson: JSON.stringify({ maxDays: 30, basis: 'DELIVERY_DATE' }),
            isEnabled: true,
          },
          {
            ruleType: 'REQUIRED_EVIDENCE',
            priority: 2,
            configurationJson: JSON.stringify({ requiredTypes: ['RECEIPT', 'PHOTO'] }),
            isEnabled: true,
          },
          {
            ruleType: 'REMEDY_ELIGIBILITY',
            priority: 3,
            configurationJson: JSON.stringify({
              eligibleRemedies: ['REPLACEMENT', 'FULL_REFUND', 'PARTIAL_REFUND'],
            }),
            isEnabled: true,
          },
          {
            ruleType: 'REFUND_LIMIT',
            priority: 4,
            configurationJson: JSON.stringify({
              maxAmountMinor: 500000,
              currency: 'INR',
              allowOverrideWithApproval: true,
            }),
            isEnabled: true,
          },
        ]
      }
    },
    include: { rules: true }
  });

  console.log('Created active policy for org_digitalmart:', policy.id, 'with', policy.rules.length, 'rules');
}

main().catch(console.error).finally(() => prisma.$disconnect());
