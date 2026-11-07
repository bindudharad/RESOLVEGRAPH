import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext } from '@/server/auth/session';
import { DashboardService } from '@/server/services/dashboard.service';

export async function GET(request?: NextRequest) {
  try {
    const session = await getSessionContext(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const summary = await DashboardService.getSummary(session.user);
    return NextResponse.json(summary);
  } catch (error: unknown) {
    console.error('API /api/dashboard/summary GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate dashboard summary';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
