import { NextRequest } from 'next/server';
import { getSessionContext, AuthenticatedUser } from './session';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Ensures the requester is authenticated with an active account.
 * Throws an AuthError (status 401) if unauthenticated.
 */
export async function requireAuth(request?: NextRequest | Request): Promise<AuthenticatedUser> {
  const { user } = await getSessionContext(request);
  if (!user) {
    throw new AuthError('Authentication required. Please sign in to access this resource.', 401);
  }
  if (!user.isActive) {
    throw new AuthError('Your account has been deactivated. Please contact support.', 403);
  }
  return user;
}

/**
 * Ensures the requester is a platform administrator.
 * Throws an AuthError (status 403) if unauthorized.
 */
export async function requirePlatformAdmin(request?: NextRequest | Request): Promise<AuthenticatedUser> {
  const user = await requireAuth(request);
  if (!user.isPlatformAdmin) {
    throw new AuthError('Access denied: Platform administrator privileges required.', 403);
  }
  return user;
}
