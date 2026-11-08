# REPORT 17 — EXTERNAL PROVIDER INTEGRATION STATUS

| Provider | Type | Environment | Status | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **PayPal** | Real REST API | Sandbox | **ACTIVE** | Orders, captures, refunds, webhooks tested. Live disabled. |
| **PhonePe** | FinTech Adapter | Sandbox / Synthetic | **ACTIVE** | UTR extraction, statement parsing, TAT tracking. |
| **Google Pay** | FinTech Adapter | Sandbox / Synthetic | **ACTIVE** | Receipt parsing, UPI transaction ID matching. |
| **Paytm** | FinTech Adapter | Sandbox / Synthetic | **ACTIVE** | Wallet & UPI reconciliation, reversal tracking. |
| **BHIM / NPCI** | FinTech Adapter | Sandbox / Synthetic | **ACTIVE** | 12-digit UTR validation, RBI TAT compensation logic. |
| **Core Banking** | FinTech Adapter | Sandbox / Synthetic | **ACTIVE** | PDF/CSV bank statement ingestion and debit verification. |
