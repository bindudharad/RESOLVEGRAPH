# AI Usage, Models & Governance

## 1. Clear Demarcation of AI Responsibilities
ResolveGraph maintains strict transparency regarding where artificial intelligence is utilized versus deterministic software logic:

```
┌──────────────────────────────────────┬───────────────────────────────────────────────────────────┐
│ Functionality                        │ Implementation Paradigm & Technology                      │
├──────────────────────────────────────┼───────────────────────────────────────────────────────────┤
│ Text & Document Fact Extraction      │ OpenAI gpt-4o-mini structured JSON outputs + unpdf parser │
│ Physical Hardware Image Inspection   │ OpenAI gpt-4o-mini Vision API (reading label capacities)  │
│ Semantic Narrative Drift             │ Cosine distance embeddings over dispute timeline events   │
│ Multi-Agent Specialist Roles         │ Specialized prompts for Triage, Evidence, Policy, Comms   │
│ Factual Discrepancy Calculation      │ Deterministic mathematical formula (alpha, beta, gamma)   │
│ Database Mutations & Ledger Tracking │ Deterministic Prisma ORM transactions (dev.db SQLite)     │
│ Financial Refund Execution           │ Deterministic PayPal REST APIs V2 via human approval gate │
└──────────────────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. Model Configuration & Fallback Resilience
- **Primary AI Provider**: OpenAI Responses API utilizing `gpt-4o-mini`.
- **Structured Outputs**: All LLM calls enforce strict JSON Schemas to guarantee predictable typing.
- **Prompt Injection Defense**: Untrusted user and merchant text is wrapped within isolated XML tags (`<user_claim>`) and scanned for prompt injection attacks.
- **Automated PII Redaction**: Luhn-valid credit card numbers, CVVs, and auth tokens are stripped from prompts prior to external dispatch.
- **Resilient Fallback Mode**: If the OpenAI API is unreachable or rate-limited, ResolveGraph automatically engages its deterministic AST/Regex heuristic extractor. The response is flagged with `"extractionMode": "fallback_heuristic"` to maintain total transparency with human caseworkers.

---

## 3. Human Governance: The Mandatory Approval Gate
- **No Autonomous Money Movement**: ResolveGraph strictly forbids AI agents from executing financial refunds, account debits, or formal legal admissions autonomously.
- **Cryptographic Action Integrity**: High-risk agent actions generate an `AgentApprovalRequest` containing a SHA-256 hash of proposed execution arguments.
- **Human Signoff**: A merchant manager must review the proposal, inspect the evidence citations, and sign off before any funds are moved via PayPal.
