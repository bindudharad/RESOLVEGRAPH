# RESOLVEGRAPH — Payment Security, Financial Invariants & Compliance

This document outlines the strict architectural invariants, security boundaries, and authorization rules governing commerce operations, payment captures, and refunds in ResolveGraph.

---

## 1. Absolute Financial Invariants

1. **Zero Client-Side Secrets**:
   - `PAYPAL_CLIENT_SECRET` and OAuth token management are strictly confined to server-side services (`src/server/paypal/`).
   - Browser bundles receive only read-only or public identifiers (`publicClientId`).
2. **Integer Minor Units Math**:
   - Monetary values in the database, ledger aggregations, and business logic are stored and computed in integer minor units (e.g. cents, paise) as `Int`.
   - Floating-point arithmetic is never used for balance evaluations or refund calculations.
3. **Sandbox-First Production Safeguard**:
   - `PAYPAL_LIVE_ENABLED=false` is enforced by default in code.
   - Any attempt to use live PayPal endpoints without explicit configuration throws a runtime exception and logs a security alert.
4. **AI Separation of Duty**:
   - Artificial intelligence agents (BERR, multimodal extraction) can suggest remedies and calculate contradiction scores, but **NEVER have the capability or permission to execute refunds autonomously**.

---

## 2. Refund Authorization Matrix

Refund execution (`POST /api/payments/[paymentId]/refund`) enforces a multi-tier permission check:

| User Role | Can Request Refund | Can Authorize Refund | Required Proposal Condition |
| :--- | :---: | :---: | :--- |
| **Buyer** | Yes (via case remedy request) | **NO (Forbidden 403)** | N/A |
| **Merchant Agent** | Yes | Yes | Must be member of merchant org |
| **Org Admin / Owner** | Yes | Yes | Must be member of merchant org |
| **Resolution Manager** | Yes | Yes | Authorized across cases |
| **Platform Administrator**| Yes | Yes | Global authorization |

### Resolution Proposal Agreement Check

When a refund is linked to a resolution proposal (`resolutionProposalId`):
$$\text{Proposal Status} \in \{\text{"AGREED"}, \text{"COMPLETED"}\}$$
If the proposal is in `DRAFT`, `PENDING_BUYER`, `PENDING_MERCHANT`, or `REJECTED`, the refund is strictly rejected.

---

## 3. Anti-Double-Refund Protection

To prevent merchant over-refunding or duplicate claims:

$$\text{remainingRefundable} = \text{capturedAmountMinor} - \sum_{r \in \text{CompletedRefunds}} r.\text{amountMinor}$$

- If $\text{requestedAmountMinor} > \text{remainingRefundable}$, the refund operation is rejected with an explanatory error.
- Every refund request requires a unique `PayPal-Request-Id` idempotency key.
- If network disconnection causes a retry with the exact same idempotency key, ResolveGraph returns the existing completed transaction without re-issuing an additional refund against PayPal.

---

## 4. Reconciliation Auditing

`ReconciliationService.reconcilePayment(paymentId)` independently audits the internal ledger against provider records:
- Detects amount discrepancies between internal ledger and PayPal gross amounts.
- Detects status mismatches (e.g., if a payment was reversed directly in the PayPal portal without webhook arrival).
- Generates discrepancy reports visible on the `/payments/[paymentId]` dashboard.
