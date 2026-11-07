import { NextRequest } from 'next/server';
import { getSessionContext, AuthenticatedUser } from '../auth/session';

export async function getCurrentUser(request?: NextRequest | Request): Promise<AuthenticatedUser | null> {
  const { user } = await getSessionContext(request);
  return user;
}
