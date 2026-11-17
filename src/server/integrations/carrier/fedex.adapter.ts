import { CarrierAdapter, StandardizedTrackingEvent } from './carrier.types';

export class FedExCarrierAdapter implements CarrierAdapter {
  public provider = 'FEDEX' as const;

  public get isConfigured(): boolean {
    return Boolean(process.env.FEDEX_CLIENT_ID && process.env.FEDEX_CLIENT_SECRET);
  }

  public validateTrackingNumber(trackingNumber: string): boolean {
    // FedEx tracking: 12 or 15 digits, or 20/22 digits ground
    return /^\d{12,22}$/.test(trackingNumber.trim());
  }

  public async parseWebhookPayload(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<StandardizedTrackingEvent> {
    const payload = JSON.parse(rawBody || '{}');
    const trackingNumber = payload.trackDetails?.[0]?.trackingNumber || payload.trackingNumber || 'UNKNOWN';

    const eventStatus = (payload.trackDetails?.[0]?.eventType || payload.status || '').toUpperCase();
    let eventType: StandardizedTrackingEvent['eventType'] = 'IN_TRANSIT';
    if (eventStatus.includes('DL') || eventStatus.includes('DELIVERED')) {
      eventType = 'DELIVERED';
    } else if (eventStatus.includes('OD') || eventStatus.includes('ON_DELIVERY')) {
      eventType = 'OUT_FOR_DELIVERY';
    } else if (eventStatus.includes('PU') || eventStatus.includes('PICKED_UP')) {
      eventType = 'DISPATCHED';
    } else if (eventStatus.includes('EX') || eventStatus.includes('EXCEPTION')) {
      eventType = 'DELIVERY_FAILED';
    }

    return {
      carrier: 'FEDEX',
      trackingNumber,
      eventType,
      checkpoint: payload.trackDetails?.[0]?.scanLocation || 'FedEx International Hub',
      isEstimated: false,
      eventTimestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      rawSource: JSON.stringify(payload),
      isSimulated: !this.isConfigured,
      signatureVerified: Boolean(headers['x-fedex-signature'] || !this.isConfigured)
    };
  }

  public getSimulatedEvents(trackingNumber: string): StandardizedTrackingEvent[] {
    const baseDate = new Date(Date.now() - 86400000 * 3);
    return [
      {
        carrier: 'FEDEX',
        trackingNumber,
        eventType: 'DISPATCHED',
        checkpoint: 'FedEx Origin Facility - Memphis, TN',
        isEstimated: false,
        eventTimestamp: baseDate,
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'FEDEX',
        trackingNumber,
        eventType: 'IN_TRANSIT',
        checkpoint: 'FedEx Ramp Sort Station',
        isEstimated: false,
        eventTimestamp: new Date(baseDate.getTime() + 86400000),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'FEDEX',
        trackingNumber,
        eventType: 'DELIVERED',
        checkpoint: 'Delivered to Front Door',
        isEstimated: false,
        eventTimestamp: new Date(),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      }
    ];
  }
}

export const fedExCarrierAdapter = new FedExCarrierAdapter();
