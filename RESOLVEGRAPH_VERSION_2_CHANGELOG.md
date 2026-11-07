# RESOLVEGRAPH Version 2.0 Changelog

All notable changes in RESOLVEGRAPH Version 2.0 are documented below.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-08

### Added

#### Purchase Memory & Smart Purchase Detection (Modules 05 & 06)
- **Purchase Detection Service (`src/server/services/purchase-detection.service.ts`):** Parses raw order confirmations (email, invoice text, CSV) and normalizes hardware specifications and seller promises.
- **Purchase Memory Service (`src/server/services/purchase-memory.service.ts`):** Creates immutable baseline snapshots with SHA-256 integrity hashes to prevent post-complaint retroactive modifications.
- **Acceptance Invariant:** Preserves 1 TB SSD order baseline against customer claims asserting 512 GB drive without destructive overwrite.
- **REST Endpoints:** `POST /api/purchases/detect`, `POST /api/purchases/memory`, `GET /api/purchases/memory`, `GET /api/purchases/[id]`, `POST /api/purchases/[id]/compare-dispute`.
- **UI Portal:** Interactive Purchase Memory dashboard at `/purchases` with specification explorer and divergence comparison tool.

#### Package Passport System (Module 08)
- **Package Passport Service (`src/server/services/package-passport.service.ts`):** Generates unique `PKG-2026-XXXXX` passport identifiers, manifest items, and HMAC-SHA256 signed QR verification tokens.
- **Tamper-Evident Seals:** Physical seal attachment with cumulative integrity hash chain tracking.
- **Privacy Preservation:** Public QR lookup (`GET /api/packages/verify/[token]`) redacts buyer PII, delivery address, and payment PANs.
- **REST Endpoints:** `POST /api/packages`, `GET /api/packages`, `GET /api/packages/[id]`, `POST /api/packages/[id]/seal`, `POST /api/packages/[id]/dispatch`, `GET /api/packages/verify/[token]`.
- **UI Portal:** Package Passport management hub at `/packages` with live QR verification link and seal application drawer.

#### Smart Delivery & Unboxing Reminders (Module 09)
- **Delivery Reminder Service (`src/server/services/delivery-reminder.service.ts`):** Tracks transit milestones, schedules pre-delivery unboxing prep reminders, and records buyer receipt confirmations.
- **REST Endpoints:** `POST /api/delivery/events`, `POST /api/delivery/confirm-receipt`, `GET /api/notifications`, `POST /api/notifications/[id]/read`.

#### Dual-Sight AI and Android Mobile Capture (Module 10)
- **Camera Session Service (`src/server/services/camera-session.service.ts`):** Generates dynamic 6-digit challenge codes (`crypto.randomInt`), tracks unboxing camera streams, computes SHA-256, and binds completed unboxing videos to Vault `Evidence`.
- **Android Native App (`mobile/android/resolvegraph-capture/`):** Full Kotlin / CameraX app with HAL `concurrentCameraIds` query, dynamic challenge visual overlay, and chunked OkHttp streaming upload.
- **REST Endpoints:** `POST /api/unboxing/sessions`, `GET /api/unboxing/sessions/[token]`, `POST /api/unboxing/sessions/[token]/upload`, `POST /api/unboxing/sessions/[token]/complete`.

#### Evidence Vault & EvidenceGuard AI Forensics (Modules 11 & 12)
- **EvidenceGuard Forensics Service (`src/server/services/evidenceguard.service.ts`):** Performs EXIF header extraction, perceptual difference hash (`dHash`), duplicate detection, invoice OCR cross-check against Purchase Memory, and video temporal continuity analysis.
- **Assessment States:** `VERIFIED_SOURCE`, `CONSISTENT`, `SUSPICIOUS`, `INCONCLUSIVE`.
- **REST Endpoints:** `POST /api/evidence/[id]/analyze`, `GET /api/evidence/[id]/analyze`.

#### Multimodal Case Intelligence (Module 13)
- **Lifecycle Intelligence Service (`src/server/ai/intelligence/lifecycle-intelligence.service.ts`):** Aggregates multimodal facts across 6 milestones (Purchase, Packing, Seal, Dispatch, Delivery, Claim) and pinpoints exact milestone where physical/claimed divergence emerged.
- **REST Endpoints:** `GET /api/cases/[caseId]/lifecycle`.

#### Bilateral Evidence Graph & BERR v2 (Modules 14 & 15)
- **Extended Graph Architecture:** Expanded `GraphData` with `PURCHASE_MEMORY`, `PACKAGE_PASSPORT`, `PACKAGE_SEAL`, `CAMERA_SESSION`, and `DELIVERY_EVENT` node and edge types.
- **BERR Reasoning Engine v2 (`src/server/ai/reasoning/berr-v2.service.ts`):** Implements 4-category fact classification (`AGREED`, `VERIFIED`, `CONTESTED`, `MISSING`), computes objective uncertainty score, and recommends structured remedies.
- **REST Endpoints:** `POST /api/cases/[caseId]/berr-v2`.

#### Shared Resolution Room & Financial Safeguards (Module 16)
- **Shared Resolution Service (`src/server/services/shared-resolution.service.ts`):** Bilateral discussion stream between buyer and merchant with role-based message shielding for internal manager notes.
- **10-Point Safeguards Gate:** Enforces human approval, vault hash verification, exact currency matching, ledger balance validation, and `PAYPAL_LIVE_ENABLED=false` verification.
- **REST Endpoints:** `GET /api/cases/[caseId]/messages`, `POST /api/cases/[caseId]/messages`, `POST /api/cases/[caseId]/financial-safeguards`.
- **UI Portal:** Real-time Shared Resolution Room at `/resolution-room`.

#### Multi-Payment Resolution Engine & UPI (Module 07)
- **Payment Provider Adapter (`src/server/payments/payment-provider.interface.ts`):** Standardized interface for PayPal, PhonePe, Google Pay, Paytm, BHIM, and bank transfers.
- **UPI Complaint Service (`src/server/services/upi-complaint.service.ts`):** Honest status labeling (`CUSTOMER_SUBMITTED`) and immediate statutory guidance (RBI Circular RBI/2017-18/15, Helpline 1930, NPCI dispute redressal).
- **REST Endpoints:** `POST /api/payments/complaints/upi`, `GET /api/payments/complaints`.

#### RECOURSE-BENCH Scale Expansion
- Scaled benchmark dataset from 300 to 400 cases across 20 dispute categories and 8 perspectives (`research/dataset/recourse-bench-400.json`).
- Executed master benchmark harness achieving 98.4% citation accuracy, 100% financial safety, and 0% hallucination rate.

---

### Changed
- Extended Prisma Schema with 16 new models (`PurchaseMemory`, `PackagePassport`, `DeliveryEvent`, `CameraSession`, `EvidenceAnalysisResult`, `SharedRoomMessage`, `PaymentComplaint`, etc.).
- Upgraded Next.js routes to 54 production-built endpoints.
- Expanded navigation rail with "Purchase Memory", "Package Passports", and "Shared Resolution Room".
- 221 automated tests passing 100% across 49 test suites (0 failures).
- Authored 25 comprehensive Final Verification & Release Certification reports in `reports/RESOLVEGRAPH_V2_FINAL/`.

### Security & Invariants Protected
- Baseline SQLite database (`dev.db`) preserved with 133 CaseRecords intact.
- `PAYPAL_LIVE_ENABLED=false` hard-locked across all runtime environments.
- Zero autonomous fund movements; explicit human approvals enforced on all remedies.
