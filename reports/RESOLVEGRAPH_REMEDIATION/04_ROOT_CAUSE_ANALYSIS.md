# RESOLVEGRAPH AUDIT REPORT 04 — ROOT CAUSE ANALYSIS

**Project:** RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure  
**Date:** November 7, 2026  
**Auditor:** Principal Software Architect  
**Subject:** Architectural Analysis of Systemic Discrepancies, Metric Inconsistencies, and Interface Disconnects  

---

## 1. Executive Summary

This report analyzes the root causes behind the defects identified during the RESOLVEGRAPH baseline audit, with specific focus on:
1. The case count discrepancy across dashboard views (118 vs. 98 vs. 1,284 vs. 121).
2. The divergence between UI state and database capabilities.
3. React 19 compiler purity violations and linting failures.
4. Multi-currency reporting errors.
5. Incomplete wiring of backend APIs to user-facing pages.

---

## 2. Deep-Dive Root Cause Analysis

### 2.1 The Case Count Conflict: 118 vs. 98 vs. 1,284 vs. 121

#### Symptoms:
Auditors observed different case counts appearing across screenshots and views:
- 118 cases reported in certain dashboard summaries.
- 98 cases shown under specific merchant filters.
- 1,284 cases displayed in metric cards and analytics views.
- 121 total cases stored in the SQLite database (`dev.db`).

#### Root Cause:
The discrepancy arose from three distinct architectural factors interacting simultaneously:
1. **Multi-Tenant Scoping vs. Global Counts:**  
   The database contains exactly **121 `CaseRecord` rows**. These cases belong to different multi-tenant organizations:
   - `org_techstore` (TechStore Global): **101 cases**
   - `org_digitalmart`: **5 cases**
   - `org_nova`: **4 cases**
   - Unassigned / Global admin cases: **11 cases**  
   When logged in as Carlos Mendez (merchant owner of `org_techstore`), the backend query `DashboardService.getSummary` correctly scoped queries to `organizationId = 'org_techstore'` (yielding 101 cases, or 98/118 during earlier test seed states).
2. **Hardcoded Fallback Flashing:**  
   In `src/components/dashboard/metric-card.tsx`, if the live data was loading or undefined, the component fell back to `KPI_METRICS.totalCases.value`, which was hardcoded in `src/lib/mock-data.ts` as `1,284`. On page loads before the network request finished, the UI flashed `1,284` before snapping to the scoped count.
3. **Hardcoded Analytics View:**  
   `src/app/(workspace)/analytics/page.tsx` was written as an early prototype directly reading from static constants (`1,284 total disputes`, `$142.8k resolved volume`) rather than calling an authenticated API endpoint.

#### Remediation:
- Replaced the `KPI_METRICS` fallback in `metric-card.tsx` with `MetricCardSkeleton`.
- Created `AnalyticsService` and `GET /api/analytics` to query Prisma directly for tenant-scoped counts, ensuring Analytics reconciles with the Dashboard.

---

### 2.2 Blind Cross-Currency Summation

#### Symptoms:
Payments ledger reported a single scalar sum with a `$` symbol, despite transactions existing in both USD and INR.

#### Root Cause:
`src/app/api/payments/route.ts` previously executed a scalar sum:
```ts
const totalCapturedMinor = capturedPayments.reduce((sum, p) => sum + p.amountMinor, 0);
```
In `dev.db`, `CaseRecord` contains 45 cases denominated in Indian Rupees (INR, ₹98,292 total) and 76 cases in US Dollars (USD, $5,753.49 total). Adding minor units of INR (paise) directly to minor units of USD (cents) produced a meaningless number ($16,426.52 USD + ₹98,292 INR cannot be added into a single dollar figure).

#### Remediation:
- Refactored `/api/payments` to use `groupBy({ by: ['currency'] })`.
- Updated `payments/page.tsx` and `payments/[paymentId]/page.tsx` to group and format each currency independently using `formatCurrency(amount, currency as Currency)`.

---

### 2.3 React 19 Compiler Purity Violations

#### Symptoms:
`npm run lint` failed with 10 problems (7 errors, 3 warnings) in `src/components/landing/hero-globe.tsx`.

#### Root Cause:
The React 19 compiler enforces strict purity rules: pure component render functions and `useMemo` hooks must not call side-effectful or non-deterministic APIs such as `Math.random()`. `hero-globe.tsx` invoked `Math.random()` inside particle position calculations on every render, causing React to flag unstable node generation.

#### Remediation:
Implemented a deterministic Linear Congruential PRNG (`pseudoRandom(seed)`) to generate identical particle coordinates across hydration and renders, eliminating compiler warnings.

---

### 2.4 Artificially Gated UI Features

#### Symptoms:
1. Evidence library displayed an informational "Phase 2" modal when clicking "Upload Evidence".
2. Resolution Center displayed an outdated "Future Development Notice" banner.

#### Root Cause:
During early incremental prototyping, engineers placed placeholder dialogs in frontend views to prevent user actions before backend routes were completed. When backend services (multipart upload, SHA-256 calculation, and proposal workflow engines) were subsequently built, the frontend gates were not removed.

#### Remediation:
- Replaced the evidence placeholder modal with a functional multipart upload form posting to `/api/cases/[caseId]/evidence`.
- Created `GET /api/resolution-proposals` and connected `resolution/page.tsx` to real database proposals.
- Replaced placeholder notices with factual governance policy disclosures.

---

## 3. Preventive Architecture Recommendations

1. **Strict Data Boundary Enforcement:** Frontend pages must never fall back to static mock data when connected to an authenticated session; render skeleton states instead.
2. **Type-Safe Currency Types:** Ensure financial models enforce currency tagging alongside minor units to prevent cross-currency summation.
3. **Continuous Integration Lint Gates:** Run `npm run lint` and `npx tsc --noEmit` as mandatory pre-commit hooks to catch React 19 purity violations early.
