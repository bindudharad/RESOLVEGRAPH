/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { WebhookVerificationService } from '@/server/paypal/services/webhook-verification.service';
import { WebhookProcessingService } from '@/server/paypal/services/webhook-processing.service';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let eventPayload: any;
    try {
      eventPayload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const headers = {
      authAlgo: request.headers.get('paypal-auth-algo'),
      certUrl: request.headers.get('paypal-cert-url'),
      transmissionId: request.headers.get('paypal-transmission-id'),
      transmissionSig: request.headers.get('paypal-transmission-sig'),
      transmissionTime: request.headers.get('paypal-transmission-time'),
    };

    // Signature verification
    const isValid = await WebhookVerificationService.verifyWebhook(headers, eventPayload);
    if (!isValid) {
      console.warn('[ResolveGraph Webhooks] PayPal signature verification failed for incoming request.');
      return NextResponse.json(
        { error: 'Invalid webhook signature or untrusted origin' },
        { status: 400 }
      );
    }

    // Idempotent processing
    const result = await WebhookProcessingService.processEvent(eventPayload);

    return NextResponse.json({
      received: true,
      result,
    }, { status: 200 });
  } catch (error: any) {
    console.error('API /api/webhooks/paypal POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
