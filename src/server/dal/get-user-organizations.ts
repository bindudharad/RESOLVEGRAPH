import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '../auth/session';

export async function getUserOrganizations(user: AuthenticatedUser) {
  if (user.isPlatformAdmin) {
    // Platform admin can view all organizations
    return prisma.organization.findMany({
      include: {
        _count: {
          select: { members: true, cases: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  const orgIds = user.orgMemberships.map((m) => m.organizationId);
  return prisma.organization.findMany({
    where: {
      id: { in: orgIds },
      isActive: true,
    },
    include: {
      _count: {
        select: { members: true, cases: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}
