# ResolveGraph Research Questions & Problem Formulation

## 1. Research Context & Central Hypothesis

**Central Research Hypothesis**:
> *A source-grounded, bilateral evidence representation combined with structured reasoning and human-governed resolution workflows can significantly improve the completeness, traceability, and efficiency of commerce complaint resolution compared with traditional complaint-management systems and unconstrained AI-only approaches.*

To empirically evaluate this hypothesis, we define 8 formal research questions (RQ1–RQ8). Each research question is framed with explicit inputs, measurable outputs, comparative baselines, evaluation metrics, and experimental limitations.

---

## 2. Research Questions Formulation

### RQ1: Source Grounding & Completeness vs Conversational Chatbots
> **Question**: *Can bilateral evidence reconciliation produce more complete, source-grounded complaint investigations than an ordinary support chatbot?*

- **Input**: Multi-party complaint dossier consisting of buyer text statements, merchant fulfillment invoice (PDF), carrier delivery confirmation, and product photographs.
- **Measurable Output**: Structured investigation dossier detailing verified facts, identified contradictions, and missing documentation.
- **Baseline**:
  - Baseline A: Standard LLM conversational support assistant (e.g., GPT-4o-mini prompt without structured evidence extraction or verification tools).
- **Test Dataset**: RECOURSE-BENCH Subset 1 (50 dispute cases across Item Not Received, Damaged Product, and Not as Described).
- **Evaluation Metrics**:
  - *Citation Accuracy* (\% of cited assertions mapped to verified primary keys in evidence).
  - *Evidence Completeness Ratio* (\% of material facts extracted vs ground truth).
  - *Hallucination Rate* (\% of generated assertions with zero supporting evidence).
- **Experimental Limitations**: Synthetic evidence documents simulate real-world formats but lack the noise of degraded physical paper scans.

---

### RQ2: Bilateral Evidence Graph Traceability
> **Question**: *Does the Bilateral Evidence Graph improve the ability to trace claims to supporting and conflicting evidence compared to flat relational queries?*

- **Input**: Case entity topology including Buyer Node, Merchant Node, Claim Nodes, Evidence Nodes, and Extracted Fact Nodes.
- **Measurable Output**: Shortest explanatory traversal paths connecting disputed claims to corroborating or contradictory evidence.
- **Baseline**:
  - Relational database lookups joining claims and evidence without multi-hop graph edge semantics.
- **Test Dataset**: RECOURSE-BENCH Subset 2 (50 cases with complex, multi-item, and multi-claim dispute relationships).
- **Evaluation Metrics**:
  - *Path Traversal Success Rate* (\% of valid contradictory claims connected to contradictory evidence via BFS paths).
  - *Mean Path Query Latency* (milliseconds).
  - *Traceability Precision* (\% of returned edges relevant to the root dispute).
- **Experimental Limitations**: Graph construction relies on the accuracy of upstream multimodal fact extraction.

---

### RQ3: Temporal Inconsistency Detection
> **Question**: *Does temporal evidence analysis identify material inconsistencies that simple structured field comparison misses?*

- **Input**: Chronological event streams with recorded timestamps ($T_{\text{recorded}}$) vs occurred timestamps ($T_{\text{occurred}}$), carrier dispatch scans, return delivery receipts, and communication timestamps.
- **Measurable Output**: Identified temporal anomalies (e.g., delivery reported before dispatch; complaint raised prior to carrier handover; return initiated outside policy return window).
- **Baseline**:
  - Static field-level comparisons (comparing delivery date vs current date without sequence validation).
- **Test Dataset**: RECOURSE-BENCH Subset 3 (40 cases with deliberate chronological sequencing conflicts and out-of-order stage transitions).
- **Evaluation Metrics**:
  - *Temporal Conflict Detection Precision & Recall*.
  - *False Positive Rate on Benign Delay* (e.g., weekend shipping pauses).
- **Experimental Limitations**: Depends on availability of granular carrier and order webhook timestamp metadata.

---

### RQ4: BERR Reasoning vs Unconstrained LLM Hallucinations
> **Question**: *Does Bilateral Evidence-to-Remedy Reasoning (BERR) reduce unsupported conclusions compared with an LLM-only reasoning baseline?*

- **Input**: Conflicting bilateral claims accompanied by partial or inconclusive evidence.
- **Measurable Output**: Structured dispute verdict with weighted discrepancy score $D$ and classified claim relationships (`SUPPORTS`, `CONTRADICTS`, `INSUFFICIENT_TO_ASSESS`).
- **Baseline**:
  - Direct zero-shot LLM reasoning prompt asked to declare which party is correct.
