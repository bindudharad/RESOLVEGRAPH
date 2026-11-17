import { CarrierAdapter, StandardizedTrackingEvent } from './carrier.types';

export class DelhiveryCarrierAdapter implements CarrierAdapter {
  public provider = 'DELHIVERY' as const;

  public get isConfigured(): boolean {
    return Boolean(process.env.DELHIVERY_API_TOKEN);
  }

  public validateTrackingNumber(trackingNumber: string): boolean {
    // Delhivery waybill format: typically 12 to 14 digits
    return /^\d{12,14}$/.test(trackingNumber.trim());
  }

  public async parseWebhookPayload(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<StandardizedTrackingEvent> {
    const payload = JSON.parse(rawBody || '{}');
    const waybill = payload.waybill || payload.awb || 'UNKNOWN';

    const statusType = (payload.status?.status_type || payload.Scan || '').toUpperCase();
    let eventType: StandardizedTrackingEvent['eventType'] = 'IN_TRANSIT';
    if (statusType.includes('DL') || statusType.includes('DELIVERED')) {
      eventType = 'DELIVERED';
    } else if (statusType.includes('UD') || statusType.includes('FAILED')) {
      eventType = 'DELIVERY_FAILED';
    } else if (statusType.includes('OFD') || statusType.includes('DISPATCH')) {
      eventType = 'OUT_FOR_DELIVERY';
    } else if (statusType.includes('MANIFEST')) {
      eventType = 'PACKAGE_REGISTERED';
    }

    return {
      carrier: 'DELHIVERY',
      trackingNumber: waybill,
      eventType,
      checkpoint: payload.status?.instructions || payload.location || 'Delhivery Hub',
      isEstimated: false,
      eventTimestamp: payload.status?.status_date_time ? new Date(payload.status.status_date_time) : new Date(),
      rawSource: JSON.stringify(payload),
      isSimulated: !this.isConfigured,
      signatureVerified: Boolean(headers['authorization'] || !this.isConfigured)
    };
  }

  public getSimulatedEvents(trackingNumber: string): StandardizedTrackingEvent[] {
    const baseDate = new Date(Date.now() - 86400000 * 2);
    return [
      {
        carrier: 'DELHIVERY',
        trackingNumber,
        eventType: 'PACKAGE_REGISTERED',
        checkpoint: 'Merchant Fulfillment Hub - Gurugram',
        isEstimated: false,
        eventTimestamp: baseDate,
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'DELHIVERY',
        trackingNumber,
        eventType: 'DISPATCHED',
        checkpoint: 'Delhivery Central Sorting Gateway',
        isEstimated: false,
        eventTimestamp: new Date(baseDate.getTime() + 43200000),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      },
      {
        carrier: 'DELHIVERY',
        trackingNumber,
        eventType: 'DELIVERED',
        checkpoint: 'Customer Doorstep Handover',
        isEstimated: false,
        eventTimestamp: new Date(),
        rawSource: 'SIMULATED_CARRIER_EVENT',
        isSimulated: true,
        signatureVerified: true
      }
    ];
  }
}

export const delhiveryCarrierAdapter = new DelhiveryCarrierAdapter();
