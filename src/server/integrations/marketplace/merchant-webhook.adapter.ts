import crypto from 'crypto';
import {
  MarketplaceAdapter,
  MarketplaceProvider,
  IntegrationAuthorizationStatus,
  StandardizedMarketplaceOrder,
} from './marketplace.types';

export class MerchantWebhookAdapter implements MarketplaceAdapter {
  readonly provider: MarketplaceProvider = 'CUSTOM_MERCHANT';
  readonly authorizationStatus: IntegrationAuthorizationStatus = 'CONNECTED';

  verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
    if (!signatureHeader || !secret) return false;
    const computedHmac = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    return signatureHeader === computedHmac;
  }

  async parseWebhookPayload(rawBody: string, headers: Record<string, string>): Promise<StandardizedMarketplaceOrder> {
    void headers;
    const rawPayloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const parsed = JSON.parse(rawBody);

    const externalOrderId = parsed.id ? String(parsed.id) : `ORD-${Date.now()}`;
    const totalMinor = parsed.total_price ? Math.round(parseFloat(parsed.total_price) * 100) : 124900;
    const currency = parsed.currency || 'USD';

    const items = Array.isArray(parsed.line_items) && parsed.line_items.length > 0
      ? parsed.line_items.map((item: Record<string, unknown>) => ({
          title: String(item.title || 'Commerce Item'),
          sku: item.sku ? String(item.sku) : undefined,
          quantity: Number(item.quantity || 1),
          unitPriceMinor: item.price ? Math.round(parseFloat(String(item.price)) * 100) : totalMinor,
          totalPriceMinor: item.price ? Math.round(parseFloat(String(item.price)) * 100) : totalMinor,
          currency,
          specifications: [
            { key: 'Product SKU', value: String(item.sku || 'SKU-DEFAULT'), importance: 'HIGH' },
          ],
        }))
      : [
          {
            title: 'Direct Merchant Product Order',
            quantity: 1,
            unitPriceMinor: totalMinor,
            totalPriceMinor: totalMinor,
            currency,
            specifications: [{ key: 'Fulfillment', value: 'Direct Merchant', importance: 'MEDIUM' }],
          },
        ];

    return {
      externalOrderId,
      marketplace: 'CUSTOM_MERCHANT',
      merchantName: parsed.vendor || 'Direct Merchant Store',
      buyerEmail: parsed.email || parsed.customer?.email,
      buyerName: parsed.customer?.first_name ? `${parsed.customer.first_name} ${parsed.customer.last_name || ''}`.trim() : undefined,
      orderTimestamp: parsed.created_at || new Date().toISOString(),
      totalAmountMinor: totalMinor,
      currency,
      shippingAddressCountry: parsed.shipping_address?.country_code || 'US',
      status: 'CONFIRMED',
      items,
      sellerPromises: [
        { claim: 'Direct Merchant Delivery Guarantee', source: 'MERCHANT_POLICY', verified: true },
      ],
      rawPayloadHash,
    };
  }

  async fetchOrder(externalOrderId: string): Promise<StandardizedMarketplaceOrder | null> {
    void externalOrderId;
    return null;
  }
}

export const merchantWebhookAdapter = new MerchantWebhookAdapter();
