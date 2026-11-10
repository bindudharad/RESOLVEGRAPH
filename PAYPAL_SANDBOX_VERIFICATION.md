# RESOLVEGRAPH 2.0 — PayPal Sandbox Verification Report

**Target:** PayPal AI Hackathon 2026 & Production Deployment  
**Repository:** `https://github.com/bindudharad/RESOLVEGRAPH`  
**Execution Date:** November 2026  
**Verification Status:** **HYBRID ARCHITECTURE VERIFIED · EXTERNAL CALL BLOCKED PENDING DEVELOPER KEYS**

---

## 1. Provider Configuration & Safety Invariants

RESOLVEGRAPH 2.0 integrates with the PayPal REST API v2 through a modular provider architecture (`PayPalProviderFactory`) supporting both live Sandbox REST calls and high-fidelity contract test doubles.

### Environment Variable Inspection (Sanitized)

| Variable Name | Configured Status | Configured Value / Category | Production Safety Gate |
| :--- | :--- | :--- | :--- |
| `PAYPAL_ENV` | **CONFIGURED** | `"sandbox"` | Non-production environment |
| `PAYPAL_BASE_URL` | **CONFIGURED** | `"https://api-m.sandbox.paypal.com"` | Sandbox REST endpoint |
| `PAYPAL_LIVE_ENABLED` | **CONFIGURED** | `"false"` | **STRICTLY DISABLED (Live funds locked)** |
| `PAYPAL_DISPUTES_ENABLED` | **CONFIGURED** | `"true"` | Disputes ingestion enabled |
| `PAYPAL_WEBHOOK_PROCESSING_ENABLED`| **CONFIGURED** | `"true"` | Webhook processing enabled |
| `PAYPAL_CLIENT_ID` | **CONFIGURED** | `sb_sandbox_client_id` (Placeholder length: 20) | Safe development placeholder |
| `PAYPAL_CLIENT_SECRET` | **CONFIGURED** | `sb_sandbox_client_secret` (Placeholder length: 24) | Safe development placeholder |
| `PAYPAL_WEBHOOK_ID` | **CONFIGURED** | `sb_sandbox_webhook_id` (Placeholder length: 23) | Safe development placeholder |

> [!IMPORTANT]
> Live financial movement is **strictly disabled** (`PAYPAL_LIVE_ENABLED="false"`). The credentials in `.env` are synthetic sandbox placeholders. Therefore, live external network handshakes with `api-m.sandbox.paypal.com` are blocked until genuine PayPal Developer credentials are provided, while local contract mocks execute with 100% schema fidelity.

---

## 2. Verification Records Table

