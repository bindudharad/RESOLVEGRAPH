import { CarrierAdapter, StandardizedTrackingEvent } from './carrier.types';

export class BlueDartCarrierAdapter implements CarrierAdapter {
  public provider = 'BLUEDART' as const;

  public get isConfigured(): boolean {
    return Boolean(process.env.BLUEDART_LOGIN_ID && process.env.BLUEDART_LICENSE_KEY);
  }

  public validateTrackingNumber(trackingNumber: string): boolean {
    // BlueDart waybill format: typically 8 to 11 digits
    return /^\d{8,11}$/.test(trackingNumber.trim());
  }

  public async parseWebhookPayload(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<StandardizedTrackingEvent> {
    const payload = JSON.parse(rawBody || '{}');
    const waybill = payload.WaybillNo || payload.waybill || 'UNKNOWN';

    // Map BlueDart scan status
    const scan = (payload.Status || payload.ScanType || '').toUpperCase();
    let eventType: StandardizedTrackingEvent['eventType'] = 'IN_TRANSIT';
    if (scan.includes('DL') || scan.includes('DELIVERED')) {
      eventType = 'DELIVERED';
    } else if (scan.includes('UD') || scan.includes('UNDELIVERED')) {
      eventType = 'DELIVERY_FAILED';
    } else if (scan.includes('OFD') || scan.includes('OUT FOR DELIVERY')) {
      eventType = 'OUT_FOR_DELIVERY';
    } else if (scan.includes('PU') || scan.includes('PICKUP')) {
      eventType = 'DISPATCHED';
    }

    return {
      carrier: 'BLUEDART',
      trackingNumber: waybill,
      eventType,
      checkpoint: payload.Location || payload.ScannedLocation || 'BlueDart Hub',
      isEstimated: false,
      eventTimestamp: payload.DateTime ? new Date(payload.DateTime) : new Date(),
      rawSource: JSON.stringify(payload),
      isSimulated: !this.isConfigured,
      signatureVerified: Boolean(headers['x-bluedart-hmac'] || !this.isConfigured)
    };
  }

  public getSimulatedEvents(trackingNumber: string): StandardizedTrackingEvent[] {
    const baseDate = new Date(Date.now() - 86400000 * 2);
    return [
      {
        carrier: 'BLUEDART',
        trackingNumber,
        eventType: 'DISPATCHED',
        checkpoint: 'Bengaluru Sort Facility',
        isEstimated: false,
        eventTimestamp: baseDate,
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'BLUEDART',
        trackingNumber,
        eventType: 'IN_TRANSIT',
        checkpoint: 'Mumbai Linehaul Hub',
        isEstimated: false,
        eventTimestamp: new Date(baseDate.getTime() + 86400000),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'BLUEDART',
        trackingNumber,
        eventType: 'DELIVERED',
        checkpoint: 'Customer Destination Hub',
        isEstimated: false,
        eventTimestamp: new Date(),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      }
    ];
  }
}

export const blueDartCarrierAdapter = new BlueDartCarrierAdapter();
