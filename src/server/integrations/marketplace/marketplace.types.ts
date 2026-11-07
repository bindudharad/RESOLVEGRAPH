export type MarketplaceProvider = 'AMAZON' | 'FLIPKART' | 'SHOPIFY' | 'WOOCOMMERCE' | 'OLX' | 'CUSTOM_MERCHANT';

export type IntegrationAuthorizationStatus =
  | 'READY_FOR_EXTERNAL_AUTHORIZATION'
  | 'CONNECTED'
  | 'BLOCKED_BY_EXTERNAL_DEPENDENCY'
  | 'PENDING_MERCHANT_OAUTH';

export interface StandardizedMarketplaceItem {
  title: string;
  sku?: string;
  modelNumber?: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  currency: string;
  specifications: Array<{ key: string; value: string; importance: string }>;
  returnWindowDays?: number;
  warrantyMonths?: number;
}

export interface StandardizedMarketplaceOrder {
  externalOrderId: string;
  marketplace: MarketplaceProvider;
  merchantName: string;
  merchantStoreId?: string;
  buyerEmail?: string;
  buyerName?: string;
  orderTimestamp: string;
  totalAmountMinor: number;
  currency: string;
  shippingAddressCountry: string;
  status: 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  items: StandardizedMarketplaceItem[];
  sellerPromises: Array<{ claim: string; source: string; verified: boolean }>;
  rawPayloadHash: string;
}

export interface MarketplaceAdapter {
  readonly provider: MarketplaceProvider;
  readonly authorizationStatus: IntegrationAuthorizationStatus;
  parseWebhookPayload(rawBody: string, headers: Record<string, string>): Promise<StandardizedMarketplaceOrder>;
  fetchOrder(externalOrderId: string, credentials?: Record<string, string>): Promise<StandardizedMarketplaceOrder | null>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean;
}
