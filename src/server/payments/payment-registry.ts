import {
  PaymentProviderAdapter,
  SupportedPaymentProvider,
} from './payment-provider.interface';
import { phonePeAdapter } from './adapters/phonepe.adapter';
import { googlePayAdapter } from './adapters/gpay.adapter';
import { cardNetworkAdapter } from './adapters/card-network.adapter';

export class PaymentRegistry {
  private adapters: Map<SupportedPaymentProvider, PaymentProviderAdapter> = new Map();

  constructor() {
    this.registerAdapter(phonePeAdapter);
    this.registerAdapter(googlePayAdapter);
    this.registerAdapter(cardNetworkAdapter);
  }

  public registerAdapter(adapter: PaymentProviderAdapter) {
    this.adapters.set(adapter.provider, adapter);
  }

  public getAdapter(provider: SupportedPaymentProvider): PaymentProviderAdapter | undefined {
    return this.adapters.get(provider);
  }

  public getSupportedProviders(): SupportedPaymentProvider[] {
    return Array.from(this.adapters.keys());
  }
}

export const paymentRegistry = new PaymentRegistry();
