import { NextRequest, NextResponse } from 'next/server';
import { carrierRegistry } from '@/server/integrations/carrier/carrier-registry';
import { CarrierProvider } from '@/server/integrations/carrier/carrier.types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ carrier: string }> }
) {
  try {
    const { carrier } = await params;
    const provider = carrier.toUpperCase() as CarrierProvider;
    const adapter = carrierRegistry.getAdapter(provider);

    if (!adapter) {
      return NextResponse.json(
        { error: `Carrier provider ${carrier} not recognized.` },
        { status: 400 }
      );
    }

    const rawBody = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const trackingEvent = await adapter.parseWebhookPayload(rawBody, headers);
    const result = await carrierRegistry.ingestTrackingEvent(trackingEvent);

    return NextResponse.json({
      success: true,
      carrier: provider,
      isSimulated: trackingEvent.isSimulated,
      duplicate: result.duplicate,
      eventId: result.eventId,
      eventType: trackingEvent.eventType,
      trackingNumber: trackingEvent.trackingNumber
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Failed to process carrier webhook', detail: msg },
      { status: 500 }
    );
  }
}