- **Test Dataset**: RECOURSE-BENCH Subset 4 (60 cases with ambiguous or contradictory evidence).
- **Evaluation Metrics**:
  - *Unsupported Finding Rate* (\% of verdicts declaring certainty when evidence is insufficient).
  - *Contradiction Detection Precision & Recall*.
  - *Safe Default Rate* (\% of inconclusive cases correctly assigned `INSUFFICIENT_TO_ASSESS`).
- **Experimental Limitations**: BERR weights ($\alpha, \beta, \gamma$) are statically calibrated for common retail dispute types.

---

### RQ5: Policy-Aware Remedy Recommendation Consistency
> **Question**: *Does policy-aware resolution intelligence improve remedy recommendation consistency compared to unconstrained generation?*

- **Input**: Case dispute findings, order minor amount, and merchant return/refund policy rules.
- **Measurable Output**: Remedy recommendation (`FULL_REFUND`, `PARTIAL_REFUND`, `REPLACEMENT`, `STORE_CREDIT`, `REJECT_CLAIM`).
- **Baseline**:
  - Free-form LLM suggestion without explicit policy bounds checking.
- **Test Dataset**: RECOURSE-BENCH Subset 5 (50 cases with diverse merchant policy rules: restocking fees, return windows, damage coverage).
- **Evaluation Metrics**:
  - *Policy Compliance Rate* (\% of recommendations strictly adhering to merchant policy limits).
  - *Invalid Remedy Rate* (\% of recommendations proposing remedies barred by policy).
  - *Remedy Determinism* (variance in proposed remedy across 5 repeated runs with identical inputs).
- **Experimental Limitations**: Requires merchant policy to be formally digitized into structured JSON rules.

---

### RQ6: Human-Governed Multi-Agent Efficiency & User Control
> **Question**: *Does human-governed agent orchestration reduce repetitive investigation work without reducing user control?*

- **Input**: High-level natural language prompt requesting case investigation, communication drafting, or settlement proposal.
- **Measurable Output**: Multi-agent step plan execution, generated artifacts, tool execution duration, and approval checkpoint triggers.
- **Baseline**:
  - Fully autonomous agent (unconstrained execution) vs Manual operator investigation.
- **Test Dataset**: RECOURSE-BENCH Subset 6 (30 end-to-end resolution scenarios).
- **Evaluation Metrics**:
  - *Investigation Time Savings* (\% reduction in seconds required to assemble findings).
  - *Financial Safety Compliance* (\% of financial transactions requiring human approval: target 100.0\%).
  - *Unauthorized Mutation Rate* (attempts by agents to execute irreversible financial transfers: target 0.0\%).
- **Experimental Limitations**: Simulated operator response times are modelled based on typical support rep interaction intervals.

---

### RQ7: Bilateral Symmetry & Perspective Fairness
> **Question**: *Can the complete platform preserve factual consistency when the same case is viewed from buyer and merchant perspectives?*

- **Input**: Identical dispute case evaluated under two permutations:
  - Permutation A: Buyer submits claims and evidence first.
  - Permutation B: Merchant submits fulfillment records first.
- **Measurable Output**: Extracted factual assertions, BERR discrepancy scores, and remedy recommendations.
- **Baseline**:
  - First-party bias baseline (systems that prioritize the initial complainant's narrative).
- **Test Dataset**: RECOURSE-BENCH Subset 7 (40 paired cases mirrored across submission order).
- **Evaluation Metrics**:
  - *Discrepancy Score Symmetry* ($|D_A - D_B|$ across permutations).
  - *Remedy Invariance Rate* (\% of cases yielding identical remedy recommendation regardless of submission sequence).
  - *Evidence Omission Rate* (\% of secondary submitter's evidence overlooked).
- **Experimental Limitations**: Language nuances in user-provided text may introduce minor semantic variance in text embeddings.

---

### RQ8: Persistent Case Continuity vs Repetitive Re-submission
> **Question**: *Does persistent case continuity reduce the need for customers and merchants to repeatedly provide the same information?*

- **Input**: Multi-round dispute history tracking original purchase record, tracking events, prior claims, and previous negotiation offers.
- **Measurable Output**: Re-use of previously verified facts during dispute escalation and PayPal dispute response compilation.
- **Baseline**:
  - Traditional ticketing systems where dispute escalation resets context and asks buyer/seller for re-submission.
- **Test Dataset**: RECOURSE-BENCH Subset 8 (30 multi-stage dispute escalation scenarios).
- **Evaluation Metrics**:
  - *Redundant Information Request Rate* (\% of requests asking for already verified data).
  - *Context Retention Depth* (number of conversation and evidence turns preserved without context truncation).
  - *Time to Compile Dispute Defense* (seconds).
- **Experimental Limitations**: Evaluated across synthesized multi-turn dispute transcripts.
