import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/server/auth/session';
import { canManageOrganization } from '@/server/auth/permissions';
import { SecurityAuditService } from '@/server/services/security-audit.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionContext();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { user } = session;
    const membership = user.orgMemberships.find((m) => m.organizationId === orgId);
    if (!user.isPlatformAdmin && !membership) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this organization' }, { status: 403 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: true,
                isPlatformAdmin: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        invitations: {
          where: {
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: { cases: true, members: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        isActive: org.isActive,
        createdAt: org.createdAt.toISOString(),
        caseCount: org._count.cases,
        memberCount: org._count.members,
        userRole: user.isPlatformAdmin ? 'OWNER' : membership?.role,
        canManage: canManageOrganization(user, orgId),
        members: org.members.map((m) => ({
          membershipId: m.id,
          userId: m.user.id,
          name: m.user.fullName,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          globalRole: m.user.role,
          orgRole: m.role,
          joinedAt: m.createdAt.toISOString(),
        })),
        pendingInvitations: org.invitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    console.error('API /api/organizations/[orgId] GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch organization details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionContext();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { user } = session;
    if (!canManageOrganization(user, orgId)) {
      return NextResponse.json(
        { error: 'Forbidden: Organization admin privileges required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const data: { name?: string; description?: string; isActive?: boolean } = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      data.name = name.trim();
    }
    if (typeof description === 'string') {
      data.description = description.trim();
    }
    if (typeof isActive === 'boolean' && user.isPlatformAdmin) {
      data.isActive = isActive;
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'ORGANIZATION_UPDATED',
      targetType: 'ORGANIZATION',
      targetId: orgId,
      status: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      metadata: { updatedFields: Object.keys(data) },
    });

    return NextResponse.json({ organization: updated });
  } catch (error: unknown) {
    console.error('API /api/organizations/[orgId] PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update organization';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
