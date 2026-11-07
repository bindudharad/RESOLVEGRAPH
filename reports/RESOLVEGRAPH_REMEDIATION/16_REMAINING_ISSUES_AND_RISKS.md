# RESOLVEGRAPH AUDIT REPORT 16 — REMAINING ISSUES AND RISKS

**Project:** RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure  
**Date:** November 7, 2026  
**Auditor:** Principal Software Architect & Security Lead  
**Scope:** Residual Architectural Constraints, Deployment Prerequisites, and Future Hardening Recommendations  

---

## 1. Executive Summary

All confirmed defects identified in the master prompt and baseline audit have been fully remediated and verified. No blocking defects, security vulnerabilities, or unresolved compile/test errors remain in the codebase.

This document identifies operational considerations, infrastructure prerequisites, and roadmap recommendations for deploying RESOLVEGRAPH from its current single-node SQLite development profile into a multi-region production cloud environment.

---

## 2. Operational Considerations & Residual Risks

### 2.1 Database Scale: SQLite to PostgreSQL Migration Path
- **Current State:**  
  The system currently runs on an embedded SQLite database (`dev.db`, 43 MB) via `@prisma/adapter-better-sqlite3`. This configuration is ideal for local evaluation, high-performance offline development, and deterministic testing.
- **Production Consideration:**  
  SQLite employs database-level write locks. In a high-concurrency production deployment with tens of thousands of simultaneous webhooks and evidence uploads, SQLite will encounter write lock contention.
- **Migration Recommendation:**  
  The application code is written entirely with Prisma ORM and abstracted service layers (`CaseService`, `AnalyticsService`, `EvidenceService`). Transitioning to managed PostgreSQL (such as Amazon RDS Aurora or Google Cloud SQL) requires only updating the `provider = "postgresql"` line in `prisma/schema.prisma` and running `prisma migrate deploy`.

---

### 2.2 Live PayPal Activation Prerequisites
- **Current State:**  
  `PAYPAL_LIVE_ENABLED=false` is enforced as an architectural lock. All transaction flows use PayPal Sandbox (`api-m.sandbox.paypal.com`) or simulated mock providers.
- **Production Activation Rules:**  
  Before flipping `PAYPAL_LIVE_ENABLED=true` in production:
  1. Production credentials (`PAYPAL_LIVE_CLIENT_ID` and `PAYPAL_LIVE_CLIENT_SECRET`) must be provisioned in the enterprise PayPal Developer portal.
  2. Public webhook endpoints must be secured behind valid SSL/TLS certificates signed by recognized certificate authorities.
  3. Strict human approval policies must remain permanently enforced (`FinancialActionGuardrails`).

---

### 2.3 Evidence Storage: Disk to S3 / Google Cloud Storage
- **Current State:**  
  Uploaded evidence files are stored securely in local private directory `./.private/evidence` with SHA-256 computation and magic-byte validation.
- **Production Scalability:**  
  In containerized Kubernetes or serverless Vercel environments, local ephemeral disk storage will be reset across deployments.
- **Cloud Storage Recommendation:**  
  The `EvidenceStorageService` is designed around stream buffers. Swapping local disk writes for presigned S3 / Google Cloud Storage buckets requires minimal modification to the storage adapter without altering case relationship models.

---

### 2.4 External AI Provider Fallback Strategy
- **Current State:**  
  The system supports both OpenAI (`gpt-4o-mini`), Google Gemini, and deterministic test providers (`AI_PROVIDER=test`).
- **Resilience Recommendation:**  
  In production, external LLM APIs may experience transient rate limits or outages. The BERR engine's deterministic rule-based baseline (Baseline A) functions completely offline without external network dependencies, ensuring that dispute fact extraction continues even during AI provider downtime.

---

## 3. Risk Assessment Matrix

| Risk Item | Likelihood | Impact | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **SQLite write lock under heavy concurrent uploads** | Medium (Prod only) | Medium | Moderate | Migrate to PostgreSQL Aurora for multi-node deployments. |
| **Accidental live payment payout** | Extremely Low | High | Minimal | Hard-coded `FeatureFlags.isPayPalLiveEnabled()` blocks live payouts in non-production. |
| **External LLM rate limit during batch triage** | Medium | Low | Low | BERR fallback to rule-based contradiction detection. |
| **Ephemeral file loss on container restart** | Low (Dev/Demo) / High (Prod) | High | Moderate | Mount persistent storage volume or configure S3 object storage adapter. |
