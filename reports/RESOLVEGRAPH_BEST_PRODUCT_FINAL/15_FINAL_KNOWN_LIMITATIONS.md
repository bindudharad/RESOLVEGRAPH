# REPORT 15: FINAL KNOWN LIMITATIONS & NON-BLOCKING ITEMS

**Project:** RESOLVEGRAPH V2.0  
**Transparency Standard:** Strict Engineering Integrity (No fabricated third-party capabilities)  

---

## 1. External Third-Party Production Limitations

The following items are external commercial dependencies that require third-party commercial contracts, corporate KYC, or developer credentials:

1. **Live PayPal Production Credentials:**
   - **Current State:** Fully implemented with Sandbox REST v2 API. `PAYPAL_LIVE_ENABLED=false` protects user safety.
   - **Production Requirement:** Requires live merchant account approval and live PayPal Client ID & Secret.
2. **Amazon SP-API Production Authorization:**
   - **Current State:** Comprehensive data parser and webhook ingestion pipeline implemented.
   - **Production Requirement:** Requires an approved Amazon Selling Partner Developer application and AWS IAM ARN delegation.
3. **Live Bank UPI / NPCI Gateway Clearing:**
   - **Current State:** UPI complaint engine implements RBI/NPCI statutory T+1 turnaround times and penalty tracking.
   - **Production Requirement:** Requires direct banking aggregator contract (e.g., Razorpay, Cashfree, or direct bank host-to-host integration).
4. **Physical Carrier Live Push Webhooks:**
   - **Current State:** Delhivery and Blue Dart tracking event parsers verified in mock engine.
   - **Production Requirement:** Commercial carrier enterprise API credentials.

---

## 2. Internal Non-Blocking Items
- **Local SQLite File Locking in Multi-Process Workers:** SQLite is utilized for local development and demonstration. For multi-node distributed production deployment, migrating to PostgreSQL (via `prisma/postgres-migration.sql`) is recommended.
- **Client-Side Video Transcoding:** Android Dual-Sight unboxing records MP4 natively; in budget mobile browsers, video chunk uploads rely on MediaRecorder API which depends on device codec availability.
