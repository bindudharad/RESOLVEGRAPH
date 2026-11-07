# RESOLVEGRAPH — PayPal Sandbox Setup & Configuration Guide

This guide describes how to configure RESOLVEGRAPH to connect to PayPal Developer Sandbox for secure commerce checkout, order capture, automated refunds, cryptographically verified webhooks, and dispute resolution.

---

## 1. Prerequisites

1. A verified **PayPal Developer Account** at [developer.paypal.com](https://developer.paypal.com).
2. At least two sandbox accounts created in the PayPal Developer Dashboard:
   - **Sandbox Merchant Account** (Business account): Receives customer payments, issues authorized refunds, and resolves disputes.
   - **Sandbox Buyer Account** (Personal account): Simulates customer checkout and disputing charges.

---

## 2. Sandbox Application Credentials

1. Navigate to **PayPal Developer Dashboard** > **Apps & Credentials**.
2. Switch toggle to **Sandbox**.
3. Click **Create App** and name it `ResolveGraph Sandbox App`.
4. Select your **Sandbox Merchant Account** as the business account.
5. Copy your **Client ID** and **Secret**.

> [!WARNING]
> Keep your PayPal Client Secret strictly on the server. Never expose client secrets in client-side bundles, React components, or public git commits.

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` or update the following keys:

```ini
# PayPal Sandbox Configuration
PAYPAL_ENV="sandbox" # Must remain "sandbox" for development and testing
PAYPAL_CLIENT_ID="your_sandbox_client_id_here"
PAYPAL_CLIENT_SECRET="your_sandbox_client_secret_here"
PAYPAL_WEBHOOK_ID="your_sandbox_webhook_id_here"
PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="sb" # Or your sandbox client ID for frontend SDK
PAYPAL_LIVE_ENABLED="false" # Safety guard: live financial transactions strictly blocked
PAYPAL_DISPUTES_ENABLED="true" # Enable Disputes API sandbox synchronization
PAYPAL_WEBHOOK_PROCESSING_ENABLED="true" # Enable incoming webhook handling
```

### Safety Invariants

- **`PAYPAL_LIVE_ENABLED=false`**: ResolveGraph enforces an active code guard that refuses live transactions unless this flag is explicitly set and validated.
- **Provider Mock Mode**: During unit and integration tests (`npm test`), the platform automatically switches to `PayPalMockProvider` to run deterministic, ultra-fast suites without relying on external sandbox latency or network dependencies.

---

## 4. Webhook Configuration

For local development and testing, you can use a tunneling service (such as ngrok or cloudflared) or PayPal Webhook Simulator:

1. In PayPal Developer Dashboard, navigate to **Apps & Credentials** > your App > **Add Webhook**.
2. Set the Webhook URL to:
   ```
   https://<your-public-domain>/api/webhooks/paypal
   ```
3. Subscribe to the following event types:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`
   - `CUSTOMER.DISPUTE.CREATED`
   - `CUSTOMER.DISPUTE.RESOLVED`
   - `CUSTOMER.DISPUTE.UPDATED`
4. Copy the generated **Webhook ID** into `PAYPAL_WEBHOOK_ID` in your `.env`.

---

## 5. Verification Checklist

To verify your configuration:
1. Run the test suite:
   ```bash
   npm test
   ```
2. Navigate to `/payments` in your browser. Verify the green **PayPal Sandbox** badge is visible.
3. Review `/paypal/disputes` and click **Sync Sandbox Disputes** to verify API connectivity.
