/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayPalConfig } from './paypal-config';
import { PayPalApiError } from './errors/paypal-error';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
  tokenType: string;
}

export class PayPalAuthService {
  private static cachedToken: CachedToken | null = null;
  private static inFlightTokenRequest: Promise<string> | null = null;

  /**
   * Masks a sensitive token for safe logging (e.g. "A21AA...48xZ").
   */
  public static maskToken(token: string): string {
    if (!token || token.length < 8) return '***';
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  /**
   * Retrieves a valid OAuth2 bearer token for PayPal REST API calls.
   * Uses cached token if valid; requests new token via Client Credentials if expired.
   */
  public static async getAccessToken(): Promise<string> {
    const now = Date.now();
    // Use a 60-second safety buffer before expiry
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.accessToken;
    }

    // Single-flight promise: avoid multiple simultaneous requests for token
    if (this.inFlightTokenRequest) {
      return this.inFlightTokenRequest;
    }

    this.inFlightTokenRequest = this.fetchNewAccessToken().finally(() => {
      this.inFlightTokenRequest = null;
    });

    return this.inFlightTokenRequest;
  }

  private static async fetchNewAccessToken(): Promise<string> {
    const config = getPayPalConfig();

    // If running with mock provider, return mock token without network call
    if (config.providerType === 'mock') {
      const mockToken = 'mock_paypal_access_token_' + Date.now();
      this.cachedToken = {
        accessToken: mockToken,
        expiresAt: Date.now() + 3600 * 1000,
        tokenType: 'Bearer',
      };
      return mockToken;
    }

    const authString = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString('base64');

    const tokenUrl = `${config.baseUrl}/v1/oauth2/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Accept-Language': 'en_US',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // non-json response
        }

        throw new PayPalApiError({
          message: `PayPal OAuth authentication failed: ${response.status} ${response.statusText}`,
          statusCode: response.status,
          paypalIssueCode: errorData.error || 'AUTHENTICATION_FAILURE',
          details: [
            {
              issue: errorData.error,
              description: errorData.error_description || errorText,
            },
          ],
        });
      }

      const data = await response.json();
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;

      this.cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + expiresInSec * 1000,
        tokenType: data.token_type || 'Bearer',
      };

      return data.access_token;
    } catch (err: any) {
      if (err instanceof PayPalApiError) throw err;
      throw new PayPalApiError({
        message: `Failed to connect to PayPal token endpoint: ${err.message}`,
        statusCode: 502,
        paypalIssueCode: 'TOKEN_NETWORK_ERROR',
        cause: err,
      });
    }
  }

  /**
   * Clears token cache (useful for testing or after authentication errors).
   */
  public static clearCache(): void {
    this.cachedToken = null;
    this.inFlightTokenRequest = null;
  }
}
