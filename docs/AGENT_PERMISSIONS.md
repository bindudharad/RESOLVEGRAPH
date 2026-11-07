# ResolveGraph Tool Registry & Role-Based Access Control (RBAC)

## 1. Controlled Tool Architecture

ResolveGraph strictly rejects open-ended agent execution or direct database mutation by subagents. Every capability is encapsulated as a typed `ToolDefinition` registered within a singleton `ToolRegistry`.

Before execution, every tool invocation passes through **three independent validation gates**:
1. **User Authentication & Tenant Isolation**: Verifies the actor belongs to the organization owning the case.
2. **Schema Validation**: Rigorous runtime validation via Zod schemas; malformed payloads fail immediately.
3. **Financial Action Guardrails**: Checks for disallowed operations and flags actions requiring human sign-off.

---

## 2. Complete Tool Inventory & Permission Matrix

### Category A: READ Tools (Read-Only Case Access)

| Tool Name | Parameters | Required Role | Tenant Scoped | Description |
| :--- | :--- | :--- | :--- | :--- |
| `get_case_summary` | `caseId` | `BUYER`, `MERCHANT`, `ADMIN` | Yes | Retrieves core case status, stage, parties, and metrics |
| `get_case_claims` | `caseId` | `BUYER`, `MERCHANT`, `ADMIN` | Yes | Returns buyer and merchant claims with backing status |
| `get_case_evidence_metadata`| `caseId` | `BUYER`, `MERCHANT`, `ADMIN` | Yes | Returns sanitized evidence metadata (respecting visibility) |
| `get_case_timeline` | `caseId` | `BUYER`, `MERCHANT`, `ADMIN` | Yes | Returns chronological event log |
| `get_case_findings` | `caseId` | `MERCHANT`, `ADMIN` | Yes | Fetches normalized facts and BERR contradiction scores |
| `get_case_graph` | `caseId` | `MERCHANT`, `ADMIN` | Yes | Retrieves Bilateral Evidence Graph topology |
| `get_applicable_policy` | `caseId` | `MERCHANT`, `ADMIN` | Yes | Fetches merchant return/refund policy rules |
| `get_resolution_history` | `caseId` | `MERCHANT`, `ADMIN` | Yes | Lists previous bilateral proposal rounds |
| `get_payment_status` | `caseId` | `MERCHANT`, `ADMIN` | Yes | Queries PayPal payment capture and ledger state |
| `get_paypal_dispute_status` | `caseId` | `MERCHANT`, `ADMIN` | Yes | Fetches external PayPal dispute lifecycle state |
| `get_organization_permissions`| None | All | No | Returns actor roles, scopes, and feature flags |

### Category B: DRAFT Tools (Side-Effect Free Artifact Creation)

> [!IMPORTANT]
> DRAFT tools **never** send customer messages or execute financial transfers. They only persist reviewable artifacts.

| Tool Name | Parameters | Permitted Org Role | Artifact Created |
| :--- | :--- | :--- | :--- |
| `create_draft_information_request` | `caseId`, `recipientRole`, `requestedItems`, `rationale` | `OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT` | `EVIDENCE_CHECKLIST` |
| `create_draft_buyer_message` | `caseId`, `subject`, `body`, `factualCitations` | `OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT` | `DRAFT_MESSAGE` |
| `create_draft_merchant_message` | `caseId`, `subject`, `body`, `factualCitations` | `OWNER`, `ORG_ADMIN` | `DRAFT_MESSAGE` |
| `create_draft_resolution_proposal` | `caseId`, `remedyType`, `amountMinor`, `rationale` | `OWNER`, `ORG_ADMIN` | `DRAFT_PROPOSAL` (triggers `AgentApprovalRequest` if financial) |
| `create_investigation_summary` | `caseId`, `coreContradictionFound`, `discrepancyScore`, `keyFacts` | `OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT` | `INVESTIGATION_SUMMARY` |
| `create_missing_evidence_checklist` | `caseId`, `missingItems` | `OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT` | `EVIDENCE_CHECKLIST` |
| `create_human_review_request` | `caseId`, `reason`, `priority` | `OWNER`, `ORG_ADMIN`, `MERCHANT_AGENT` | `QUALITY_REPORT` |

### Category C: REVIEW Tools (Validation & Adversarial Quality Gates)

| Tool Name | Parameters | Purpose |
| :--- | :--- | :--- |
| `validate_claim_evidence_links` | `caseId` | Audits evidence grounding ratio across all submitted claims |
| `validate_source_citations` | `citations`, `validEvidenceIds` | Verifies cited evidence IDs exist and are visible |
| `validate_policy_conditions` | `caseId`, `remedyType` | Validates proposed remedy against policy limits |
| `validate_agent_result` | `stepOutput`, `expectedSchema` | Structural schema verification of intermediate subagent outputs |

---

## 3. Disallowed Autonomous Operations

The following tools are **strictly disallowed** from autonomous agent execution. Invocations immediately throw `FinancialActionGuardrailViolation`:

```typescript
const DISALLOWED_AUTONOMOUS_OPERATIONS = [
  'execute_refund',
  'capture_paypal_order',
  'accept_paypal_dispute',
  'escalate_paypal_dispute',
  'send_live_customer_email',
  'close_case_unilaterally'
];
```
