# RESOLVEGRAPH — Complete Project Functionality Audit & Technical Documentation Report

> **Audit Mode**: Strictly Read-Only Inspection & Verification (zero mutations to existing source code, schema, migrations, environment secrets, packages, or live external systems)  
> **Repository Root**: `c:\Projects\resolvegraph` (`rg-scaffold@0.1.0`, branch `qa-hardening`)  
> **Date of Audit**: 2026-11-12  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Overall Completion Assessment](#2-overall-completion-assessment)
3. [Project Overview & Architecture](#3-project-overview--architecture)
4. [Environment, Configuration & Setup Audit](#4-environment-configuration--setup-audit)
5. [Authentication & Authorization Audit](#5-authentication--authorization-audit)
6. [Database Schema & Persistence Audit](#6-database-schema--persistence-audit)
7. [Buyer Portal & Complaint Submission Flows](#7-buyer-portal--complaint-submission-flows)
8. [Seller Identity, Communication Gateway & Seller Workspace Audit](#8-seller-identity-communication-gateway--seller-workspace-audit)
9. [Evidence Vault & Verification Audit](#9-evidence-vault--verification-audit)
10. [AI / ML Capabilities & Models Audit](#10-ai--ml-capabilities--models-audit)
11. [Bilateral Evidence Graph (BEG) Audit](#11-bilateral-evidence-graph-beg-audit)
12. [BERR Reasoning Engine Audit](#12-berr-reasoning-engine-audit)
13. [Resolution Policies, Proposals & Authorization Workflow Audit](#13-resolution-policies-proposals--authorization-workflow-audit)
14. [Resolution Engine (Refunds & Replacements Execution) Audit](#14-resolution-engine-refunds--replacements-execution-audit)
15. [Payments, Webhooks & Reconciliation Audit](#15-payments-webhooks--reconciliation-audit)
16. [Marketplaces & External Communication Integrations Audit](#16-marketplaces--external-communication-integrations-audit)
17. [Purchase Memory, Package Passport & Dual-Sight Capture Audit](#17-purchase-memory-package-passport--dual-sight-capture-audit)
18. [Mobile Companion App Audit (Android `resolvegraph-capture`)](#18-mobile-companion-app-audit-android-resolvegraph-capture)
19. [Multi-Agent Copilot, Guardrails & SRE Operations Audit](#19-multi-agent-copilot-guardrails--sre-operations-audit)
20. [Analytics, Overview, Reporting & Notifications Audit](#20-analytics-overview-reporting--notifications-audit)
21. [Frontend Pages & UI-to-Backend Connectivity Audit](#21-frontend-pages--ui-to-backend-connectivity-audit)
22. [Complete Backend API Routes Inventory](#22-complete-backend-api-routes-inventory)
23. [Master Feature Status Classification Table](#23-master-feature-status-classification-table)
24. [What RESOLVEGRAPH Can Successfully Do Right Now](#24-what-resolvegraph-can-successfully-do-right-now)
25. [What RESOLVEGRAPH Cannot Yet Do Reliably](#25-what-resolvegraph-cannot-yet-do-reliably)
26. [Mocked, Simulated, Hardcoded & Fallback Components Register](#26-mocked-simulated-hardcoded--fallback-components-register)
27. [Unused, Duplicated, Legacy & Preparation-Layer Components](#27-unused-duplicated-legacy--preparation-layer-components)
28. [Security, Auth & Isolation Audit Findings](#28-security-auth--isolation-audit-findings)
29. [Automated Test Suite Inventory & Verification Results](#29-automated-test-suite-inventory--verification-results)
30. [Deployment, Environment & PostgreSQL Migration Readiness](#30-deployment-environment--postgresql-migration-readiness)
31. [Local Machine vs External Dependencies Breakdown](#31-local-machine-vs-external-dependencies-breakdown)
32. [Pending Work & Known Technical Limitations](#32-pending-work--known-technical-limitations)
33. [Recommended Prioritized Next Engineering Roadmap](#33-recommended-prioritized-next-engineering-roadmap)
34. [Final Audit Verdict & Summary Counts](#34-final-audit-verdict--summary-counts)

---

## 1. Executive Summary

**RESOLVEGRAPH** is a Next.js `16.4.4` / React `19.3.0` / Prisma `7.10.1` (SQLite via `@prisma/adapter-better-sqlite3`) bilateral commerce dispute-resolution platform centered around separating evidence linkage (**BEG**), evidence evaluation (**BERR**), and remedy coordination/execution (**ResolutionEngine** / **ResolutionOrchestrationService**).

Codebase inspection confirms substantial real engineering across the backend domain core alongside deliberate mock/sandbox adapters, deterministic fallbacks, and several half-wired or static UI surfaces:

- **Genuine Working Backend Core**: Complaint submission, local content-addressed SHA-256 file vaulting, PDF text parsing (`unpdf`), role-aware invoice seller extraction & Seller Directory matching, persisted Bilateral Evidence Graph (`BegGraph`/`BegNode`/`BegEdge`/`BegGraphRevision`), deterministic 4-layer BERR v2 reasoning (`BerrAssessmentRecord`/`BerrFindingItem`), policy validation, proposal/approval state machines, PayPal refund guardrails, delivery-gated replacement execution, Purchase Memory snapshots, HMAC-signed Package Passport QR tokens, Canonical Transaction 10-tier reconciliation, hash-chained audit logs, kill switches, and DSAR privacy controls all persist to SQLite and pass automated tests.
- **What Is Simulated, Partial, or Unwired in Local Runtime**: Under current `.env`, `AI_PROVIDER=test`, `AI_PROCESSING_ENABLED=false`, `OPENAI_API_KEY=<EMPTY>`, and `PAYPAL_CLIENT_ID=sb_sandbox_client_id`, causing PayPal operations to route through `PayPalMockProvider` and v1 AI pipelines through `TestAIProvider`. `GEMINI_API_KEY` is configured in `.env.local`, yet Gemini multimodal image/video inspection (`GeminiEvidenceService`) remains an unwired preparation layer—only `/api/ai/gemini/health` and optional BERR v2 Layer 2 claim structuring invoke Gemini when `AI_PROVIDER=gemini`. Object storage (`S3EvidenceStorage`), image/scanned-PDF OCR, real SMTP/push delivery, bank/NPCI UPI clearing, live marketplace polling, Android `VideoCapture` media recording, and ML multilingual translation are simulated or unimplemented.
- **Code Quality & Test Posture**:
  - `npx tsc --noEmit`: **0 errors** (verified live).
  - `npm run lint`: **0 errors, 25 warnings** (verified live).
  - Automated `tsx --test` suite (**53** test files): **438 tests** across **72 suites** — **412 passed**, **0 failed**, **26 skipped** (all 26 skipped in live-server UI suite [`tests/ui-all-screens.test.ts`](file:///c:/Projects/resolvegraph/tests/ui-all-screens.test.ts)), observed from the offline suite execution log prior to the read-only audit freeze because running integration tests mutates `dev.db`.
- **Master Audit Totals (60 Discrete Audited Features)**:
  - **WORKING AND VERIFIED**: **20**
  - **IMPLEMENTED BUT NOT FULLY VERIFIED**: **11**
  - **PARTIALLY WORKING**: **10**
  - **MOCKED / SIMULATED**: **10**
  - **FRONTEND ONLY / BACKEND ONLY**: **3**
  - **NOT IMPLEMENTED / NOT VERIFIED**: **6**

---

## 2. Overall Completion Assessment

| Layer / Domain | Assessment | Honest Reality |
| :--- | :--- | :--- |
| **Core Backend Domain Engine (BEG, BERR v2, Policies, Approvals, Replacement/Refund Guardrails)** | **High Maturity (~85%)** | Real Prisma models, deterministic math/provenance rules, idempotency locks, strict separation of responsibilities, strong test coverage. |
| **Multi-Role Portals (Buyer, Seller, Investigator Workspace UI)** | **Moderate-High (~70%)** | Live API wiring exists for primary Buyer, Seller, Case BEG/BERR/Resolution, Payments, Packages, and Copilot workflows; several secondary pages contain demo fallbacks, broken paths (`/api/purchases/extract`), or static charts/badges. |
| **AI / Multimodal Verification & OCR** | **Early / Split (~35%)** | Real `unpdf` PDF extraction and regex heuristics work; BERR v2 deterministic rules work well; Gemini multimodal services (`GeminiEvidenceService`) are built & unit-tested but disconnected from upload intake/UI; OpenAI is disabled/empty-keyed; scanned PDFs/images lack OCR. |
| **External Payments, Marketplaces & Comms** | **Sandbox / Simulated (~25%)** | PayPal REST v2 HTTP client exists but auto-routes to `PayPalMockProvider` with placeholder sandbox creds; PhonePe/GPay/Card/Amazon/Flipkart/UPI clearing/SMTP/Push perform no live external API execution. |
| **Mobile Companion (`mobile/android`)** | **Prototype (~25%)** | CameraX preview + session API client exist, but video capture generates synthetic `0x42` bytes on Stop and targets emulator `10.0.2.2:3000`. |
| **Production Infrastructure & Deployment** | **Pre-Production (~30%)** | SQLite `dev.db` (`~870 MB` locally), local filesystem `.private/`, hardcoded `rg_ent_*` enterprise key shortcut, and partial 8-table Postgres SQL draft vs 85-model Prisma schema. |

---

## 3. Project Overview & Architecture

### Tech Stack ([`package.json`](file:///c:/Projects/resolvegraph/package.json))
- **Framework**: Next.js `16.4.4` (App Router, Turbopack), React `19.3.0`, TypeScript `^5`
- **ORM & DB**: Prisma `7.10.1` (`prisma-client` generator output to `src/generated/prisma`), SQLite via `@prisma/adapter-better-sqlite3` (`better-sqlite3 ^13.0.3`)
- **Authentication**: `better-auth ^1.7.15` (`prismaAdapter` in [`src/lib/auth.ts`](file:///c:/Projects/resolvegraph/src/lib/auth.ts))
- **Validation**: `zod ^4.6.7`
- **AI SDKs**: `@google/genai ^3.2.0`, `openai ^7.47.0`
- **Document Parsing**: `unpdf ^2.1.0`
- **UI & Visualization**: Tailwind CSS v4 (`@tailwindcss/turbopack`), `lucide-react`, `recharts`, `framer-motion`, `gsap`, `lenis`, `three`, `@react-three/fiber`, `@react-three/drei`, `@splinetool/react-spline`, custom SVG 2D BEG canvas (`reactflow`/`@xyflow` is **not** installed)
- **Verification / Tooling**: Node/tsx native test runner (`tsx --test`), `eslint` (`eslint-config-next 16.4.4`), `puppeteer-core ^25.16.0` (browser scripts in `scripts/`)

### Codebase Inventory (Directly Counted)
| Inventory Category | Count | Location |
| :--- | :---: | :--- |
| App Router Pages (`page.tsx`) | **41** | `src/app/**/page.tsx` |
| Backend API Route Files (`route.ts`) | **118** | `src/app/api/**/route.ts` |
| Prisma Schema Models (`model`) | **85** | `prisma/schema.prisma` (2,559 lines) |
| Prisma Schema Enums (`enum`) | **16** | `prisma/schema.prisma` |
| Automated Test Files (`*.test.ts`) | **53** | `tests/` |
| Mobile Android Project Files | **13** | `mobile/android/resolvegraph-capture/` |

### Architectural Boundary Model
The platform enforces three separated backend responsibilities for core disputes:
1. **BEG (`src/server/graph/`)** — Connects complaint claims, buyer/seller uploaded evidence, Purchase Memory, Package Passport, Payment records, and Seller Identity nodes with explicit `BegVerificationState` provenance (`VERIFIED`, `SOURCE_SUPPORTED`, `INFERRED`, `CONTESTED`, `UNVERIFIED`, `MISSING`).
2. **BERR (`src/server/ai/reasoning/berr-v2.service.ts`, `berr-layers.service.ts`)** — Consumes persisted BEG graphs, executes complaint-category deterministic/optional-Gemini reasoning, classifies facts into `AGREED | VERIFIED | CONTESTED | MISSING`, computes uncertainty scores and versioning, and logs human overrides.
3. **Resolution Engine & Orchestration (`src/server/resolution/`, `src/server/orchestration/`)** — Validates merchant policy compliance, coordinates bilateral acceptance (`ResolutionProposal`), gates human/manager authorization, and executes financial refunds (`RefundService`) or delivery-tracked replacements (`ReplacementExecutionService`).

---

## 4. Environment, Configuration & Setup Audit

### Non-Secret `.env`, `.env.local`, and `.env.production.example` Inspection
Values for sensitive keys are masked strictly as `<SET>` or `<EMPTY>`:

| File | Key Variable | Observed Value / Status | Operational Impact |
| :--- | :--- | :--- | :--- |
| `.env` | `DATABASE_URL` | `<SET>` | Local SQLite DB (`dev.db` at root: `870,023,168` bytes) |
| `.env` | `NODE_ENV` | `development` | Enables `x-demo-user-email` header auth & demo login |
| `.env` | `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | `<SET>` / `<SET>` | Better Auth active locally |
| `.env` | `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Client/server base URL |
| `.env` | `EVIDENCE_STORAGE_DIR` | `./.private/evidence` | Disk storage for vault uploads |
| `.env` | `ADMIN_BOOTSTRAP_SECRET` | `<SET>` | Bootstrap admin CLI secret |
| `.env` | `AI_PROVIDER` / `AI_PROCESSING_ENABLED` | `test` / `false` | Forces deterministic `TestAIProvider` and skips live LLM calls in BERR Layer 2 |
| `.env` | `OPENAI_API_KEY` / `OPENAI_MODEL` | `<EMPTY>` / `gpt-4o-mini` | OpenAI inactive |
| `.env` | `PAYPAL_ENV` / `PAYPAL_LIVE_ENABLED` | `sandbox` / `false` | Live PayPal blocked; `sb_sandbox_client_id` triggers `PayPalMockProvider` |
| `.env` | `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | `sb_sandbox_client_id` / `<SET>` / `sb_sandbox_webhook_id` | Placeholder prefix `sb_` auto-selects `PayPalMockProvider` in `getPayPalConfig()` |
| `.env` | `RESOLVEGRAPH_DEMO_ACCESS` | `true` | Enables `/api/auth/demo-login` quick workspace login |
| `.env.local` | `GEMINI_API_KEY` | `<SET>` | Available for `/api/ai/gemini/health`; inactive in BERR Layer 2 while `AI_PROVIDER=test` |

### Startup Config & Feature Flag Guards
- [`EnvValidator`](file:///c:/Projects/resolvegraph/src/lib/env-validator.ts) validates production invariants (blocks `file:` SQLite URLs, enforces `BETTER_AUTH_SECRET >= 32` chars, forbids `NEXT_PUBLIC_GEMINI_API_KEY` browser exposure, blocks `PAYPAL_LIVE_ENABLED=true` outside `NODE_ENV=production`). Note that `EnvValidator.validate()` is callable on startup/tests, rather than halting Next.js automatically unless invoked.
- [`FeatureFlags`](file:///c:/Projects/resolvegraph/src/lib/feature-flags.ts) enforces `isPayPalLiveEnabled()` hard-returning `false` whenever `NODE_ENV !== 'production'`.

---

## 5. Authentication & Authorization Audit

### Session, Auth & RBAC Architecture
- **Better Auth Core ([`src/lib/auth.ts`](file:///c:/Projects/resolvegraph/src/lib/auth.ts))**: Configures email+password auth (`minPasswordLength: 12`, `requireEmailVerification: false` in dev), SQLite adapter, 7-day session TTL (`604800s`), localhost origin allowlist, and fallback dev secret literal if `BETTER_AUTH_SECRET` is unset.
- **Session Resolution ([`src/server/auth/session.ts`](file:///c:/Projects/resolvegraph/src/server/auth/session.ts))**: Calls `auth.api.getSession()`, loads active `orgMemberships`, and falls back in non-production (`process.env.NODE_ENV !== 'production'`) to `x-demo-user-email` lookup for test suites/local debugging.
- **Role Hierarchy**: `UserRole` (`BUYER`, `MERCHANT`, `RESOLUTION_MANAGER`, `ADMIN`) + `isPlatformAdmin` flag + per-organization `OrganizationRole` (`OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT`, `RESOLUTION_MANAGER`, `VIEWER`).
- **One-Click Demo Login ([`src/app/api/auth/demo-login/route.ts`](file:///c:/Projects/resolvegraph/src/app/api/auth/demo-login/route.ts))**: IP-rate-limited (`15 req / 60s` in-memory `Map`) switching among 3 fixed seeded accounts (`PLATFORM`: `admin@resolvegraph.demo`, `BUYER`: `alex.morgan@consumer.demo`, `MERCHANT`: `disputes@techstore.demo`).
- **Edge Middleware ([`src/middleware.ts`](file:///c:/Projects/resolvegraph/src/middleware.ts))**: Checks cookie presence (`better-auth.session_token`, `__Secure-better-auth.session_token`, `session_token`) or non-prod `x-demo-user-email`. Redirects unauthenticated workspace pages to `/sign-in?callbackUrl=...` and returns JSON `401` on protected `/api/*` paths. Public paths explicitly allow `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/access-denied`, `/docs`, `/methodology`, `/api/auth`, `/api/health`, `/api/webhooks/paypal`.

### Gaps Observed
- **Simulated Auth Subflows**: [`forgot-password/page.tsx`](file:///c:/Projects/resolvegraph/src/app/(auth)/forgot-password/page.tsx), [`reset-password/page.tsx`](file:///c:/Projects/resolvegraph/src/app/(auth)/reset-password/page.tsx), and `verify-email/page.tsx` are client-side `setTimeout` / static views with zero email token backend.
- **Enterprise Auth Weak Token Check**: [`enterprise-api-auth.ts`](file:///c:/Projects/resolvegraph/src/server/auth/enterprise-api-auth.ts) grants access to `org_techstore` for any key starting with `rg_ent_` or matching `rg_test_key_techstore_2026`, or using raw `organization.id`/`slug` as header key (detailed in Section 28).

---

## 6. Database Schema & Persistence Audit

- **Schema Scope ([`prisma/schema.prisma`](file:///c:/Projects/resolvegraph/prisma/schema.prisma))**: **85 models** and **16 enums** across 2,559 lines, targeting SQLite (`provider = "sqlite"`).
- **Major Model Clusters**:
  - *Identity & Multi-Tenancy*: `User`, `Session`, `Account`, `Verification`, `Organization`, `OrganizationMember`, `SecurityAuditLog`, `HashChainedAuditRecord`, `KillSwitchConfig`
  - *Cases & Disputes*: `CaseRecord`, `CaseParticipant`, `Claim`, `CaseEvent`, `CaseNote`, `InvestigationTimelineEvent`, `SharedRoomMessage`, `NotificationMessage`
  - *Evidence & Forensics*: `Evidence`, `EvidenceFieldExtraction`, `EvidenceAnalysisResult`, `ExtractedFact`, `ConsentRecord`
  - *Seller Subsystem*: `SellerAccount`, `SellerIdentityMatch`, `SellerEvidenceRequest`, `SellerCommunicationAttempt`, `SellerResponse`, `SellerFollowUpMessage`
  - *BEG & BERR*: `BegGraph`, `BegNode`, `BegEdge`, `BegEdgeAction`, `BegGraphRevision`, `BerrAssessmentRecord`, `BerrFindingItem`, `BerrReviewAction`, `BerrFinding` (v1), `AIAnalysisRun`, `AIAnalysisInput`, `SemanticDriftReport`
  - *Commerce, Custody & Payments*: `PurchaseMemory`, `PurchaseSpecification`, `PurchasePromise`, `PurchaseSnapshot`, `PackagePassport`, `PackageItem`, `PackageSeal`, `PackageEvent`, `DeliveryEvent`, `DeliveryReminder`, `CameraSession`, `UnboxingChallenge`, `CameraStream`, `CommerceOrder`, `PayPalPayment`, `RefundTransaction`, `PayPalDispute`, `PayPalWebhookEvent`, `CanonicalTransaction`, `ReconciliationMatch`, `PaymentComplaint`, `PaymentIncident`, `InvestigationFinding`
  - *Resolution & Copilot*: `ResolutionPolicy`, `ResolutionRule`, `ResolutionProposal`, `ResolutionResponse`, `ReplacementFulfillment`, `AgentRun`, `AgentStep`, `ToolInvocation`, `AgentArtifact`, `AgentApprovalRequest`
- **Local DB State**: `c:\Projects\resolvegraph\dev.db` measures **870,023,168 bytes** (~830 MB) with 11 historical snapshot backups (`dev.db.*.bak`) at repository root. Private vault files on disk in `.private/` total **237 files** (**116,188 bytes**).
- **Seeding ([`prisma/seed.ts`](file:///c:/Projects/resolvegraph/prisma/seed.ts))**: Seeds 3 organizations (`org_techstore`, `org_digitalmart`, `org_nova`), demo buyer/merchant/admin users (`RG-1001`–`RG-1010` cases, etc.).

---

## 7. Buyer Portal & Complaint Submission Flows

- **API Endpoints**:
  - `POST /api/complaints/submit` ([`submit/route.ts`](file:///c:/Projects/resolvegraph/src/app/api/complaints/submit/route.ts)) — Idempotent multipart submission validating shopping platform, order ID, product name, positive amount, currency, category, description, and files. Allocates sequential `RG-*` case number (up to 5 retry attempts on `P2002`), validates & writes files to `LocalEvidenceStorage`, records `CaseRecord` + `Claim` + `Evidence`, runs `EvidenceGuardService.analyzeEvidence()`, triggers `SellerWorkflowOrchestrator.initiateAfterScreening()`, runs `BegSyncService.handleDomainEvent("COMPLAINT_CREATED")`, creates completed/tracked `AIAnalysisRun`, and executes `BerrV2Service.evaluateCase()`.
  - `POST /api/complaints/suggest-title`, `GET /api/complaints/my`, `GET /api/complaints/[caseId]`, `POST /api/complaints/[caseId]/evidence`, `POST /api/complaints/[caseId]/seller-outreach`
- **Tracking Engine ([`BuyerTrackingService`](file:///c:/Projects/resolvegraph/src/server/services/buyer-tracking.service.ts))**: Translates raw case/seller/BERR/proposal states into 13 consumer-friendly statuses (`"Submitted"`, `"Reviewing evidence"`, `"Waiting for seller"`, `"Under investigation"`, `"Additional information required"`, `"Re-investigation"`, `"Decision ready"`, `"Awaiting approval"`, `"Refund in progress"`, `"Replacement in progress"`, `"Resolved"`, `"Escalated"`, `"Closed"`), builds 7-stage milestone timelines, blocks cross-buyer data access, and respects buyer notification & re-investigation prompts.
- **Buyer UI Components**: [`BuyerComplaintsList`](file:///c:/Projects/resolvegraph/src/components/buyer/buyer-complaints-list.tsx) and [`BuyerCaseDetail`](file:///c:/Projects/resolvegraph/src/components/buyer/buyer-case-detail.tsx) render inside `/cases` and `/cases/[caseId]` when `session.user.role === "BUYER"`. Verified wired to live complaint APIs (`/api/complaints/*`, `/api/resolution-proposals/[proposalId]/respond`) plus customer notification bell (`/api/notifications`).

---

## 8. Seller Identity, Communication Gateway & Seller Workspace Audit

This subsystem implements a 4-stage pipeline tested across 5 dedicated seller test suites:
1. **Buyer Screening Gate ([`BuyerScreeningService`](file:///c:/Projects/resolvegraph/src/server/seller/buyer-screening.service.ts))**: Ensures at least one valid, clean (`INFECTED`/rejected blocked) buyer purchase document exists before initiating seller outreach.
2. **Role-Aware Seller Extraction ([`SellerExtractionService`](file:///c:/Projects/resolvegraph/src/server/seller/seller-extraction.service.ts))**: Parses PDF/text documents to distinguish **actual product seller** vs marketplace intermediary vs carrier/logistics entity (`detectedEntities`), flagging OCR-degraded/ambiguous invoices for human review rather than guessing.
3. **Directory Lookup & Priority Matching ([`SellerDirectoryService`](file:///c:/Projects/resolvegraph/src/server/seller/seller-directory.service.ts))**: Priority order: (1) Exact GSTIN, (2) Marketplace Seller/Storefront ID, (3) Strict normalized legal/trade name, (4) Fuzzy candidate flagged `requiresHumanReview=true`.
4. **3-Priority Communication Gateway ([`SellerCommunicationGatewayService`](file:///c:/Projects/resolvegraph/src/server/seller/seller-communication-gateway.service.ts))**:
   - *Priority 1*: Registered & verified seller organizations via **RESOLVEGRAPH Seller Portal** (`SellerEvidenceRequest` + `SellerNotification` + `VIEWED` timestamp tracking).
   - *Priority 2*: Authorized marketplace adapter only when genuine credentials/capabilities exist (falls back cleanly when absent).
   - *Priority 3*: **Customer-Assisted Official Help Centre Fallback** (`CUSTOMER_ACTION_REQUIRED` + prepared buyer message + marketplace support link + buyer confirmation endpoint `/api/complaints/[caseId]/seller-outreach`).
5. **Seller Workspace UI (`/seller/**`)**:
   - Pages `/seller`, `/seller/requests`, `/seller/requests/[requestId]`, `/seller/responses`, `/seller/responses/[responseId]`, `/seller/directory`, `/seller/profile`.
   - [`SellerSubmissionWizard`](file:///c:/Projects/resolvegraph/src/components/seller/seller-submission-wizard.tsx): 4-step guided response (`AGREE | DISAGREE | CLARIFICATION_ONLY`), category-adaptive Step 2 & Step 3 forms, draft save (`PATCH`), `NOT_AVAILABLE`/`NOT_APPLICABLE` non-coercive item choices, PII stripping on buyer-shared preview, supplemental follow-up threads (`/follow-up`), and profile RBAC resetting verification on GSTIN/legalName updates.

---

## 9. Evidence Vault & Verification Audit

- **Disk Storage ([`LocalEvidenceStorage`](file:///c:/Projects/resolvegraph/src/server/storage/local-evidence-storage.ts))**:
  - Validates `>0` bytes and `<=10 MB`, enforces binary magic-byte signatures (`application/pdf` `%PDF-`, `image/png`, `image/jpeg`, `image/webp`, `video/mp4` `ftyp`, `video/webm`), blocks `.exe/.sh/.bat/.cmd/.vbs/.svg`, sanitizes path traversal filenames, writes content-addressed keys to `EVIDENCE_STORAGE_DIR` (`.private/evidence`), and calculates full SHA-256 checksums.
  - Permissioned streaming via `GET /api/evidence/[evidenceId]/download` ([`download/route.ts`](file:///c:/Projects/resolvegraph/src/app/api/evidence/[evidenceId]/download/route.ts)) enforces `canViewEvidence()` (`BUYER_ONLY`, `MERCHANT_ONLY`, `SHARED_WITH_PARTICIPANTS`, `INTERNAL`), logs allowed/denied access to `SecurityAuditService`, and restricts `?inline=1` MIME types safely.
- **S3 Adapter ([`S3EvidenceStorage`](file:///c:/Projects/resolvegraph/src/server/storage/s3-evidence-storage.ts))**:
  - Validates buffer and hashes SHA-256 key, **but contains no AWS S3 SDK upload/download call** (commented placeholder only); `evidence-storage.ts` always exports `LocalEvidenceStorage`.
- **Universal Intake ([`UniversalEvidenceIntakeService`](file:///c:/Projects/resolvegraph/src/server/services/universal-evidence-intake.service.ts))**:
  - Handles multipart & base64 JSON uploads, extracts PDF text via `unpdf` (`PdfExtractor`), runs regex anchor extraction (`UTR`, amounts, dates, merchant identifiers), detects exact SHA-256 duplicates, triggers `EvidenceGuardService` & `BegSyncService`.
  - *Limitation*: `validateMagicBytes` includes a fallback (`L92-94`) accepting declared `image/*`, `application/pdf`, or `text/*` MIME headers when magic bytes fail; scanned PDFs (`< 30 chars/page`) flag `isScanned=true` with empty OCR text.
- **EvidenceGuard Forensics ([`EvidenceGuardService`](file:///c:/Projects/resolvegraph/src/server/services/evidenceguard.service.ts))**:
  - Checks SHA-256 integrity, compares perceptual hashes across prior `EvidenceAnalysisResult` rows, checks JPEG/PNG EXIF headers, and cross-checks against `PurchaseMemory`.
  - *Crucial Finding*: `computeDifferenceHash()` (`L49-53`) hashes the first 4 KB of raw compressed bytes with MD5 rather than computing pixel luminance gradients (so re-saved/cropped copies won't collide like true visual dHash), EXIF scan stops at byte `2048` and inspects only for `"Exif"`, and `POST /api/evidence/[evidenceId]/analyze` defaults to `Buffer.from(evidence.description || "DEFAULT_EVIDENCE_BUFFER")` when raw file bytes are not passed in request/caller.
- **Malware Scanning**: Schema `MalwareScanStatus` includes `NOT_CONFIGURED` as default; no ClamAV/antivirus scanner exists.

---

## 10. AI / ML Capabilities & Models Audit

| Component | File(s) | Configured / Live Behavior |
| :--- | :--- | :--- |
| **Provider Factory & OpenAI** | [`provider-factory.ts`](file:///c:/Projects/resolvegraph/src/server/ai/providers/provider-factory.ts), [`openai.provider.ts`](file:///c:/Projects/resolvegraph/src/server/ai/providers/openai.provider.ts) | Currently `.env` sets `AI_PROVIDER=test`, `AI_PROCESSING_ENABLED=false`, `OPENAI_API_KEY=<EMPTY>`, so legacy `BerrEngine` v1 runs exclusively through deterministic regex [`TestAIProvider`](file:///c:/Projects/resolvegraph/src/server/ai/providers/test.provider.ts). OpenAI `chat.completions` code exists (`gpt-4o-mini`/`gpt-4o`) but has zero active key. |
| **Gemini Connection Health & Config** | [`gemini-config.ts`](file:///c:/Projects/resolvegraph/src/server/ai/gemini/gemini-config.ts), [`gemini-connection-test.ts`](file:///c:/Projects/resolvegraph/src/server/ai/gemini/gemini-connection-test.ts), `/api/ai/gemini/health` | Reads `GEMINI_API_KEY` from `.env.local` (server-only, rejects `NEXT_PUBLIC_GEMINI_API_KEY` & browser globals), defaults to `gemini-3.6-flash` (plus `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`), blocks paid models (`gemini-*-pro`, `gemini-4-*`, `imagen-*`, `veo-*`) when `GEMINI_FREE_TIER_ONLY` is true. |
| **Gemini in BERR Layer 2** | [`berr-layers.service.ts:472-516`](file:///c:/Projects/resolvegraph/src/server/ai/reasoning/berr-layers.service.ts#L472-L516) | Only invokes `executeGeminiCall` if `AI_PROVIDER === "gemini"` **and** `GEMINI_API_KEY` is set. Redacts PII via `DataRedactor` + `ContentSanitizer` XML fencing and silently falls back to deterministic extraction on error/quota. Currently **inactive** because `.env` has `AI_PROVIDER=test`. |
| **Gemini Multimodal Service (Preparation Layer)** | [`gemini-evidence.service.ts`](file:///c:/Projects/resolvegraph/src/server/ai/gemini/gemini-evidence.service.ts) | Full Zod-validated JSON schemas & inline/Files-API transport for `analyzeImage()`, `analyzeProductPhoto()`, and `analyzeVideoFrames()`, **but imported only by [`gemini/index.ts`](file:///c:/Projects/resolvegraph/src/server/ai/gemini/index.ts) and unit tests (`gemini-integration.test.ts`)**. Not called by evidence upload, `EvidenceGuard`, or UI routes. |
| **Document Text Extraction & Normalization** | [`PdfExtractor`](file:///c:/Projects/resolvegraph/src/server/ai/extraction/pdf-extractor.ts), `TextExtractor`, `FactNormalizer` | Real PDF text extraction via `unpdf`; byte/page offset tracking; unit normalization (GB/TB, minor currency units, ISO dates, SKUs). Image/scanned-PDF OCR is **absent** (`ImageExtractor` only base64-encodes files). |
| **AI Security & Privacy Guardrails** | `DataRedactor`, `ContentSanitizer`, `ConsentManager` | Verified Luhn credit-card check, PAN/CVV/SSN/token redaction, prompt-injection regex & delimiter isolation, per-evidence/claim consent opt-in. |
| **Evaluation Benchmarks** | [`evaluation-runner.ts`](file:///c:/Projects/resolvegraph/src/server/ai/evaluation/evaluation-runner.ts), [`multi-agent-evaluator.ts`](file:///c:/Projects/resolvegraph/src/server/agents/evaluation/multi-agent-evaluator.ts) | Synthetic 100-scenario dataset benchmark. **Limitation**: `EvaluationRunner` Baseline D reads `scenario.groundTruth` and hardcodes ETC `0.98`; `MultiAgentEvaluator` returns hardcoded static KPIs. |

---

## 11. Bilateral Evidence Graph (BEG) Audit

- **Implementation Files**: [`GraphBuilder`](file:///c:/Projects/resolvegraph/src/server/graph/graph-builder.ts), [`BegMatcherService`](file:///c:/Projects/resolvegraph/src/server/graph/beg-matcher.service.ts), [`GraphValidator`](file:///c:/Projects/resolvegraph/src/server/graph/graph-validator.ts), [`BegPersistenceService`](file:///c:/Projects/resolvegraph/src/server/graph/beg-persistence.service.ts), [`BegSyncService`](file:///c:/Projects/resolvegraph/src/server/graph/beg-sync.service.ts), [`GraphProjectionService`](file:///c:/Projects/resolvegraph/src/server/graph/graph-projection.ts), [`GraphVisibilityService`](file:///c:/Projects/resolvegraph/src/server/graph/graph-visibility.ts), [`GraphQueryService`](file:///c:/Projects/resolvegraph/src/server/graph/graph-query.service.ts).
- **How It Works Internally**:
  1. Assembles typed nodes (`CASE`, `ORDER`, `PURCHASE_MEMORY`, `PACKAGE_PASSPORT`, `SEAL`, `PAYMENT`, `CLAIM`, `BUYER_EVIDENCE`, `SELLER_EVIDENCE`, `EXTRACTED_FACT`, `SELLER_IDENTITY`, `SHIPMENT`, `MISSING_EVIDENCE`, `CONTRADICTION`, etc.) strictly tagged by `party` (`BUYER`, `SELLER`, `MARKETPLACE`, `LOGISTICS`, `SYSTEM`, `NEUTRAL`) and `sourceOrigin`.
  2. Deterministic Matcher (`BegMatcherService`) connects records by strict priority: `EXACT_COMPLAINT_ID` > `EXACT_ORDER_ID` > `VERIFIED_GSTIN` > `MARKETPLACE_SELLER_ID` > `SKU_MODEL` > `INVOICE_NUMBER` > `AMOUNT_AND_CORROBORATED_ANCHOR` — **explicitly rejects amount-only linking (`AMOUNT_ONLY_REJECTED`)** and flags ambiguous links (`isAmbiguous=true`).
  3. Provenance Validator (`GraphValidator`) blocks invalid edge schemas, cycles, and AI inferences from auto-promoting to `VERIFIED`.
  4. `BegPersistenceService` hashes canonical graph state (`SHA-256` `integrityHash`), stores normalized `BegGraph` / `BegNode` / `BegEdge` rows, increments `BegGraphRevision` versions (`version`) when changes occur, preserves prior human edge overrides across rebuilds, and marks older `BerrAssessmentRecord` rows `isStale=true`.
  5. Event triggers (`BegSyncService.handleDomainEvent`) hook complaint creation, buyer evidence upload/verification, seller matching, request dispatch, seller response, and manual rebuild (`/api/cases/[caseId]/graph/rebuild`).
- **API & UI**:
  - APIs: `GET /api/cases/[caseId]/graph` (`PERSISTED` / `DYNAMIC`), `GET .../graph/expand`, `POST .../graph/rebuild`, `POST .../beg/edges/[edgeId]/action` (human `CONFIRM`, `REJECT`, `MARK_CONTESTED`, `REQUEST_ADDITIONAL_INFO`, `ESCALATE`), `GET .../beg/evidence/[evidenceId]/preview`.
  - Real Explorer UI ([`EvidenceGraphExplorer`](file:///c:/Projects/resolvegraph/src/components/cases/evidence-graph-explorer.tsx)): Renders a custom 2D interactive SVG canvas + accessible table view, category/party/verification filters, neighborhood expansion, evidence preview drawer, and investigator edge review actions.
  - Note: Landing page 3D Three.js graph ([`interactive-evidence-graph.tsx`](file:///c:/Projects/resolvegraph/src/components/3d/interactive-evidence-graph.tsx)) is **static demo chrome**, completely separate from persisted BEG.

---

## 12. BERR Reasoning Engine Audit

- **v2 Production Pipeline ([`BerrV2Service`](file:///c:/Projects/resolvegraph/src/server/ai/reasoning/berr-v2.service.ts) + [`berr-layers.service.ts`](file:///c:/Projects/resolvegraph/src/server/ai/reasoning/berr-layers.service.ts))**:
  - Enforces strict separation: reads persisted BEG graph (`BegPersistenceService`), checks minimum sufficient graph threshold (`INSUFFICIENT_BEG_DATA` short-circuit when critical graph nodes/evidence are absent), builds bilateral context (Layer 1), structures claims via deterministic rules or optional redacted Free-Tier Gemini call when `AI_PROVIDER=gemini` (Layer 2), runs complaint-category cross-party reasoning classifying facts into **`AGREED | VERIFIED | CONTESTED | MISSING`** (Layer 3), and checks remedy readiness + next actions without ever calling payment APIs (Layer 4).
  - **Strict Promotion Guardrails** (verified by `tests/berr-system.test.ts`): `AGREED` findings never auto-promote to `VERIFIED`; `VERIFIED` excludes hash-only/AI-only or uncorroborated buyer payment screenshots unless ledger/authority verification backs them.
  - **Versioning & Human Review**: Saves append-only `BerrAssessmentRecord` versions (`v1`, `v2`, ...) with `begGraphVersion`, `isStale`, `BerrFindingItem` links to BEG node/edge IDs, and `BerrReviewAction` overrides preserving original AI classifications (`originalAiClassification`, `originalAiExplanation`).
  - **RBAC Security**: `GET/POST /api/cases/[caseId]/berr-v2` and `POST .../berr-v2/review` block BUYER and unauthorized roles via `canViewInternalBegGraph` / `canMutateBegGraph` (`403`). UI panel in [`BerrView`](file:///c:/Projects/resolvegraph/src/components/cases/berr-view.tsx).
- **Legacy v1 Coexistence**: `BerrEngine` (`berr-engine.ts`) writes to older `AIAnalysisRun` + `BerrFinding` tables and still powers `/api/cases/[caseId]/analysis` + `scripts/ai-worker.ts`.

---

## 13. Resolution Policies, Proposals & Authorization Workflow Audit

- **Policy Evaluation ([`ResolutionEngine`](file:///c:/Projects/resolvegraph/src/server/resolution/resolution-engine.ts), [`PolicyValidator`](file:///c:/Projects/resolvegraph/src/server/resolution/policy-validator.ts))**:
  - Reads persisted BERR v2 assessment, active merchant `ResolutionPolicy` + `ResolutionRule` configs (`REQUIRED_EVIDENCE`, `RETURN_WINDOW`, `REFUND_LIMIT`, `REMEDY_ELIGIBILITY`, `HUMAN_REVIEW_REQUIRED`), existing payments/refund balances (`calculateRemainingRefundable`), and marketplace context.
  - Blocks auto-eligibility for refunds/replacements when BERR is missing/insufficient (`INSUFFICIENT_BEG_DATA`), buyer evidence is blocked, seller response is missing, unresolved conflicts exist (forces escalation / `HUMAN_REVIEW`), or full refund is already completed/pending.
- **Proposal Lifecycle ([`ProposalWorkflowService`](file:///c:/Projects/resolvegraph/src/server/resolution/proposal-workflow.ts), [`ResolutionOrchestrationService`](file:///c:/Projects/resolvegraph/src/server/orchestration/resolution-orchestration.service.ts))**:
  - Persists `ResolutionProposal` (`PROPOSED` -> bilateral responses via `POST /api/resolution-proposals/[proposalId]/respond` -> `AGREED` or `REJECTED` / `COUNTER_PROPOSED`), tracks independent `authorizationStatus` (`PENDING_APPROVAL` -> `APPROVED` / `REJECTED`), and records all transitions to `CaseEvent`, `InvestigationTimelineEvent`, and `SecurityAuditService`.
  - **Approver Gate (`POST /api/resolution-proposals/[proposalId]/review`)**: Restricted strictly to `ADMIN`, `RESOLUTION_MANAGER`, or `isPlatformAdmin`; blocks authorization if underlying BERR is `INSUFFICIENT_BEG_DATA`, contested conflicts haven't been escalated/resolved, or balance is exhausted.
- **Case Workspace UI**: [`ResolutionPanel`](file:///c:/Projects/resolvegraph/src/components/cases/resolution-panel.tsx) calls `resolution-options`, `resolution-proposals`, `respond`, `review`, and `execute` endpoints cleanly.

---

## 14. Resolution Engine (Refunds & Replacements Execution) Audit

- **Execution Endpoint**: `POST /api/resolution-proposals/[proposalId]/execute` ([`execute/route.ts`](file:///c:/Projects/resolvegraph/src/app/api/resolution-proposals/[proposalId]/execute/route.ts)) validates authenticated user, case authorization, and executor role (`isPlatformAdmin`, `ADMIN`, `RESOLUTION_MANAGER`, or `RefundService.isAuthorizedRefundApprover`), then invokes `ResolutionOrchestrationService.executeAuthorizedProposal()`.
- **Refund Execution Path ([`RefundService`](file:///c:/Projects/resolvegraph/src/server/paypal/services/refund.service.ts))**:
  - Protected by per-payment async serialization mutex (`paymentLocks`), `KillSwitchService.getStatus().isOutboundPayPalKilled`, `isAuthorizedRefundApprover`, completed PayPal capture status, non-`INSUFFICIENT_BEG_DATA` assessment check, duplicate proposal refund prevention, currency match, and remaining balance invariant (`COMPLETED + PENDING + PROCESSING` deducted).
  - Case only marks `RESOLVED` when PayPal refund returns `COMPLETED` immediately or asynchronously via idempotent PayPal webhook (`PAYMENT.CAPTURE.REFUNDED`), **never** when `FAILED` or still `PENDING`; retries are permitted after `FAILED`.
- **Replacement Execution Path ([`ReplacementExecutionService`](file:///c:/Projects/resolvegraph/src/server/orchestration/replacement-execution.service.ts))**:
  - Strictly enforces multi-step custody: Authorization (`PROPOSAL` `APPROVED` & `AGREED`) -> Seller Stock Confirmation (`SELLER_CONFIRM`) -> Physical Dispatch creating/updating signed `PackagePassport` (`DISPATCH`, sets case `EXECUTING_REPLACEMENT`) -> Confirmed Delivery (`CONFIRM_DELIVERY` / `DeliveryReminderService.syncDeliveredPackage` -> `CaseStatus.RESOLVED`).
  - Explicitly forbids marking a replacement dispute `RESOLVED` upon authorization or dispatch alone.

---

## 15. Payments, Webhooks & Reconciliation Audit

- **PayPal Subsystem (`src/server/paypal/`)**:
  - Implements real OAuth2 single-flight token caching (`PayPalAuthService`), HTTP client (`PayPalClient`), Orders/Captures/Refunds/Disputes/Evidence Compilation/Sync/Reconciliation services, and webhook certificate URL allowlist SSRF guard + signature verification delegation (`WebhookVerificationService`).
  - **Crucial Runtime Caveat (`paypal-config.ts`)**: Because `.env` sets `PAYPAL_CLIENT_ID=sb_sandbox_client_id`, `AI_PROVIDER=test`, and `PAYPAL_LIVE_ENABLED=false`, `PayPalProviderFactory.getProvider()` resolves to stateful in-memory `PayPalMockProvider`. Real HTTP execution via `PayPalRestProvider` requires valid non-placeholder sandbox credentials and `AI_PROVIDER !== 'test'`.
- **Other Payment Rails (`src/server/payments/`)**:
  - `PhonePePaymentAdapter`: Implements real SHA-256 X-VERIFY checksum formatting; `verifyPayment()` returns `UNVERIFIABLE_WITHOUT_CREDENTIALS` without env keys, while `fetchPayment()` and `requestRefund()` return hardcoded demo responses (`249900`, `PENDING_GATEWAY_INTEGRATION`).
  - `GooglePayPaymentAdapter`: Always returns hardcoded `fetchPayment` (`649900`), `verifyPayment` (`verified: false`, `CUSTOMER_SUBMITTED`), and `MANUAL_INTERVENTION_REQUIRED` for refunds.
  - `CardNetworkAdapter`: Always returns hardcoded `124900` / `AUTH_09219` / chargeback draft simulation.
- **India UPI Complaints (`UpiComplaintService`)**: Records `PaymentComplaint` safely under `CUSTOMER_SUBMITTED` with RBI/NPCI statutory guidance (T+1 reversal, ₹100/day penalty notice, zero-liability 72h reporting advisory) and makes zero false claims of bank verification.
- **Canonical Ledger & Matching (`CanonicalTransactionService`, `CrossPlatformMatchingService`)**: Uses integer minor-unit arithmetic (`BigInt`-safe/largest-remainder proportional allocation) and deterministic 10-tier matching (`MATCHED`, `REVIEW`, `UNMATCHED`, `CONFLICT`).
- **Root-Cause Investigation (`RootCauseInvestigationService`)**: Evaluates 18 incident categories deterministically, distinguishing `VERIFIED_FACT`, `SOURCE_SUPPORTED_CLAIM`, `HYPOTHESIS`, `CONTRADICTION`, and `MISSING_INFORMATION`.

---

## 16. Marketplaces & External Communication Integrations Audit

- **Marketplace Adapters (`src/server/integrations/marketplace/`)**:
  - `AmazonSpApiAdapter`, `FlipkartAdapter`, `MerchantWebhookAdapter`, `MarketplaceRegistry`: Verify HMAC webhook signatures cleanly (`crypto.timingSafeEqual`) and normalize webhook JSON payloads (`AmazonSpApiAdapter` has hardcoded SSD item defaults if fields omit item metadata). `fetchOrder()` returns `null` (notes SP-API/Flipkart OAuth requirements; zero live HTTPS API calls implemented).
  - `UcpAp2ProtocolAdapter` (`protocols/ucp-ap2.adapter.ts`): Pure library helper generating SHA-256 Merkle/HMAC UCP/1.0 dispute packages & AP2/1.0 mandate signature checks — not exposed via any API route or UI.
- **Marketplace Communication Service (`src/server/seller/marketplace-communication.service.ts`)**: Honest capability check blocks automated marketplace API dispatch when live credentials are missing, routing unregistered sellers cleanly to Priority 3 Customer-Assisted Official Help Centre fallback.
- **Enterprise API Endpoints (`/api/enterprise/{orders,packages,dispatch,proposals}`)**: Protected by `requireEnterpriseAuth` (`src/server/auth/enterprise-api-auth.ts`) — **warning**: accepts demo/prefix tokens directly (Section 28).
- **External Email / Push**: No Nodemailer/SendGrid/SMTP or FCM push SDK is installed in `package.json`; delivery reminders & seller notifications operate via persisted SQLite `NotificationMessage` rows and console/UI badges.

---

## 17. Purchase Memory, Package Passport & Dual-Sight Capture Audit

- **Purchase Memory (`PurchaseDetectionService`, `PurchaseMemoryService`)**: Parses forwarded email text/JSON/CSV/manual purchases, detects duplicates by `externalOrderId`, writes immutable SHA-256 `PurchaseSnapshot`, `PurchaseSpecification`, and `PurchasePromise` rows (`ORDER` promises never overwritten by post-delivery claim diffs), and compares claims against promises (`POST /api/purchases/[id]/compare-dispute`).
  - *UI Bug*: [`purchases/page.tsx:161`](file:///c:/Projects/resolvegraph/src/app/(workspace)/purchases/page.tsx#L161) calls `POST /api/purchases/extract` (which does not exist; real endpoint is `/api/purchases/detect`) and fakes success inside `catch`.
- **Package Passport (`PackagePassportService`, `/packages`)**: Generates `PKG-2026-*` records, HMAC-SHA256 QR verification tokens (`/api/packages/verify/[token]` strips buyer PII publicly), SVG QR previews, tamper-evident physical `PackageSeal` hashes, and dispatch custody chain events.
- **Dual-Sight Unboxing Capture (`CameraSessionService`, `/intake`)**: Generates 15-minute 6-digit visual unboxing challenges, ingests stream buffers with SHA-256 verification, and materializes unboxing `Evidence` records on the dispute.

---

## 18. Mobile Companion App Audit (Android `resolvegraph-capture`)

- **Structure (`mobile/android/resolvegraph-capture/`)**: 13 Kotlin/Gradle/XML files (`MainActivity.kt`, `CaptureActivity.kt`, `CameraCapabilityDetector.kt`, `ResolveGraphApiClient.kt`).
- **Actual Observed Behavior**:
  - `CameraCapabilityDetector` probes Camera2 concurrent multi-camera support and detects rear/front capabilities.
  - `ResolveGraphApiClient` uses `HttpURLConnection` pointing by default to emulator host `http://10.0.2.2:3000` (polling `/api/unboxing/sessions/{token}`, uploading multipart streams, triggering `/complete`). Note: no auth cookie/login screen exists in the app, yet `/api/unboxing/sessions/[token]/upload` & `/complete` enforce `requireAuth`, and `middleware.ts` intercepts unauthenticated requests.
  - `CaptureActivity.kt:74-86` starts CameraX `Preview` on screen, **does NOT bind `VideoCapture`**, and on Stop writes a synthetic `ByteArray(1024) { 0x42 }` fake `.mp4` buffer to temp storage and uploads that placeholder file.

---

## 19. Multi-Agent Copilot, Guardrails & SRE Operations Audit

- **Architecture (`src/server/agents/`)**:
  - Coordinator (`AgentCoordinatorService`), orchestrator (`AgentOrchestrator` + `AgentRunService`), 9 specialist agent classes (`CaseTriage`, `EvidenceInvestigator`, `PolicyRemedy`, `CommunicationDrafter`, `QualityReview`, `PaymentInvestigation`, `PaymentReconciliation`, `RootCauseInvestigation`, `SecurityAndApproval`), tool registry (`ToolRegistry` with Zod schemas + org isolation across `read/draft/review` tools), guardrails (`InputGuardrails`, `OutputGuardrails`, `FinancialActionGuardrails`), approval service (`AgentApprovalService`), and SRE recovery (`AgentOperationsService`).
- **Observed Reality**:
  - Non-negotiable financial guardrail blocks `DISALLOWED_AUTONOMOUS_OPERATIONS` (`execute_refund`, `capture_paypal_order`, `accept_paypal_dispute`, `escalate_paypal_dispute`, `send_live_customer_email`, `close_case_unilaterally`).
  - Approval flow uses SHA-256 `argumentsHash` tamper verification and role checks; materializes approved drafts into `ResolutionProposal`.
  - Runs deterministically via rule-based specialist logic (no live multi-turn LLM tool-calling loop executing arbitrary completions). Note `draft-tools.ts` falls back to `mock-${Date.now()}` IDs if a tool is invoked outside an active `AgentRun`.
  - SRE `AgentOperationsService` recovers stuck runs (>15 min) and expires overdue `AgentApprovalRequest`s.

---

## 20. Analytics, Overview, Reporting & Notifications Audit

- **Unified Overview ([`OverviewService`](file:///c:/Projects/resolvegraph/src/server/services/overview.service.ts), [`overview/page.tsx`](file:///c:/Projects/resolvegraph/src/app/overview/page.tsx))**: Server-rendered & role-scoped for `PLATFORM`, `BUYER`, and `MERCHANT` sessions (`BUYER` scoped strictly to their cases/claims; `MERCHANT` to org). Meanwhile [`DashboardService.getSummary()`](file:///c:/Projects/resolvegraph/src/server/services/dashboard.service.ts#L414-L421) returns real DB KPIs alongside a hardcoded `integrationHealth` array (listing static `'Gemini 1.5 Multimodal Engine'`, `'240ms'`, `'310ms'`, etc.).
- **Analytics ([`AnalyticsService`](file:///c:/Projects/resolvegraph/src/server/services/analytics.service.ts), [`analytics/page.tsx`](file:///c:/Projects/resolvegraph/src/app/(workspace)/analytics/page.tsx))**: Backend calculates tenant-scoped metrics from Prisma. Frontend renders live KPIs, AI accuracy stats, and `MONTHLY_VOLUME`, **but 5 charts/tables (`TREND_SERIES`, `STATUS_DATA`, `OUTCOME_DATA`, `PRIORITY_DATA`, `MERCHANT_STATS`) display hardcoded demo constants**.
- **Investigation Reports ([`InvestigationReportService`](file:///c:/Projects/resolvegraph/src/server/services/investigation-report.service.ts), `/api/investigations/[caseId]/report`)**: Generates real DB-derived JSON, Markdown, and CSV dossiers with PII masking for unauthorized roles. Does not generate binary `.pdf` files.
- **Notifications ([`NotificationPanel`](file:///c:/Projects/resolvegraph/src/components/common/notification-panel.tsx))**: Renders live DB `/api/notifications` with unread count and mark-read for `BUYER` and `MERCHANT` accounts, **while `ADMIN`/platform view falls back to static `EnterpriseDemoNotificationPanel` (`DEMO_NOTIFICATIONS`)**.

---

## 21. Frontend Pages & UI-to-Backend Connectivity Audit

All **41** `page.tsx` routes under `src/app/` inspected via source audit (`LIVE = wired to real backend APIs`, `PARTIAL = mixed live + demo/broken API`, `STATIC/SIM = purely static UI or local timer/mock`):

| # | Route Path | Component File | Rendering | Connectivity Classification & Notes |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `/` | `src/app/page.tsx` | Server | **STATIC/MARKETING**: Renders `MarketingHomePage` + interactive landing showcase + hardcoded Three.js graph (`interactive-evidence-graph.tsx`) |
| 2 | `/overview` | `src/app/overview/page.tsx` | Server | **LIVE (Scoped)**: Uses `OverviewService.getScopedOverview()` for session user |
| 3 | `/dashboard` | `src/app/(workspace)/dashboard/page.tsx` | Server | **REDIRECT**: 5-line redirect to `/overview` |
| 4 | `/docs` | `src/app/docs/page.tsx` | Server | **STATIC**: API reference documentation & examples |
| 5 | `/methodology` | `src/app/methodology/page.tsx` | Server | **STATIC**: BERR/BEG methodology explainer |
| 6 | `/sign-in` | `src/app/(auth)/sign-in/page.tsx` | Client | **LIVE + DEMO**: Better Auth `signIn.email` + one-click `/api/auth/demo-login` |
| 7 | `/sign-up` | `src/app/(auth)/sign-up/page.tsx` | Client | **LIVE**: Better Auth `signUp.email` |
| 8 | `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Client | **SIMULATED**: 600ms `setTimeout` alert; zero backend API |
| 9 | `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Client | **SIMULATED**: 600ms `setTimeout` redirect; zero backend API |
| 10 | `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | Client | **STATIC**: Placeholder confirmation screen |
| 11 | `/access-denied` | `src/app/(auth)/access-denied/page.tsx` | Client | **STATIC**: Role access denied landing notice |
| 12 | `/cases` | `src/app/(workspace)/cases/page.tsx` | Client | **PARTIAL / LIVE**: Buyers render `BuyerComplaintsList` (100% live `/api/complaints/my`); Admin/Ops uses `useDemoCases` (`/api/cases` merged with `CANONICAL_DEMO_CASE`) |
| 13 | `/cases/[caseId]` | `src/app/(workspace)/cases/[caseId]/page.tsx` | Client | **PARTIAL / LIVE**: Buyers render live `BuyerCaseDetail`; Enterprise tabs (`graph`, `berr`, `seller_outreach`, `resolution`, `paypal`, `copilot`, `report`) hit live backend APIs, while `handleStatusChange` mutates via `useDemoCases` (`usr_priya_admin` fallback) & missing case falls back to `CANONICAL_DEMO_CASE` |
| 14 | `/intake` | `src/app/(workspace)/intake/page.tsx` | Client | **LIVE**: Calls `/api/cases`, `/api/evidence/intake`, `/api/evidence/extractions/[id]`, `/api/unboxing/sessions/*` |
| 15 | `/evidence` | `src/app/(workspace)/evidence/page.tsx` | Client | **PARTIAL / LIVE**: Calls `/api/evidence` & `/api/evidence/intake` with `DEMO_EVIDENCE` fallback |
| 16 | `/investigation` | `src/app/(workspace)/investigation/page.tsx` | Client | **STATIC (FRONTEND ONLY)**: Static feature showcase (`RECOURSE-BENCH: 89.3% Accuracy`) & links |
| 17 | `/reconciliation` | `src/app/(workspace)/reconciliation/page.tsx` | Client | **LIVE + DEMO FALLBACK**: Calls `/api/cases`, `/api/transactions/canonical`, `/api/transactions/reconcile` |
| 18 | `/incidents` | `src/app/(workspace)/incidents/page.tsx` | Client | **LIVE**: Calls `/api/cases`, `/api/investigations/[caseId]`, `/report`, `/api/payments/complaints/*` |
| 19 | `/multilingual` | `src/app/(workspace)/multilingual/page.tsx` | Client | **PARTIAL / SIMULATED**: Calls `/api/complaints/multilingual` (regex parser + static template translation; browser-only `webkitSpeechRecognition`) |
| 20 | `/purchases` | `src/app/(workspace)/purchases/page.tsx` | Client | **PARTIAL (BUGGY)**: Calls live `/api/purchases/memory` & `/compare-dispute`, but "Simulate" calls non-existent `/api/purchases/extract` with catch fallback |
| 21 | `/packages` | `src/app/(workspace)/packages/page.tsx` | Client | **LIVE**: Calls `/api/packages`, `/seal`, `/dispatch`, `/verify/[token]`, `/api/delivery/*` |
| 22 | `/payments` | `src/app/(workspace)/payments/page.tsx` | Client | **LIVE (Sanitized/Mock Adapter Backend)**: Calls `/api/payments` |
| 23 | `/payments/[paymentId]` | `src/app/(workspace)/payments/[paymentId]/page.tsx` | Client | **LIVE**: Calls `/api/payments/[paymentId]` & `/reconciliation` |
| 24 | `/paypal/disputes` | `src/app/(workspace)/paypal/disputes/page.tsx` | Client | **LIVE (Mock Provider under `.env`)**: Calls `/api/paypal/disputes` |
| 25 | `/paypal/disputes/[disputeId]` | `src/app/(workspace)/paypal/disputes/[disputeId]/page.tsx` | Client | **LIVE**: Calls `/api/paypal/disputes/[disputeId]` + `/evidence` + `/respond` |
| 26 | `/copilot` | `src/app/(workspace)/copilot/page.tsx` | Client | **PARTIAL / LIVE**: Calls `/api/copilot/runs`, `/approvals/[id]/respond`, `/api/cases` (imports `DEMO_CASES` fallback) |
| 27 | `/resolution` | `src/app/(workspace)/resolution/page.tsx` | Client | **PARTIAL / LIVE**: Calls `/api/resolution-proposals` & `/review` with `DEMO_REMEDIES` fallback |
| 28 | `/resolution-room` | `src/app/(workspace)/resolution-room/page.tsx` | Client | **LIVE**: Calls `/api/cases` & `/api/cases/[caseId]/messages` |
| 29 | `/seller` | `src/app/(workspace)/seller/page.tsx` | Client | **LIVE**: Redirect/summary calling `/api/seller/requests` |
| 30 | `/seller/requests` | `src/app/(workspace)/seller/requests/page.tsx` | Client | **LIVE**: Org-scoped requests list via `/api/seller/requests` |
| 31 | `/seller/requests/[requestId]` | `src/app/(workspace)/seller/requests/[requestId]/page.tsx` | Client | **LIVE**: Guided 4-step wizard, draft save, response submit, follow-ups |
| 32 | `/seller/responses` | `src/app/(workspace)/seller/responses/page.tsx` | Client | **LIVE**: Submitted responses table via `/api/seller/responses` |
| 33 | `/seller/responses/[responseId]` | `src/app/(workspace)/seller/responses/[responseId]/page.tsx` | Client | **LIVE**: Response detail & attachments via `/api/seller/responses/[responseId]` |
| 34 | `/seller/directory` | `src/app/(workspace)/seller/directory/page.tsx` | Client | **LIVE**: Directory search/CRUD via `/api/seller/directory/*` |
| 35 | `/seller/profile` | `src/app/(workspace)/seller/profile/page.tsx` | Client | **LIVE**: Seller org profile settings via `/api/seller/profile` |
| 36 | `/analytics` | `src/app/(workspace)/analytics/page.tsx` | Client | **PARTIAL**: KPIs live from `/api/analytics`; 5 breakdown datasets hardcoded |
| 37 | `/organizations` | `src/app/(workspace)/organizations/page.tsx` | Client | **LIVE**: Multi-tenant orgs & member invite/role management via `/api/organizations/*` |
| 38 | `/admin/security` | `src/app/(workspace)/admin/security/page.tsx` | Client | **PARTIAL (UI MISMATCH BUG)**: Kill switch live; `/api/audit/chained` expects wrong JSON keys (`records` vs `recentRecords`, `isChainValid` vs `verification.isValid`) |
| 39 | `/settings` | `src/app/(workspace)/settings/page.tsx` | Client | **LIVE**: Profile edit via `/api/profile` & system status via `/api/health` |
| 40 | `/demo` | `src/app/(workspace)/demo/page.tsx` | Client | **SIMULATED DEMO TOOL**: Triggers `GET/POST /api/demo/paypal-investigation` |
| 41 | `/help` | `src/app/(workspace)/help/page.tsx` | Client | **STATIC (FRONTEND ONLY)**: Help guide & shortcuts |

*Global Chrome Note*: [`app-sidebar.tsx`](file:///c:/Projects/resolvegraph/src/components/layout/app-sidebar.tsx) renders static hardcoded `ACTION_BADGES` (`12`, `4`, `2`, `3`).

---

## 22. Complete Backend API Routes Inventory

All **118** Next.js Route Handlers under `src/app/api/` directly enumerated from repository scan:

| Domain Group | Route Path | Methods | Route-Level Guard Observed |
| :--- | :--- | :--- | :--- |
| **Auth / Health / Demo** | `/api/auth/[...all]` | Better Auth handler | Session/Auth handler |
| | `/api/auth/demo-login` | `POST` | Public (if `RESOLVEGRAPH_DEMO_ACCESS`, rate-limited) |
| | `/api/health` | `GET` | Public (`PUBLIC_PATHS`) |
| | `/api/demo/paypal-investigation` | `POST`, `GET` | **NONE** at route level (middleware checks session only) |
| **Admin / Audit / Users / Orgs** | `/api/admin/kill-switch` | `GET`, `POST` | `requirePlatformAdmin` |
| | `/api/ai/gemini/health` | `GET`, `POST` | `requirePlatformAdmin` |
| | `/api/audit/chained` | `GET` | `requirePlatformAdmin` |
| | `/api/profile` | `GET`, `PATCH` | `requireAuth` |
| | `/api/users` | `GET` | `requireAuth` + role (`ADMIN`/`RESOLUTION_MANAGER`) |
| | `/api/organizations` | `GET`, `POST` | `authorize` / session |
| | `/api/organizations/[orgId]` | `GET`, `PATCH` | `authorize` / session |
| | `/api/organizations/[orgId]/members/invite` | `POST` | `authorize` / session |
| | `/api/organizations/[orgId]/members/[memberId]` | `PATCH`, `DELETE` | `authorize` / session |
| **Overview / Dashboard / Notifications** | `/api/overview/summary` | `GET` | `requireAuth` |
| | `/api/dashboard/summary` | `GET` | `authorize` / session |
| | `/api/analytics` | `GET` | `authorize` / session |
| | `/api/notifications` | `GET` | `requireAuth` |
| | `/api/notifications/[id]/read` | `POST` | `requireAuth` |
| | `/api/notifications/read-all` | `POST` | `requireAuth` |
| **Cases, BEG & BERR** | `/api/cases` | `GET`, `POST` | `requireAuth` |
| | `/api/cases/[caseId]` | `GET`, `PATCH` | `requireAuth` + case/mutation auth |
| | `/api/cases/[caseId]/claims` | `GET`, `POST` | `requireAuth` |
| | `/api/cases/[caseId]/evidence` | `GET`, `POST` | `requireAuth` + case auth |
| | `/api/cases/[caseId]/events` | `GET` | **NONE** (no `requireAuth`/`getCaseByIdAuthorized` IDOR risk) |
| | `/api/cases/[caseId]/lifecycle` | `GET` | `requireAuth` + case auth |
| | `/api/cases/[caseId]/messages` | `GET`, `POST` | `requireAuth` + case auth |
| | `/api/cases/[caseId]/replay` | `GET` | `requireAuth` |
| | `/api/cases/[caseId]/timeline` | `GET`, `POST` | `requireAuth` |
| | `/api/cases/[caseId]/timeline/[eventId]` | `GET` | `requireAuth` |
| | `/api/cases/[caseId]/graph` | `GET` | `requireAuth` + `canViewInternalBegGraph` |
| | `/api/cases/[caseId]/graph/expand` | `GET` | `requireAuth` + `canViewInternalBegGraph` |
| | `/api/cases/[caseId]/graph/rebuild` | `POST` | `requireAuth` + `canMutateBegGraph` |
| | `/api/cases/[caseId]/beg/edges/[edgeId]/action` | `POST` | `requireAuth` + `canMutateBegGraph` |
| | `/api/cases/[caseId]/beg/evidence/[evidenceId]/preview` | `GET` | `requireAuth` + `canViewEvidence` |
| | `/api/cases/[caseId]/relationships` | `GET`, `POST` | `requireAuth` |
| | `/api/cases/[caseId]/relationships/review` | `POST` | `requireAuth` |
| | `/api/cases/[caseId]/berr-v2` | `GET`, `POST` | `requireAuth` + `canViewInternalBegGraph` |
| | `/api/cases/[caseId]/berr-v2/review` | `POST` | `requireAuth` + `canMutateBegGraph` |
| | `/api/cases/[caseId]/analysis` | `GET`, `POST` | `requireAuth` |
| | `/api/cases/[caseId]/financial-safeguards` | `POST` | `requireAuth` |
| | `/api/cases/[caseId]/resolution-options` | `GET` | `requireAuth` |
| | `/api/cases/[caseId]/resolution-proposals` | `GET`, `POST` | `requireAuth` + `canMutateCase` |
| | `/api/cases/[caseId]/seller-workflow` | `GET`, `POST`, `PATCH` | `requireAuth` |
| **Buyer Complaints & Multilingual** | `/api/complaints/submit` | `POST` | `requireAuth` |
| | `/api/complaints/suggest-title` | `POST` | `requireAuth` + auth check |
| | `/api/complaints/my` | `GET` | `requireAuth` |
| | `/api/complaints/[caseId]` | `GET` | `requireAuth` |
| | `/api/complaints/[caseId]/evidence` | `POST` | `requireAuth` + case auth |
| | `/api/complaints/[caseId]/seller-outreach` | `POST` | `requireAuth` |
| | `/api/complaints/multilingual` | `POST`, `PATCH` | `requireAuth` |
| **Evidence, AI Runs & Investigations** | `/api/evidence` | `GET` | `authorize` / `requireAuth` |
| | `/api/evidence/intake` | `POST` | `requireAuth` |
| | `/api/evidence/extractions/[id]` | `PATCH` | `requireAuth` |
| | `/api/evidence/[evidenceId]/download` | `GET` | Session + `canViewEvidence` |
| | `/api/evidence/[evidenceId]/analyze` | `GET`, `POST` | `requireAuth` |
| | `/api/evidence/[evidenceId]/ai-consent` | `POST`, `DELETE` | `requireAuth` |
| | `/api/claims/[claimId]/ai-consent` | `POST`, `DELETE` | `requireAuth` |
| | `/api/analysis/[runId]` | `GET` | `requireAuth` |
| | `/api/analysis/[runId]/review` | `POST` | `requireAuth` |
| | `/api/investigations/[caseId]` | `GET`, `POST` | `requireAuth` |
| | `/api/investigations/[caseId]/report` | `GET` | `requireAuth` |
| **Seller Portal & Directory** | `/api/seller/directory` | `GET`, `POST` | `requireAuth` |
| | `/api/seller/directory/[sellerId]` | `PATCH` | `requireAuth` |
| | `/api/seller/profile` | `GET`, `PATCH` | `requireAuth` + SellerPortal RBAC |
| | `/api/seller/requests` | `GET` | `requireAuth` + SellerPortal RBAC |
| | `/api/seller/requests/[requestId]` | `GET`, `PATCH` | `requireAuth` + SellerPortal RBAC |
| | `/api/seller/requests/[requestId]/respond` | `POST` | `requireAuth` + SellerPortal RBAC |
| | `/api/seller/requests/[requestId]/follow-up` | `POST` | `requireAuth` + SellerPortal RBAC |
| | `/api/seller/responses` | `GET` | `requireAuth` + SellerPortal RBAC |
| | `/api/seller/responses/[responseId]` | `GET` | `requireAuth` + SellerPortal RBAC |
| **Resolution Proposals & Replacements** | `/api/resolution-proposals` | `GET` | `requireAuth` |
| | `/api/resolution-proposals/[proposalId]` | `GET` | `requireAuth` |
| | `/api/resolution-proposals/[proposalId]/respond` | `POST` | `requireAuth` + participant auth |
| | `/api/resolution-proposals/[proposalId]/review` | `POST` | `requireAuth` + Manager/Admin |
| | `/api/resolution-proposals/[proposalId]/execute` | `POST` | `requireAuth` + executor role |
| | `/api/replacements` | `GET`, `POST` | `requireAuth` + case/seller auth |
| | `/api/replacements/[fulfillmentId]` | `GET`, `POST` | `requireAuth` + case/seller auth |
| **Commerce, Purchase Memory, Packages, Camera** | `/api/commerce/orders` | `GET`, `POST` | `requireAuth` |
| | `/api/commerce/orders/[orderId]` | `GET` | `requireAuth` |
| | `/api/purchases/detect` | `POST` | `requireAuth` |
| | `/api/purchases/memory` | `GET`, `POST` | `requireAuth` |
| | `/api/purchases/[id]` | `GET` | `requireAuth` |
| | `/api/purchases/[id]/compare-dispute` | `POST` | `requireAuth` |
| | `/api/packages` | `GET`, `POST` | `requireAuth` |
| | `/api/packages/[id]` | `GET` | `requireAuth` |
| | `/api/packages/[id]/seal` | `POST` | `requireAuth` |
| | `/api/packages/[id]/dispatch` | `POST` | `requireAuth` |
| | `/api/packages/verify/[token]` | `GET` | **NONE** at route (privacy-safe QR lookup; gated by middleware unless cookie/demo header present) |
| | `/api/delivery/events` | `POST` | `requireAuth` |
| | `/api/delivery/confirm-receipt` | `POST` | `requireAuth` |
| | `/api/unboxing/sessions` | `POST` | `requireAuth` |
| | `/api/unboxing/sessions/[token]` | `GET` | **NONE** at route (middleware blocks unauth API calls) |
| | `/api/unboxing/sessions/[token]/upload` | `POST` | `requireAuth` |
| | `/api/unboxing/sessions/[token]/complete` | `POST` | `requireAuth` |
| **Payments, PayPal, Reconciliation & UPI** | `/api/payments` | `GET` | `requireAuth` |
| | `/api/payments/[paymentId]` | `GET` | `requireAuth` |
| | `/api/payments/[paymentId]/refund` | `POST` | `requireAuth` |
| | `/api/payments/[paymentId]/reconciliation` | `GET` | `requireAuth` |
| | `/api/payments/complaints` | `GET`, `POST` | `requireAuth` |
| | `/api/payments/complaints/upi` | `POST` | `requireAuth` |
| | `/api/payments/paypal/orders` | `POST` | `requireAuth` |
| | `/api/payments/paypal/orders/[orderId]/capture` | `POST` | `requireAuth` |
| | `/api/paypal/disputes` | `GET` | `requireAuth` + org scope |
| | `/api/paypal/disputes/[disputeId]` | `GET` | `requireAuth` |
| | `/api/paypal/disputes/[disputeId]/respond` | `POST` | `requireAuth` |
| | `/api/paypal/disputes/[disputeId]/evidence` | `POST` | `requireAuth` |
| | `/api/webhooks/paypal` | `POST` | `verifyWebhook` (`PUBLIC_PATHS`) |
| | `/api/transactions/canonical` | `GET`, `POST` | `requireAuth` |
| | `/api/transactions/reconcile` | `GET`, `POST` | `requireAuth` |
| **AI Copilot** | `/api/copilot/runs` | `GET`, `POST` | `requireAuth` |
| | `/api/copilot/runs/[runId]` | `GET` | `requireAuth` |
| | `/api/copilot/runs/[runId]/cancel` | `POST` | `requireAuth` |
| | `/api/copilot/approvals` | `GET` | `requireAuth` |
| | `/api/copilot/approvals/[approvalId]/respond` | `POST` | `requireAuth` |
| **Enterprise API** | `/api/enterprise/orders` | `POST` | `requireEnterpriseAuth` (weak key pattern check) |
| | `/api/enterprise/packages` | `POST` | `requireEnterpriseAuth` |
| | `/api/enterprise/dispatch` | `POST` | `requireEnterpriseAuth` |
| | `/api/enterprise/proposals` | `GET` | `requireEnterpriseAuth` |

*(Total across all domain groups: 4 + 9 + 6 + 24 + 7 + 11 + 9 + 7 + 17 + 15 + 5 + 4 = **118** route files).*

---

## 23. Master Feature Status Classification Table

Every major feature classified strictly using the 6 required states (`60` total features):

| # | Feature / Capability | Primary Files / Services | Classification | Verification Evidence & Caveat |
| :-: | :--- | :--- | :--- | :--- |
| 1 | Better Auth authentication & RBAC helpers | `src/lib/auth.ts`, `session.ts`, `permissions.ts` | `WORKING AND VERIFIED` | Pass `authorization.test.ts`, `pilot-readiness.test.ts` |
| 2 | Next.js Edge Middleware route protection | `src/middleware.ts` | `WORKING AND VERIFIED` | Intercepts unauth UI/API routes |
| 3 | Case Management CRUD & state machine | `CaseService`, `/api/cases/**` | `WORKING AND VERIFIED` | Pass `backend.test.ts`, `api-routes.test.ts` |
| 4 | Local Disk Content-Addressed Evidence Vault | `LocalEvidenceStorage`, `/api/evidence/[evidenceId]/download` | `WORKING AND VERIFIED` | Magic-byte checks + `.private` + `file-storage.test.ts` |
| 5 | PDF & Text Extraction + Normalization | `PdfExtractor`, `TextExtractor`, `FactNormalizer` | `WORKING AND VERIFIED` | Real `unpdf` extraction (`ai-extraction.test.ts`; no scanned-PDF OCR) |
| 6 | Buyer Complaint Submission & Case Tracking | `/api/complaints/submit`, `BuyerTrackingService` | `WORKING AND VERIFIED` | Pass `buyer-complaint-submission.test.ts`, `buyer-seller-audit-e2e.test.ts` |
| 7 | Buyer Evidence Screening & Invoice Seller Extraction | `BuyerScreeningService`, `SellerExtractionService` | `WORKING AND VERIFIED` | Pass `seller-identification-extraction.test.ts` |
| 8 | Seller Directory & Priority Entity Matching | `SellerDirectoryService`, `/api/seller/directory` | `WORKING AND VERIFIED` | Pass `seller-directory-and-gateway.test.ts` |
| 9 | Persisted BEG Graph Assembly, Matching & Validator | `GraphBuilder`, `BegMatcherService`, `BegPersistenceService`, `BegSyncService` | `WORKING AND VERIFIED` | Rejects amount-only links (`beg-system.test.ts`, `graph.test.ts`) |
| 10 | BEG Investigator Edge Actions & Hash Integrity | `/api/cases/[caseId]/beg/edges/[edgeId]/action` | `WORKING AND VERIFIED` | Logs actions & marks BERR stale (`beg-system.test.ts`) |
| 11 | BERR v2 4-Layer Reasoning, Versioning & Review | `BerrV2Service`, `BerrLayersService`, `/berr-v2/**` | `WORKING AND VERIFIED` | `AGREED/VERIFIED/CONTESTED/MISSING` + RBAC (`berr-system.test.ts`) |
| 12 | Policy Engine & Bilateral Proposal Workflow | `ResolutionEngine`, `PolicyValidator`, `ProposalWorkflowService` | `WORKING AND VERIFIED` | Pass `resolution.test.ts`, `e2e-beg-berr-resolution-audit.test.ts` |
| 13 | Financial Refund Safeguards & Kill-Switch Lock | `RefundService`, `KillSwitchService` | `WORKING AND VERIFIED` | Pass `financial-safeguards-negative.test.ts`, `paypal-refunds.test.ts` |
| 14 | Replacement Execution & Delivery-Gated Close | `ReplacementExecutionService`, `/api/replacements/**` | `WORKING AND VERIFIED` | Stays `EXECUTING_REPLACEMENT` until delivery (`e2e-beg-berr-resolution-audit.test.ts`) |
| 15 | Purchase Memory Immutable Snapshot Engine | `PurchaseDetectionService`, `PurchaseMemoryService` | `WORKING AND VERIFIED` | Pass `purchase-memory.test.ts`, `v2-full-lifecycle.test.ts` |
| 16 | Package Passport HMAC-SHA256 QR & Seal Chain | `PackagePassportService`, `/api/packages/**` | `WORKING AND VERIFIED` | Pass `package-passport.test.ts`, privacy-safe verify |
| 17 | Canonical Transactions & 10-Tier Matching | `CanonicalTransactionService`, `CrossPlatformMatchingService` | `WORKING AND VERIFIED` | Minor-unit integer math + `hackathon-expansion.test.ts` |
| 18 | Temporal Sequencing, Replay & Semantic Drift | `TemporalEngine`, `SemanticDriftEngine` | `WORKING AND VERIFIED` | Pass `temporal.test.ts`, `lifecycle-intelligence.test.ts` |
| 19 | Hash-Chained Audit Ledger & Kill Switch Backend | `HashChainedAuditService`, `/api/audit/chained`, `/api/admin/kill-switch` | `WORKING AND VERIFIED` | Cryptographic chain verification verified in tests |
| 20 | Privacy DSAR Export, Legal Holds & Redaction | `PrivacyService`, `DataRedactor`, `ContentSanitizer` | `WORKING AND VERIFIED` | Pass `ai-security.test.ts`, `pilot-readiness.test.ts` |
| 21 | Live Browser/SSR Rendering Verification of Pages | `tests/ui-all-screens.test.ts` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | 26 Phase-8 tests skipped (requires live server on port 3000/3005) |
| 22 | 2D SVG BEG Explorer & Evidence Preview UI | `EvidenceGraphExplorer`, `/beg/evidence/[id]/preview` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Code wired; DOM behavior not exercised in headless run |
| 23 | Seller Portal Workspace & 4-Step Guided Wizard UI | `src/app/(workspace)/seller/**`, `SellerSubmissionWizard` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | APIs verified; live React UI interaction not executed |
| 24 | Buyer Portal Case Tracking & Complaint Detail UI | `BuyerComplaintsList`, `BuyerCaseDetail` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Backend `BuyerTrackingService` tested; browser UI unverified |
| 25 | Google Gemini Health Ping & BERR Layer 2 Hook | `/api/ai/gemini/health`, `berr-layers.service.ts` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Unit/security suite passes; disabled under `.env` (`AI_PROVIDER=test`) |
| 26 | PayPal REST v2 HTTP Sandbox Client & Webhook Sync | `PayPalRestProvider`, `PayPalAuthService`, `WebhookVerificationService` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Auto-routed to `PayPalMockProvider` under current `.env` |
| 27 | Shared Resolution Room Messaging UI | `src/app/(workspace)/resolution-room/page.tsx`, `ResolutionPanel` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Service & routes tested (`shared-resolution.test.ts`); live UI unverified |
| 28 | Multi-Agent Copilot, Tool Registry & SRE Recovery | `src/server/agents/**`, `copilot/page.tsx` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Deterministic plan/guardrails pass (`agent-orchestration.test.ts`); no live LLM loop |
| 29 | Forensic Dossier Report Generator (JSON/MD/CSV) | `InvestigationReportService`, `RootCauseInvestigationService` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Backend tested (`hackathon-expansion.test.ts`); no binary PDF generator |
| 30 | Legacy AI Queue (`AnalysisQueue`, `BerrEngine` v1) | `analysis-queue.ts`, `berr-engine.ts`, `scripts/ai-worker.ts` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | Separate `AIAnalysisRun` / `BerrFinding` pipeline from v2 |
| 31 | Delivery & Pre-Unboxing Reminders (`IN_APP`) | `DeliveryReminderService`, `/api/delivery/**` | `IMPLEMENTED BUT NOT FULLY VERIFIED` | In-app DB alerts pass; external email/push unimplemented |
| 32 | EvidenceGuard Visual Forensics Heuristics | `EvidenceGuardService`, `/api/evidence/[id]/analyze` | `PARTIALLY WORKING` | `computeDifferenceHash` hashes raw first 4KB bytes via MD5, not pixel dHash; route falls back to description buffer |
| 33 | Universal Evidence Intake Magic Bytes & OCR | `UniversalEvidenceIntakeService` | `PARTIALLY WORKING` | Fallback trusts declared `mimeType` header; no binary image OCR |
| 34 | Admin Security & Chained Audit UI Page | `src/app/(workspace)/admin/security/page.tsx` | `PARTIALLY WORKING` | Kill switch works; Audit table parses wrong JSON fields (`records` vs `recentRecords`, `isChainValid` vs `verification.isValid`) |
| 35 | Analytics & Reporting Dashboard | `src/app/(workspace)/analytics/page.tsx` | `PARTIALLY WORKING` | Top KPIs & monthly volume live; 5 breakdown charts/tables hardcoded |
| 36 | Case Detail Page & Dashboard Health Integrations | `cases/[caseId]/page.tsx`, `dashboard.service.ts` | `PARTIALLY WORKING` | Real BEG/BERR/Resolution tabs, mixed with `CANONICAL_DEMO_CASE`, `useDemoCases`, & hardcoded integration health list |
| 37 | Purchase Memory UI Page | `src/app/(workspace)/purchases/page.tsx` | `PARTIALLY WORKING` | Real memory list & compare, but modal calls non-existent `/api/purchases/extract` |
| 38 | Dual-Sight Camera Session API & `/intake` Flow | `CameraSessionService`, `/api/unboxing/sessions/**` | `PARTIALLY WORKING` | DB session/hash works; `[token]` GET lacks route-level auth; heuristic continuity |
| 39 | India UPI Complaint Escalation Module | `UpiComplaintService`, `/api/payments/complaints/upi` | `PARTIALLY WORKING` | Honest `CUSTOMER_SUBMITTED` recording + RBI guidance; zero bank verification |
| 40 | Organization Management & Invites UI | `/api/organizations/**`, `organizations/page.tsx` | `PARTIALLY WORKING` | DB memberships work; no real SMTP invite email dispatch |
| 41 | Enterprise API Key Ingestion Endpoints | `/api/enterprise/**`, `enterprise-api-auth.ts` | `PARTIALLY WORKING` | Routes work, but `rg_ent_*` / `org.slug` token validation is insecure |
| 42 | Android Mobile Video Capture App (`CaptureActivity`) | `mobile/android/resolvegraph-capture/**` | `MOCKED / SIMULATED` | Preview only; Stop generates synthetic `0x42` bytes instead of real video |
| 43 | Multilingual Voice Intake & Translation | `MultilingualVoiceService`, `multilingual/page.tsx` | `MOCKED / SIMULATED` | Template translation wrapper; browser-only `webkitSpeechRecognition` |
| 44 | PayPal Mock Provider (Active Dev Rail) | `PayPalMockProvider` | `MOCKED / SIMULATED` | In-memory `Map` simulator active via `.env` defaults |
| 45 | PhonePe, Google Pay & Card Network Adapters | `src/server/payments/adapters/**` | `MOCKED / SIMULATED` | Return static fixture amounts (`249900`, `649900`, `124900`) & manual states |
| 46 | Amazon / Flipkart / Webhook Adapters | `src/server/integrations/marketplace/**` | `MOCKED / SIMULATED` | HMAC helpers exist; hardcoded SSD fallbacks & `fetchOrder() -> null` |
| 47 | Password Recovery & Email Verification UI | `forgot-password`, `reset-password`, `verify-email` | `MOCKED / SIMULATED` | Client `setTimeout` animations only |
| 48 | Demo Login, Sidebar Badges, Admin Bell & `/demo` Seeder | `demo-login/route.ts`, `app-sidebar.tsx`, `notification-panel.tsx`, `PayPalDemoService` | `MOCKED / SIMULATED` | Static badges (`12/4/2/3`), `DEMO_NOTIFICATIONS` for admin, 13-stage synthetic scenario |
| 49 | Landing Page Interactive 3D Graph | `src/components/3d/interactive-evidence-graph.tsx` | `MOCKED / SIMULATED` | Hardcoded Three.js nodes (`Alex Morgan`) purely decorative |
| 50 | AI Test Provider (`TestAIProvider`) | `src/server/ai/providers/test.provider.ts` | `MOCKED / SIMULATED` | Deterministic regex extractor active under `AI_PROVIDER=test` |
| 51 | AI & Multi-Agent Eval Harnesses | `EvaluationRunner`, `MultiAgentEvaluator` | `MOCKED / SIMULATED` | Baseline D peeks at `groundTruth` (`0.98`); agent evaluator returns constants |
| 52 | Static Investigation Hub & Help Center Pages | `investigation/page.tsx`, `help/page.tsx` | `FRONTEND ONLY / BACKEND ONLY` | `FRONTEND ONLY` informational pages with static `89.3%` text |
| 53 | Gemini Multimodal Evidence Service (Images/Video) | `src/server/ai/gemini/gemini-evidence.service.ts` | `FRONTEND ONLY / BACKEND ONLY` | `BACKEND ONLY` preparation layer unwired from upload/intake & UI |
| 54 | Unmounted UCP/AP2 Adapter & In-Memory `DurableJobWorker` | `ucp-ap2.adapter.ts`, `durable-worker.ts` | `FRONTEND ONLY / BACKEND ONLY` | `BACKEND ONLY` orphaned libraries (empty job processor branches) |
| 55 | AWS S3 / Cloudflare R2 Vault Integration | `src/server/storage/s3-evidence-storage.ts` | `NOT IMPLEMENTED / NOT VERIFIED` | Stub comment only; zero S3 SDK or cloud bucket I/O |
| 56 | PostgreSQL + `pgvector` Database Execution | `prisma/postgres-migration.sql`, `.env.production.example` | `NOT IMPLEMENTED / NOT VERIFIED` | Draft SQL covers 8 tables vs 85 SQLite models; Prisma hardcoded to SQLite |
| 57 | Live OpenAI Execution (`OpenAIProvider`) | `src/server/ai/providers/openai.provider.ts` | `NOT IMPLEMENTED / NOT VERIFIED` | `OPENAI_API_KEY=<EMPTY>`, `AI_PROCESSING_ENABLED=false` |
| 58 | Image / Scanned-PDF Optical Character Recognition (OCR) | `PdfExtractor`, `ImageExtractor`, `SellerExtractionService` | `NOT IMPLEMENTED / NOT VERIFIED` | Flags `isScanned=true` without running Tesseract/Vision OCR in pipeline |
| 59 | Real SMTP Email, Push Transport & Antivirus Scanner | `MalwareScanStatus.NOT_CONFIGURED`, `DeliveryReminderService` | `NOT IMPLEMENTED / NOT VERIFIED` | No SMTP client, push gateway, or ClamAV binary integrated |
| 60 | Live Marketplace SP-API/Flipkart & NPCI Bank APIs | `MarketplaceCommunicationService`, UPI adapters | `NOT IMPLEMENTED / NOT VERIFIED` | Zero live external merchant/bank API tokens or polling |

---

## 24. What RESOLVEGRAPH Can Successfully Do Right Now

1. **Authenticate Buyers, Merchants, Resolution Managers & Platform Admins** via Better Auth (with multi-tenant org roles & isolated queries).
2. **Submit Real Multi-File Buyer Complaints** (`/api/complaints/submit`) with content-addressed SHA-256 disk persistence, buyer evidence screening, role-aware PDF/text seller extraction, and directory matching.
3. **Orchestrate 3-Channel Seller Communication**: Automatically route registered sellers via the native **Seller Portal**, and safely downgrade unregistered marketplace sellers to a guided **Customer-Assisted Help Centre Fallback** (`CUSTOMER_ACTION_REQUIRED`).
4. **Collect Structured Seller Responses via 4-Step Wizard** (`/seller/requests/[requestId]`) with draft persistence, category-specific fields, non-coercive `N/A` options, PII-stripped buyer sharing, and supplemental follow-ups.
5. **Construct & Persist Versioned Bilateral Evidence Graphs (BEG)** with deterministic matching rules, provenance checks, incremental revisions, edge audit actions, and BERR stale marking.
6. **Execute Deterministic Hybrid BERR v2 Evaluation** producing Zod-validated `AGREED / VERIFIED / CONTESTED / MISSING` findings linked to BEG node/edge IDs, uncertainty metrics, append-only assessment versions, and human override trails.
7. **Coordinate Policy-Checked Remedies & Guardrailed Execution**: Block unauthorized or insufficient-evidence refunds/replacements, require dual party agreement + manager/owner authorization, serialize concurrent refunds, retry cleanly after failure, and keep replacements in `EXECUTING_REPLACEMENT` until confirmed `DELIVERED`.
8. **Maintain Immutable Purchase Memory, QR-Signed Package Passports, Hash-Chained Audit Logs, Kill Switches, Canonical Ledger Reconciliation & GDPR/DPDPA Privacy Exports**.

---

## 25. What RESOLVEGRAPH Cannot Yet Do Reliably

1. **Real Financial Settlement or Bank/UPI Clearing**: Current `.env` executes mocked PayPal (`PayPalMockProvider`) and hardcoded PhonePe/GPay/Card responses; cannot verify real bank UTRs or reverse UPI debits.
2. **Automated Visual Image / Scanned-PDF Understanding in Dispute Pipelines**: Scanned invoices (`<30 chars/page`) and product defect photos are not run through OCR or `GeminiEvidenceService` automatically upon intake.
3. **True Image Manipulation / Visual Perceptual Forensics**: `EvidenceGuardService` hashes compressed bytes instead of decoded luminance pixels and inspects limited EXIF headers only.
4. **Live Android Video Proof Recording**: Mobile app emits synthetic `0x42` byte arrays rather than genuine camera hardware video.
5. **True Multilingual Speech-to-Text & Neural Translation**: Kannada/Hindi speech requires Chromium Web Speech API and backend translation uses template wrapping rather than ML translation.
6. **Live External Communication**: Cannot dispatch actual password-reset, org-invite, seller-alert, or delivery-reminder emails/push notifications.
7. **Live UI Smoke Confidence**: The 26-screen live Next.js test suite has not executed cleanly against a running server in this offline audit.

---

## 26. Mocked, Simulated, Hardcoded & Fallback Components Register

| File / Module | Line(s) | Exact Behavior Found |
| :--- | :--- | :--- |
| `src/server/paypal/providers/paypal-mock.provider.ts` | Entire file | In-memory `Map` simulator active whenever `PAYPAL_CLIENT_ID` starts with `sb_`/`mock_` or `AI_PROVIDER=test`. |
| `src/server/ai/providers/test.provider.ts` | Entire file | Deterministic regex mock AI provider active under `AI_PROVIDER=test`. |
| `src/server/payments/adapters/phonepe.adapter.ts` | `L32-74` | Hardcoded amount `249900`, `merchant@ybl`, unverified fallback. |
| `src/server/payments/adapters/gpay.adapter.ts` | `L31-65` | Hardcoded amount `649900`, `CUSTOMER_SUBMITTED`, `MANUAL_INTERVENTION_REQUIRED`. |
| `src/server/payments/adapters/card-network.adapter.ts` | `L13-75` | Hardcoded `124900`, `AUTH_09219`, simulated chargeback draft. |
| `src/server/integrations/marketplace/amazon.adapter.ts` | `L35-82` | Hardcoded SSD item/warranty defaults; `fetchOrder()` returns `null`. |
| `src/server/services/dashboard.service.ts` | `L414-421` | Hardcoded `integrationHealth` array (claims `'Gemini 1.5 Multimodal Engine'`, fake latencies). |
| `src/app/(workspace)/analytics/page.tsx` | `L56-126+` | Hardcoded `MONTHLY_VOLUME` fallback + static `STATUS_DATA`, `OUTCOME_DATA`, `PRIORITY_DATA`, `MERCHANT_STATS`, `TREND_SERIES`. |
| `src/app/(workspace)/admin/security/page.tsx` | `L84,129,145` | Expects `auditData.records` & `data.isChainValid` while `/api/audit/chained` sends `recentRecords` & `verification.isValid`. |
| `src/app/(workspace)/purchases/page.tsx` | `L140-175` | Demo `pkg-demo-01` + calls nonexistent `/api/purchases/extract` with fake `catch` success. |
| `src/hooks/use-demo-cases.tsx` | `L189-325` | Merges `CANONICAL_DEMO_CASE`, injects hardcoded `actorId: "usr_priya_admin"`. |
| `src/components/layout/app-sidebar.tsx` | `L59-64` | Static sidebar `ACTION_BADGES` (`12`, `4`, `2`, `3`). |
| `src/components/common/notification-panel.tsx` | `L90-105` | Admin bell falls back to `EnterpriseDemoNotificationPanel` (`DEMO_NOTIFICATIONS`). |
| `src/components/3d/interactive-evidence-graph.tsx` | `L56-65` | Hardcoded Three.js nodes rendered on public marketing page. |
| `src/app/(auth)/forgot-password/page.tsx` & `reset-password/page.tsx` | `L18`, `L28` | Client-side `setTimeout(..., 600)` simulations. |
| `src/app/(workspace)/investigation/page.tsx` | `L80` | Static showcase with hardcoded `"RECOURSE-BENCH: 89.3% Accuracy"`. |
| `mobile/.../CaptureActivity.kt` | `L74-86` | Writes `ByteArray(1024) { 0x42 }` fake `.mp4` on capture stop. |
| `src/server/services/multilingual-voice.service.ts` | `L109-121` | Static string wrapper instead of neural translation. |
| `src/server/ai/evaluation/evaluation-runner.ts` & `multi-agent-evaluator.ts` | Eval baselines | Reads `scenario.groundTruth` / returns static metrics. |
| `src/server/services/paypal-demo.service.ts` & `/api/demo/paypal-investigation` | Entire file | One-click seeded 13-stage scenario generator. |

---

## 27. Unused, Duplicated, Legacy & Preparation-Layer Components

1. **Duplicate Reasoning Engines (v1 vs v2)**:
   - Legacy **v1** (`BerrEngine`, `AnalysisQueue`, `AIAnalysisRun`, `BerrFinding`, `scripts/ai-worker.ts`) powers `/api/cases/[caseId]/analysis` and `/api/analysis/[runId]`.
   - Current **v2** (`BerrV2Service`, `BerrLayersService`, `BerrAssessmentRecord`, `BerrFindingItem`) powers auto-submission (`/api/complaints/submit`), `/api/cases/[caseId]/berr-v2`, BEG sync hooks, and `ResolutionEngine`. Both co-exist in the schema and codebase.
2. **Gemini Multimodal Preparation Layer (`GeminiEvidenceService`)**: Cleanly implemented & unit-tested for images, product photos, and video frames, but completely unused by upload intake, `EvidenceGuardService`, or UI.
3. **Orphaned Queue Worker (`DurableJobWorker`)**: `src/server/jobs/durable-worker.ts` has an in-memory array and empty `if/else` comments for `DELIVERY_REMINDER_CHECK` and `STORAGE_RECONCILIATION`, disconnected from DB/workers.
4. **Unmounted S3 Adapter & Protocol Stub (`S3EvidenceStorage`, `UcpAp2ProtocolAdapter`)**: Not connected to runtime config or HTTP routes.
5. **Broken Endpoint Contract (`purchases/page.tsx`)**: Frontend calls `/api/purchases/extract`; backend exposes `/api/purchases/detect`.
6. **Stale Dashboard Copy**: `dashboard.service.ts:415` still reports `'Gemini 1.5 Multimodal Engine'` while `gemini-config.ts` targets `gemini-3.6-flash` (and `.env` is `AI_PROVIDER=test`).

---

## 28. Security, Auth & Isolation Audit Findings

### Strengths Verified
- Better Auth password minimum (`12`), `canAccessCase` / `canViewEvidence` visibility enforcement (`BUYER_ONLY`, `MERCHANT_ONLY`, `INTERNAL`), `requirePlatformAdmin` on kill-switch/chained-audit/gemini-health routes, `sanitizeFilename` + `detectMagicBytes` + safe `?inline=1` allowlist, SSRF host allowlist on PayPal cert URLs, DataRedactor Luhn masking, ContentSanitizer XML prompt fencing, and strict `FinancialActionGuardrails` blocking autonomous financial calls.

### Concrete Security Gaps Identified
1. **IDOR / Missing Auth on `GET /api/cases/[caseId]/events` ([`events/route.ts`](file:///c:/Projects/resolvegraph/src/app/api/cases/[caseId]/events/route.ts))**: Route handler performs zero `requireAuth()` and zero `getCaseByIdAuthorized()` check—any authenticated user passing middleware can query arbitrary case events including full `actor` user records!
2. **Unrestricted Authenticated Access to Demo Mutation Route (`POST/GET /api/demo/paypal-investigation`)**: Route lacks `requirePlatformAdmin` / `requireAuth` check; any signed-in buyer or user passing middleware can seed demo data via `GET` or `POST` into SQLite.
3. **Weak Enterprise API Key Authentication ([`enterprise-api-auth.ts`](file:///c:/Projects/resolvegraph/src/server/auth/enterprise-api-auth.ts))**: Accepts **any** string starting with `rg_ent_` as `org_techstore` without DB lookup or secret verification, and accepts unhashed raw `organization.id` or `organization.slug` as an API credential.
4. **Magic-Byte Spoofing Fallback (`UniversalEvidenceIntakeService:92-94`)**: Unlike `LocalEvidenceStorage` (which strictly checks binary magic bytes), `UniversalEvidenceIntakeService.validateMagicBytes` trusts declared HTTP MIME prefixes (`image/`, `application/pdf`, `text/`) when magic bytes fail.
5. **Development Header Auth (`x-demo-user-email`) & Hardcoded Fallback Secret**: Both `session.ts` and `middleware.ts` bypass cookie auth whenever `NODE_ENV !== 'production'` and `x-demo-user-email` is sent (critical to keep `NODE_ENV=production` in any exposed staging/preview deployment). `auth.ts:11` also keeps a static fallback secret literal.
6. **Unauthenticated `GET /api/unboxing/sessions/[token]` Route Handler**: Lacks route-level `requireAuth`, relying purely on edge middleware token blocking and 160-bit random session token secrecy (`middleware` blocks Android client calls unless authenticated).

---

## 29. Automated Test Suite Inventory & Verification Results

### Live Verification Executed During Read-Only Audit Session
- `npx tsc --noEmit`: **Exited 0** (zero TypeScript compilation errors).
- `npm run lint`: **Exited 0** (**0 errors, 25 warnings** — unused imports/vars and 1 `react-hooks/exhaustive-deps` warning across 10 files).

### Complete 53-File Automated Test Suite (`tests/*.test.ts`)
Observed from the immediately preceding full `npm test` run (`tsx --test --test-concurrency=1 tests/**/*.test.ts`, captured prior to the strictly read-only audit freeze; not re-executed during this inspection because integration tests write temporary records into `dev.db`):

- **Total Tests**: `438` | **Suites**: `72` | **Passed**: `412` | **Failed**: `0` | **Cancelled**: `0` | **Skipped**: `26` | **Duration**: `141,565.79 ms` (~141.6s)
- **Skipped Tests Detail**: All **26 skipped** cases belong to `PHASE 8 — UI & Screen Rendering End-to-End Suite` ([`ui-all-screens.test.ts`](file:///c:/Projects/resolvegraph/tests/ui-all-screens.test.ts)), skipped with `# Skipped: Requires running local Next.js server on port 3005 or 3000`.

<details>
<summary>All 53 Test Files in <code>tests/</code></summary>

`agent-orchestration.test.ts`, `ai-evaluation.test.ts`, `ai-extraction.test.ts`, `ai-routes.test.ts`, `ai-security.test.ts`, `api-routes.test.ts`, `authorization.test.ts`, `backend.test.ts`, `beg-and-berr-v2.test.ts`, `beg-system.test.ts`, `berr-engine.test.ts`, `berr-system.test.ts`, `buyer-complaint-submission.test.ts`, `buyer-seller-audit-e2e.test.ts`, `delivery-reminder.test.ts`, `demo-one-click.test.ts`, `dual-sight-capture.test.ts`, `e2e-beg-berr-resolution-audit.test.ts`, `e2e-paypal-demo.test.ts`, `e2e-scenarios-a-h.test.ts`, `e2e-workflow.test.ts`, `evidenceguard.test.ts`, `fairness.test.ts`, `file-storage.test.ts`, `financial-safeguards-negative.test.ts`, `fintech-40-adversarial.test.ts`, `gemini-integration.test.ts`, `graph.test.ts`, `hackathon-acceptance.test.ts`, `hackathon-expansion.test.ts`, `lifecycle-intelligence.test.ts`, `multi-payment.test.ts`, `package-passport.test.ts`, `paypal-auth.test.ts`, `paypal-disputes.test.ts`, `paypal-orders.test.ts`, `paypal-reconciliation.test.ts`, `paypal-refunds.test.ts`, `paypal-webhooks.test.ts`, `pilot-readiness.test.ts`, `purchase-memory.test.ts`, `resolution.test.ts`, `seller-api-routes.test.ts`, `seller-directory-and-gateway.test.ts`, `seller-identification-extraction.test.ts`, `seller-response-beg-berr-security.test.ts`, `seller-workspace-upgrade.test.ts`, `shared-resolution.test.ts`, `temporal.test.ts`, `ui-all-screens.test.ts`, `unified-overview.test.ts`, `v2-40-scenarios.test.ts`, `v2-full-lifecycle.test.ts`

</details>

---

## 30. Deployment, Environment & PostgreSQL Migration Readiness

- **Not Production-Ready Yet**:
  - `prisma/schema.prisma` sets `provider = "sqlite"` and `src/lib/prisma.ts` hardcodes `@prisma/adapter-better-sqlite3` — deploying against PostgreSQL (`DATABASE_URL=postgresql://...` in `.env.production.example`) requires changing the Prisma provider/adapter, regenerating clients, and producing full PostgreSQL migrations.
  - `prisma/postgres-migration.sql` covers only **8 tables** (`User`, `Organization`, `PurchaseMemory`, `PurchaseSpecification`, `PackagePassport`, `Evidence`, `PaymentComplaint`, `SharedRoomMessage`) with `pgvector` HNSW indexing, leaving ~77 other models unmigrated.
  - Ephemeral/container hosts (serverless/Vercel/Render) would lose `.private/evidence/` uploads because `S3EvidenceStorage` is unimplemented.
  - Production Redis/OTEL/Sentry keys in `.env.production.example` have zero runtime SDK packages (`@sentry/*`, `@upstash/redis`, OpenTelemetry) in `package.json`.

---

## 31. Local Machine vs External Dependencies Breakdown

| Capability | Runs Locally Without Internet / API Keys? | External Dependency Required for Live Operation |
| :--- | :--- | :--- |
| Next.js workspace, Auth, RBAC, Case DB, BEG Graph, Deterministic BERR v2, Policies, Approvals, Replacement Lifecycle, Purchase Memory, Package Passport, Hash Audit Ledger, Kill Switch | **YES (100% Local)** | None (SQLite `dev.db` + `.private/evidence`) |
| `unpdf` Digital PDF Text Extraction & SHA-256 Vault | **YES** | None |
| Gemini Connection Health & Layer 2 Structuring | Partial (`TestAIProvider` fallback locally) | Google AI Studio `GEMINI_API_KEY` + `AI_PROVIDER=gemini` |
| OpenAI Document / Multimodal Extraction | Mocked via `TestAIProvider` | Paid `OPENAI_API_KEY` |
| PayPal Orders, Captures, Refunds, Disputes, Webhooks | Simulated via `PayPalMockProvider` | Real PayPal Sandbox/Live REST credentials + HTTPS webhook tunnel |
| PhonePe, Google Pay, Card Network & UPI Clearing | Simulated locally | Licensed PSP / NPCI / Bank Sponsor credentials |
| Amazon SP-API & Flipkart Seller APIs | Simulated webhook parsers | Approved Marketplace Partner OAuth/LWA credentials |
| Email (SMTP), Push, Malware Scan, S3/R2 Object Vault | In-app/local fallback or not wired | SMTP/Resend, FCM, ClamAV, S3/R2 SDK + bucket |
| Live Browser Voice Input (`webkitSpeechRecognition`) | Browser-dependent (Chromium/WebKit) | Speech service or backend Whisper STT |

---

## 32. Pending Work & Known Technical Limitations

1. Fix UI-to-API contract bugs on `/admin/security` (`records` vs `recentRecords`, `isChainValid` vs `verification.isValid`) and `/purchases` (`/api/purchases/extract` vs `/api/purchases/detect`).
2. Secure `/api/cases/[caseId]/events` (add `requireAuth` + `getCaseByIdAuthorized`), restrict `/api/demo/paypal-investigation`, and replace insecure `rg_ent_*`/`slug` matching in `enterprise-api-auth.ts` with hashed API key records.
3. Wire `GeminiEvidenceService` + OCR (or Tesseract) into image/scanned-PDF intake and `EvidenceGuardService` so multimodal verification & real perceptual image hashing (`pHash`/`dHash` on decoded pixels) actually protect cases.
4. Connect `/analytics` and `/dashboard` integration health & breakdown charts cleanly to database aggregations and clean up `AppSidebar` static badges & `Admin` notification fixture.
5. Reconcile legacy `BerrEngine` v1 / `AnalysisQueue` vs `BerrV2Service`, remove unused `DurableJobWorker`, implement real `S3EvidenceStorage` via `@aws-sdk/client-s3`, and upgrade `Prisma` schema/migration story for PostgreSQL.
6. Implement real `VideoCapture` recording + mobile session authentication in Android `CaptureActivity.kt`, and real password reset tokens / SMTP transport.
7. Run live Next.js server and execute Phase 8 (`ui-all-screens.test.ts` — 26 tests) with Playwright/Puppeteer end-to-end assertions.

---

## 33. Recommended Prioritized Next Engineering Roadmap

1. **P0 — Security & Broken Live UI Fixes (Immediate)**: Add auth + IDOR guards to `/api/cases/[caseId]/events` and `/api/demo/paypal-investigation`; harden `enterprise-api-auth.ts`; remove fake MIME fallback in `UniversalEvidenceIntakeService`; fix `/admin/security` Audit Ledger property mapping and `/purchases` endpoint `/api/purchases/detect`.
2. **P1 — Unify AI, OCR & Multimodal Forensics**: Wire `GeminiEvidenceService` behind `AI_PROCESSING_ENABLED` + `ConsentManager` into evidence upload & `SellerExtractionService` scanned-PDF fallback; compute real pixel-based `dHash` in `EvidenceGuardService`; unify or deprecate v1 `BerrEngine` in favor of `BerrV2Service`.
3. **P2 — Eliminate UI Demo Hardcodes & Run Phase 8 Live E2E**: Replace static chart arrays on `/analytics`, hardcoded integration health in `DashboardService`, static badges in `AppSidebar`, and admin mock notifications; boot Next.js and verify all 26 `ui-all-screens.test.ts` scenarios cleanly.
4. **P3 — Cloud Storage, Email & PostgreSQL Readiness**: Add `@aws-sdk/client-s3` to `S3EvidenceStorage`, add SMTP mailer (password reset + seller alerts + delivery reminders), generate full PostgreSQL schema migrations covering all 85 Prisma models, and archive stale `.bak` / bloat from `dev.db` (`870 MB`).
5. **P4 — External Rails & Mobile Hardware Capture**: Configure genuine PayPal Sandbox credentials for live `PayPalRestProvider` round-trip verification; bind real CameraX `VideoCapture` in `CaptureActivity.kt` with token/auth exchange; implement real multilingual ML translation if required beyond English keywords.

---

## 34. Final Audit Verdict & Summary Counts

### Verdict
RESOLVEGRAPH is a **well-architected, backend-strong dispute resolution engineering platform**—not vaporware. Its core **BEG -> BERR v2 -> Policy Engine -> Proposal/Approval -> Guardrailed Refund & Delivery-Gated Replacement** workflow is genuinely implemented in SQLite + Prisma, enforces strong financial safety invariants, and passes **412 offline automated tests** (`npx tsc --noEmit` = 0 errors, `npm run lint` = 0 errors).

However, it is **not yet production-deployable or externally live**: real external payments/banks/marketplaces/emails/S3/OCR remain mocked or unimplemented, Gemini multimodal vision is still an unwired preparation layer while `AI_PROVIDER=test`, two workspace UI pages contain endpoint/JSON key mismatches (`/purchases`, `/admin/security`), one API route (`/api/cases/[caseId]/events`) lacks route-level authorization, and live-server browser tests (`26` cases) remain skipped.

### Final Summary Counts
| Audited Dimension | Exact Count |
| :--- | :---: |
| Next.js Frontend Pages (`page.tsx`) | **41** |
| Next.js Backend API Route Files (`route.ts`) | **118** |
| Prisma Schema Models / Enums | **85 models / 16 enums** |
| Automated Test Files (`tests/*.test.ts`) | **53 files** |
| Mobile Android App Source/Config Files | **13 files** |
| Offline Test Run Result (`npm test` log) | **438 total \| 72 suites \| 412 pass \| 0 fail \| 26 skipped** |
| Live Typecheck & ESLint (`npx tsc --noEmit`, `npm run lint`) | **0 TypeScript errors \| 0 ESLint errors (25 warnings)** |
| **Feature Classifications (`60` audited features)** | |
| 1. `WORKING AND VERIFIED` | **20** |
| 2. `IMPLEMENTED BUT NOT FULLY VERIFIED` | **11** |
| 3. `PARTIALLY WORKING` | **10** |
| 4. `MOCKED / SIMULATED` | **10** |
| 5. `FRONTEND ONLY / BACKEND ONLY` | **3** |
| 6. `NOT IMPLEMENTED / NOT VERIFIED` | **6** |
| **Total Audited Features** | **60** |
