# 00. Existing Feature Discovery & Baseline Audit

**Project:** RESOLVEGRAPH Version 2.0  
**Updated Project Title:** Preventive Commerce Protection & Evidence-Based Payment Resolution Infrastructure  
**Tagline:** Protect before delivery. Verify during unboxing. Resolve with evidence.  
**Auditor / Architect:** Principal Software Architect & Lead Full-Stack Engineer  
**Date:** November 7, 2026  
**Status:** **DISCOVERY COMPLETE — FOUNDATION VERIFIED & PRESERVED**

---

## 1. Executive Summary

This document presents the Phase Zero architectural discovery and baseline audit of the RESOLVEGRAPH codebase prior to implementing the Version 2.0 expansion. The inspection verified that the existing application provides a robust, working foundation for dispute cases, evidence cryptography, bilateral reasoning (BERR), multi-agent copilot orchestration, and PayPal commerce workflows.

All existing working modules, database rows, and automated tests are preserved intact. A non-destructive database snapshot `dev.db.v2.bak` has been established to protect historical data throughout the expansion.

---

## 2. Technical Stack & Environment

| Component | Technology | Version | Purpose |
|:---|:---|:---:|:---|
| **Framework** | Next.js (App Router) | 16.4.4 | Web application core, SSR, API route handlers |
| **Runtime / Language**| Node.js / TypeScript | Node v20+ / TS 5.x | Server execution and static type safety |
| **UI Library** | React | 19.3.0 | Modern component hierarchy and state hooks |
| **Styling** | Tailwind CSS / Lucide React | v4 / 1.66.0 | Dark enterprise-fintech design language |
| **3D Graph Engine** | Three.js / React Three Fiber | 0.187.0 / 9.8.2 | Bilateral Evidence Graph 3D visualizer |
| **ORM / Database** | Prisma / better-sqlite3 | 7.10.1 / 13.0.3 | Relational schema and local SQLite persistence (`dev.db`) |
| **Authentication** | Better-Auth + Custom Dal | 1.7.15 | Multi-tenant RBAC (Buyer, Merchant, Manager, Admin) |
| **Document Processing**| unpdf | 2.1.0 | Server-side PDF invoice and document inspection |
| **Validation** | Zod | 4.6.7 | Runtime schema validation across API payloads |
| **Testing Harness** | Node.js Test Runner / tsx | tsx 4.23.15 | Concurrency-controlled test execution |

---

## 3. Database Schema & Model Inventory

The Prisma schema (`prisma/schema.prisma`) comprises 34 existing models structured into logical subsystems:

### Subsystem 1: Identity & Multi-Tenant Access Control
- `User`: Roles `BUYER`, `MERCHANT`, `RESOLUTION_MANAGER`, `ADMIN`. Platform admin flag and tenant memberships.
- `Session`, `Account`, `Verification`: Better-Auth token storage and session persistence.
- `Organization`: Tenant container (e.g., TechStore, DigitalMart, Nova Electronics).
- `OrganizationMember`: Role mapping (`OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT`, `RESOLUTION_MANAGER`, `VIEWER`).
- `OrganizationInvitation`: Tokenized onboarding invitations.

### Subsystem 2: Core Dispute & Evidence Management
- `CaseRecord`: Central dispute record with case number, priority, category, minor currency amounts, and lifecycle stages.
- `Claim`: Statements filed by buyer or merchant with requested remedies.
- `Evidence`: Binary asset metadata with storage key, SHA-256 hash, MIME type, source, and visibility controls (`SHARED_WITH_PARTICIPANTS`, `BUYER_ONLY`, `MERCHANT_ONLY`, `INTERNAL`).
- `CaseEvent`, `SecurityAuditEvent`: Immutable audit trails.

### Subsystem 3: Multimodal AI & BERR Intelligence
- `AIAnalysisRun`: Queue and lease management for LLM analysis runs.
- `ExtractedFact`: Normalized entities (capacities, dates, monetary values, serial numbers) with bounding boxes.
- `ClaimEvidenceAssessment`: Evaluates if evidence supports, contradicts, or does not address a claim.
- `BerrFinding`, `BerrFindingEvidence`: Reasoning conclusions (agreements, contradictions, missing evidence).
- `AIAnalysisInput`, `AIProcessingConsent`, `AIReviewFeedback`: Consent tracking and human-in-the-loop overrides.

### Subsystem 4: Bilateral Evidence Graph & Resolution Policies
- `FactRelation`: Directed semantic edges between extracted facts (`EQUIVALENT`, `CONTRADICTS`, `SUPERSEDES`, `TEMPORALLY_PRECEDES`).
- `FactClaimAssessment`: Evaluates fact-to-claim alignment.
- `CaseTimelineEvent`: Temporal event ordering with precision and basis tags.
- `ResolutionPolicy`, `ResolutionRule`: Merchant policy rules (remedy eligibility, return windows).
- `ResolutionProposal`, `ResolutionPartyResponse`: Bilateral settlement proposals and responses.
- `GraphSnapshot`: Cached graph projections.

