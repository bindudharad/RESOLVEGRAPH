import { CarrierAdapter, CarrierProvider, StandardizedTrackingEvent } from './carrier.types';
import { blueDartCarrierAdapter } from './bluedart.adapter';
import { delhiveryCarrierAdapter } from './delhivery.adapter';
import { fedExCarrierAdapter } from './fedex.adapter';
import { upsCarrierAdapter } from './ups.adapter';
import { prisma } from '@/lib/prisma';

export class CarrierRegistry {
  private adapters: Map<CarrierProvider, CarrierAdapter> = new Map();

  constructor() {
    this.registerAdapter(blueDartCarrierAdapter);
    this.registerAdapter(delhiveryCarrierAdapter);
    this.registerAdapter(fedExCarrierAdapter);
    this.registerAdapter(upsCarrierAdapter);
  }

  public registerAdapter(adapter: CarrierAdapter) {
    this.adapters.set(adapter.provider, adapter);
  }

  public getAdapter(provider: CarrierProvider): CarrierAdapter | undefined {
    return this.adapters.get(provider);
  }

  public detectCarrier(trackingNumber: string): CarrierProvider {
    const clean = trackingNumber.trim();
    if (/^1Z[0-9A-Z]{16}$/i.test(clean)) return 'UPS';
    if (/^\d{8,11}$/.test(clean)) return 'BLUEDART';
    if (/^\d{12,14}$/.test(clean)) return 'DELHIVERY';
    if (/^\d{15,22}$/.test(clean)) return 'FEDEX';
    return 'SIMULATED';
  }

  public async ingestTrackingEvent(event: StandardizedTrackingEvent, packageId?: string): Promise<{
    created: boolean;
    eventId?: string;
    duplicate: boolean;
  }> {
    // 1. Check for exact duplicate event timestamp & eventType for package
    if (packageId) {
      const existing = await prisma.deliveryEvent.findFirst({
        where: {
          packageId,
          eventType: event.eventType,
          eventTimestamp: event.eventTimestamp
        }
      });

      if (existing) {
        return { created: false, eventId: existing.id, duplicate: true };
      }
    }

    // 2. Persist new DeliveryEvent in database
    const created = await prisma.deliveryEvent.create({
      data: {
        packageId: packageId || null,
        carrier: event.carrier,
        eventType: event.eventType,
        checkpoint: event.checkpoint || null,
        isEstimated: event.isEstimated,
        eventTimestamp: event.eventTimestamp,
        rawSource: event.rawSource
      }
    });

    return { created: true, eventId: created.id, duplicate: false };
  }
}

export const carrierRegistry = new CarrierRegistry();
