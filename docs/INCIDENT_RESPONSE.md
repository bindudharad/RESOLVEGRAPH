# RESOLVEGRAPH — Incident Response Framework & Disaster SOPs

## 1. Incident Severity Definitions & SLA

| Severity Level | Response SLA | Update Cadence | Incident Commander | Criteria |
| :--- | :---: | :---: | :--- | :--- |
| **SEV-1 (Critical)** | **$\le 15$ min** | Every 30 min | VP Eng / Lead Architect | Total system outage, unauthorized refund attempt, data breach, cross-tenant leak. |
| **SEV-2 (Major)** | **$\le 45$ min** | Every 1 hour | Staff SRE / Tech Lead | AI provider failure, PayPal webhook signature drop, evidence storage degraded. |
| **SEV-3 (Moderate)**| **$\le 4$ hours** | Daily | On-call Engineer | Non-critical worker latency, isolated merchant export failure, transient timeout. |

---

## 2. Standard Operating Procedures (Incidents 1–13)

### Incident 1: Database Outage (PostgreSQL / SQLite Connection Loss)
- **Detection**: Health check `/api/health` returns HTTP 500 (`database.connected: false`); connection pool alert fires.
- **Severity**: **SEV-1**
- **Immediate Containment**:
  1. Freeze incoming mutation endpoints; switch reverse proxy to maintenance page (`503 Service Unavailable`).
  2. Inspect connection pool saturation and managed database health metrics.
- **Investigation & Recovery**:
  1. Attempt connection pool drain and graceful restart.
  2. If hardware or storage failure: initiate failover to standby replica.
  3. If data corruption suspected: execute non-destructive restoration drill as defined in `docs/DISASTER_RECOVERY.md` using latest point-in-time snapshot.
- **Post-Incident**: Verify record parity across `caseRecord` and `payPalPayment` tables before reopening traffic.

---

### Incident 2: Evidence Storage Outage (S3 / Local Vault Inaccessible)
- **Detection**: File upload errors exceed 5% in 5 minutes; download token generation fails.
- **Severity**: **SEV-2**
- **Immediate Containment**:
  1. Place evidence upload forms in "Queued for Upload" status; display informational notice to users.
  2. Existing case metadata and claims remain functional.
- **Investigation & Recovery**:
  1. Verify S3 IAM credentials, bucket status, and KMS encryption key availability.
  2. Replay pending evidence uploads from temporary local cache once service restores.

---

### Incident 3: AI Provider Outage (OpenAI API Degradation or 5xx Spikes)
- **Detection**: Worker error rate $>5\%$; `ai_worker_queue_backlog` rises $>25$ jobs.
- **Severity**: **SEV-2**
- **Immediate Containment**:
  1. Automated fallback activates: `AnalysisQueue` switches active provider from `openai` to `TestAIProvider` and local deterministic BERR rule engine.
- **Investigation & Recovery**:
  1. Monitor OpenAI status dashboard.
  2. Re-queue completed deterministic fallback cases for enhanced vision re-analysis if requested by the merchant.

---

### Incident 4: PayPal API Outage (Sandbox / Production Gateway Down)
- **Detection**: Capture or refund endpoints return HTTP 502/504 or socket timeouts.
- **Severity**: **SEV-1** (if live) / **SEV-2** (in Sandbox)
- **Immediate Containment**:
  1. Disable checkout submit buttons with message: *"Payment gateway is temporarily experiencing network latency. Please check back shortly."*
  2. Hold draft resolution proposals in `PENDING_GATEWAY` state.
- **Investigation & Recovery**:
  1. Verify PayPal developer status.
  2. Once restored, run `scripts/reconcile-payments.ts` to reconcile pending payment sessions.

---

### Incident 5: Invalid Webhook Signatures (Signature Verification Drop)
- **Detection**: Webhook processing drops with `Invalid PayPal transmission signature` alert.
- **Severity**: **SEV-1 (Potential Spoofing / MITM)**
- **Immediate Containment**:
  1. Block processing of unverified webhooks; write payloads to a quarantined audit bucket.
  2. Verify PayPal certificate URL host whitelist (`*.paypal.com`).
- **Investigation & Recovery**:
  1. Determine if PayPal rotated public root certificates or if an attacker is attempting webhook forgery.
  2. Re-process quarantined payloads manually once valid certificate chains are cached.

---

