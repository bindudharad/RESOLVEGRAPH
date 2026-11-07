# ResolveGraph Intelligent Copilot Workflows

ResolveGraph Step 8 supports **4 primary enterprise resolution workflows**, executable from the Copilot Command Center (`/copilot`) or directly within the Case Workspace (`/cases/[caseId]` Tab 11).

---

## Workflow 1: Discrepancy & Forensic Investigation

**Intent**: `INVESTIGATE_DISCREPANCIES`  
**Goal**: Audit claims and evidence, identify contradictions, and generate a missing evidence checklist.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Resolution Operator
    participant Orch as AgentOrchestrator
    participant Triage as CaseTriageAgent
    participant Inv as EvidenceInvestigatorAgent
    participant Review as QualityReviewAgent
    participant DB as SQLite / Prisma

    Op->>Orch: "Investigate evidence discrepancies and missing items"
    Orch->>Triage: triage(prompt)
    Triage-->>Orch: Plan: [EvidenceInvestigatorAgent, QualityReviewAgent]
    
    Orch->>Inv: execute()
    Inv->>DB: get_case_findings, get_case_claims, get_case_evidence_metadata
    Inv->>DB: create_investigation_summary (BERR Score: 42%)
    Inv->>DB: create_missing_evidence_checklist (Carrier Tracking, Packaging Photo)
    Inv-->>Orch: Factual Dossier Completed
    
    Orch->>Review: execute()
    Review->>DB: validate_claim_evidence_links, validate_source_citations
    Review-->>Orch: Quality Verdict: APPROVED_FOR_DISPLAY
    Orch-->>Op: Run Complete + Display Artifacts
```

---

## Workflow 2: Policy Evaluation & Resolution Proposal (Human-in-the-Loop)

**Intent**: `EVALUATE_POLICY`  
**Goal**: Evaluate merchant policy bounds and formulate an authorized bilateral remedy proposal.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Resolution Operator
    participant Orch as AgentOrchestrator
    participant Triage as CaseTriageAgent
    participant Pol as PolicyRemedyAgent
    participant Gov as FinancialActionGuardrails
    participant DB as SQLite / Prisma

    Op->>Orch: "Evaluate policy and propose eligible partial refund"
    Orch->>Triage: triage(prompt)
    Triage-->>Orch: Plan: [PolicyRemedyAgent, QualityReviewAgent]
    
    Orch->>Pol: execute()
    Pol->>DB: get_applicable_policy, get_case_summary
    Pol->>Gov: inspectAction('create_draft_resolution_proposal', payload)
    Gov-->>Pol: Sensitive Financial Action (HIGH risk)
    Pol->>DB: create_draft_resolution_proposal (Partial Refund $35.00)
    DB-->>DB: Create AgentApprovalRequest (argumentsHash computed)
    Pol-->>Orch: Draft Prepared, Approval Required
    
    Orch->>DB: Update AgentRun status -> WAITING_FOR_APPROVAL
    Orch-->>Op: Execution Paused: Pending Operator Sign-off
    
    Op->>DB: POST /api/copilot/approvals/{id}/respond (APPROVE)
    DB->>Gov: verifyArgumentsHash(payload, argumentsHash)
    Gov-->>DB: Hash Valid (0 Tampering)
    DB->>DB: Materialize ResolutionProposal (status: PENDING_BUYER)
    DB-->>Op: Proposal Live in Bilateral Negotiation Portal
```

---

## Workflow 3: Grounded Buyer / Merchant Communication

**Intent**: `DRAFT_COMMUNICATION`  
**Goal**: Draft professional, objective correspondence grounded in verified evidence without unilateral dispatch.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Resolution Operator
    participant Orch as AgentOrchestrator
    participant Drafter as CommunicationDrafterAgent
    participant Review as QualityReviewAgent
    participant DB as SQLite / Prisma

    Op->>Orch: "Draft an objective update to the buyer citing evidence"
    Orch->>Drafter: execute()
    Drafter->>DB: get_case_summary, get_case_findings
    Drafter->>DB: create_draft_buyer_message (with evidence citations)
    Drafter-->>Orch: Draft Artifact Saved (dispatched: false)
    
    Orch->>Review: execute()
    Review->>DB: validate_source_citations(citations)
    Review-->>Orch: Verdict: APPROVED_FOR_DISPLAY
    Orch-->>Op: Draft Message Displayed in UI for Operator Edit/Send
```

---

## Workflow 4: PayPal Dispute Defense Dossier

**Intent**: `PREPARE_DISPUTE_DOSSIER`  
**Goal**: Assemble chronological facts and verified evidence for external PayPal dispute defense.

1. **Evidence Investigator**: Pulls carrier tracking proof, merchant fulfillment invoices, and buyer complaint excerpts.
2. **Quality Review**: Ensures 100% citation grounding and redacts payment card numbers.
3. **Artifact Output**: Creates an exportable PayPal Dispute Defense brief ready for submission.
