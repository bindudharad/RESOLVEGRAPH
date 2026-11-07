# ResolveGraph Agent Operations & Production Runbook

## 1. Operational Overview

ResolveGraph Step 8 Copilot is architected for zero-downtime operations, token efficiency, deterministic audit trails, and strict cost controls in production enterprise environments.

---

## 2. Resource Budgets & Guardrails

| Budget Parameter | Default Threshold | Maximum Allowed | Action on Breach |
| :--- | :--- | :--- | :--- |
| **Max Steps per Run** | 8 steps | 12 steps | Run halts with status `FAILED` (Step budget exceeded) |
| **Token Budget** | 8,000 tokens | 16,000 tokens | Sanitizer cuts context and alerts operator |
| **Tool Execution Timeout** | 10 seconds | 30 seconds | Invocations time out and log `FAILED` |
| **Approval Request Expiration** | 24 hours | 72 hours | Request transitions to `EXPIRED` |

---

## 3. Monitoring & Observability

### API Health & Metrics Endpoints
- **Run Status**: `GET /api/copilot/runs/{runId}` returns step checklist, durations, token counts, and tool traces.
- **Pending Approvals**: `GET /api/copilot/approvals?organizationId={orgId}` lists actionable financial sign-offs.
- **Case Audit Events**: `GET /api/cases/{caseId}/events` records `AGENT_RUN_STARTED`, `AGENT_RUN_COMPLETED`, `AGENT_APPROVAL_REQUESTED`, and `AGENT_APPROVAL_RESOLVED`.

### SQLite Database Tracing
Inspect tool invocations directly in SQLite:
```sql
SELECT toolName, toolCategory, status, durationMs, createdAt 
FROM AgentToolInvocation 
WHERE runId = 'cmw0m6...' 
ORDER BY createdAt ASC;
```

---

## 4. Run Cancellation Procedure

If an operator determines a long-running plan is obsolete or misguided:
1. **Via UI**: Click **Cancel Run** in the Copilot Command Center banner.
2. **Via API**:
   ```http
   POST /api/copilot/runs/{runId}/cancel
   Authorization: Bearer <session-token>
   ```
3. The orchestrator immediately updates status to `CANCELLED`, records cancellation timestamps, and emits a cancellation audit event.
