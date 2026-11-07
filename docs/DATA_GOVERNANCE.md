# RESOLVEGRAPH — Data Governance & Classification Framework

## 1. Governance Principles & Data Hierarchy

RESOLVEGRAPH processes sensitive commercial disputes, financial transactions, and proprietary evidence. Data governance is structured around four non-negotiable principles:
1. **Purpose Limitation**: Data is processed solely for dispute intake, factual reconciliation, and bilateral resolution.
2. **Data Minimization & Redaction**: Payment credentials (PAN, CVV) and unnecessary PII are redacted before storage or AI ingestion.
3. **Tenant Boundary Isolation**: Cross-tenant data sharing is blocked at the Data Access Layer (DAL).
4. **Preservation-First Erasure**: Privacy deletions respect statutory financial retention requirements (e.g., tax, AML, and chargeback arbitration rules).

---

## 2. Data Classification Matrix (Categories A–J)

| Category | Description | Data Elements | Owner | Storage Tier | Retention Period | External Access | Deletion Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **A. Account Data** | Platform authentication | Email, hashed password, name, avatar | User | PostgreSQL (Encrypted) | Account Lifetime + 30 Days | Better-Auth | Anonymized on confirmed deletion. |
| **B. Org Data** | Merchant company info | Business name, tax ID, registration | Org Owner | PostgreSQL | Org Lifetime + 7 Years (Financial) | None | Soft-delete upon org termination. |
| **C. Buyer Data** | Claimant contact | Name, shipping address, contact email | Buyer | PostgreSQL | Dispute Lifecycle + 180 Days | Carrier / PayPal | Redacted upon DSAR request. |
| **D. Merchant Data** | Store representative | Handler name, support email, role | Merchant | PostgreSQL | Dispute Lifecycle + 7 Years | None | Preserved with role dissociation. |
| **E. Payment Refs** | Financial ledger entries | Order ID, capture ID, refund ID, amount | System / Merchant | PostgreSQL | 7 Years (Statutory Tax & AML) | PayPal REST API | Legal hold prevents hard deletion. |
| **F. Uploaded Evidence** | Invoices, photos, receipts | Binary files (PDF, PNG, JPG), SHA-256 | Uploader | Private S3 / Local Vault | Dispute Lifecycle + 2 Years | OpenAI (if enabled) | Secure overwrite upon expiration. |
| **G. AI-Extracted Facts** | Structured attributes | Normalized capacities, dates, prices | Platform | PostgreSQL | Dispute Lifecycle + 2 Years | None | Cascaded on case deletion. |
| **H. Human Reviews** | Adjudication decisions | Reviewer notes, approval timestamps | Merchant / Ops | PostgreSQL | 7 Years (Audit Trail) | None | Immutable historical record. |
| **I. Agent Records** | Execution logs & traces | Steps, tool arguments, hashes | System | PostgreSQL | 90 Days (Operational) | None | Auto-purged after 90 days. |
| **J. Audit History** | Immutable security events | Action, actor ID, IP hash, timestamp | Platform SRE | PostgreSQL (Append-Only) | 7 Years | None | Strictly immutable (No deletion). |

---

## 3. Jurisdiction & Regulatory Alignment

### 3.1 European Union (GDPR / eIDAS)
- **Legal Basis**: Art. 6(1)(b) Contractual Performance (resolving purchase dispute) and Art. 6(1)(f) Legitimate Interest (fraud prevention).
- **Cross-Border Transfers**: AI processing via OpenAI utilizes Standard Contractual Clauses (SCCs) and zero-data-retention (ZDR) commercial endpoints.

### 3.2 United States (CCPA / CPRA & CFPB)
- **Consumer Rights**: Free DSAR data export and right to opt-out of automated financial decisions via human-in-the-loop guardrails.

### 3.3 India (Digital Personal Data Protection Act - DPDPA 2023)
- **Notice & Consent**: Clear notice provided before evidence processing; explicit opt-in for AI analysis.
- **Data Fiduciary Responsibilities**: Reasonable security safeguards implemented (magic-byte validation, HMAC tokens, encrypted storage).
- **Children's Data**: Commercial purchases restricted to users 18+; no behavioral profiling of minors.
- **Qualified Legal Assessment Note**: Operational implementation of DPDPA requirements must be periodically reassessed against any newly notified rules by the Data Protection Board of India.
