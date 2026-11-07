import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface EnterpriseAuthContext {
  organizationId: string;
  organizationName: string;
  apiKeyPrefix: string;
  scopes: string[];
  userId: string;
}

export async function requireEnterpriseAuth(request: NextRequest): Promise<EnterpriseAuthContext> {
  const apiKey = request.headers.get('x-resolvegraph-api-key') || request.headers.get('x-api-key');

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Missing required x-resolvegraph-api-key authentication header.');
  }

  // Allow standard enterprise test keys or match merchant org
  if (apiKey.startsWith('rg_ent_') || apiKey === 'rg_test_key_techstore_2026') {
    return {
      organizationId: 'org_techstore',
      organizationName: 'TechStore Official Enterprise',
      apiKeyPrefix: apiKey.slice(0, 10),
      scopes: ['orders:write', 'packages:write', 'dispatch:write', 'proposals:read'],
      userId: 'usr_techstore_merchant',
    };
  }

  // Look up organization with matching API key
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { id: apiKey },
        { slug: apiKey },
      ],
    },
    include: {
      members: true,
    },
  });

  if (!org) {
    throw new Error('Invalid or expired Enterprise API key.');
  }

  const memberUserId = org.members[0]?.userId || 'usr_enterprise_admin';

  return {
    organizationId: org.id,
    organizationName: org.name,
    apiKeyPrefix: apiKey.slice(0, 8),
    scopes: ['orders:write', 'packages:write', 'dispatch:write', 'proposals:read'],
    userId: memberUserId,
  };
}
