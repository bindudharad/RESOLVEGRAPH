import { prisma } from '../src/lib/prisma';

async function main() {
  const policies = await prisma.resolutionPolicy.findMany({
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      rules: true
    }
  });
  console.log('--- ALL RESOLUTION POLICIES ---');
  for (const p of policies) {
    console.log(`Policy: ${p.id} | Name: "${p.name}" | Version: ${p.version} | Active: ${p.isActive}`);
    console.log(`  Org: ${p.organizationId} (${p.organization?.name || 'No Org'})`);
    for (const r of p.rules) {
      console.log(`    Rule: ${r.ruleType} | Priority: ${r.priority} | Config: ${r.configurationJson}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
