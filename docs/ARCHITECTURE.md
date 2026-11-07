# RESOLVEGRAPH — System Architecture & Data Flow

This document details the software architecture, module breakdown, domain models, and end-to-end data pipelines powering **RESOLVEGRAPH**.

---

## 1. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Next.js 16 (App Router)                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐ │
│  │   Buyer Portal (UI)   │  │ Merchant Console (UI) │  │  Admin Dossier (UI)   │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └───────────┬───────────┘ │
└──────────────┼──────────────────────────┼──────────────────────────┼─────────────┘
               │                          │                          │
┌──────────────▼──────────────────────────▼──────────────────────────▼─────────────┐
│                    Unified Application Orchestration Layer                       │
│  - CaseLifecycleService          - PurchaseOrchestrationService                  │
│  - InvestigationOrchestrator     - ResolutionOrchestrator                        │
│  - PaymentOrchestrator           - EventOrchestrator                             │
└──────────────┬──────────────────────────┬──────────────────────────┬─────────────┘
               │                          │                          │
┌──────────────▼───────────┐ ┌────────────▼────────────┐ ┌───────────▼─────────────┐
│    Multimodal AI & BERR  │ │   Bilateral Graph &     │ │  PayPal REST Gateway    │
│  - Vision & Text Extract │ │   Temporal Intelligence │ │  - Orders V2 Checkout   │
│  - Fact Normalization    │ │  - Evidence Graph       │ │  - Captures & Refunds   │
│  - Discrepancy D Engine  │ │  - Semantic Drift       │ │  - Dispute Sync (V1)    │
│  - Missing Evidence Scan │ │  - Policy Engine        │ │  - Webhook Ingestion    │
└──────────────┬───────────┘ └────────────┬────────────┘ └───────────┬─────────────┘
               │                          │                          │
┌──────────────▼──────────────────────────▼──────────────────────────▼─────────────┐
│                       Data Layer & Security Perimeter                            │
│  - Prisma ORM (PostgreSQL / SQLite dev.db)                                        │
│  - Private Evidence Vault (Magic byte scan, SHA-256 seal, signed download)       │
│  - Immutable Audit History (CaseEvents, TimelineEvents, SecurityAudits)          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Data Model Architecture

The database is modeled via Prisma with explicit relationships maintaining financial and evidentiary integrity:

### Core Case Entities
- `CaseRecord`: Central dispute entity with caseNumber, title, description, category, status (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `UNDER_ANALYSIS`, `RESOLVED`, `CLOSED`), amountMinor, currency, buyerId, merchantId, and stage.
- `Claim`: Decomposed factual claims filed by buyer or merchant, specifying requested remedies and contested status.
- `Evidence`: Binary asset metadata (SHA-256 hash, MIME type, size, storage key, visibility, and malware scan status).
- `CaseEvent`: Append-only audit record of case status shifts, assignments, and mutations.

### Multimodal AI & Intelligence Entities
- `AIAnalysisRun`: Execution tracking for BERR reasoning runs (model, engineVersion, attempt counts).
- `ExtractedFact`: Normalized factual assertion extracted from text excerpts or image bounding boxes (coordinates 0–1000).
- `ClaimEvidenceAssessment`: Machine assessment comparing evidence facts against party claims with confidence scores.
- `BerrFinding`: Synthesized findings detailing exact discrepancies, semantic drift, and missing evidence signals.
- `AIProcessingConsent`: Explicit user consent tracking for AI processing per evidence/claim item.

### Graph & Temporal Entities
- `FactRelation`: Directed relationship between extracted facts (`SUPPORTS`, `CONTRADICTS`, `SUPERSEDES`, `QUALIFIES`).
- `CaseTimelineEvent`: High-precision chronological milestone with `occurredAt`, `recordedAt`, `timePrecision`, and `timeBasis`.
- `ResolutionPolicy` & `ResolutionRule`: Organization-scoped dispute policies defining required evidence and eligible settlement remedies.
- `ResolutionProposal` & `ResolutionPartyResponse`: Bilateral remedy proposals and counterparty voting records (`ACCEPTED`, `REJECTED`).
- `GraphSnapshot`: Cached graph projection serialized to JSON for fast rendering.

### PayPal Fintech Entities
- `CommerceOrder` & `CommerceOrderItem`: Purchase orders with unit amounts, quantities, and totals in integer minor units.
- `PayPalPayment`: Provider order session mapping internal commerce order to PayPal Order ID and PayPal Capture ID.
- `RefundTransaction`: Idempotent refund ledger tracking `refundRequestId`, `paypalRefundId`, minor amounts, and approval states.
- `PayPalWebhookEvent`: Idempotent webhook event ledger preventing duplicate event processing.
- `PayPalDispute`: Synchronized PayPal Dispute records with lifecycle stages, deadlines, and allowed seller actions.

---

## 3. End-to-End Execution Lifecycles

### Purchase & Checkout Lifecycle
1. Client requests order creation via `PurchaseOrchestrationService.createOrderWithItems`.
2. Validates line item arithmetic in minor units: `totalAmountMinor = sum(quantity * unitAmountMinor)`.
3. Creates `CommerceOrder` and initializes PayPal Order V2 session via `OrderService`.
4. Returns approve URL to client for PayPal authentication.

### Payment Capture Lifecycle
1. Buyer completes approval on PayPal.
2. Webhook or return redirect invokes `PaymentOrchestrationService.capturePayment`.
3. Calls `CaptureService.captureOrder` with idempotency guard.
4. Updates `PayPalPayment` to `COMPLETED` and sets `captureId`.
5. Emits `PAYMENT_CAPTURED` event in audit ledger.

### Complaint & Investigation Lifecycle
1. Buyer files complaint linked to order via `CaseLifecycleService`.
2. Evidence uploaded: checked via `detectMagicBytes` for binary file signatures and hashed via SHA-256.
3. AI consent verified via `ConsentManager`.
4. Multimodal extractor normalizes values (`FactNormalizer`) and identifies bounding box coordinates (`ImageExtractor`).
5. BERR Engine calculates weighted discrepancy:
   $$D = \alpha D_{exact} + \beta D_{semantic} + \gamma D_{temporal}$$
6. Constructs Bilateral Evidence Graph snapshot via `GraphBuilder`.

### Policy Grounding & Refund Lifecycle
1. `ResolutionOrchestrationService.evaluateCasePolicies` evaluates findings against organization policies.
2. Generates grounded settlement proposal (e.g. `PARTIAL_REFUND $25.00`).
3. Buyer and merchant cast bilateral votes via `recordPartyResponse`.
4. Upon bilateral agreement (`AGREED`):
   - Verifies remaining refundable balance: `calculateRemainingRefundable`.
   - Executes PayPal Sandbox refund with unique idempotency key (`PayPal-Request-Id`).
   - Updates `PayPalPayment` refunded balance and records `RefundTransaction`.
   - Resolves case status to `RESOLVED` and stage to `FINALIZED`.
   - Emits immutable audit milestone via `EventOrchestrationService`.
