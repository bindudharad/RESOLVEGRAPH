import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getSessionContext } from '@/server/auth/session';
import { canManageOrganization } from '@/server/auth/permissions';
import { SecurityAuditService } from '@/server/services/security-audit.service';
import { OrganizationRole } from '@/generated/prisma/client';

export async function POST(
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
    const { email, role } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = (role as OrganizationRole) || OrganizationRole.MERCHANT_AGENT;

    // Disallow escalation to OWNER or invalid roles via regular invite
    if (!Object.values(OrganizationRole).includes(cleanRole) || cleanRole === OrganizationRole.OWNER) {
      return NextResponse.json(
        { error: 'Invalid or disallowed role for invitation. Valid roles: ORG_ADMIN, MERCHANT_AGENT, RESOLUTION_MANAGER, VIEWER' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if target user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      // Check if already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: `User ${cleanEmail} is already a member of this organization with role ${existingMember.role}` },
          { status: 409 }
        );
      }

      // Add user directly as member
      const newMember = await prisma.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: existingUser.id,
          role: cleanRole,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      await SecurityAuditService.record({
        actorId: user.id,
        action: 'ORGANIZATION_MEMBER_ADDED',
        targetType: 'ORGANIZATION_MEMBER',
        targetId: newMember.id,
        status: 'SUCCESS',
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
        metadata: {
          orgId,
          invitedEmail: cleanEmail,
          role: cleanRole,
          directAdd: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          status: 'MEMBER_ADDED',
          member: {
            membershipId: newMember.id,
            userId: newMember.user.id,
            name: newMember.user.fullName,
            email: newMember.user.email,
            avatarUrl: newMember.user.avatarUrl,
            globalRole: newMember.user.role,
            orgRole: newMember.role,
            joinedAt: newMember.createdAt.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    // User does not exist yet: create a secure invitation record
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Upsert invitation
    const invitation = await prisma.organizationInvitation.upsert({
      where: {
        tokenHash,
      },
      update: {
        role: cleanRole,
        expiresAt,
      },
      create: {
        organizationId: orgId,
        email: cleanEmail,
        role: cleanRole,
        tokenHash,
        invitedById: user.id,
        expiresAt,
      },
    });

    await SecurityAuditService.record({
      actorId: user.id,
      action: 'ORGANIZATION_INVITATION_SENT',
      targetType: 'ORGANIZATION_INVITATION',
      targetId: invitation.id,
      status: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'Unknown',
      metadata: {
        orgId,
        invitedEmail: cleanEmail,
        role: cleanRole,
      },
    });

    return NextResponse.json(
      {
        success: true,
        status: 'INVITATION_SENT',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
          inviteUrl: `/sign-up?invite=${token}`,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('API /api/organizations/[orgId]/members/invite POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send invitation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
