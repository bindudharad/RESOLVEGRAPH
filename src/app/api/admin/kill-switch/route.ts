/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin, AuthError } from '@/server/auth/require-auth';
import { KillSwitchService } from '@/server/services/kill-switch.service';

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin(request);
    const status = await KillSwitchService.getStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Failed to get kill switch status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePlatformAdmin(request);

    const body = await request.json();
    if (!body.reason) {
      return NextResponse.json({ error: 'Audit reason is required to modify kill switch state.' }, { status: 400 });
    }

    const updated = await KillSwitchService.updateStatus({
      isOutboundPayPalKilled: body.isOutboundPayPalKilled,
      isExternalProviderKilled: body.isExternalProviderKilled,
      isAutonomousAgentKilled: body.isAutonomousAgentKilled,
      isNotificationKilled: body.isNotificationKilled,
      reason: String(body.reason),
      actorId: user.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Failed to update kill switch' }, { status: 500 });
  }
}
