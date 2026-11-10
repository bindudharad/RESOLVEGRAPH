# RESOLVEGRAPH — Role & Permission Access Control Matrix (RBAC)

**Audit Date:** November 2026  
**Security Standard:** Strict Principle of Least Privilege & Separation of Financial Duties  
**Total Defined Roles:** 5 (`BUYER`, `MERCHANT`, `INVESTIGATOR`, `SUPPORT`, `ADMIN`)  

---

## 1. Role Definitions & Responsibilities

1. **BUYER (`buyer`):** Consumers and end-purchasers filing disputes, providing unboxing proof, uploading receipts, and accepting or declining remedy proposals.
2. **MERCHANT (`merchant`):** Store owners and sellers registering Package Passports, dispatching parcels, issuing return authorizations, and approving financial resolutions.
3. **INVESTIGATOR (`investigator`):** Neutral arbitration analysts and AI copilot supervisors evaluating evidence graphs, forensic signals, and BERR probabilistic models.
4. **SUPPORT (`support`):** Front-line dispute coordinators managing customer communications, intake triage, and multilingual translations.
5. **ADMIN (`admin`):** System administrators managing enterprise multi-tenancy, cryptographic audit chains, and emergency platform kill-switches.

---

## 2. Granular Permissions Matrix

| Platform Capability / Route | BUYER | MERCHANT | INVESTIGATOR | SUPPORT | ADMIN | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **View Own Cases (`/cases`)** | ✅ | ✅ | ✅ | ✅ | ✅ | Tenancy filter on `organizationId` / `buyerId` |
| **Create New Dispute Case** | ✅ | ❌ | ❌ | ✅ | ✅ | API Route `POST /api/cases` |
| **View Evidence Vault (`/evidence`)** | ✅ | ✅ | ✅ | ✅ | ✅ | Read access scoped to case association |
| **Upload Evidence (`/intake`)** | ✅ | ✅ | ✅ | ✅ | ✅ | API Route `POST /api/evidence/intake` |
| **Edit OCR Field Extractions** | ❌ | ❌ | ✅ | ✅ | ✅ | API Route `PATCH /api/evidence/extractions/[id]` |
| **Initiate Dual-Sight Unbox** | ✅ | ❌ | ✅ | ❌ | ✅ | Session token tied to buyer identity |
| **Register Tamper Seal (`/packages`)**| ❌ | ✅ | ❌ | ❌ | ✅ | API Route `POST /api/packages/[id]/seal` |
| **Dispatch Package to Carrier** | ❌ | ✅ | ❌ | ❌ | ✅ | API Route `POST /api/packages/[id]/dispatch` |
| **Record Delivery Checkpoints** | ❌ | ✅ | ❌ | ✅ | ✅ | API Route `POST /api/delivery/events` |
| **Confirm Delivery Arrival** | ✅ | ✅ | ❌ | ✅ | ✅ | API Route `POST /api/delivery/confirm-receipt` |
| **Submit Remedy Proposal** | ✅ (Counter) | ✅ | ✅ | ❌ | ✅ | API Route `POST /api/cases/[id]/resolution-proposals` |
| **Approve Financial Refund** | ❌ | ✅ | ❌ | ❌ | ✅ | **10-Point Safeguard Gate** strictly blocks Buyer sign-off |
| **Run Autonomous Copilot (`/copilot`)**| ❌ | ❌ | ✅ | ❌ | ✅ | Investigator / Admin gate |
| **Sign-Off Copilot Recommendations**| ❌ | ✅ | ✅ | ❌ | ✅ | Role-based cryptographic approval hash |
| **Register India UPI Dispute** | ✅ | ❌ | ❌ | ✅ | ✅ | API Route `POST /api/payments/complaints/upi` |
| **Payment Reconciliation Ledger**| ❌ | ✅ | ✅ | ❌ | ✅ | Financial ledger gate |
| **View Cryptographic Audit Chain**| ❌ | ❌ | ❌ | ❌ | ✅ | Route `/admin/security` (`ADMIN` only) |
| **Toggle Emergency Kill-Switch** | ❌ | ❌ | ❌ | ❌ | ✅ | API Route `POST /api/admin/kill-switch` (`ADMIN` only) |
| **Manage Tenant Team Members** | ❌ | ❌ | ❌ | ❌ | ✅ | Route `/organizations` (`ADMIN` only) |

---

## 3. Financial Segregation & Safety Safeguards

The ResolveGraph platform strictly enforces segregation of duties:
1. **Buyers Cannot Authorize Payouts:** Under no circumstance can a buyer sign off on a merchant remedy or execute an autonomous refund. Any attempt yields `403 Forbidden: Insufficient financial signing authority`.
2. **Deterministic Cryptographic Argument Hashing:** When the Copilot drafts a financial action, a SHA-256 hash of the exact parameters (`caseId`, `amount`, `currency`, `recipient`) is locked into an `AgentApprovalRequest`. Any tampering with amounts invalidates the approval token.
3. **Dual-Key Tenancy:** Organization data queries in SQLite enforce strict `organizationId` boundaries. Cross-tenant access is tested and verified to return `404 Not Found` or `403 Forbidden`.
