import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/server/auth/session';
import { canManageOrganization } from '@/server/auth/permissions';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { OrganizationRole } from '@/generated/prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const { orgId, memberId } = await params;
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
    const { role } = body;

    if (!role || !Object.values(OrganizationRole).includes(role)) {
      return NextResponse.json({ error: 'Invalid organization role' }, { status: 400 });
    }

    // Check target membership
    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
    }

    // An ORG_ADMIN cannot alter an OWNER's role unless caller is platform admin or OWNER
    const callerMembership = user.orgMemberships.find((m) => m.organizationId === orgId);
    const callerIsOwner = user.isPlatformAdmin || callerMembership?.role === OrganizationRole.OWNER;

    if (targetMember.role === OrganizationRole.OWNER && !callerIsOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only organization owners or platform admins can alter an owner role' },
        { status: 403 }
      );
    }

    if (role === OrganizationRole.OWNER && !callerIsOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only an owner can promote another member to owner' },
        { status: 403 }
      );
    }

    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: role as OrganizationRole },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'ORGANIZATION_MEMBER_ROLE_UPDATED',
      targetType: 'ORGANIZATION_MEMBER',
      targetId: memberId,
      status: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      metadata: {
        orgId,
        memberUserId: targetMember.userId,
        previousRole: targetMember.role,
        newRole: role,
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        membershipId: updated.id,
        userId: updated.user.id,
        name: updated.user.fullName,
        email: updated.user.email,
        orgRole: updated.role,
      },
    });
  } catch (error: unknown) {
    console.error('API /api/organizations/[orgId]/members/[memberId] PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update member role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  try {
    const { orgId, memberId } = await params;
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

    const targetMember = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== orgId) {
      return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
    }

    // Prevent removing the sole owner of an organization
    if (targetMember.role === OrganizationRole.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: OrganizationRole.OWNER,
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner of an organization. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'ORGANIZATION_MEMBER_REMOVED',
      targetType: 'ORGANIZATION_MEMBER',
      targetId: memberId,
      status: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      metadata: {
        orgId,
        removedUserId: targetMember.userId,
        previousRole: targetMember.role,
      },
    });

    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error: unknown) {
    console.error('API /api/organizations/[orgId]/members/[memberId] DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove member';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
