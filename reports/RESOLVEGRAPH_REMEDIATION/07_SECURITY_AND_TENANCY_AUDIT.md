# RESOLVEGRAPH AUDIT REPORT 07 — SECURITY AND TENANCY AUDIT

**Project:** RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure  
**Date:** November 7, 2026  
**Auditor:** Principal Security Engineer  
**Scope:** Multi-Tenant Boundaries, Role-Based Access Control, Secret Management, SSRF Prevention, and Prompt Injection Defense  

---

## 1. Executive Summary

A comprehensive security audit was executed against the RESOLVEGRAPH platform to evaluate multi-tenant boundary integrity, authorization checks across all user roles, protection of financial endpoints, cryptographic audit logging, and input/output sanitization in AI pipelines.

All automated security test suites passed without failure. No multi-tenant data leaks, SSRF vulnerabilities, or unauthorized execution vectors were identified.

---

## 2. Multi-Tenant Isolation & Authorization Testing

### 2.1 Boundary Verification Results

| Test Scenario | Actor / Role | Target Resource | Expected Behavior | Observed Result | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cross-Tenant Case Reading** | Carlos Mendez (`org_techstore`) | Case belonging to `org_digitalmart` | Access Denied (403/404) | Query filtered out case; direct ID lookup returned 404 | **PASS** |
| **Buyer-to-Buyer Isolation** | Alex Morgan (Buyer A) | Case belonging to Buyer B | Access Denied | Scoped query returned only Buyer A's cases | **PASS** |
| **Cross-Tenant Mutation Guard** | Merchant Member (`org_nova`) | Patch case in `org_techstore` | Mutation Blocked | Blocked by tenant ownership check | **PASS** |
| **Platform Admin Omniscience** | Priya Raghavan (`ADMIN`) | Global cross-tenant cases | Unrestricted Audit Access | Returns all cases across all tenants | **PASS** |
| **Cross-Tenant Tool Execution** | Copilot Agent running for `org_techstore` | `get_case_summary` for other org | Tool RBAC Block | Blocked by `FinancialActionGuardrails` | **PASS** |

---

## 3. Financial Guardrails & Human-in-the-Loop Safeguards

1. **Non-Negotiable Ban on Autonomous Payouts:**  
   The `FinancialActionGuardrails` module strictly forbids autonomous execution of financial disbursement tools by any AI agent persona. All high-risk proposals must generate an `AgentApprovalRequest`.
2. **Cryptographic Argument Hashing:**  
   When an approval request is created, a deterministic SHA-256 hash is computed over its parameters:
   $$\text{Hash} = \text{SHA256}(\text{caseId} + \text{amountMinor} + \text{recipient} + \text{toolName})$$
   Any modification of the arguments payload before execution invalidates the request immediately.
3. **Dual-Key Authorization:**  
   Buyers are structurally barred from approving merchant refunds or disbursements. Only designated merchant owners or authorized platform resolution managers can authorize financial settlements.

---

## 4. Webhook Security & SSRF Prevention

PayPal webhook delivery relies on public HTTP endpoints (`/api/webhooks/paypal`). To prevent Server-Side Request Forgery (SSRF) and spoofing:
1. **Certificate Hostname Whitelisting:**  
   The application strictly validates that the certificate URL supplied in the webhook transmission headers belongs to trusted PayPal infrastructure (`.paypal.com` domain ending). Untrusted certificate hosts are rejected immediately before any network request is initiated.
2. **Transmission Header Verification:**  
   Payloads lacking required security headers (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`) are rejected with HTTP 400.
3. **Idempotency Window:**  
   Webhook event IDs are tracked in the database to prevent replay attacks and duplicate payment captures.

---

## 5. AI Input Sanitization & Data Privacy

1. **Prompt Injection Isolation:**  
   Untrusted user input and claim text are wrapped inside strict XML boundary delimiters (`<user_claim_text>`, `<evidence_summary>`) before passing to LLM prompts, neutralizing delimiter injection attacks.
2. **Data Redaction & Masking:**  
   All outbound text is scanned with a Luhn-verified credit card detector (`passesLuhnCheck`), SSN pattern matchers, and API credential filters. Primary Account Numbers (PANs) and CVVs are masked before persistence or LLM transmission.
3. **Consent Management (DSAR / GDPR):**  
   The `ConsentManager` enforces explicit consent checks before any buyer evidence is processed by AI models. Data Subject Access Requests (`PrivacyService.generateDsarExport`) produce structured JSON archives, and right-to-erasure workflows safely pseudonymize records while preserving mandatory financial dispute ledgers.
