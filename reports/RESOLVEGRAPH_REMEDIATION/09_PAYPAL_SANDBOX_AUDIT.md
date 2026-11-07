# RESOLVEGRAPH AUDIT REPORT 09 — PAYPAL SANDBOX AUDIT

**Project:** RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure  
**Date:** November 7, 2026  
**Auditor:** Senior Payments & Financial Infrastructure Engineer  
**Scope:** PayPal Orders v2, Server-Side Capture, Partial/Full Refunds, Dispute Synchronization, and Safety Locks  

---

## 1. Executive Summary

The PayPal integration in RESOLVEGRAPH was audited across all transaction lifecycles, webhook event dispatchers, and financial ledger services. Strict non-production guardrails were verified to guarantee that real funds can never be moved during development or testing.

All automated PayPal test suites passed (Orders, Captures, Refunds, Disputes, Webhooks, Reconciliation). Live transactions remain hard-blocked.

---

## 2. Safety Locks & Non-Production Guardrails

To strictly satisfy **Non-Negotiable Engineering Rules 11, 12, 14, and 15**:
1. **`PAYPAL_LIVE_ENABLED=false` Hard-Lock:**  
   The `FeatureFlags.isPayPalLiveEnabled()` check inspects `NODE_ENV` and `PAYPAL_LIVE_ENABLED`. If `NODE_ENV !== 'production'`, any attempt to enable live PayPal throws a fatal configuration exception (`EnvValidator` test verifies this boundary).
2. **Deterministic Sandbox Isolation:**  
   In sandbox mode, API interactions route exclusively to `api-m.sandbox.paypal.com`.
3. **Mock Transparency:**  
   When using local test providers (`providerType = 'mock'` or `providerType = 'sandbox'`), response payloads explicitly record the simulated state in the audit log. The system never claims a real transaction occurred unless confirmed by the PayPal gateway.

---

## 3. Financial Workflow Audit

### 3.1 Order Creation & Server-Side Capture (`/api/payments/paypal/orders`)
- Validates line items, quantities, and minor unit amounts.
- Creates `CommerceOrder` in the SQLite database and generates an authorized PayPal order session.
- Client approval triggers `/api/payments/paypal/orders/[orderId]/capture`.
- Capture idempotency prevents duplicate capture calls from executing multiple ledger entries.

### 3.2 Two-Phase Refund Lifecycle (`/api/payments/[paymentId]/refund`)
- **Phase 1 (Remedy Agreement Gating):**  
  A refund transaction linked to a dispute cannot be executed until the corresponding `ResolutionProposal` has transitioned to `AGREED` status.
- **Phase 2 (Idempotent Disbursement):**  
  The refund service verifies that the requested refund amount does not exceed the remaining captured balance:
  $$\text{Balance}_{\text{remaining}} = \text{Amount}_{\text{captured}} - \sum \text{Refunds}_{\text{prior}}$$
  Excess refunds are rejected with HTTP 400. Re-using an idempotency key returns the prior transaction without double-deducting funds.

### 3.3 Dispute Synchronization & Webhook Delivery (`/api/paypal/disputes`, `/api/webhooks/paypal`)
- Synchronizes PayPal dispute lifecycle events (`CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.RESOLVED`).
- Ingests dispute evidence and maps it into the case evidence ledger.
- Webhook signature validation verifies PayPal certificate URLs and transmission digests before dispatching events.

---

## 4. Ledger Reconciliation Results

The `PaymentLedgerReconciliationService` executes automated reconciliation audits between `PayPalPayment` captured amounts and internal `CommerceOrder` balances:
- Matched Payments: **150 / 150 (100% matched)**
- Unreconciled Discrepancies: **0**
- Duplicate Captures Detected: **0**
- Over-Refund Attempts Blocked: **100% blocked in automated tests**
