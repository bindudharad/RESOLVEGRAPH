# Phase 1: Repository Discovery and Baseline Engineering Audit

**Project:** RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure  
**Audit Timestamp:** 2026-11-07  
**Auditor:** Principal Software Architect & QA Systems Engineer  
**Status:** Baseline Completed  

---

## 1. Executive Summary

A comprehensive, non-destructive engineering audit of the RESOLVEGRAPH codebase was performed in accordance with Phase 0 and Phase 1 rules.
- Safe database backup created: `dev.db.baseline.bak` (43,302,912 bytes).
- Git repository tracking initialized to record all remediation steps with full fidelity.
- All 170 existing automated tests passed across 39 suites.
- TypeScript compilation check succeeded with 0 errors.
- Next.js production build succeeded for all 36 routes.
- ESLint identified 7 React 19 compiler purity errors and 3 warnings in `src/components/landing/hero-globe.tsx`.
- Concrete functional, data, and presentation discrepancies were confirmed, including dashboard case count flashes, currency presentation flaws, missing empty states on multi-tenant organizations, and placeholder UI elements.

---

## 2. Environment & Version Verification

| Component | Installed / Configured Version | Status |
| :--- | :--- | :--- |
| **Node.js** | `v24.20.0` | Active |
| **Next.js** | `16.4.4` (Turbopack) | Passing (Middleware deprecation warning) |
| **React** | `19.3.0` | Active |
| **React DOM** | `19.3.0` | Active |
| **TypeScript** | `^5` (tsc 5.x) | 0 compilation errors |
| **Prisma** | `^7.10.1` | Active with better-sqlite3 adapter |
| **Better Auth** | `^1.7.15` | Configured |
| **Tailwind CSS** | `^4` (`@tailwindcss/turbopack`) | Configured |
| **Database** | SQLite via `better-sqlite3` (`13.0.3`) | Healthy (43.3 MB `dev.db`) |

---

## 3. Baseline Quality & Verification Results

### 3.1 Static Typecheck (`npx tsc --noEmit`)
- **Result:** PASSED (Exit code: 0)
- **Errors:** 0

### 3.2 ESLint Validation (`npm run lint`)
- **Result:** FAILED (Exit code: 1)
- **Total Problems:** 10 problems (7 errors, 3 warnings)
- **Location:** `src/components/landing/hero-globe.tsx`
  - **7 Errors (`react-hooks/purity`):** Impure function calls (`Math.random()`) inside render / `useMemo` blocks (lines 62, 213, 214, 215, 216, 217, 221).
  - **3 Warnings (`@typescript-eslint/no-unused-vars`):** Unused variables `colorAttr` (L94), `spherePositions` (L115), and `viewport` (L377).

### 3.3 Next.js Production Build (`npm run build`)
- **Result:** PASSED (Exit code: 0)
- **Routes compiled:** 36 routes (App router and API route handlers)
- **Deprecation Notice:** `The "middleware" file convention is deprecated. Please use "proxy" instead.`

### 3.4 Automated Test Suite Execution (`npm test`)
- **Command:** `tsx --test --test-concurrency=1 tests/**/*.test.ts`
- **Result:** PASSED (Exit code: 0)
- **Suites:** 39 passed, 39 total
- **Tests:** 170 passed, 0 failed, 0 skipped, 0 cancelled
- **Duration:** 62.86 seconds

---

## 4. Authoritative Database Inventory (`dev.db`)

An authoritative query of the persistent SQLite database revealed the following entity record counts:

| Table / Model | Record Count | Notes / Scope |
| :--- | :--- | :--- |
| `User` | 13 | 7 seeded demo users (1 Admin, 3 Buyers, 3 Merchants), 6 pilot test users |
| `Organization` | 6 | TechStore Global (101 cases), DigitalMart (5 cases), Nova Electronics (4 cases), 3 test orgs |
| `OrganizationMember` | 9 | Multi-tenant membership assignments |
| `CaseRecord` | 121 | Authoritative total cases across all organizations |
| `Claim` | 66 | Dispute claims filed across cases |
| `Evidence` | 68 | Stored evidence records |
| `CommerceOrder` | 160 | E-commerce orders |
| `PayPalPayment` | 150 | Authoritative payment captures (all in USD) |
| `RefundTransaction` | 65 | Authoritative refund transactions (all in USD) |
| `PayPalDispute` | 45 | PayPal dispute mirrors |
| `PayPalApiOperation` | 388 | Recorded PayPal API calls & idempotency logs |
| `AIAnalysisRun` | 83 | BERR analysis runs executed |
| `BerrFinding` | 63 | AI forensic findings |
| `GraphSnapshot` | 17 | Bilateral Evidence Graph snapshots |
| `ResolutionProposal`| 45 | Structured remedy proposals |
| `ResolutionPartyResponse` | 17 | Human buyer/merchant proposal sign-offs |
| `AgentRun` | 54 | Specialist multi-agent orchestration runs |
| `AgentApprovalRequest` | 21 | High-risk human approval requests |
| `SecurityAuditEvent`| 109 | Audit logs for all critical operations |
| `CaseEvent` | 2,575 | Chronological lifecycle events |

