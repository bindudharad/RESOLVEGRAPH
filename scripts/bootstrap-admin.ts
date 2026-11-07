import { prisma } from '../src/lib/prisma';
import { hashPassword } from 'better-auth/crypto';
import { UserRole } from '../src/generated/prisma/client';

async function bootstrap() {
  console.log('🔒 RESOLVEGRAPH Platform Administrator Bootstrap Tool');

  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const passedSecret = process.argv[2] || process.env.BOOTSTRAP_SECRET_INPUT;

  if (!secret) {
    console.error('❌ Error: ADMIN_BOOTSTRAP_SECRET is not configured in environment variables.');
    process.exit(1);
  }

  if (passedSecret !== secret) {
    console.error('❌ Access Denied: Invalid or missing bootstrap secret.');
    console.log('Usage: npx tsx scripts/bootstrap-admin.ts <ADMIN_BOOTSTRAP_SECRET> <EMAIL> <PASSWORD> [NAME]');
    process.exit(1);
  }

  const email = process.argv[3] || 'admin@resolvegraph.demo';
  const password = process.argv[4] || 'Admin@ResolveGraph2026!';
  const fullName = process.argv[5] || 'Priya Raghavan';

  if (password.length < 12) {
    console.error('❌ Password must be at least 12 characters.');
    process.exit(1);
  }

  // Check if an active platform admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { isPlatformAdmin: true, isActive: true },
  });

  if (existingAdmin && existingAdmin.email !== email) {
    console.error(`❌ Security Safeguard: Platform administrator already provisioned (${existingAdmin.email}).`);
    console.error('One-time bootstrap cannot overwrite existing administrators.');
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      name: fullName,
      fullName,
      role: UserRole.ADMIN,
      isPlatformAdmin: true,
      emailVerified: true,
      isActive: true,
    },
    create: {
      email,
      name: fullName,
      fullName,
      role: UserRole.ADMIN,
      isPlatformAdmin: true,
      emailVerified: true,
      isActive: true,
    },
  });

  // Link credential account
  const account = await prisma.account.findFirst({
    where: { userId: adminUser.id, providerId: 'credential' },
  });

  if (account) {
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: adminUser.id,
        accountId: adminUser.id,
        providerId: 'credential',
        password: hashedPassword,
      },
    });
  }

  // Log to security audit ledger
  await prisma.securityAuditEvent.create({
    data: {
      actorId: adminUser.id,
      action: 'PLATFORM_ADMIN_BOOTSTRAP',
      targetType: 'User',
      targetId: adminUser.id,
      status: 'SUCCESS',
      metadataJson: JSON.stringify({ email: adminUser.email }),
    },
  });

  console.log(`✅ Platform administrator successfully provisioned: ${adminUser.email}`);
  console.log('Role: ADMIN | isPlatformAdmin: true | emailVerified: true');
}

bootstrap()
  .catch((e) => {
    console.error('Bootstrap failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
