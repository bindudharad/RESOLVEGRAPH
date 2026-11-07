import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PayPalAuthService } from '../src/server/paypal/paypal-auth.service';
import { getPayPalConfig, resetPayPalConfigForTesting } from '../src/server/paypal/paypal-config';

describe('ResolveGraph PayPal Authentication & Config Suite', () => {
  beforeEach(() => {
    PayPalAuthService.clearCache();
    resetPayPalConfigForTesting();
  });

  it('getPayPalConfig defaults to sandbox and blocks unauthorized live mode', () => {
    const config = getPayPalConfig();
    assert.equal(config.env, 'sandbox');
    assert.equal(config.liveEnabled, false);
    assert.ok(config.baseUrl.includes('sandbox'));
  });

  it('PayPalAuthService masks sensitive tokens safely', () => {
    const token = 'A21AAI_89hdsjkfahskdjfhasjkdfh_48xZ';
    const masked = PayPalAuthService.maskToken(token);
    assert.equal(masked, 'A21A...48xZ');

    assert.equal(PayPalAuthService.maskToken(''), '***');
    assert.equal(PayPalAuthService.maskToken('short'), '***');
  });

  it('PayPalAuthService retrieves and caches bearer token', async () => {
    const token1 = await PayPalAuthService.getAccessToken();
    assert.ok(token1);
    assert.ok(typeof token1 === 'string');

    // Second call should return the exact same cached token
    const token2 = await PayPalAuthService.getAccessToken();
    assert.equal(token1, token2);
  });

  it('PayPalAuthService handles concurrent callers with single-flight promise', async () => {
    PayPalAuthService.clearCache();
    const [t1, t2, t3] = await Promise.all([
      PayPalAuthService.getAccessToken(),
      PayPalAuthService.getAccessToken(),
      PayPalAuthService.getAccessToken(),
    ]);

    assert.equal(t1, t2);
    assert.equal(t2, t3);
  });
});
