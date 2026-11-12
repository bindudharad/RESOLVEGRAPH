import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/server/auth/require-auth';
import { CaptureAnalyticsQueryOptions } from '@/server/analytics/capture-analytics.service';
import { CaptureAnalyticsValidationError } from '@/server/analytics/timezone-calendar';

export const CAPTURE_ANALYTICS_NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
} as const;

export function extractCaptureQueryOptions(req: NextRequest): CaptureAnalyticsQueryOptions {
  const sp = req.nextUrl.searchParams;
  return {
    currency: sp.get('currency'),
    organizationId: sp.get('organizationId'),
    environment: sp.get('environment'),
    timezone: sp.get('timezone'),
    month: sp.get('month'),
  };
}

export function handleCaptureAnalyticsError(error: unknown, scope: string) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: CAPTURE_ANALYTICS_NO_STORE_HEADERS }
    );
  }
  if (error instanceof CaptureAnalyticsValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: CAPTURE_ANALYTICS_NO_STORE_HEADERS }
    );
  }
  console.error(`[API /api/analytics/captures/${scope}] error:`, error);
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'Internal Server Error',
    },
    { status: 500, headers: CAPTURE_ANALYTICS_NO_STORE_HEADERS }
  );
}
