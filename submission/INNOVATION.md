# Innovation & Methodological Novelty

## 1. What Makes ResolveGraph Different
Most existing chargeback and dispute tools approach the problem unilaterally—focusing exclusively on helping merchants generate rebuttal letters against banks (e.g. Chargehound, Midigator) or deflecting customer support tickets via conversational chatbots (e.g. Decagon, Zendesk).

ResolveGraph introduces three core technical innovations:

---

## 2. Innovation 1: Bilateral Evidence-to-Remedy Reasoning (BERR)
BERR is a 10-stage applied reasoning framework designed specifically for commercial dispute reconciliation:
- **Mathematical Contradiction Scoring**: Computes a weighted multi-factor discrepancy score:
  $$D = \alpha D_{\text{exact}} + \beta D_{\text{semantic}} + \gamma D_{\text{temporal}}$$
  Combining numerical mismatches ($\alpha=0.45$), semantic divergence ($\beta=0.35$), and chronological timeline anomalies ($\gamma=0.20$).
- **Unit & Entity Normalization**: Eliminates superficial discrepancies caused by non-standard notation (converting `1000 GB` and `1 TB` to identical standardized units).
- **Missing-Evidence Identification**: Evaluates whether either party has omitted critical evidentiary documentation (e.g. carrier Proof of Delivery for non-delivery claims).

---

## 3. Innovation 2: The Bilateral Evidence Graph
ResolveGraph represents dispute ecosystems as a **Directed Multi-Relational Knowledge Graph**:
- **Symmetric Evidence Weighting**: Buyer unboxing photographs and merchant fulfillment scan records receive identical evidential standing.
- **Traceable Provenance**: Every extracted fact maps directly to its source document hash and bounding box coordinates, eliminating LLM hallucinations.
- **Cycle & Constraint Checking**: Directed acyclic graph validation asserts that claims cannot precede order timestamps.

---

## 4. Innovation 3: Temporal & Semantic Drift Detection
- **Timeline Anomaly Detection**: Reconstructs the end-to-end lifecycle across purchase, fulfillment, delivery, and dispute phases to flag chronological impossibilities.
- **Semantic Drift Analysis**: Tracks narrative shifts between the buyer's initial complaint and subsequent submissions, highlighting when claims evolve over time.

---

## 5. Innovation 4: Cryptographically Governed Multi-Agent Copilot
Unlike autonomous AI systems that pose financial leakage risks, ResolveGraph's agent copilot operates under strict human governance:
- Specialist agents (`CaseTriageAgent`, `EvidenceInvestigatorAgent`, `PolicyRemedyAgent`) synthesize findings into an `AgentApprovalRequest`.
- Sensitive actions enforce a deterministic **SHA-256 arguments hash**. If execution parameters are tampered with between proposal and execution, the transaction is rejected.
- A human decision-maker must explicitly sign off before any funds are moved via PayPal.
