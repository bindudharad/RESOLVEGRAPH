# REPORT 07: AI SYSTEMS & MULTI-AGENT QUALITY REPORT

**Project:** RESOLVEGRAPH V2.0  
**AI Framework:** BERR v2 (Bilateral Evidence-to-Remedy Reasoning) & Multi-Agent Copilot Orchestration  
**Safety Protocol:** Zero Autonomous Financial Actions | 100% Citations Grounding  

---

## 1. BERR v2 Reasoning Engine Architecture

BERR v2 evaluates disputes by cross-referencing buyer claims and merchant assertions against immutable purchase memories and forensic package passports:

### 1.1 Four-Category Fact Classification
1. **AGREED FACTS:** Facts confirmed by both buyer and merchant (e.g., tracking delivered, payment received, base item model).
2. **VERIFIED FACTS:** Facts validated by objective technical proof (e.g., cryptographically signed unboxing video, tamper-evident tape barcode, carrier API delivery scan).
3. **CONTESTED FACTS:** Assertions where buyer and merchant statements directly conflict without decisive proof.
4. **MISSING FACTS:** Critical evidentiary gaps (e.g., buyer claims item damaged but uploaded no photo; merchant claims dispatched 1 TB SSD but invoice lists 512 GB).

### 1.2 Mathematical Divergence Formulation
The divergence metric $mathcal{D}$ evaluates discrepancy between purchase memory $mathcal{M}$ and delivered physical artifact $mathcal{A}$:
$$mathcal{D} = w_{	ext{spec}} cdot Delta_{	ext{spec}} + w_{	ext{serial}} cdot mathbb{I}(	ext{SN}_{	ext{match}} = 0) + w_{	ext{seal}} cdot (1 - S_{	ext{integrity}})$$
Where $w_{	ext{spec}} = 0.5$, $w_{	ext{serial}} = 0.3$, and $w_{	ext{seal}} = 0.2$.

---

## 2. Multi-Agent System (MAS) Specialist Roles

RESOLVEGRAPH deploys 6 specialized, non-autonomous agents under strict human governance:

| Specialist Agent | Objective & Responsibilities | Tool Access Scope | Autonomy Level |
|:---|:---|:---|:---:|
| **Orchestrator** | Coordinates pipeline, evaluates completion, sequences subagents | Internal routing only | Read-only |
| **CaseTriageAgent** | Classifies incoming dispute into taxonomy, drafts investigation plan | `get_case_summary`, `list_claims` | Read-only |
| **EvidenceInvestigatorAgent**| Cross-checks buyer/merchant evidence, identifies missing documents | `get_evidence_details`, `verify_hash` | Read-only |
| **PolicyRemedyAgent** | Evaluates merchant return policy bounds, drafts remedy proposal | `get_policy_rules`, `draft_proposal` | Draft-only |
| **CommunicationDrafterAgent**| Drafts clear, grounded buyer messages without making legal promises | `draft_message` | Draft-only |
| **QualityReviewAgent** | Audits draft proposal against citations, verifies evidence IDs | `verify_citations`, `check_guardrails` | Verification gate |

---

## 3. Human Approval Gate
- **High-Risk Guardrail:** Any remedy proposing financial transfers (refund, return label, replacement) generates an `AgentApprovalRequest` with a deterministic SHA-256 arguments hash.
- **Sovereign Execution:** The action is materialized only when signed off by an authorized human manager or merchant owner. Autonomous execution is physically blocked by code assert.
