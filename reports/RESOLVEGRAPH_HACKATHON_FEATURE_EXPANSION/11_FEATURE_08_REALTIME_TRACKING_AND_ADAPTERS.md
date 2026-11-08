# REPORT 11 — FEATURE 08: REAL-TIME TRANSACTION TRACKING & PROVIDER REGISTRY

## 1. Provider Capability Registry
Defines capabilities for each provider:
- **PayPal:** Sandbox live API lookup, capture, status readback, refund, webhooks.
- **PhonePe:** Customer statement ingestion, UTR matching, NPCI TAT compliance.
- **Google Pay:** Screenshot OCR, UTR extraction, settlement verification.
- **Paytm:** Wallet and bank debit reconciliation.
- **BHIM / NPCI:** UPI 12-digit RRN verification.

## 2. Webhook Idempotency & Replay Protection
Prevents duplicate event processing using cryptographic hash indexing and verified idempotency keys.
