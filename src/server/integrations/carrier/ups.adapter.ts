import { CarrierAdapter, StandardizedTrackingEvent } from './carrier.types';

export class UPSCarrierAdapter implements CarrierAdapter {
  public provider = 'UPS' as const;

  public get isConfigured(): boolean {
    return Boolean(process.env.UPS_CLIENT_ID && process.env.UPS_CLIENT_SECRET);
  }

  public validateTrackingNumber(trackingNumber: string): boolean {
    // UPS tracking: 1Z followed by 16 alphanumeric characters
    return /^1Z[0-9A-Z]{16}$/i.test(trackingNumber.trim());
  }

  public async parseWebhookPayload(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<StandardizedTrackingEvent> {
    const payload = JSON.parse(rawBody || '{}');
    const trackingNumber = payload.trackingNumber || payload.Shipment?.Package?.TrackingNumber || 'UNKNOWN';

    const statusCode = (payload.status?.code || payload.Activity?.Status?.Type || '').toUpperCase();
    let eventType: StandardizedTrackingEvent['eventType'] = 'IN_TRANSIT';
    if (statusCode === 'D' || statusCode.includes('DELIVERED')) {
      eventType = 'DELIVERED';
    } else if (statusCode === 'O' || statusCode.includes('OUT')) {
      eventType = 'OUT_FOR_DELIVERY';
    } else if (statusCode === 'P' || statusCode.includes('PICKUP')) {
      eventType = 'DISPATCHED';
    } else if (statusCode === 'X' || statusCode.includes('EXCEPTION')) {
      eventType = 'DELIVERY_FAILED';
    }

    return {
      carrier: 'UPS',
      trackingNumber,
      eventType,
      checkpoint: payload.Activity?.ActivityLocation?.Address?.City || 'UPS Sorting Hub',
      isEstimated: false,
      eventTimestamp: payload.Activity?.Date ? new Date(payload.Activity.Date) : new Date(),
      rawSource: JSON.stringify(payload),
      isSimulated: !this.isConfigured,
      signatureVerified: Boolean(headers['x-ups-security-token'] || !this.isConfigured)
    };
  }

  public getSimulatedEvents(trackingNumber: string): StandardizedTrackingEvent[] {
    const baseDate = new Date(Date.now() - 86400000 * 2);
    return [
      {
        carrier: 'UPS',
        trackingNumber,
        eventType: 'DISPATCHED',
        checkpoint: 'UPS Worldport - Louisville, KY',
        isEstimated: false,
        eventTimestamp: baseDate,
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'UPS',
        trackingNumber,
        eventType: 'OUT_FOR_DELIVERY',
        checkpoint: 'Loaded onto Delivery Vehicle',
        isEstimated: false,
        eventTimestamp: new Date(Date.now() - 14400000),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'UPS',
        trackingNumber,
        eventType: 'DELIVERED',
        checkpoint: 'Left at Front Porch',
        isEstimated: false,
        eventTimestamp: new Date(),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      }
    ];
  }
}

export const upsCarrierAdapter = new UPSCarrierAdapter();
