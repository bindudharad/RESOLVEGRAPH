/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPayPalConfig } from './paypal-config';
import { PayPalAuthService } from './paypal-auth.service';
import { PayPalApiError } from './errors/paypal-error';

export interface PayPalRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  requestId?: string; // Passed as PayPal-Request-Id
  prefer?: 'return=representation' | 'return=minimal';
  timeoutMs?: number;
}

export class PayPalClient {
  /**
   * Executes an authenticated request against the configured PayPal REST endpoint.
   */
  public static async request<T = any>(options: PayPalRequestOptions): Promise<T> {
    const config = getPayPalConfig();
    const token = await PayPalAuthService.getAccessToken();

    const url = options.path.startsWith('http')
      ? options.path
      : `${config.baseUrl}${options.path.startsWith('/') ? '' : '/'}${options.path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    if (options.requestId) {
      headers['PayPal-Request-Id'] = options.requestId;
    }

    if (options.prefer) {
      headers['Prefer'] = options.prefer;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { rawText: text };
      }

      if (!response.ok) {
        const debugId = response.headers.get('Paypal-Debug-Id') || data.debug_id;
        const issueCode = data.name || data.error || `HTTP_${response.status}`;
        const message =
          data.message ||
          data.error_description ||
          `PayPal API error: ${response.status} ${response.statusText}`;

        throw new PayPalApiError({
          message,
          statusCode: response.status,
          paypalDebugId: debugId,
          paypalIssueCode: issueCode,
          details: Array.isArray(data.details) ? data.details : undefined,
        });
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof PayPalApiError) {
        // If 401 Unauthorized, clear token cache so next call refreshes
        if (err.statusCode === 401) {
          PayPalAuthService.clearCache();
        }
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new PayPalApiError({
          message: `PayPal request timed out after ${options.timeoutMs || 15000}ms to ${options.path}`,
          statusCode: 504,
          paypalIssueCode: 'GATEWAY_TIMEOUT',
          isRetryable: true,
          cause: err,
        });
      }

      throw new PayPalApiError({
        message: `Network error connecting to PayPal: ${err.message}`,
        statusCode: 502,
        paypalIssueCode: 'NETWORK_ERROR',
        isRetryable: true,
        cause: err,
      });
    }
  }
}
