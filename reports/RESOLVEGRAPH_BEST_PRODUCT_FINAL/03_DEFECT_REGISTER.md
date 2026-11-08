# REPORT 03: DEFECT REGISTER & REMEDIATION LOG

**Project:** RESOLVEGRAPH V2.0  
**Status:** All Defects Successfully Resolved and Regressed  
**Classification:** Severity 1 (Critical), Severity 2 (Major), Severity 3 (Moderate), Severity 4 (Minor)  

---

## 1. Remediation Summary Table

| Defect ID | Severity | Subsystem | Description & Root Cause | Resolution Implemented | Regression Test |
|:---|:---:|:---|:---|:---|:---|
| **DEF-01** | Sev-1 | `PackagePassport` | Package seal could be added to already dispatched/delivered parcels | Added guard in `attachSeal` throwing error if status is `DISPATCHED` or `DELIVERED` | `tests/v2-40-scenarios.test.ts` (Scenario 05) |
| **DEF-02** | Sev-2 | `PackagePassport` | Duplicate physical seal numbers could be applied to the same package | Added unique seal number check across package items before insertion | `tests/v2-40-scenarios.test.ts` (Scenario 05) |
| **DEF-03** | Sev-2 | `PackagePassport` | Package could be re-dispatched while already in transit or delivered | Enforced single dispatch state transition check in `dispatchPackage` | `tests/v2-full-lifecycle.test.ts` (Workflow 2) |
| **DEF-04** | Sev-1 | `CameraSession` | Expired unboxing camera sessions accepted incoming video chunks | Added expiration date validation in `uploadStream` and `completeSession` | `tests/v2-40-scenarios.test.ts` (Scenario 15) |
| **DEF-05** | Sev-3 | `PurchaseDetection` | Empty or malformed manual entry crashed detection service with unhandled exception | Added input boundary check throwing descriptive error on empty or malformed payloads | `tests/v2-40-scenarios.test.ts` (Scenario 18) |
| **DEF-06** | Sev-2 | `SharedResolution` | Third-party users could submit messages into private case resolution rooms | Restricted `postMessage` to validated dispute participants (buyer, merchant, admin) | `tests/shared-resolution.test.ts` |
| **DEF-07** | Sev-2 | `SharedResolution` | Regular participants could inject internal managerial notes | Strictly restricted `isInternalOnly: true` to manager and admin roles | `tests/shared-resolution.test.ts` |
| **DEF-08** | Sev-1 | `SharedResolution` | Over-refund proposals exceeding remaining refundable balance could be processed | Implemented remaining capture balance ledger check in `validateFinancialSafeguards` | `tests/v2-40-scenarios.test.ts` (Scenario 31) |
| **DEF-09** | Sev-1 | `Multi-Agent` | Autonomous subagents could theoretically approve high-risk refund proposals | Strict invariant: `actionRisk === "HIGH"` requires explicit human HMAC signature | `tests/agent-orchestration.test.ts` |
| **DEF-10** | Sev-3 | `DeliveryReminder` | Scheduled pre-unboxing reminders could duplicate on identical events | Idempotent hash key generation on scheduled reminders | `tests/delivery-reminder.test.ts` |
| **DEF-11** | Sev-3 | `UPIComplaints` | Statutorily incorrect TAT guidance returned on debited-not-credited disputes | Enforced RBI/NPCI statutory TAT (T+1 turnaround, ₹100/day auto-reversal penalty) | `tests/v2-40-scenarios.test.ts` (Scenario 22) |
| **DEF-12** | Sev-2 | `EvidenceGuard` | Perceptual hash collision or duplicate image uploaded across distinct claims | `EvidenceGuardService` records perceptual dHash and flags exact visual duplicates | `tests/v2-40-scenarios.test.ts` (Scenario 16) |
| **DEF-13** | Sev-3 | `Next.js Routes` | React 19 SSR hydration warnings on date formatting and skeleton components | Resolved date rendering purity with client-mounted safe wrappers | `npm run build` (54 routes clean) |

---

## 2. Defect Verification Verdict
**Zero Open Defects.** All 13 remediation items have corresponding automated unit and integration tests executing in CI.
