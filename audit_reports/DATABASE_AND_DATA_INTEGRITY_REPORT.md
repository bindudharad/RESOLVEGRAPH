# RESOLVEGRAPH 2.0 — DATABASE AND DATA INTEGRITY AUDIT REPORT

**Date:** November 10, 2026  
**Auditor:** Senior Database Architect & Full-Stack Engineer  
**Database Engine:** SQLite 3 via Better-SQLite3 (`v13.0.3`)  
**ORM / Adapter:** Prisma Client (`v7.10.1`) with `@prisma/adapter-better-sqlite3`  
**Database File:** `./dev.db` (Size: `343.65 MB`)  
**Overall Integrity Status:** **EXCELLENT (Zero Structural or Referential Violations)**

---

## 1. Schema Architecture & PRAGMA Verification

The application defines **68 database models** spanning authentication, case management, evidentiary tracking, bilateral evidence graph caching, PayPal operations, multimodal extractions, and cryptographic audit chains.

### Direct SQLite Pragma Audits
- **`PRAGMA integrity_check`:**  
  Result: `[ { integrity_check: 'ok' } ]` (Zero page corruption, index corruption, or B-tree inconsistencies).
- **`PRAGMA foreign_key_check`:**  
  Result: `0 foreign key violations` (100% referential integrity across all 68 tables).

---

## 2. Table Inventory & Row Count Distribution

| Table Name | Record Count | Description & Integrity Analysis |
|---|---|---|
| `MatchingDecision` | **33,644** | Historical deterministic & fuzzy matching records between disparate rails. |
| `AIAnalysisInput` | **9,054** | Cached inputs to BERR and agent evaluation pipelines. |
| `ClaimEvidenceAssessment` | **2,496** | Evidentiary grounding link table connecting claims to evidence items. |
| `AgentToolInvocation` | **1,872** | Audit trail of every tool invoked by specialist AI subagents. |
| `PayPalApiOperation` | **1,575** | Telemetry logs of orders, captures, refunds, and dispute queries. |
| `CaseEvent` | **1,025** | Immutable event log for lifecycle audit trail. |
| `TransactionSourceRecord` | **810** | Raw ingested transaction records prior to normalization. |
| `CommerceOrderItem` | **632** | Line items associated with customer purchases. |
| `CommerceOrder` | **591** | Orders placed across merchants. |
| `PayPalPayment` | **577** | Normalized PayPal payment transactions. |
| `CanonicalTransaction` | **479** | Cross-provider normalized transaction ledger. |
| `AgentArtifact` | **399** | Intermediate artifacts generated during agent runs (e.g. drafted messages). |
| `CaseRecord` | **346** | Core dispute cases across all statuses. |
| `AIProcessingConsent` | **306** | Explicit user consent records for AI analysis of evidence and PII. |
| `ResolutionProposal` | **282** | Proposed settlement remedies (refund, return, replacement, store credit). |
| `RefundTransaction` | **274** | Reconciled refund actions linked to parent payments. |
| `SecurityAuditEvent` | **272** | Security incident and access violation logs. |
| `AgentRun` | **250** | Execution sessions of the multi-agent copilot. |
| `AIAnalysisRun` | **227** | Forensic analysis runs executing BERR reasoning. |
| `PayPalWebhookEvent` | **216** | Received PayPal webhook payloads with signature validation metadata. |
| `HashChainedAuditRecord` | **207** | Cryptographically chained audit log (SHA-256 tamper-evident chain). |
| `InvestigationFinding` | **203** | Discrete forensic conclusions reached during investigation. |
| `BerrFindingEvidence` | **192** | Evidence citations supporting BERR findings. |
| `CaseTimelineEvent` | **177** | Human-readable chronological dispute timeline events. |
| `AgentStep` | **174** | Step-by-step reasoning trace executed by agent coordinator. |
| `AgentApprovalRequest` | **146** | Human sign-off requests with deterministic argument hashes. |
| `CameraSession` | **145** | Dual-Sight unboxing camera challenge sessions. |
| `CaptureChallenge` | **145** | Cryptographic visual challenges issued to unboxing clients. |
| `EvidenceFieldExtraction` | **143** | Normalized extracted fields (dates, amounts, model numbers, SKUs). |
| `BerrFinding` | **138** | High-level BERR dispute classifications (`AGREED`, `VERIFIED`, etc.). |
| `PayPalDispute` | **135** | Disputes synchronized from PayPal Sandbox. |
| `DeliveryReminder` | **120** | Pre-delivery and delivery notification dispatch records. |
| `Evidence` | **103** | Core uploaded evidence files in the Evidence Vault. |
| `ResolutionPartyResponse` | **100** | Bilateral responses (accept, counter, reject) from participants. |
| `MultilingualComplaint` | **90** | Voice/conversational complaint transcripts with language detection. |
| `NotificationMessage` | **71** | In-app notification queue records. |
| `PaymentIncident` | **57** | Payment anomalies flagged for root-cause investigation. |
| `GraphSnapshot` | **49** | Serialized 3D/2D Bilateral Evidence Graph projections. |
| `ReconciliationMismatch` | **33** | Rail discrepancies flagged for human resolution. |
| `User` | **16** | Registered system users (Admins, Buyers, Merchants). |
| `Session` | **11** | Active Better-Auth session tokens. |
| `OrganizationMember` | **9** | Multi-tenant organization user bindings. |
| `Organization` | **7** | Multi-tenant organizations. |

---

## 3. Analysis of Zero-Record Tables

Several tables currently hold 0 records in `dev.db`:
- `PackagePassport`, `PackageItem`, `PackageSeal`, `PackageEvent`: 0 records.
  - *Root Cause:* The automated test suite (`tests/package-passport.test.ts`) contains an explicit `after()` hook that cleans up and deletes test packages upon completion to prevent test database bloat.
- `EvidenceAnalysisResult`, `ExtractedFact`, `FactClaimAssessment`, `FactRelation`: 0 records.
  - *Root Cause:* Legacy v1 schema tables superseded by the modernized `EvidenceFieldExtraction`, `ClaimEvidenceAssessment`, and `BerrFinding` structures.
- `SharedRoomMessage`: 0 records.
  - *Root Cause:* Resolution Room messaging is backed dynamically by `CaseTimelineEvent` and `ResolutionPartyResponse`.
- `OrganizationInvitation`: 0 records.
  - *Root Cause:* Direct administrator assignment is used in development rather than pending email invites.

---

## 4. Referential Integrity & Relational Soundness

1. **User - Case Relationships:**
   - Every `CaseRecord` has a valid `buyerId` referencing an existing `User`.
   - Cases assigned to merchants have a valid `merchantId` or `organizationId`.
2. **Evidence - Case Integrity:**
   - All 103 `Evidence` records point to valid `caseId` records in `CaseRecord`. Zero orphaned evidence files exist.
   - All files have non-null `sha256Hash` entries.
3. **Audit Ledger Consistency:**
   - The 207 records in `HashChainedAuditRecord` form a continuous unbroken SHA-256 chain. Each record's `previousHash` matches the `chainedHash` of the preceding record.
