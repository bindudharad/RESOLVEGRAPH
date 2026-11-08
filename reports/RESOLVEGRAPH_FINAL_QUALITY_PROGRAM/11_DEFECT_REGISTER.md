# REPORT 11 — COMPREHENSIVE DEFECT & REPAIR REGISTER

| Defect ID | Severity | Module | Description | Root Cause | Fix Implemented | Retest Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | High | Database / Prisma | `merchantOrganization` reference error in CaseRecord queries | Naming mismatch in Prisma schema | Updated to `organization` | 20/20 Passing | **RESOLVED** |
| **DEF-02** | Medium | API Routes | `AuthError.statusCode` undefined in 9 payment endpoints | Property name is `status` | Refactored to `error.status` | Route Tests Pass | **RESOLVED** |
| **DEF-03** | High | Multi-Agent | `AgentExecutionContext.userId` missing | Context uses `actor.id` | Updated to `ctx.actor.id` | Agent Suite Pass | **RESOLVED** |
| **DEF-04** | Low | Frontend UI | `Badge` component `variant` type error on 5 pages | Design token uses `tone` | Standardized to `tone` | `tsc` Clean | **RESOLVED** |
| **DEF-05** | Medium | Frontend UI | React 19 `set-state-in-effect` warning in UI tables | Async fetch called directly in effect | Encapsulated in async loader with cleanup flag | 0 Lint Warnings | **RESOLVED** |
| **DEF-06** | Low | Investigation | `any` typing on `findingType` in root cause service | Missing enum union type | Typed to strict 5-category union | `tsc` Clean | **RESOLVED** |
| **DEF-07** | Medium | Audit Ledger | `blockHash` vs `currentHash` property mismatch | Database column naming | Updated service to `currentHash` | Audit Suite Pass | **RESOLVED** |
| **DEF-08** | Low | Testing | Duplicate evidence test failure on re-runs | Static mock payload in test | Added timestamp nonces | 100% Reliable | **RESOLVED** |
| **DEF-09** | Low | Code Quality | Unused variable warning in expansion test | Variable assigned but unread | Removed unused variable | 0 Warnings | **RESOLVED** |
