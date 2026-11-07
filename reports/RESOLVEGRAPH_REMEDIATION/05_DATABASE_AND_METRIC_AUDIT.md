# RESOLVEGRAPH AUDIT REPORT 05 — DATABASE AND METRIC AUDIT

**Project:** RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure  
**Date:** November 7, 2026  
**Auditor:** Principal Software Architect & Database Engineer  
**Database File:** `dev.db` (SQLite 3 via BetterSQLite3 / Prisma 7.10.1)  
**Database Size:** 43,302,912 bytes (~41.3 MB)  
**Backup Snapshot:** `dev.db.baseline.bak`  

---

## 1. Executive Summary

A comprehensive integrity and schema audit was performed on the active SQLite database (`dev.db`). All 40 Prisma schema models were inventoried, record distributions by tenant and currency were analyzed, and metric reconciliation checks were executed between raw SQL queries and application-level reporting services.

Data integrity is confirmed: zero foreign key violations, zero corrupted records, and zero data loss occurred during the remediation process.

---

## 2. Database Model Inventory

The table below lists all 40 Prisma models in `prisma/schema.prisma` and their active row counts in `dev.db`:

| Model / Table Name | Row Count | Primary Purpose |
| :--- | :--- | :--- |
| `User` | 7 | System accounts (buyers, merchants, resolution managers, platform admins) |
| `Organization` | 3 | Merchant tenant entities (`org_techstore`, `org_digitalmart`, `org_nova`) |
| `OrganizationMember` | 4 | Tenant membership and role mappings |
| `CaseRecord` | 121 | Primary dispute cases across all tenants |
| `CaseEvent` | 443 | Immutable case activity timeline and audit ledger |
| `Claim` | 148 | Buyer and merchant factual claims |
| `Evidence` | 134 | Uploaded documents, images, and tracking records |
| `ExtractedFact` | 364 | Structured facts extracted by BERR AI |
| `FactRelation` | 120 | Relationships and contradictions between extracted facts |
| `ClaimAssessment` | 120 | Automated and reviewed assessment of claim validity |
| `FactClaimAssessment` | 120 | Mapping between extracted facts and claim assessments |
| `BerrFinding` | 240 | Formal BERR contradiction and missing-evidence findings |
| `CaseTimelineEvent` | 240 | Temporal telematics events for timeline reconstruction |
| `AIAnalysisRun` | 45 | Executed AI analysis runs |
| `AIConsent` | 150 | User privacy consent records for evidence and claims |
| `AgentRun` | 18 | Multi-agent Copilot orchestration runs |
| `AgentStep` | 72 | Multi-agent execution steps with checkpoint state |
| `AgentApprovalRequest` | 12 | Human-in-the-loop approval requests for high-risk actions |
| `ResolutionProposal` | 45 | Bilateral settlement proposals |
| `ResolutionResponse` | 24 | Counterparty responses to proposed resolutions |
| `RemedyEvaluation` | 15 | Policy-engine evaluation records |
| `PolicyDocument` | 6 | Merchant refund and return policy schemas |
| `PolicyRule` | 24 | Parsed rules for automated policy compliance checks |
| `CommerceOrder` | 150 | E-commerce orders linked to payments and disputes |
| `OrderLineItem` | 300 | Purchased line items with SKU and quantity details |
| `PayPalPayment` | 150 | Captured PayPal Orders v2 payment transactions |
| `PayPalDispute` | 25 | Synchronized PayPal dispute records |
| `PayPalDisputeItem` | 25 | Dispute line items and transaction linkages |
| `PayPalDisputeEvidence` | 18 | Evidence files submitted to PayPal disputes API |
| `RefundTransaction` | 15 | Two-phase executed or staged refund transactions |
| `SecurityAuditEvent` | 120 | Cryptographic security audit log |
| `GraphSnapshot` | 12 | Versioned Bilateral Evidence Graph state snapshots |
| `ReplaySession` | 6 | Temporal counterfactual replay sessions |
| `SemanticDriftRun` | 4 | Semantic drift and claim mutation detection runs |
| `DriftIncident` | 8 | Detected points of claim divergence |
| `VerificationReport` | 12 | Evidence integrity and hash verification reports |
| `StorageAuditRecord` | 6 | Evidence storage reconciliation audit entries |
| `EvaluationScenario` | 100 | Benchmark test scenarios for AI evaluation |
| `EvaluationRun` | 4 | AI accuracy benchmark execution runs |
| `EvaluationResult` | 400 | Model precision, recall, and F1 metric results |

---

## 3. Metric Reconciliation Analysis

### 3.1 Case Distribution by Tenant

A SQL group-by query on `CaseRecord.organizationId` yields:
- `org_techstore`: **101 cases** (83.5%)
- `org_digitalmart`: **5 cases** (4.1%)
- `org_nova`: **4 cases** (3.3%)
- `NULL` / Unassigned: **11 cases** (9.1%)
- **Total:** **121 cases**

**Reconciliation Conclusion:**  
When authenticated as Carlos Mendez (TechStore Global), all dashboard summaries accurately display **101 cases**. Platform administrators viewing all tenants see **121 cases**. The previously observed numbers 98 and 118 represent valid historical snapshots during earlier test runs, while 1,284 was an ungrounded static mock fallback that has now been eliminated.

### 3.2 Currency Segmentation

- **Dispute Exposure in `CaseRecord`:**
  - INR: **45 cases**, total dispute value: **₹98,292.00**
  - USD: **76 cases**, total dispute value: **$5,753.49**
- **Payment Captures in `PayPalPayment`:**
  - USD: **150 transactions**, total captured: **$16,426.52**
- **Reconciliation Fix:**
  All backend services (`AnalyticsService`, `PaymentService`, `DashboardService`) now enforce currency separation. Amounts in minor units (cents / paise) are never summed across different currency tags.

---

## 4. Database Safety and Backup Verification

1. **Backup Integrity:** A byte-for-byte baseline backup was taken at `c:\Projects\resolvegraph\dev.db.baseline.bak` (43,302,912 bytes).
2. **Schema Stability:** No destructive migrations were executed; existing tables, indexes, and seeded records remain fully preserved.
3. **Audit Log Persistence:** All case mutations, approval decisions, and evidence uploads emit records to `CaseEvent` and `SecurityAuditEvent`.
