import crypto from 'crypto';
import {
  MarketplaceAdapter,
  MarketplaceProvider,
  IntegrationAuthorizationStatus,
  StandardizedMarketplaceOrder,
} from './marketplace.types';

export class FlipkartMarketplaceAdapter implements MarketplaceAdapter {
  readonly provider: MarketplaceProvider = 'FLIPKART';
  readonly authorizationStatus: IntegrationAuthorizationStatus = 'READY_FOR_EXTERNAL_AUTHORIZATION';

  verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    if (!signatureHeader || !secret) return false;
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    return signatureHeader === computed;
  }

  async parseWebhookPayload(rawBody: string, headers: Record<string, string>): Promise<StandardizedMarketplaceOrder> {
    void headers;
    const rawPayloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const parsed = JSON.parse(rawBody);

    const orderId = parsed.orderId || `FK-${Date.now()}`;
    const totalAmount = parsed.priceComponents?.total ? Math.round(Number(parsed.priceComponents.total) * 100) : 649900;

    return {
      externalOrderId: orderId,
      marketplace: 'FLIPKART',
      merchantName: parsed.sellerDetails?.sellerName || 'Flipkart Assured Merchant',
      merchantStoreId: parsed.sellerDetails?.fsn,
      buyerEmail: parsed.buyerDetails?.email,
      orderTimestamp: parsed.orderDate || new Date().toISOString(),
      totalAmountMinor: totalAmount,
      currency: 'INR',
      shippingAddressCountry: 'IN',
      status: 'CONFIRMED',
      items: [
        {
          title: parsed.items?.[0]?.title || 'Ultra-Fast 1TB Portable Solid State Drive',
          sku: parsed.items?.[0]?.sku || 'SKU-FK-SSD-1TB',
          quantity: parsed.items?.[0]?.quantity || 1,
          unitPriceMinor: totalAmount,
          totalPriceMinor: totalAmount,
          currency: 'INR',
          specifications: [
            { key: 'Capacity', value: '1TB', importance: 'CRITICAL' },
            { key: 'Warranty', value: '3 Years Domestic', importance: 'HIGH' },
          ],
          returnWindowDays: 7,
          warrantyMonths: 36,
        },
      ],
      sellerPromises: [
        { claim: 'Flipkart Assured Quality Check', source: 'MARKETPLACE_BADGE', verified: true },
        { claim: '100% Genuine Sealed Retail Pack', source: 'SELLER_DECLARATION', verified: false },
      ],
      rawPayloadHash,
    };
  }

  async fetchOrder(externalOrderId: string, credentials?: Record<string, string>): Promise<StandardizedMarketplaceOrder | null> {
    if (!credentials?.appId || !credentials?.appSecret) {
      return null;
    }
    // Production call to https://api.flipkart.net/sellers/v3/orders/{orderId}
    return null;
  }
}

export const flipkartMarketplaceAdapter = new FlipkartMarketplaceAdapter();
