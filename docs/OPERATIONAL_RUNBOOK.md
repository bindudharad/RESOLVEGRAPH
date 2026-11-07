# RESOLVEGRAPH — Operational Runbook & SRE Procedures
**Phase:** Step 10 Production Engineering & Operational Excellence  
**Status:** STANDARD OPERATING PROCEDURE (SOP)  
**Audience:** Site Reliability Engineers, Platform Operations, On-Call Engineers  
**Version:** 1.0.0  
**Last Updated:** November 2026

---

## 1. On-Call Structure & Escalation Matrix

ResolveGraph maintains a 24/7/365 follow-the-sun on-call rotation with three escalation tiers:

```
[Alert Fired / PagerDuty / Datadog]
                │
                ▼
      ┌──────────────────┐
      │  Tier 1: Triage  │  Response SLA: 10 Minutes (P1), 30 Minutes (P2)
      └─────────┬────────┘  Initial triage, log inspection, service restarts, canary rollback
                │ (Escalated if unresolved in 20 min)
                ▼
      ┌──────────────────┐
      │ Tier 2: Platform │  Response SLA: 15 Minutes
      └─────────┬────────┘  Database performance, connection pools, PayPal API drift, storage
                │ (Escalated if data integrity or AI safety involved)
                ▼
      ┌──────────────────┐
      │ Tier 3: Core AI  │  Response SLA: 30 Minutes
      │    & Security    │  Model drift, prompt jailbreak, financial ledger discrepancy, DPO
      └──────────────────┘
```

### Escalation Directory
- **T1 Platform Ops Primary**: `ops-oncall@resolvegraph.io` / PagerDuty Schedule: `RG-Ops-T1`
- **T2 Database & Cloud Lead**: `infra-lead@resolvegraph.io` / PagerDuty Schedule: `RG-Infra-T2`
- **T3 AI & Security Architect**: `security-team@resolvegraph.io` / PagerDuty Schedule: `RG-Sec-T3`

---

## 2. Daily Operational Checklist

The primary on-call engineer must complete and sign off on this checklist every day at 08:00 UTC:

```markdown
- [ ] 1. Health Probe Verification:
      curl -s https://app.resolvegraph.com/api/health | jq .
      Verify status === "healthy", db latency < 20ms, all subsystems reporting true.

- [ ] 2. Agent Operations Audit:
      Run background agent monitoring pass:
      Inspect stuck runs (> 15 mins) and auto-expired human approvals.
      Verify zero stranded agent executions in status RUNNING or PENDING_APPROVAL > 24h.

- [ ] 3. Storage Reconciliation Scan:
      Run: npm run storage:reconcile
      Verify: 0 missing physical files, 0 unindexed orphan files, 100% hash parity.

- [ ] 4. Payment Ledger Audit:
      Run: npm run payments:reconcile
      Verify: Zero discrepancies between internal Orders/Refunds and PayPal status.

- [ ] 5. Error Budget & Sentry Rate Check:
      Confirm HTTP 5xx error rate is under 0.05% for the preceding 24 hours.

- [ ] 6. Disk & Database Headroom:
      Confirm database volume and storage bucket have >= 35% free headroom.
```

---

## 3. Routine Maintenance Procedures

### 3.1 Weekly Database Backup-and-Restoration Drill
Every Monday at 02:00 UTC, the automated restoration drill must run in an isolated sandbox to certify RPO/RTO metrics:
```bash
# Execute drill
npm run db:drill

# Verify output ends with:
# [SUCCESS] Database Backup & Restoration Drill PASSED.
# All data integrity invariants and relational checks verified.
```
*If this script fails or reports record count discrepancies, page Tier 2 Infrastructure immediately.*

### 3.2 Evidence Storage Re-indexing
Every Wednesday at 03:00 UTC:
```bash
npm run storage:reconcile
```
Inspect the output. Any detected discrepancies must be logged as Jira tickets under the `INFRA-STORAGE` board.

