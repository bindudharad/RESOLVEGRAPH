# REPORT 04: INDEPENDENT CYBERSECURITY & PRIVACY AUDIT

**Project:** RESOLVEGRAPH V2.0  
**Classification:** STRICT AUDIT REPORT  
**Compliance Standards:** OWASP Top 10 (2021), ISO/IEC 27001, GDPR DSAR & Right to Erasure, RBI/NPCI Guidelines  

---

## 1. Threat Modeling & Defense-in-Depth Architecture

RESOLVEGRAPH handles high-value commerce disputes and financial settlement instructions. The following security controls were audited and verified:

### 1.1 Tenant Isolation & Authorization (Broken Access Control)
- **Multi-Tenant Boundary:** Verified in `tests/authorization.test.ts` and `tests/v2-40-scenarios.test.ts` (Scenario 33). Merchants cannot query, read, or mutate dispute records belonging to foreign organizations.
- **RBAC Matrix:** Strictly enforced across 5 roles (`BUYER`, `MERCHANT_AGENT`, `ORG_ADMIN`, `RESOLUTION_MANAGER`, `ADMIN`).
- **Object-Level Permissions:** Verified on evidence files: `BUYER_ONLY`, `MERCHANT_ONLY`, `SHARED_WITH_PARTICIPANTS`, and `INTERNAL`. Internal notes are physically filtered from API responses delivered to buyers.

### 1.2 File Storage & Magic Byte Validation (Malicious Uploads)
- **Local & S3 Storage Isolation:** Files stored outside web root with random UUID storage keys.
- **Magic Byte Verification:** `LocalEvidenceStorage.validateFile` inspects file buffer headers (PDF `%PDF`, PNG `PNG`, JPEG `ÿØÿ`). Executables or shell scripts renamed to `.pdf` or `.png` are rejected.
- **Size Quota:** 10 MB strict limit per evidence file.
- **SHA-256 Hashing:** Calculated on binary ingestion and verified on retrieval.

### 1.3 Financial Safeguards & Anti-Fraud Gates
- **10-Point Safeguard Gate:** Located in `SharedResolutionService.validateFinancialSafeguards`:
  1. Dispute status must not be `RESOLVED` or `CLOSED`.
  2. Proposal status must be `AGREED`.
  3. Proposing/approving actor must be authorized merchant agent or admin.
  4. Refund amount must be greater than zero minor units.
  5. Currency must match order currency exactly.
  6. Remaining refundable balance on payment capture must be $ge$ proposal amount.
  7. No concurrent pending refund transaction for the same order.
  8. Live fund execution strictly locked if `PAYPAL_LIVE_ENABLED=false`.
  9. Required human approval record must exist with unexpired timestamp.
  10. Cryptographic argument hash matches recorded approval payload.

### 1.4 Privacy & GDPR Compliance
- **PII Redaction:** `DataRedactor` masks credit card numbers (Luhn-verified), bank account numbers, CVVs, SSNs, and passwords before feeding text to AI.
- **DSAR & Erasure:** `PrivacyService.generateDsarExport` packages all user data; `pseudonymizeUser` securely pseudonymizes records once active disputes are closed.

### 1.5 Webhook Security & Idempotency
- **HMAC Signatures:** PayPal webhooks require CRC32/SHA-256 signature verification.
- **Idempotency Keying:** Webhook events are logged in `PayPalWebhookEvent` with unique constraint on `paypalEventId`. Duplicate webhook deliveries are safely acknowledged without re-executing business logic.
