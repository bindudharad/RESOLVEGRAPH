# REPORT 10: EXTERNAL INTEGRATION STATUS & DEPENDENCY REGISTER

**Project:** RESOLVEGRAPH V2.0  
**Architecture:** Adapter Pattern with Deterministic Offline Fallbacks & Sandbox Verification  
**Audit Standard:** Honest Operational Accounting (No synthetic claims of live bank clearance)  

---

## 1. External Integration Register

| External Provider | Target Workflow | Integration Pattern | Sandbox / Test Status | Production Dependency Requirement |
|:---|:---|:---|:---|:---|
| **PayPal Commerce** | Order capture, dispute ingestion, refund orchestration | Official REST v2 API via `@paypal/checkout-server-sdk` | **VERIFIED (Sandbox)** | Live Client ID + Secret, Live Webhook URL, Live KYC |
| **Amazon SP-API** | Purchase memory detection, order sync | Normalized schema parser (`SP-API` payload adapter) | **IMPLEMENTATION READY** | Registered Amazon Developer Account, AWS IAM ARN, SP-API App Approval |
| **Flipkart API** | Purchase detection, shipping tracking | Ingestion adapter & CSV/JSON webhook parser | **IMPLEMENTATION READY** | Flipkart Seller Partner Credentials |
| **NPCI / UPI Gateways** | Indian payment dispute resolution (PhonePe, GPay, Paytm) | Statutory RBI/NPCI workflow adapter with T+1 TAT rules | **VERIFIED (Simulated + Standard)** | Direct Bank / Payment Aggregator Production API Agreement |
| **Blue Dart / Delhivery** | Package tracking, delivery checkpoints | Carrier transit webhook parser | **VERIFIED (Mock Carrier Engine)** | Live Carrier Tracking API Key & Webhook Secret |
| **AWS S3 / Cloud Storage** | Persistent encrypted evidence vault | S3-compatible adapter interface | **LOCAL VERIFIED (S3-Ready)** | AWS S3 Bucket, Access Key ID, Secret Access Key |

---

## 2. Sandbox Verification Details
- **PayPal Sandbox:** Confirmed order creation, capture, and mock refund workflows executing in `tests/paypal-orders.test.ts` and `tests/paypal-refunds.test.ts`.
- **Live Fund Protection:** The environment variable `PAYPAL_LIVE_ENABLED` defaults strictly to `false`. At no point does the application transmit production funds or claim live clearing.
