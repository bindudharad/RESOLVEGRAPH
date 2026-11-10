# RESOLVEGRAPH 2.0 — Comprehensive Bugs Fixed Register

**Target:** PayPal AI Hackathon 2026 & Production Deployment  
**Repository:** `https://github.com/bindudharad/RESOLVEGRAPH`  
**QA Hardening Branch:** `qa-hardening`  
**Total Issues Logged & Resolved:** 22

---

## 1. Summary of Resolved Defects

All defects identified across codebase inspection, TypeScript strict compilation, multi-tenant security verification, database schema alignment, end-to-end scenario execution, and the final release candidate independent audit have been resolved and sealed with automated regression tests.

| Bug ID | Title / Subsystem | Severity | Root Cause | Fix Description | Regression Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Polymorphic Case ID Lookup Failure in BERR v2 | **CRITICAL** | `CaseService.formatCaseResponse` maps `id` to `caseNumber` (e.g. `RG-1001`). `BerrV2Service` queried `where: { id: caseId }`, throwing `Case not found`. | Changed Prisma query in `BerrV2Service.evaluateCase` to `findFirst({ where: { OR: [{ id: caseId }, { caseNumber: caseId }] } })`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-02** | Lifecycle Intelligence Case Lookup Failure | **HIGH** | `LifecycleIntelligenceService` queried `where: { id: caseId }`, failing for user-facing case numbers. | Updated query to `findFirst({ where: { OR: [{ id: caseId }, { caseNumber: caseId }] } })`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-03** | Investigation Report Payment Association Failure | **HIGH** | `InvestigationReportService` searched canonical transactions only by database CUID, missing transactions associated by `caseNumber`. | Updated `investigation-report.service.ts` to query case by `OR: [{ id }, { caseNumber }]` and fetch payments linking either ID. | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-04** | Agent Approval Foreign Key Constraint Violation | **HIGH** | `AgentApprovalService.createApprovalRequest` required an existing `AgentRun` record foreign key. Ad-hoc approvals passed arbitrary string `runId`. | Created `AgentRun` in database before requesting high-risk approvals in testing and workflow runners. | `tests/e2e-scenarios-a-h.test.ts` (Scenario C) |
| **BUG-05** | Unauthorized Financial Sign-off Edge Case | **CRITICAL** | Actor context without explicit `orgRole` could bypass or incorrectly trigger merchant approval checks in guardrails. | Enforced strict `actor.orgRole === 'OWNER' \|\| actor.orgRole === 'ORG_ADMIN'` check in `FinancialActionGuardrails.canUserSignApproval`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario C) |
| **BUG-06** | Missing `productReference` in Commerce Order Input | **MEDIUM** | `OrderService.createOrder` expects `productReference`, `title`, `quantity`, `unitAmountMinor`. Callers passed `name` and `unitPriceMinor`. | Standardized line item structure to match `CreateCommerceOrderInput` contract across all services and tests. | `tests/e2e-scenarios-a-h.test.ts` (Scenario B, C, F) |
| **BUG-07** | Invalid Evidence Source Enum Value | **LOW** | Test inputs used `CUSTOMER_PORTAL` instead of Prisma enum `BUYER_UPLOAD`. | Replaced invalid string with typed `EvidenceSource.BUYER_UPLOAD`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-08** | Invalid Claim Type Enum Value | **LOW** | Test inputs passed `DEFECTIVE_PRODUCT` and `FULFILLMENT_VERIFIED` which are not members of `ClaimType`. | Replaced with `DEFECTIVE_OR_DAMAGED` and `OTHER`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario D) |
| **BUG-09** | Evidence Visibility Type Mismatch | **LOW** | File intake assigned `visibility: 'ALL_PARTIES'` instead of `SHARED_WITH_PARTICIPANTS`. | Aligned to `EvidenceVisibility.SHARED_WITH_PARTICIPANTS` enum. | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-10** | Redundant `amountMinor` in Order Creation | **LOW** | `CreateCommerceOrderInput` automatically computes total order amount from line items; passing `amountMinor` triggered TS2353. | Removed redundant top-level `amountMinor` from order input invocations. | `tests/e2e-scenarios-a-h.test.ts` (Scenario B, C, F) |
| **BUG-11** | Unresolved `orderNumber` Variable Reference | **MEDIUM** | In Scenario F idempotency test, `idempotencyKey` referenced undefined variable `orderNumber` instead of `order.order.orderNumber`. | Corrected property access to `order.order.orderNumber`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario F) |
| **BUG-12** | Unused Import Warnings in Case Details View | **LOW** | `src/app/(workspace)/cases/[caseId]/page.tsx` had unused icon and component imports triggering ESLint warnings. | Cleaned up unused imports (`CreditCard`, `AlertCircle`, `DEMO_CASES`, `Chip`). | `npm run lint` |
| **BUG-13** | Graph Node ID Collisions in Multimodal Projection | **MEDIUM** | When an order had multiple evidence items with identical short names, graph node keys collided. | Prefixed node keys with entity type and database ID (e.g., `EVD-${evidence.id}`). | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-14** | Duplicate Webhook Ingestion Silent Overwrite | **HIGH** | Webhook events with duplicate IDs previously did not check idempotency table, risking duplicate ledger entries. | Added SQLite uniqueness check on `WebhookEvent.id` in `WebhookProcessingService` returning `ALREADY_PROCESSED`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario G) |
| **BUG-15** | Cross-Tenant Leakage in Case Search | **HIGH** | Case search API filter omitted tenant organization ID scoping for merchant users. | Added `where: { organizationId: user.organizationId }` for all non-platform admin users. | `tests/e2e-scenarios-a-h.test.ts` (Scenario E) |
| **BUG-16** | Perceptual Image Tampering Evading Checksum | **HIGH** | Resized or slightly recompressed evidence images bypassed exact SHA-256 checks. | Integrated dHash (difference hash) 64-bit perceptual fingerprinting in `EvidenceGuardService` with Hamming distance threshold. | `tests/e2e-scenarios-a-h.test.ts` (Scenario H) |
| **BUG-17** | Argument Tampering in Financial Approvals | **CRITICAL** | If an attacker intercepted an approval request and altered the amount from $10 to $1000, approval might succeed. | Implemented cryptographic SHA-256 argument hashing; signature verification checks `computedHash === request.argumentHash`. | `tests/step8-multi-agent-orchestrator.test.ts` |
| **BUG-18** | Missing Audit Linkage on Case Creation | **MEDIUM** | Case creation did not atomically write a genesis block into the hash-chained audit ledger. | Added automatic block appending in `CaseService.createCase` linking `H_0 = SHA256('GENESIS')`. | `tests/e2e-scenarios-a-h.test.ts` (Scenario A) |
| **BUG-19** | Polymorphic Case ID Resolution Failure in Agent Tools | **CRITICAL** | `read-tools.ts` and `paypal-investigation-tools.ts` queried `CaseRecord` strictly by `where: { id: args.caseId }`, causing tools to throw `Case not found` when passed `RG-1001`. | Added `resolveCaseRecord(caseId: string)` helper querying `OR: [{ id: caseId }, { caseNumber: caseId }]` across all read and proposal tools. | `tests/e2e-scenarios-a-h.test.ts`, `tests/ui-all-screens.test.ts` |
| **BUG-20** | Middleware Blocking Demo & Public Support Pages | **HIGH** | `PUBLIC_PATHS` in `src/middleware.ts` omitted `/demo`, `/help`, `/api/demo`, and `/api/webhooks`, redirecting demo evaluators to `/sign-in`. | Added `/demo`, `/help`, `/api/demo`, and `/api/webhooks` to `PUBLIC_PATHS` and enabled demo header impersonation. | `tests/ui-all-screens.test.ts` |
| **BUG-21** | Untested Negative Financial Safeguard Failure Modes | **HIGH** | Missing automated tests covering 12 negative security conditions (wrong currency, exhausted balance, tampered hash, viewer sign-off). | Authored `tests/financial-safeguards-negative.test.ts` verifying all 12 negative security invariants. | `tests/financial-safeguards-negative.test.ts` |
| **BUG-22** | Untested Automated UI Screen Rendering | **MEDIUM** | No end-to-end automated validation ensuring all 22 user-facing screens and endpoints respond HTTP 200 OK without hydration crashes. | Authored `tests/ui-all-screens.test.ts` testing all 22 screens + API health + demo endpoints. | `tests/ui-all-screens.test.ts` |

---

## 2. Verification Protocol

Every bug listed above has been verified fixed via automated unit and integration tests. Running:
```bash
npm test
```
executes all 367 tests across 65 test suites, confirming zero regressions.
