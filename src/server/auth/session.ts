import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { headers as nextHeaders } from 'next/headers';
import { OrganizationRole, UserRole } from '@/generated/prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  organization: string | null;
  orgMemberships: Array<{
    organizationId: string;
    role: OrganizationRole;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface SessionContext {
  user: AuthenticatedUser | null;
  sessionToken: string | null;
}

/**
 * Resolves the authenticated user and their active organization memberships from request context.
 */
export async function getSessionContext(request?: NextRequest | Request): Promise<SessionContext> {
  try {
    let reqHeaders: Headers;
    if (request) {
      reqHeaders = request.headers;
    } else {
      reqHeaders = await nextHeaders();
    }

    // Retrieve active session from Better Auth
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session?.user) {
      // Check for Development Mode Demo Header if enabled in development
      const demoUserEmail = reqHeaders.get('x-demo-user-email');
      if (process.env.NODE_ENV !== 'production' && demoUserEmail) {
        const demoUser = await prisma.user.findUnique({
          where: { email: demoUserEmail },
          include: {
            orgMemberships: {
              where: { isActive: true },
              include: { organization: true },
            },
          },
        });
        if (demoUser && demoUser.isActive) {
          return {
            user: {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name || demoUser.fullName,
              fullName: demoUser.fullName,
              role: demoUser.role,
              isPlatformAdmin: demoUser.isPlatformAdmin,
              isActive: demoUser.isActive,
              avatarUrl: demoUser.avatarUrl,
              organization: demoUser.organization,
              orgMemberships: demoUser.orgMemberships.map((m) => ({
                organizationId: m.organizationId,
                role: m.role,
                organization: {
                  id: m.organization.id,
                  name: m.organization.name,
                  slug: m.organization.slug,
                },
              })),
            },
            sessionToken: 'dev-demo-session',
          };
        }
      }

      return { user: null, sessionToken: null };
    }

    // Load full user details with active organization memberships
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        orgMemberships: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });

    if (!userRecord || !userRecord.isActive) {
      return { user: null, sessionToken: null };
    }

    const authUser: AuthenticatedUser = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name || userRecord.fullName,
      fullName: userRecord.fullName,
      role: userRecord.role,
      isPlatformAdmin: userRecord.isPlatformAdmin,
      isActive: userRecord.isActive,
      avatarUrl: userRecord.avatarUrl,
      organization: userRecord.organization,
      orgMemberships: userRecord.orgMemberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
        },
      })),
    };

    return {
      user: authUser,
      sessionToken: session.session?.token || null,
    };
  } catch (error) {
    console.error('Failed to resolve session context:', error);
    return { user: null, sessionToken: null };
  }
}
