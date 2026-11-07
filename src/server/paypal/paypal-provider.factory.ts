import { IPayPalProvider } from './providers/paypal-provider.interface';
import { PayPalRestProvider } from './providers/paypal-rest.provider';
import { PayPalMockProvider } from './providers/paypal-mock.provider';
import { getPayPalConfig } from './paypal-config';

let overrideProvider: IPayPalProvider | null = null;

export class PayPalProviderFactory {
  public static getProvider(): IPayPalProvider {
    if (overrideProvider) {
      return overrideProvider;
    }

    const config = getPayPalConfig();
    if (config.providerType === 'mock') {
      return new PayPalMockProvider();
    }

    return new PayPalRestProvider();
  }

  public static setProvider(provider: IPayPalProvider | null): void {
    overrideProvider = provider;
  }
}
