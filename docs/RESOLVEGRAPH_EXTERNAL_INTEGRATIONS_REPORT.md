# RESOLVEGRAPH — External Integrations & Carrier Framework Report

**Project:** RESOLVEGRAPH  
**Team:** TeamNexa  
**Date:** 2026-11-17  
**Branch:** `completion/master-project-completion`  
**Commit:** `f2021e3`  
**Lead:** Senior Integrations & Financial Systems Architect  

---

## 1. Executive Summary

RESOLVEGRAPH connects disparate enterprise ecosystems: financial payment gateways, logistics carriers, marketplace platforms, and IoT physical packaging devices.

This report documents the architecture, implementation, and operational status of all external integrations in RESOLVEGRAPH, including:
1. **Financial Gateways:** PayPal Sandbox & NPCI-compliant UPI Mock.
2. **Logistics & Carriers:** BlueDart, Delhivery, FedEx, and UPS tracking adapters with unified webhook ingestion.
3. **Physical Authentication:** NTAG424 DNA NFC cryptographic verification engine.
4. **Mobile Capture:** Android Evidence Capture native module with tamper telemetry.

---

## 2. Payment & Financial Integrations

### 2.1 PayPal Sandbox Integration
- **SDK & Protocols:** `@paypal/checkout-server-sdk` with PayPal REST API v2 (`https://api-m.sandbox.paypal.com`).
- **Implemented Capabilities:**
  - Order Creation: `/api/payments/paypal/orders` (`createOrder` with transaction metadata and dispute tracking tags).
  - Order Capture: `/api/payments/paypal/orders/[orderId]/capture`.
  - Dispute Synchronization: `/api/paypal/disputes` and `/api/paypal/disputes/[disputeId]`.
  - Evidence Packaging & Upload: Automatic compilation of BEG evidence packets for PayPal dispute submission.
  - Webhook Ingestion: `/api/webhooks/paypal` with webhook signature header verification (`PAYPAL-AUTH-ALGO`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-CERT-URL`).
- **Operational Status:** Fully integrated and verified against PayPal Sandbox environment. Production live transactions require formal merchant entity approval and commercial API keys.

### 2.2 UPI Payment Simulation (NPCI-Compliant)
- **Implemented Capabilities:**
  - Virtual Payment Address (VPA) validation (`username@bank`).
  - UPI Intent URI generation (`upi://pay?pa=...&pn=...&am=...&cu=INR`).
  - Complaint & Refund Lifecycle: `/api/payments/complaints/upi`.
- **Operational Status:** Fully verified in sandbox/mock mode with realistic transaction lifecycles and zero financial risk.

---

## 3. Carrier & Logistics Integration Framework

RESOLVEGRAPH features a modular carrier tracking architecture located under `src/server/integrations/carrier/`:

```
src/server/integrations/carrier/
├── carrier.types.ts           # Unified data models, events & status mapping
├── carrier-registry.ts        # Dynamic carrier detection & DB ingestion
├── bluedart.adapter.ts        # BlueDart waybill validator & scan parser
├── delhivery.adapter.ts       # Delhivery AWB validator & scan parser
├── fedex.adapter.ts           # FedEx tracking validator & scan parser
└── ups.adapter.ts             # UPS 1Z validator & scan parser
```

### 3.1 Carrier Adapters Matrix

| Carrier | Pattern / Format | Parser File | Supported Statuses |
| :--- | :--- | :--- | :--- |
| **BlueDart** | `^(\d{8,11})$` (8 to 11 digits) | `bluedart.adapter.ts` | Dispatched, In Transit, Out for Delivery, Delivered, Undelivered / Exception |
| **Delhivery** | `^(\d{12,14})$` (12 to 14 digits) | `delhivery.adapter.ts` | Manifested, In Transit, Pending Delivery, Delivered, RTO (Return to Origin) |
| **FedEx** | `^(\d{12}\|\d{15})$` (12 or 15 digits) | `fedex.adapter.ts` | Picked Up, In Transit, On FedEx Vehicle, Delivered, Exception / Delay |
| **UPS** | `^1Z[0-9A-Z]{16}$` (1Z followed by 16 alphanumeric characters) | `ups.adapter.ts` | Origin Scan, Departure Scan, Out for Delivery, Delivered, Exception |

### 3.2 Unified Ingestion Pipeline & Webhook Route
Located at: `src/app/api/carrier/webhook/[carrier]/route.ts`

1. **Auto-Detection:** Inbound tracking numbers are matched against registered carrier regex patterns to identify the originating carrier automatically.
2. **Payload Parsing:** Raw webhook or API scan payloads are normalized into `NormalizedCarrierEvent` structures:
   ```typescript
   export interface NormalizedCarrierEvent {
     carrier: CarrierType;
     trackingNumber: string;
     status: CarrierTrackingStatus;
     description: string;
     location?: string;
     timestamp: Date;
     signedBy?: string;
     weightGrams?: number;
     rawEvent?: Record<string, unknown>;
   }
   ```
3. **Database Ingestion & Deduplication:** Events are persisted into the `DeliveryEvent` table with idempotent composite keys `(carrier, trackingNumber, timestamp, status)` to prevent duplicate events from repeated webhook deliveries.
4. **Evidence Graph Linkage:** If the tracking number is associated with an active `Case`, the delivery event automatically updates the case timeline and recalculates the delivery timeline verification edge in the Bilateral Evidence Graph.

---

## 4. Physical Security & IoT: NFC NTAG424 DNA

### 4.1 Verification Architecture
Located at: `src/server/services/nfc-verification.service.ts`

- **Protocol:** NXP NTAG424 DNA Secure Unique NFC (SUN) with AES-128 cryptographic MAC.
- **Verification Flow:**
  1. The physical tag dynamically generates a URL containing the tag UID, dynamic read counter (`SDM Read Counter`), and a cryptographic CMAC signature calculated using the master AES-128 key.
  2. The endpoint `/api/packages/verify/[token]` evaluates the counter progression to eliminate replay attacks.
  3. The CMAC is recomputed using the server-side secret key; if valid, the package seal state transitions to `VERIFIED_UNBROKEN`.
- **Operational Status:** Fully implemented cryptographic verification engine with complete unit test coverage. Physical tag scanning verified with emulation payloads; production hardware requires factory-provisioned NTAG424 tags.

---

## 5. Mobile Evidence Capture: Android Client

### 5.1 Native Android Module Architecture
Located in: `android/`

- **Platform:** Native Kotlin / Android SDK 34.
- **Core Components:**
  - `CameraXCaptureEngine`: Manages real-time autofocus, resolution stabilization, and uncompressed frame capture.
  - `SensorTamperDetector`: Monitors accelerometer, gyroscope, and ambient light sensors during unboxing to detect package flipping, camera obscuration, or video splicing.
  - `EvidencePackager`: Computes SHA-256 hashes of captured assets on-device, attaches GPS coordinates and hardware device fingerprint, signs the bundle with an Android Keystore private key, and streams it to `/api/unboxing/sessions/[token]/upload`.
- **Operational Status:** Module is architected and compilable. Emulator verification completed; physical device fleet rollout requires Google Play or enterprise MDM sideloading.

---

## 6. Integrations Status Summary

| Integration | Subsystem | Verification Level | Production Readiness |
| :--- | :--- | :--- | :--- |
| **PayPal Sandbox** | Financial | Full API & Webhook verified | **Ready for Demo** (Live keys needed for prod) |
| **UPI Mock Gateway** | Financial | NPCI-compliant workflow verified | **Ready for Demo** |
| **BlueDart Logistics** | Carriers | Validator & Parser verified | **Ready for Demo / Webhook Live** |
| **Delhivery Logistics**| Carriers | Validator & Parser verified | **Ready for Demo / Webhook Live** |
| **FedEx Logistics**   | Carriers | Validator & Parser verified | **Ready for Demo / Webhook Live** |
| **UPS Logistics**     | Carriers | Validator & Parser verified | **Ready for Demo / Webhook Live** |
| **NFC NTAG424 DNA**   | IoT / Packaging | Cryptographic CMAC engine verified | **Ready for Demo / Hardware needed for live** |
| **Android Client**    | Mobile Capture | Native Kotlin module & API verified | **Ready for Demo / Fleet needed for live** |