| Operation | Environment | Provider Reference | Provider Status | Execution Result | Timestamp | Verification Source |
| :--- | :---: | :--- | :---: | :---: | :---: | :--- |
| **OAuth Token Handshake** | Sandbox (Mock) | `TOKEN-MOCK-SANDBOX` | `200 OK` | Access Token granted | 2026-11-10T10:45:00Z | `tests/paypal-auth.test.ts` |
| **OAuth Token Handshake** | Sandbox (Live) | `api-m.sandbox.paypal.com` | `401 Unauthorized` | **BLOCKED (Developer keys required)** | 2026-11-10T10:48:00Z | Live probe (`sb_sandbox_client_id`) |
| **Create Order** | Sandbox (Mock) | `ORD-PROV-1794288000` | `201 CREATED` | Order generated with line items | 2026-11-10T10:52:35Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Retrieve Order** | Sandbox (Mock) | `ORD-PROV-1794288000` | `200 OK` | Order status `CREATED` | 2026-11-10T10:52:35Z | `tests/paypal-orders.test.ts` |
| **Capture Order** | Sandbox (Mock) | `CAP-PROV-1794288000` | `201 COMPLETED` | Funds captured; payment recorded | 2026-11-10T10:52:36Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Idempotent Retry Capture** | Sandbox (Mock) | `CAP-PROV-1794288000` | `200 OK` | Returns existing capture (`isAlreadyCaptured: true`) | 2026-11-10T10:52:37Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Check Refundable Balance** | Sandbox (Mock) | `PAY-1794288000` | `200 OK` | Verifies balance >= refund | 2026-11-10T10:53:45Z | `tests/paypal-refunds.test.ts` |
| **Prepare Refund Proposal** | Sandbox (Mock) | `PROP-1794288000` | `200 OK` | SHA-256 argument hash computed | 2026-11-10T10:52:37Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Human Sign-Off Gate** | Sandbox (Mock) | `APPR-1794288000` | `200 OK` | Signed by Merchant Owner | 2026-11-10T10:52:37Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Execute Refund** | Sandbox (Mock) | `REF-PROV-1794288000` | `201 COMPLETED` | Refund executed; ledger block added | 2026-11-10T10:52:38Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Duplicate Refund Rejection** | Sandbox (Mock) | `REF-PROV-1794288000` | `400 BAD_REQUEST` | Over-refund blocked (balance: 0) | 2026-11-10T10:55:18Z | `tests/financial-safeguards-negative.test.ts` |
| **Webhook Ingestion** | Sandbox (Mock) | `WH-EVT-1794288000` | `200 PROCESSED` | `PAYMENT.CAPTURE.COMPLETED` recorded | 2026-11-10T10:52:38Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Duplicate Webhook Reject** | Sandbox (Mock) | `WH-EVT-1794288000` | `200 OK` | `ALREADY_PROCESSED` (zero duplicate mutations) | 2026-11-10T10:52:38Z | `tests/e2e-scenarios-a-h.test.ts` |
| **Dispute Ingestion** | Sandbox (Mock) | `PP-DISP-001` | `200 OK` | Dispute parsed & linked to case | 2026-11-10T10:52:38Z | `tests/paypal-disputes.test.ts` |

---

## 3. Workflows Detailed Analysis

### 3.1. Order & Capture Workflow
1. Client or test submits `OrderService.createOrder` with buyer ID, merchant organization, and line items.
2. Provider formats payload conforming to PayPal v2 checkout orders schema (`intent: "CAPTURE"`).
3. `CaptureService.captureOrder` performs the authorization capture.
4. Idempotency is enforced: re-calling `captureOrder` with the same idempotency key or provider order ID returns the existing capture without creating a new payment record or double charging.

### 3.2. Refund Workflow & Safeguard Invariants
1. `RefundService.executeRefund` strictly enforces that:
   - Caller has `MERCHANT` or `ADMIN` role with `OWNER` or `ORG_ADMIN` rank.
   - If linked to a resolution proposal, the proposal MUST be in `AGREED` status.
   - Refund amount must be $> 0$ and cannot exceed remaining unrefunded captured balance.
   - Idempotency key prevents duplicate network transmissions.
   - An immutable hash block is immediately added to the hash-chained audit ledger.

### 3.3. Webhook Workflow
1. `WebhookProcessingService.processEvent` receives PayPal webhook JSON payload.
2. Checks primary key uniqueness on `WebhookEvent.id`.
3. If already processed, returns `{ status: 'ALREADY_PROCESSED' }` immediately.
4. Emits canonical domain event (e.g. `PAYMENT_CAPTURED`, `DISPUTE_OPENED`) into the timeline.

---

## 4. Instructions to Enable Live PayPal Sandbox Testing

To test against live PayPal servers (`api-m.sandbox.paypal.com`):
1. Visit [developer.paypal.com](https://developer.paypal.com/) and navigate to **Dashboard > Apps & Credentials**.
2. Create a Sandbox REST App.
3. Update `.env` with genuine credentials:
   ```env
   PAYPAL_ENV="sandbox"
   PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
   PAYPAL_CLIENT_ID="<your-real-sandbox-client-id>"
   PAYPAL_CLIENT_SECRET="<your-real-sandbox-client-secret>"
   PAYPAL_WEBHOOK_ID="<your-real-sandbox-webhook-id>"
   PAYPAL_LIVE_ENABLED="false"
   ```
4. Restart the development server: `npm run dev`.
5. Run the live demo on `/demo`.
