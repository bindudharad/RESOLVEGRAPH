# 17. Security, Privacy & Regulatory Compliance Audit

**Service Files:** `src/server/privacy/evidence-privacy.service.ts`, `src/server/auth/enterprise-api-auth.ts`  
**Test Suites:** `tests/security-consent.test.ts`, `tests/authorization-isolation.test.ts`

---

## 1. Multi-Tenant Boundary Security

Cross-tenant data isolation is enforced at the database query layer:
- **Tenant Scope:** Every case query for merchant agents includes `where: { organizationId: user.organizationId }`.
- **Foreign Access Rejection:** Automated test `tests/authorization-isolation.test.ts` confirms that an authenticated merchant from *Nova Electronics* attempting to read or mutate a *TechStore* case receives an immediate 403 Forbidden rejection.

---

## 2. Privacy & Statutory Legal Holds (GDPR / CCPA)

- **Automated DSAR Package (`generateDsarExport`):** Exports all user data (orders, cases, claims, evidence metadata) in machine-readable JSON format.
- **Statutory Legal-Hold Protection (`requestErasure`):**
  If a user requests account deletion while being a party to an active dispute (`SUBMITTED`, `IN_REVIEW`, `UNDER_ANALYSIS`), erasure is strictly blocked:
  $$\text{Deletion blocked by statutory legal hold under e-commerce dispute retention rules.}$$
  Once all disputes are resolved, personal identifiers are irreversibly pseudonymized into `Redacted User <hash>`.
