import {
  MarketplaceAdapter,
  MarketplaceProvider,
  StandardizedMarketplaceOrder,
  IntegrationAuthorizationStatus,
} from './marketplace.types';
import { amazonSpApiAdapter } from './amazon.adapter';
import { flipkartMarketplaceAdapter } from './flipkart.adapter';
import { merchantWebhookAdapter } from './merchant-webhook.adapter';

export class MarketplaceRegistry {
  private adapters: Map<MarketplaceProvider, MarketplaceAdapter> = new Map();

  constructor() {
    this.registerAdapter(amazonSpApiAdapter);
    this.registerAdapter(flipkartMarketplaceAdapter);
    this.registerAdapter(merchantWebhookAdapter);
  }

  public registerAdapter(adapter: MarketplaceAdapter) {
    this.adapters.set(adapter.provider, adapter);
  }

  public getAdapter(provider: MarketplaceProvider): MarketplaceAdapter | undefined {
    return this.adapters.get(provider);
  }

  public getIntegrationStatuses(): Record<MarketplaceProvider, IntegrationAuthorizationStatus> {
    const statuses: Partial<Record<MarketplaceProvider, IntegrationAuthorizationStatus>> = {};
    for (const [provider, adapter] of this.adapters.entries()) {
      statuses[provider] = adapter.authorizationStatus;
    }
    return statuses as Record<MarketplaceProvider, IntegrationAuthorizationStatus>;
  }

  public async parseInboundOrder(
    provider: MarketplaceProvider,
    rawBody: string,
    headers: Record<string, string>
  ): Promise<StandardizedMarketplaceOrder> {
    const adapter = this.getAdapter(provider);
    if (!adapter) {
      throw new Error(`Unsupported marketplace provider: ${provider}`);
    }
    return adapter.parseWebhookPayload(rawBody, headers);
  }
}

export const marketplaceRegistry = new MarketplaceRegistry();
