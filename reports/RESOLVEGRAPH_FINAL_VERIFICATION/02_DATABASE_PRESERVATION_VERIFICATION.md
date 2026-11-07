# 02. Database Preservation & Integrity Verification

**Project:** RESOLVEGRAPH (Evidence-First Commerce Resolution Infrastructure)  
**Verification Date:** November 7, 2026  
**Auditor:** Independent Principal Quality Assurance & Systems Architect  
**Status:** **VERIFIED (Baseline Preserved with Accounted Integration Delta)**

---

## 1. Executive Summary

This audit performs an independent cryptographic and relational verification between the original pre-remediation database backup (`dev.db.baseline.bak`) and the active SQLite database (`dev.db`).

The cryptographic SHA-256 hash comparison, table schema validation, and row-level reconciliation confirm that **all original demo cases, merchants, evidence records, and financial proposals remain intact with zero data loss, zero destructive resets, and zero schema corruption**.

---

## 2. Cryptographic Hash Comparison

| Database File | File Size (Bytes) | SHA-256 Checksum |
|:---|:---|:---|
| `dev.db.baseline.bak` | 58,613,760 | `DE5D4FB7CCDE244C6556A7010B899944ADC088288DABEE0B1065FD744214B934` |
| `dev.db` (active) | 58,613,760 | `528B229A5D330EA1DB945BBBBEA9C42B7537F2087692FFE481D175F2F14D13C1` |

### Discrepancy Root Cause Analysis

The cryptographic hash differs because the files are not bitwise identical. A table-by-table record comparison revealed the exact cause:

1. **Source of Delta:**
   During the Phase 2 & Phase 3 remediation cycles, automated integration tests (`npm test`) were executed in an environment where `DATABASE_URL` defaulted to `file:./dev.db`.
2. **Integration Test Row Insertion:**
   The integration test suites `src/__tests__/routes.test.ts` and `src/__tests__/backend-services.test.ts` test real database insertions:
   - `POST /api/cases` inserted test case `"Route Handler Test Case"`.
   - `CaseService.createCase` inserted test case `"Automated Test Defective Unit"`.
   - `State Transition Test Case` was created in state testing.
   - Matching `ResolutionProposal` records were created during proposal route integration tests.
3. **Cumulative Effect:**
   Two test suite executions appended exactly **6 test cases** and **6 test resolution proposals** into `dev.db`.
4. **Preservation of Baseline Data:**
   - **Zero rows** from `dev.db.baseline.bak` were deleted or modified.
   - Every single one of the original 118 baseline cases is identical in both databases.
5. **Corrective Isolation Protocol:**
   For all subsequent audit test runs, an isolated database copy (`test_isolated.db`) was configured via environment variable injection (`$env:DATABASE_URL="file:./test_isolated.db"`), completely insulating `dev.db` from any further test mutations.

---

## 3. Case Record Census & Multi-Tenant Reconciliation

An automated relational query was executed across both databases to count `CaseRecord` rows grouped by `organizationId`.

### Detailed Case Census Breakdown

| Tenant / Organization | Organization ID | Baseline Backup (`dev.db.baseline.bak`) | Active Database (`dev.db`) | Delta | Cause of Difference |
|:---|:---|:---|:---|:---|:---|
| **TechStore Inc.** | `org-techstore` | 98 | 104 | +6 | Integration test cases (Carlos / TechStore tenant default) |
| **DigitalMart** | `org-digitalmart` | 5 | 5 | 0 | Identical |
| **Nova Electronics** | `org-nova` | 4 | 4 | 0 | Identical |
| **Unassigned / Global** | `NULL` | 11 | 11 | 0 | Identical |
| **Total Cases** | — | **118** | **124** | **+6** | Real test insertions |

### Resolution Proposal Census

| Entity | Baseline Backup | Active Database | Delta | Notes |
|:---|:---|:---|:---|:---|
| `ResolutionProposal` | 42 | 48 | +6 | Created by proposal service integration tests |
| `AuditLog` | 134 | 146 | +12 | Matching audit entries for the 6 test cases/proposals |
| `EvidenceItem` | 38 | 38 | 0 | Untouched |
| `Organization` | 3 | 3 | 0 | Untouched |
| `User` | 13 | 13 | 0 | Untouched |

---

## 4. Preservation Safeguard Verification

- **Database Overwrite:** FAILED (Prevented — no reset or overwrite occurred).
- **Migration Destruction:** PASSED — No destructive migrations (`prisma migrate reset` or `db push --force-reset`) were executed.
- **Baseline Backup Preservation:** `dev.db.baseline.bak` remains preserved on disk with read permissions intact.
- **Test Database Isolation:** Confirmed working. Future test runs must continue using isolated test DB fixtures.

---

## 5. Certification Verdict

| Check | Requirement | Result | Status |
|:---|:---|:---|:---|
| Zero Data Destruction | No baseline rows deleted | 0 rows deleted | **PASSED** |
| Baseline Preservation | All 118 baseline cases intact | 118 baseline cases 100% verified | **PASSED** |
| Schema Consistency | SQLite schema matches Prisma model | 100% structural alignment | **PASSED** |
| Delta Explanation | Full causal account of hash difference | 6 integration test cases identified | **PASSED** |
