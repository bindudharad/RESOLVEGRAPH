import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/server/auth/session';
import { getAccessibleEvidence } from '@/server/dal/get-accessible-evidence';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionContext(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 25;
    const caseId = searchParams.get('caseId') || undefined;
    const type = searchParams.get('type') || undefined;
    const verification = searchParams.get('verification') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getAccessibleEvidence(session.user, {
      page,
      limit,
      caseId,
      type,
      verification,
      search,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('API /api/evidence GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list evidence';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
