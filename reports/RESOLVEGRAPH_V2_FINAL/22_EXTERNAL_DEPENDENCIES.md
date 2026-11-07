# 22. External Dependencies, Third-Party APIs & Gateway Status

**Auditor:** FinTech Integration Engineer & Cloud DevOps Lead  
**Date:** November 8, 2026

---

## 1. Third-Party Gateway Audit

| External Gateway | Environment | Production Credentials | Sandbox / Local Adapter Status | Fallback Strategy |
|:---|:---:|:---:|:---:|:---|
| **PayPal Commerce** | Sandbox Verified | `PAYPAL_LIVE_ENABLED=false` | **ACTIVE & VERIFIED** | Sandbox mock captures; zero real fund risk |
| **Amazon SP-API** | OAuth Webhook | Requires Merchant Token | **ADAPTER COMPLETE** | Mock webhook payload parser with HMAC verification |
| **Flipkart API** | Webhook | Requires Seller FSN | **ADAPTER COMPLETE** | Webhook payload parser with FSN mapping |
| **PhonePe UPI** | Merchant UPI | Requires NPCI Gateway Onboarding | **ADAPTER COMPLETE** | `CUSTOMER_SUBMITTED` status with statutory RBI TAT guidance |
| **Google Pay** | Merchant UPI | Requires Merchant VPA Clearing | **ADAPTER COMPLETE** | Standardized UPI interface with UTR tracking |
| **AWS S3 / R2** | Cloud Vault | Configured via env | **ACTIVE & VERIFIED** | Fallback to Content-Addressable Local Vault |
| **Blue Dart / FedEx** | Logistics API | Tracking Number Format | **SIMULATION COMPLETE**| Courier scan ingestion & checkpoint logging |
