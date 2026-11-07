# RESOLVEGRAPH — AI Model Governance & ModelOps Framework

## 1. Governance Principles for Applied AI in Fintech

RESOLVEGRAPH enforces strict operational boundaries for generative models and reasoning engines:
1. **Explainable & Source-Grounded**: Every factual finding must link directly to an immutable evidence ID. Free-form, uncited assertions are blocked by the `QualityReviewAgent`.
2. **Deterministic Version Pinning**: Model IDs (e.g. `gpt-4o-2024-08-06`) and prompt version tags (`v1.2.0`) are pinned explicitly in code and configuration; dynamic model aliases (e.g. `gpt-4o-latest`) are forbidden in production.
3. **No Hidden Chain-of-Thought Storage**: Only structured reasoning summaries, normalized attributes, and cited excerpts are persisted; ungrounded internal scratchpads are never stored.
4. **Preservation of Pre-Correction State**: When a human operator overrides an AI finding, both the original model output and the human correction are retained to measure model drift and fine-tuning regressions.

---

## 2. Version Management & Subsystem Registry

| Subsystem | Current Version | Registry Location | Promotion Requirement | Rollback Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Multimodal Extraction** | `extraction-v1.4` | `src/server/ai/extraction/` | Benchmark $F_1 \ge 0.95$ on invoices/receipts | Revert to regex & standard OCR extractor |
| **Fact Normalizer** | `normalizer-v1.2` | `src/server/ai/normalization/` | 100% pass rate on capacity/date/money tests | Hardcoded unit mappings |
| **BERR Reasoning Engine** | `berr-v2.0` | `src/server/ai/reasoning/` | Contradiction $F_1 \ge 0.90$ on RECOURSE-BENCH | Fallback to Step 4 8-stage rule engine |
| **Semantic Drift Engine** | `drift-v1.1` | `src/server/drift/` | Zero false drift alerts on identical SKUs | Disable multi-stage transition check |
| **Resolution Policy Validator** | `policy-v1.3` | `src/server/resolution/` | 100% schema compliance against Zod rules | Escalate all disputed cases to human review |
| **Specialist Agent System** | `agents-v1.0` | `src/server/agents/specialists/` | 100% Financial Guardrail compliance | Revert to single-stage triage |
| **Evaluation Dataset** | `recourse-bench-1.0` | `research/dataset/` | Reviewed by fintech arbitration leads | Version-tagged JSON snapshot |

---

## 3. Pre-Promotion Regression Protocol

Before any new model tier, prompt iteration, or reasoning logic is promoted from Staging to Production, it must execute the automated RECOURSE-BENCH benchmark:

```bash
npm run benchmark
```

### Promotion Quality Gates
1. **Citation Accuracy Gate**: Evidence Traceability Coverage (ETC) must exceed **95.0%**.
2. **Hallucination Gate**: QualityReview gate must maintain **0.0% ungrounded assertions**.
3. **Financial Safety Gate**: 100% of proposed financial transactions must be intercepted by `FinancialActionGuardrails`.
4. **Bilateral Invariance Gate**: Order permutation score must exceed **95.0%**.
5. **Latency Budget**: End-to-end triage and analysis must complete within $1,500\text{ ms}$ ($p_{95}$).

---

## 4. Human Correction Tracking & Retraining Loops

When an operator edits or rejects an AI recommendation:
1. An audit event `AI_FINDING_REVIEWED` is logged with `{ originalFinding, correctedFinding, reason }`.
2. The discrepancy is tagged into an automated regression review queue.
3. Quarterly reviews evaluate the **Human Correction Rate (HCR)** per dispute category. If HCR exceeds $15\%$ in any category, that category's prompt templates and extraction rules are placed under mandatory engineering review.
