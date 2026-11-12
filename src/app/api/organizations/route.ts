import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/server/auth/session';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { OrganizationRole, UserRole } from '@/generated/prisma/client';

export async function GET(request?: NextRequest) {
  try {
    const session = await getSessionContext(request);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { user } = session;
    let orgs;

    if (user.isPlatformAdmin) {
      orgs = await prisma.organization.findMany({
        include: {
          _count: {
            select: { members: true, cases: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      const orgIds = user.orgMemberships.map((m) => m.organizationId);
      orgs = await prisma.organization.findMany({
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

    // Attach current user's role in each org
    const items = orgs.map((org) => {
      const membership = user.orgMemberships.find((m) => m.organizationId === org.id);
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        isActive: org.isActive,
        createdAt: org.createdAt.toISOString(),
        memberCount: org._count.members,
        caseCount: org._count.cases,
        userRole: user.isPlatformAdmin ? OrganizationRole.OWNER : membership?.role || null,
      };
    });

    return NextResponse.json({ organizations: items });
  } catch (error: unknown) {
    console.error('API /api/organizations GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch organizations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { user } = session;
    if (!user.isPlatformAdmin && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can register organizations directly' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Organization name is required (minimum 2 characters)' }, { status: 400 });
    }

    const safeSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await prisma.organization.findUnique({
      where: { slug: safeSlug },
    });
    if (existingSlug) {
      return NextResponse.json({ error: `An organization with slug "${safeSlug}" already exists` }, { status: 409 });
    }

    const newOrg = await prisma.organization.create({
      data: {
        name: name.trim(),
        slug: safeSlug,
        description: description?.trim() || null,
        members: {
          create: {
            userId: user.id,
            role: OrganizationRole.OWNER,
          },
        },
      },
      include: {
        _count: {
          select: { members: true, cases: true },
        },
      },
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'ORGANIZATION_CREATED',
      targetType: 'ORGANIZATION',
      targetId: newOrg.id,
      status: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      metadata: {
        name: newOrg.name,
        slug: newOrg.slug,
      },
    });

    return NextResponse.json(
      {
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          description: newOrg.description,
          isActive: newOrg.isActive,
          createdAt: newOrg.createdAt.toISOString(),
          memberCount: newOrg._count.members,
          caseCount: newOrg._count.cases,
          userRole: OrganizationRole.OWNER,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('API /api/organizations POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create organization';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
