# RESOLVEGRAPH 2.0: System Boundaries, External Dependencies & Known Limitations
**Document ID:** RG-LIM-2026-V2  
**Classification:** Technical Disclosure & Transparency Specification  
**Status:** Certified Architecture Boundary Standard  
**Last Updated:** November 10, 2026

---

## 1. Architectural Philosophy of Transparency

RESOLVEGRAPH maintains an uncompromising standard of technical honesty. In production financial systems, passing off synthetic data as live records or pretending external banking switches are directly connected without statutory licensing is a severe compliance violation.

This document explicitly defines the boundaries where RESOLVEGRAPH connects to real external systems versus where it relies on sandboxes, hardware fallbacks, or regulatory simulation fixtures.

---

## 2. External Integration Boundaries

### 2.1 PayPal Gateway Integration
- **Live Payments Disabled by Design:** The flag `PAYPAL_LIVE_ENABLED` is intentionally defaulted to `false` in all environments (`src/server/paypal/paypal-config.ts`).
- **Sandbox Operational Mode:** All PayPal Orders v2, Captures, Refunds, Dispute webhooks, and dispute resolution flows are fully implemented and verified against the **PayPal Developer Sandbox**.
- **Production Readiness:** To enable live PayPal operations, an enterprise tenant must:
  1. Configure verified PayPal Live REST API client credentials.
  2. Set `PAYPAL_ENVIRONMENT="live"`.
  3. Explicitly set `PAYPAL_LIVE_ENABLED="true"` with dual-key administrative sign-off.
- **Fail-Safe Circuit Breaker:** Any attempt to process a live transaction while `PAYPAL_LIVE_ENABLED !== "true"` immediately throws a fatal exception preventing monetary loss.

### 2.2 Indian Banking & NPCI UPI Switch Integration
- **Regulatory Simulation Fixtures:** Direct live connectivity to the NPCI UPI Central Switch (`UDIR` / `ReqPendingTxn` / `CheckTxnStatus`) requires registration as an authorized Payment Aggregator (PA), Payment Gateway (PG), or Scheduled Commercial Bank under the Payment and Settlement Systems Act, 2007.
- **High-Fidelity Switch Emulation:** RESOLVEGRAPH emulates the NPCI switch using official NPCI ISO 8583 response specifications, real-world error reason codes (`U01`, `U19`, `U30`, `U69`, `91`), and statutory turnaround times governed by RBI Circular `DPSS.CO.PD No.629/02.01.014/2019-20`.
- **Zero Synthetic Claims:** Ingested bank statements (SBI, HDFC, Axis, ICICI) and UPI payloads are parsed with real format parsers and cryptographically verified against SHA-256 evidence digests.

### 2.3 Mobile CameraX Dual-Sight Unboxing
- **Hardware Capability Dependency:** Simultaneous dual-camera video recording (recording both the buyer's face and the package simultaneously using Android CameraX `ConcurrentCamera` APIs) requires hardware multi-camera support exposed by the device OEM (typically available on Pixel 7+, Samsung Galaxy S22+, and select modern chipsets).
- **Graceful Deterministic Fallback:** On devices lacking concurrent camera support, RESOLVEGRAPH's `CameraCapabilityDetector` automatically detects the hardware limitation and switches to **Sequential Dual-Sight Mode** (capturing sequential package seal inspection followed by front-camera verification) or single-lens guided capture with timestamp and EXIF seal hashing.

### 2.4 Cloud AI & Multimodal Inference
- **Configurable Fallbacks:** Multimodal fact extraction and BERR v2 reasoning can operate in two modes:
  1. **Cloud Frontier Mode:** Utilizes OpenAI `gpt-4o-mini` / `gpt-4o` for high-throughput multimodal vision and reasoning when `OPENAI_API_KEY` is present.
  2. **Deterministic Offline Mode:** When API keys are not provided or network access is restricted, RESOLVEGRAPH seamlessly falls back to the internal deterministic **BERR Rule Engine** and local regex/EXIF/dHash extractors, ensuring 100% platform availability.

### 2.5 Outbound Email & SMS Notifications
- **Development & Staging Mode:** Outbound notifications (delivery alerts, unboxing reminders, dispute updates) are emitted to structured console logs and persisted in the internal database `Notification` table.
- **Production Mode:** Outbound delivery requires binding active SendGrid / AWS SES API keys for email and Twilio / Gupshup for SMS/WhatsApp alerts.

---

## 3. Summary Compliance Table

| Subsystem | Development / Demo Status | Production Requirement | Fallback Behavior |
|---|---|---|---|
| **PayPal Orders & Captures** | Verified on Sandbox | Live Client ID + Secret | Blocked if `PAYPAL_LIVE_ENABLED=false` |
| **PayPal Refunds** | Verified on Sandbox | Dual-Key Admin Approval | Blocked if unapproved / live disabled |
| **PayPal Disputes** | Verified on Sandbox | Live Webhook Endpoint URL | Stored in local DB / processed safely |
| **NPCI UPI Switch** | Statutory Emulation | PA / PG License Registration | RBI DPSS Circular T+1 TAT Formulas |
| **CameraX Dual-Sight** | Dual-Concurrent Video | OEM Multi-Camera HAL | Sequential Capture / Single Sensor |
| **Multimodal Extraction** | Cloud / Rule Engine | `OPENAI_API_KEY` Configured | Deterministic Rule Engine / OCR |
| **Audit Ledger** | SHA-256 Chained Blocks | Append-Only Disk Partition | SQLite WAL / Local Encrypted Blocks |
| **Evidence Storage** | Local Encrypted Vault | AWS S3 / Cloudflare R2 | Local File System with SHA-256 Check |