### 3.3 Log Rotation & Audit Archive
Audit logs (stored in JSON structured format) are retained in hot storage for 90 days and automatically moved to AWS S3 Glacier / Cloud Storage Coldline with object locking (WORM: Write Once, Read Many) for 7 years to comply with financial audit requirements.

---

## 4. Diagnostic & Remediation Workflows

### 4.1 Workflow: Diagnosing Stuck Agent Runs
**Symptom**: An agent run has remained in `RUNNING` or `PENDING_APPROVAL` status beyond expected boundaries.

1. **Locate Stuck Runs**:
   Query the database using Prisma Studio or CLI script:
   ```typescript
   import { agentOperations } from '@/server/agents/runtime/agent-operations.service';
   const report = await agentOperations.monitorAndRecover();
   console.log(report);
   ```
2. **Review Execution Logs**:
   Inspect structured JSON logs for the specific `runId`:
   ```bash
   grep '"runId":"agent-run-xyz"' /var/log/resolvegraph/app.json | jq .
   ```
3. **Inspect External API Calls**:
   Check if an LLM invocation timed out or rate limits were exceeded (`OpenAI 429 Too Many Requests`).
4. **Remediate**:
   Call `agentOperations.recoverStuckRuns(15)` which transitions runs exceeding 15 minutes to `FAILED` with error message `"Execution timed out after 15 minutes of inactivity"`.

---

### 4.2 Workflow: Handling Payment Ledger Discrepancies
**Symptom**: `npm run payments:reconcile` reports `MISMATCH` or `ORPHAN` status on an order or dispute refund.

1. **Do NOT blindly modify the database.** Financial tables are auditable ledgers.
2. Run diagnostic report for the affected order ID:
   ```bash
   npm run payments:reconcile -- --orderId=order-123
   ```
3. Check PayPal Developer Dashboard Sandbox API Logs for event notifications and webhook delivery history.
4. If a webhook was missed due to transient downtime, manually redeliver the event from PayPal Developer Portal or replay the signed event payload via POST to `/api/webhooks/paypal`.
5. If discrepancy persists, file an incident ticket (`P2-Fintech-Drift`) and notify Finance Operations.

---

### 4.3 Workflow: Storage Hash Mismatch
**Symptom**: Storage reconciliation reports `HASH_MISMATCH` for an evidence file.

1. Retrieve the affected evidence record:
   ```bash
   npm run storage:reconcile -- --evidenceId=ev-456
   ```
2. **Check for Disk Corruption**: Verify underlying filesystem mount health (`fsck` / smartctl).
3. **Compare SHA-256**:
   Calculate manual hash of the file on disk:
   ```bash
   sha256sum data/evidence_storage/org-123/ev-456.jpg
   ```
4. If hash does not match `Evidence.sha256Hash`, the file may have been altered or corrupted:
   - Mark `Evidence.verificationStatus = "FLAGGED_TAMPERED"`.
   - Restore file from the most recent immutable snapshot in S3/GCS.
   - Log security audit alert for potential tampering.

---

### 4.4 Workflow: Emergency Secret & Credential Rotation
If a secret key (`AUTH_SECRET`, `PAYPAL_CLIENT_SECRET`, or `OPENAI_API_KEY`) is compromised:

1. **Generate New Secret**:
   ```bash
   openssl rand -hex 32
   ```
2. **Update Secrets Manager**:
   Push updated value to AWS Secrets Manager / Vault:
   ```bash
   aws secretsmanager update-secret --secret-id resolvegraph/prod/auth-secret --secret-string "..."
   ```
3. **Rolling Pod Restart**:
   Trigger rolling restart to inject new environment variables:
   ```bash
   kubectl rollout restart deployment/resolvegraph-web -n production
   ```
4. **Revoke Old Credentials**:
   Immediately revoke the old secret in the provider console (PayPal Developer Portal or OpenAI API dashboard).
5. **Verify Health**:
   Execute `/api/health` and verify all services remain healthy with 0 auth failures.
