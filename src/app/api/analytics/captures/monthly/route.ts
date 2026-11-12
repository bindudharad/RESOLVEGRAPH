import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth/require-auth';
import { CaptureAnalyticsService } from '@/server/analytics/capture-analytics.service';
import {
  CAPTURE_ANALYTICS_NO_STORE_HEADERS,
  extractCaptureQueryOptions,
  handleCaptureAnalyticsError,
} from '../_shared';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const data = await CaptureAnalyticsService.getMonthly(
      user,
      extractCaptureQueryOptions(req)
    );
    return NextResponse.json(data, { headers: CAPTURE_ANALYTICS_NO_STORE_HEADERS });
  } catch (error) {
    return handleCaptureAnalyticsError(error, 'monthly');
  }
}
