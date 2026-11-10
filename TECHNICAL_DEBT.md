# RESOLVEGRAPH 2.0: Technical Debt & Architectural Boundaries
**System:** RESOLVEGRAPH 2.0  
**Classification:** Engineering Audit & Technical Debt Register  
**Last Updated:** November 10, 2026

---

## 1. Overview & Transparency Mandate

In high-consequence financial systems, pretending that sandbox stubs are live banking networks or that mobile camera hardware constraints do not exist introduces operational and compliance risks. This document registers all known technical compromises, intentional sandboxes, and architectural boundaries in RESOLVEGRAPH 2.0.

---

## 2. Technical Debt Itemization

### TD-01: PayPal Sandbox vs Live Payments
- **Category:** Safety Invariant & External Gateways
- **Description:** By default, `PAYPAL_LIVE_ENABLED=false` is enforced in `src/server/paypal/paypal-config.ts`. All order sessions, payment captures, and refunds default to the PayPal Sandbox environment.
- **Rationale:** Prevents unintended monetary loss during hackathon judging and development demonstrations.
- **Production Resolution:** Production deployment requires setting `PAYPAL_ENVIRONMENT="live"`, `PAYPAL_LIVE_ENABLED="true"`, and injecting verified enterprise PayPal Client ID / Secret with dual-key administrator sign-off.

### TD-02: Android CameraX Multi-Camera OEM HAL Divergence
- **Category:** Mobile Hardware Support
- **Description:** Concurrent dual-stream video capture (front camera for buyer verification + rear camera for parcel unboxing) relies on Android CameraX `ConcurrentCamera` APIs, which require OEM chipset support (typically Google Pixel 7+, Samsung Galaxy S22+).
- **Graceful Fallback:** `CameraCapabilityDetector.kt` automatically inspects `cameraManager.concurrentCameraIds` and switches to **Sequential Dual-Sight Mode** or guided single-sensor capture with EXIF timestamps and dHash verification on single-sensor devices.
- **Resolution:** No breaking changes required; hardware capabilities are dynamically queried at runtime.

### TD-03: Indian Banking & NPCI UPI Switch Integration
- **Category:** Regulatory Compliance & Licensing
- **Description:** Direct API connectivity to the NPCI UPI Central Switch (`UDIR` / `ReqPendingTxn` / `CheckTxnStatus`) requires statutory licensing as an authorized Payment Aggregator (PA) or Scheduled Commercial Bank under the Payment and Settlement Systems Act, 2007.
- **Current Architecture:** High-fidelity switch emulation adheres strictly to NPCI ISO 8583 response specifications, standard error reason codes (`U01`, `U19`, `U30`, `U69`, `91`), and statutory turnaround times governed by RBI Circular `DPSS.CO.PD No.629/02.01.014/2019-20`.
- **Resolution:** When an enterprise tenant possesses an active PA/PG license, swap the simulation driver for the certified NPCI direct gateway connector.

### TD-04: Outbound SMS & Email Delivery
- **Category:** External Provider Dependency
- **Description:** In the default offline/sandbox environment, transactional emails and unboxing SMS alerts are emitted to structured console logs and persisted in the relational `Notification` table.
- **Production Resolution:** Production deployment requires configuring SendGrid / AWS SES API keys for email and Twilio / Gupshup for SMS/WhatsApp delivery.

### TD-05: Database Engine Portability (SQLite WAL to PostgreSQL)
- **Category:** Persistence Layer
- **Description:** For hackathon evaluation and zero-dependency local verification, RESOLVEGRAPH utilizes SQLite in WAL mode (`file:./dev.db`).
- **Production Resolution:** The Prisma schema (`prisma/schema.prisma`) is fully compatible with PostgreSQL 16+. Migrating requires updating `provider = "postgresql"` in `schema.prisma` and running `prisma migrate deploy`.
