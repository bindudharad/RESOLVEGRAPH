/* eslint-disable @typescript-eslint/no-explicit-any */
import { PayPalProviderFactory } from '../paypal-provider.factory';
import { getPayPalConfig } from '../paypal-config';

export interface WebhookHeaders {
  authAlgo?: string | null;
  certUrl?: string | null;
  transmissionId?: string | null;
  transmissionSig?: string | null;
  transmissionTime?: string | null;
}

export class WebhookVerificationService {
  /**
   * Validates that cert URL belongs to PayPal trusted domain to prevent SSRF.
   */
  public static isValidCertUrl(certUrl: string): boolean {
    try {
      const parsed = new URL(certUrl);
      if (parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'api.paypal.com' ||
        host === 'api.sandbox.paypal.com' ||
        host === 'api-m.paypal.com' ||
        host === 'api-m.sandbox.paypal.com' ||
        host.endsWith('.paypal.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifies the authenticity of a PayPal webhook event.
   */
  public static async verifyWebhook(
    headers: WebhookHeaders,
    rawBody: Record<string, any> | string
  ): Promise<boolean> {
    const config = getPayPalConfig();

    if (!headers.authAlgo || !headers.certUrl || !headers.transmissionId || !headers.transmissionSig || !headers.transmissionTime) {
      return false;
    }

    if (!this.isValidCertUrl(headers.certUrl)) {
      console.warn(`[ResolveGraph PayPal Webhook] Rejected untrusted cert URL: ${headers.certUrl}`);
      return false;
    }

    const eventPayload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const webhookId = config.webhookId || 'mock_paypal_webhook_id';

    const provider = PayPalProviderFactory.getProvider();
    return provider.verifyWebhookSignature({
      authAlgo: headers.authAlgo,
      certUrl: headers.certUrl,
      transmissionId: headers.transmissionId,
      transmissionSig: headers.transmissionSig,
      transmissionTime: headers.transmissionTime,
      webhookId,
      webhookEvent: eventPayload,
    });
  }
}
