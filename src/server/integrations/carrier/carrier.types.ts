/**
 * RESOLVEGRAPH Carrier Integration Framework
 * Standardized types and provider interfaces for delivery tracking.
 */

export type CarrierProvider = 'BLUEDART' | 'DELHIVERY' | 'FEDEX' | 'UPS' | 'SIMULATED';

export type CarrierTrackingStatus =
  | 'ORDER_CONFIRMED'
  | 'PACKAGE_REGISTERED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RETURNED';

export interface StandardizedTrackingEvent {
  carrier: CarrierProvider;
  trackingNumber: string;
  eventType: CarrierTrackingStatus;
  checkpoint?: string;
  isEstimated: boolean;
  eventTimestamp: Date;
  rawSource: string;
  isSimulated: boolean;
  signatureVerified: boolean;
}

export interface CarrierAdapter {
  provider: CarrierProvider;
  isConfigured: boolean;
  validateTrackingNumber(trackingNumber: string): boolean;
  parseWebhookPayload(
    rawBody: string,
    headers: Record<string, string>
  ): Promise<StandardizedTrackingEvent>;
  getSimulatedEvents(trackingNumber: string): StandardizedTrackingEvent[];
}
