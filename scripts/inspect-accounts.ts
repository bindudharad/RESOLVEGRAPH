import { prisma } from '../src/lib/prisma';

async function main() {
  const accounts = await prisma.account.findMany({
    include: { user: { select: { email: true, role: true } } }
  });
  console.log('--- ALL AUTH ACCOUNTS ---');
  for (const a of accounts) {
    console.log(`Account: ${a.id} | Provider: ${a.providerId} | User: ${a.user.email} (${a.user.role}) | HasPassword: ${Boolean(a.password)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
