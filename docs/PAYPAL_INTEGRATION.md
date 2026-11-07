# RESOLVEGRAPH — Complete PayPal Fintech Integration

This document details the PayPal REST API integration, orders, captures, refunds, dispute synchronization, and webhook verification architectures implemented in **RESOLVEGRAPH**.

---

## 1. Supported PayPal Capabilities & Endpoints

| Capability | PayPal REST V2 / V1 Endpoint | ResolveGraph Service |
| :--- | :--- | :--- |
| **OAuth 2.0 Auth** | `POST /v1/oauth2/token` | `PayPalAuthService` (Single-flight caching) |
| **Create Order** | `POST /v2/checkout/orders` | `OrderService.createOrder` |
| **Capture Payment** | `POST /v2/checkout/orders/{id}/capture` | `CaptureService.captureOrder` |
| **Execute Refund** | `POST /v2/payments/captures/{id}/refund` | `RefundService.executeRefund` |
| **Dispute Inquiry** | `GET /v1/customer/disputes` | `DisputeService.listDisputes` |
| **Dispute Details** | `GET /v1/customer/disputes/{id}` | `DisputeService.getDisputeById` |
| **Dispute Evidence** | `POST /v1/customer/disputes/{id}/provide-evidence` | `EvidenceCompilerService.compileEvidence` |
| **Accept Dispute** | `POST /v1/customer/disputes/{id}/accept-claim` | `DisputeService.acceptClaim` |
| **Webhook Delivery**| `POST /api/webhooks/paypal` | `WebhookProcessingService.processEvent` |
| **Ledger Audit** | `GET /v2/payments/captures/{id}` | `ReconciliationService.reconcilePayment` |

---

## 2. Minor Unit Financial Math Architecture

To eliminate floating-point arithmetic errors across currencies, ResolveGraph executes all monetary accounting in **integer minor units** (cents, paise):

```ts
// $79.99 USD -> 7999 cents
const minorPrice = toMinorUnits('79.99', 'USD'); // 7999
const displayStr = toDecimalString(7999, 'USD');  // "79.99"
```

Zero-decimal currencies like JPY are automatically respected:
```ts
const yenMinor = toMinorUnits('2500', 'JPY'); // 2500
const yenDisplay = toDecimalString(2500, 'JPY'); // "2500"
```

Over-refunds are prevented before network dispatch by `calculateRemainingRefundable`:
$$\text{Remaining} = \text{CapturedMinor} - \sum \text{RefundedMinor}$$
Any refund request exceeding the remaining refundable balance is rejected with an explicit validation error.

---

## 3. Idempotency & Concurrency Safety

Every financial refund request includes a cryptographically secure idempotency key passed as `PayPal-Request-Id`:
- Generated deterministically: `reso-ref-{proposalId}` or client-supplied UUID.
- Registered in `RefundTransaction.refundRequestId`.
- If network timeouts trigger an automatic retry, ResolveGraph identifies the existing key and returns the identical transaction record without re-deducting merchant funds.

---

## 4. Webhook Security & SSRF Protection

Inbound webhooks to `/api/webhooks/paypal` are verified by `WebhookVerificationService`:

1. **Header Validation:** Checks `paypal-transmission-id`, `paypal-transmission-time`, `paypal-transmission-sig`, and `paypal-cert-url`.
2. **SSRF Prevention:** The TLS certificate URL is parsed and verified to ensure its hostname strictly matches:
   - `api.paypal.com`
   - `api.sandbox.paypal.com`  
   Any arbitrary or self-hosted certificate URL is rejected upfront.
3. **Idempotent Ingestion:** Every webhook is assigned a unique `paypalEventId` in `PayPalWebhookEvent`. Duplicate webhooks return `ALREADY_PROCESSED` without double-updating internal state.

---

## 5. Live Mode Safety Guard

In accordance with hackathon safety requirements, ResolveGraph features an unconditional hard block on live payments:
```ts
if (config.environment === 'live' && process.env.PAYPAL_LIVE_ENABLED !== 'true') {
  throw new Error("CRITICAL SAFETY BLOCK: Live PayPal mode requested but PAYPAL_LIVE_ENABLED is not 'true'.");
}
```
All development and evaluation is conducted against **PayPal Sandbox**.
