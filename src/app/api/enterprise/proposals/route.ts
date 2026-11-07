import { NextRequest, NextResponse } from 'next/server';
import { requireEnterpriseAuth } from '@/server/auth/enterprise-api-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authContext = await requireEnterpriseAuth(request);

    const proposals = await prisma.resolutionProposal.findMany({
      where: {
        case: {
          organizationId: authContext.organizationId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: proposals.length,
        proposals,
      },
      {
        headers: {
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '992',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Enterprise proposals fetch error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
