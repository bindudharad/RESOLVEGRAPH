import { prisma } from '../src/lib/prisma';

async function main() {
  const policies = await prisma.resolutionPolicy.findMany({
    include: { rules: true },
  });
  console.log(JSON.stringify(policies, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
