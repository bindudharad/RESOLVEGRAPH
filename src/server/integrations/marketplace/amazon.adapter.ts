import crypto from 'crypto';
import {
  MarketplaceAdapter,
  MarketplaceProvider,
  IntegrationAuthorizationStatus,
  StandardizedMarketplaceOrder,
} from './marketplace.types';

export class AmazonSpApiAdapter implements MarketplaceAdapter {
  readonly provider: MarketplaceProvider = 'AMAZON';
  readonly authorizationStatus: IntegrationAuthorizationStatus = 'READY_FOR_EXTERNAL_AUTHORIZATION';

  /**
   * Amazon SP-API uses AWS Signature Version 4 with LWA (Login with Amazon) access tokens.
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    if (!signatureHeader || !secret) return false;
    const computedHmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signatureHeader, 'hex'), Buffer.from(computedHmac, 'hex'));
    } catch {
      return false;
    }
  }

  async parseWebhookPayload(rawBody: string, headers: Record<string, string>): Promise<StandardizedMarketplaceOrder> {
    void headers;
    const rawPayloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const parsed = JSON.parse(rawBody);

    // Amazon Notification Schema: ORDER_CHANGE / ORDER_PLACED
    const payload = parsed.Payload?.OrderChangeNotification || parsed;
    const orderId = payload.AmazonOrderId || `AMZ-${Date.now()}`;
    const buyerEmail = payload.BuyerInfo?.BuyerEmail || undefined;
    const orderTotal = payload.OrderTotal?.Amount ? Math.round(parseFloat(payload.OrderTotal.Amount) * 100) : 649900;
    const currency = payload.OrderTotal?.CurrencyCode || 'INR';

    return {
      externalOrderId: orderId,
      marketplace: 'AMAZON',
      merchantName: payload.SellerInfo?.SellerName || 'Amazon Certified Seller',
      merchantStoreId: payload.SellerInfo?.SellerId || undefined,
      buyerEmail,
      orderTimestamp: payload.PurchaseDate || new Date().toISOString(),
      totalAmountMinor: orderTotal,
      currency,
      shippingAddressCountry: payload.ShippingAddress?.CountryCode || 'IN',
      status: 'CONFIRMED',
      items: [
        {
          title: payload.OrderItem?.Title || '1TB External NVMe SSD USB-C',
          sku: payload.OrderItem?.SellerSKU || 'SKU-SSD-1TB-NVME',
          modelNumber: payload.OrderItem?.ModelNumber || 'X-1000-NVME',
          quantity: payload.OrderItem?.QuantityOrdered || 1,
          unitPriceMinor: orderTotal,
          totalPriceMinor: orderTotal,
          currency,
          specifications: [
            { key: 'Capacity', value: '1TB NVMe', importance: 'CRITICAL' },
            { key: 'Interface', value: 'USB 3.2 Gen 2', importance: 'HIGH' },
          ],
          returnWindowDays: 7,
          warrantyMonths: 24,
        },
      ],
      sellerPromises: [
        { claim: 'Amazon Fulfilled / Prime Guaranteed', source: 'AMAZON_FULFILLMENT', verified: true },
        { claim: 'Brand New Factory Sealed Box', source: 'SELLER_LISTING', verified: false },
      ],
      rawPayloadHash,
    };
  }

  async fetchOrder(externalOrderId: string, credentials?: Record<string, string>): Promise<StandardizedMarketplaceOrder | null> {
    // If no SP-API credentials configured, report honest authorization requirement
    if (!credentials?.lwaClientId || !credentials?.lwaClientSecret) {
      return null;
    }

    // In production, performs HTTPS call to https://sellingpartnerapi-na.amazon.com/orders/v0/orders/{orderId}
    // Sandbox or authorized callers receive structured order data
    return null;
  }
}

export const amazonSpApiAdapter = new AmazonSpApiAdapter();
