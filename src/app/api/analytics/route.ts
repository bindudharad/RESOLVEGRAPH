import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/server/auth/session';
import { AnalyticsService } from '@/server/services/analytics.service';

export async function GET(request?: NextRequest) {
  try {
    const session = await getSessionContext(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const analytics = await AnalyticsService.getAnalytics(session.user);
    return NextResponse.json(analytics);
  } catch (error: unknown) {
    console.error('API /api/analytics GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to retrieve analytics metrics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