### Incident 6: Suspected Unauthorized Refund Attempt
- **Detection**: `FinancialActionGuardrails` intercepts an unauthorized tool invocation or tampered argument hash.
- **Severity**: **SEV-1 (CRITICAL SECURITY)**
- **Immediate Containment**:
  1. Immediately terminate active `AgentRun` and revoke user session token.
  2. Lock associated case in `SECURITY_FREEZE` status.
- **Investigation & Recovery**:
  1. Audit `AgentApprovalRequest` arguments hash versus proposed parameters.
  2. Check for unauthorized role escalation or credential theft.
  3. Notify merchant security officer and log immutable audit event.

---

### Incident 7: Cross-Organization Data Exposure (IDOR Leak)
- **Detection**: DAL authorization check flags cross-tenant access attempt or user reports seeing another merchant's case.
- **Severity**: **SEV-1 (CRITICAL DATA BREACH)**
- **Immediate Containment**:
  1. Temporarily restrict access to the affected route.
  2. Invalidate active session tokens for the affected organization.
- **Investigation & Recovery**:
  1. Trace request logs by `traceId` and user IP.
  2. Audit DAL queries for missing `organizationId` filter clauses.
  3. Issue regulatory notification if PII was exposed.

---

### Incident 8: Account Compromise (Credential Stuffing / Stolen Session)
- **Detection**: Rapid geographic IP shifts on active session; unusual burst of dispute actions.
- **Severity**: **SEV-2**
- **Immediate Containment**:
  1. Revoke all active Better-Auth sessions for the affected user ID (`POST /api/auth/revoke`).
  2. Invalidate user API keys and force password reset.
- **Investigation & Recovery**:
  1. Audit all actions performed during the compromise window.
  2. Roll back any unauthorized dispute proposals created during the window.

---

### Incident 9: Prompt-Injection / Adversarial Override Incident
- **Detection**: ContentSanitizer flags malicious payload or QualityReviewAgent rejects ungrounded favorable draft containing system prompt fragments.
- **Severity**: **SEV-2**
- **Immediate Containment**:
  1. The injection string is stripped by `ContentSanitizer`; claim text is isolated inside `<untrusted_claim>` tags.
  2. Flag user account for trust & safety review.
- **Investigation & Recovery**:
  1. Verify no tool executed outside bounds.
  2. Add novel injection patterns to `src/server/ai/security/content-sanitizer.ts`.

---

### Incident 10: Malicious File Upload (Disguised PE Binary / Polyglot)
- **Detection**: File magic-byte scanner catches executable signature disguised with `.pdf` extension.
- **Severity**: **SEV-2**
- **Immediate Containment**:
  1. The upload is instantly rejected before writing to disk.
  2. IP address and user account are logged to `SecurityAuditEvent`.
- **Investigation & Recovery**:
  1. Confirm local evidence vault was not modified.
  2. Update malware signature rules if new zero-day vector was attempted.

---

### Incident 11: Data Leakage Incident (Accidental PII in Public Logs)
- **Detection**: Structured log scanner detects unmasked credit card PAN or customer phone number in logs.
- **Severity**: **SEV-2**
- **Immediate Containment**:
  1. Purge log index from centralized log aggregator (Datadog / CloudWatch).
- **Investigation & Recovery**:
  1. Update regex redaction filters in `src/lib/logger.ts` to cover the leaked format.

---

### Incident 12: Worker Backlog Spikes (Queue Congestion)
- **Detection**: `ai_worker_queue_backlog` exceeds 50 jobs for $>10$ minutes.
- **Severity**: **SEV-3**
- **Immediate Containment**:
  1. Spawn additional worker instances (`npm run ai:worker`).
  2. Prioritize high-priority disputed cases over routine background re-indexing.

---

### Incident 13: Corrupted Historical Case Records
- **Detection**: Database foreign key integrity check fails during reconciliation drill.
- **Severity**: **SEV-1**
- **Immediate Containment**:
  1. Lock affected case record in read-only audit mode.
- **Investigation & Recovery**:
  1. Query chronological `caseEvent` table to reconstruct state history.
  2. Restore corrupted relational link from backup snapshot.

---

## 3. Post-Incident Review & Preservation Protocol

1. **Evidence Preservation**: Under no circumstances are logs, database audit records, or network traces deleted following an incident.
2. **Blameless Post-Mortem**: Document Root Cause, Detection Time (TTD), Resolution Time (TTR), Preventive Action Items, and JIRA tracking tickets within 48 hours.