### 4.1 Case Breakdown by Status
- `SUBMITTED`: 74
- `IN_REVIEW`: 38
- `EVIDENCE_REQUESTED`: 4
- `UNDER_ANALYSIS`: 3
- `RESOLVED`: 2
- **Total:** 121

### 4.2 Case Breakdown by Currency
- **INR:** 45 cases (Sum: 9,829,200 minor units = ₹98,292.00)
- **USD:** 76 cases (Sum: 575,349 minor units = $5,753.49)
- **Total:** 121 cases

---

## 5. Confirmed Discrepancies & Defect Register Baseline

### 5.1 Inconsistent Case Counts (118 vs 98 vs 1284 vs 121)
- **Root Cause Identified:**
  1. `src/lib/mock-data.ts` defines `KPI_METRICS` with `total-cases: 1284`, `open-cases: 186`, etc.
  2. `src/components/dashboard/metric-card.tsx` falls back to `KPI_METRICS` whenever `summary?.kpis` is loading or undefined (`if (!summary?.kpis) return KPI_METRICS;`), causing a flash of 1,284 before real database metrics load.
  3. `src/app/(workspace)/analytics/page.tsx` renders `{formatNumber(KPI_METRICS[0].value)} Cases` (hardcoded 1,284) and static synthetic analytics without querying backend APIs.
  4. Scoped counts: When logged in as `usr_techstore_merchant`, `DashboardService.getSummary` scopes cases to `org_techstore` (101 cases), or if a filter excludes certain statuses, lower counts (e.g. 98 or 118) appear. Total database-wide cases is 121.

### 5.2 Multi-Tenant Organizations Blank Section
- **Root Cause Identified:**
  - `src/app/(workspace)/organizations/page.tsx` makes a client fetch to `/api/organizations`.
  - When accessed without an active session or by a buyer user (e.g. `usr_alex_buyer` who has 0 merchant org memberships), `/api/organizations` returns an empty array or 401.
  - The UI lacks an empty state or unauthenticated prompt and simply renders an empty grid and null details card, appearing as an unexplained blank section.

### 5.3 Currency Representation & Ledger Formatting
- **Root Cause Identified:**
  - `src/app/(workspace)/payments/page.tsx` and `payments/[paymentId]/page.tsx` hardcode `$` for all currency renders, ignoring `p.currency` (`INR` vs `USD`).
  - `/api/payments` aggregates `amountMinor` into a single total without grouping by currency, summing INR paise and USD cents together.

### 5.4 Placeholder Evidence Upload
- **Root Cause Identified:**
  - `src/app/(workspace)/evidence/page.tsx` has a button "Upload Evidence" which displays an informational dialog claiming that evidence ingestion will arrive in "Phase 2".
  - However, `/api/cases/[caseId]/evidence` and `LocalEvidenceStorage` already support full multipart uploads with SHA-256 hash generation and MIME validation.

### 5.5 Landing Page Social Proof & Headline
- **Root Cause Identified:**
  - `src/components/landing/testimonials-section.tsx` contains fictional testimonials attributed to "Sarah Chen", "Marcus Rivera", and "Priya Patel".
  - `src/components/landing/hero-section.tsx` contains unverified platform logos ("PayPal, Stripe, Shopify, Square, Klarna") and reads "Resolve Commerce Disputes with AI Intelligence" instead of the evidence-first positioning.

---

## 6. Baseline Verification Artifacts

- Database Backup: `dev.db.baseline.bak`
- Test log: 170 passed in 62.86s
- Build log: 36 routes generated successfully
- Baseline Remediation Directory: `reports/RESOLVEGRAPH_REMEDIATION/`