### Subsystem 5: PayPal Commerce & Financial Ledger
- `CommerceOrder`, `CommerceOrderItem`: Order records with line-item totals.
- `PayPalPayment`: Capture ID, payer/payee references, amounts in minor units.
- `RefundTransaction`: Two-phase refund ledger with idempotency keys (`PayPal-Request-Id`).
- `PayPalWebhookEvent`: Idempotent incoming webhook storage.
- `PayPalDispute`: PayPal dispute sync model.
- `PayPalApiOperation`: Audit logs for outbound PayPal REST operations.

### Subsystem 6: Multi-Agent Orchestration & Copilot
- `AgentRun`, `AgentStep`: Multi-step agent execution tracing.
- `AgentToolInvocation`: Audit log of tool executions.
- `AgentApprovalRequest`: High-risk financial/action approval gates with cryptographic argument hashing.
- `AgentArtifact`: Draft proposals, checklists, and messages.

---

## 4. Baseline Operational Metrics

Prior to any modifications, the existing codebase was subjected to full automated verification:

- **Automated Tests:** `npm test` executed across `tests/**/*.test.ts`:
  - **Suites:** 39 passed (39 total)
  - **Tests:** 170 passed (170 total, 0 failures, 0 skipped, 0 cancelled)
  - **Execution Time:** 67.98s
- **Static Type Safety:** `npx tsc --noEmit` exited with code 0 (zero errors).
- **ESLint Analysis:** `npm run lint` exited with code 0 (zero errors, zero warnings).
- **Database Census:**
  - `dev.db` contains 124 CaseRecords, 48 ResolutionProposals, 3 Organizations, and 13 Users.
  - Safe backup `dev.db.v2.bak` established.

---

## 5. Architectural Gap Analysis for Version 2.0

To realize the complete Preventive Commerce Protection lifecycle:

$$\text{PURCHASE} \rightarrow \text{PURCHASE MEMORY} \rightarrow \text{PACKAGE PASSPORT} \rightarrow \text{DISPATCH} \rightarrow \text{DELIVERY} \rightarrow \text{UNBOXING} \rightarrow \text{VAULT} \rightarrow \text{EVIDENCEGUARD} \rightarrow \text{BEG} \rightarrow \text{BERR} \rightarrow \text{SHARED ROOM} \rightarrow \text{APPROVAL} \rightarrow \text{PAYMENT}$$

The following critical gaps must be bridged:

1. **Purchase Memory Engine (Module 06):**
   Currently, `CommerceOrder` only records simple order totals. There is no immutable preservation of original product listings, technical specifications, seller promises, return windows, or snapshot integrity hashes that survive future product page updates.
2. **Package Passport System (Module 08):**
   No package registration, QR-code generation/verification, tamper-evident physical seal registration, or packing video/photograph linkage exists in the current schema or UI.
3. **Smart Delivery & Unboxing Reminders (Module 09):**
   Delivery status tracking is basic. There is no durable scheduled reminder engine alerting buyers before delivery to prepare their unboxing setup and inspect physical seals.
4. **Dual-Sight Mobile Capture (Module 10):**
   No Android Kotlin/CameraX project currently exists in the workspace. An authentic mobile capture client with capability detection (concurrent front/rear vs rear-only fallback), session challenge verification, and chunked upload must be constructed.
5. **EvidenceGuard AI Forensics (Module 12):**
   Current evidence handling verifies SHA-256 and extracts text via `unpdf`. It lacks multi-signal image forensics (EXIF parsing, duplicate/perceptual hashing, suspicious compositing signals), video frame sampling, invoice cross-checks against Purchase Memory, and the four required assessment states (`VERIFIED SOURCE`, `CONSISTENT`, `SUSPICIOUS`, `INCONCLUSIVE`).
6. **Multi-Payment Complaint Intake (Module 07):**
   PayPal is well-integrated, but UPI complaint intake (PhonePe, GPay, Paytm, BHIM with UTR/RRN collection, receipt parsing, and unauthorized payment guidance) does not yet exist.
7. **Shared Resolution Room (Module 16):**
   Proposal review routes exist, but a real-time bilateral discussion room with case-specific messaging, permission-gated evidence attachments, and structured remedy counter-offers is missing.
8. **RECOURSE-BENCH Expansion (Module 15 / Research):**
   The benchmark dataset currently contains 100 scenarios. It must be expanded toward 400 distinct, reproducible scenarios covering the full taxonomy of commerce and payment complaints.

---

## 6. Conclusion & Recommendation

The existing codebase is structurally sound, rigorously tested, and ready for Version 2.0 extension. All new models, services, APIs, and UI routes will be added additively without destructive changes to existing tables or breaking existing test suites.
