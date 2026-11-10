# RESOLVEGRAPH 2.0 — RECOURSE-BENCH Benchmark Independent Verification

**Target:** PayPal AI Hackathon 2026 & Scientific Reproducibility  
**Repository:** `https://github.com/bindudharad/RESOLVEGRAPH`  
**Dataset Path:** `research/dataset/recourse-bench.json` (400 cases across 20 dispute categories)  
**Execution Script:** `scripts/evaluation/run-benchmark.ts` (`npm run benchmark`)  
**Audit Timestamp:** November 2026  
**Status:** **INDEPENDENTLY AUDITED · REPRODUCED · DISCREPANCIES CLARIFIED**

---

## 1. Executive Summary & Verification Protocol

The RECOURSE-BENCH evaluation suite tests the RESOLVEGRAPH reasoning and intelligence engines across **400 synthetic ground-truth dispute cases** spanning 20 e-commerce dispute categories (including wrong product, missing accessories, damaged goods, tampered seals, delayed delivery, failed delivery, prompt injection attacks, and debited-not-credited UPI transactions).

This independent audit re-executed `npm run benchmark`, inspected the metric evaluation scripts in `scripts/evaluation/`, analyzed the calculation formulas, and investigated why certain metrics reported 100.0% while others differed between summaries.

---

## 2. Empirical Subsystem Metrics (Measured vs. Projected)

The table below contrasts the actual empirical output of the benchmark runner against the theoretical / projected baseline comparisons:

| Subsystem | Metric Name | Numerator / Denominator | Calculation Method | Empirical Runner Score | Baseline D Projection | Notes / Discrepancy Clarification |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- |
| **1. Fact Extraction** | Field Precision | $\text{TP} / (\text{TP} + \text{FP})$ | Key-value presence across extracted facts | **100.0%** | 98.4% | All synthetic dataset facts contain valid fieldKey and rawValue. |
| **1. Fact Extraction** | Field Recall | $\text{TP} / (\text{TP} + \text{FN})$ | Ground-truth fact coverage | **100.0%** | 98.4% | Fully annotated synthetic ground-truth facts. |
| **1. Fact Extraction** | Normalized Val Acc | $\text{Correct} / \text{Total}$ | Unit conversion (GB, minor units, ISO dates) | **100.0%** | 98.8% | Deterministic normalizers in `FactNormalizer`. |
| **2. BERR Reasoning** | Contradiction F1 | $2 \cdot P \cdot R / (P + R)$ | Discrepancy metric $D > 0.40$ vs ground-truth label | **52.2%** | 96.1% | **CORRECTION:** Heuristic discrepancy threshold achieves 100% Precision but 35.3% Recall on nuanced synthetic disputes. Previous summary quoted Baseline D projection. |
| **2. BERR Reasoning** | Missing Proof F1 | $2 \cdot P \cdot R / (P + R)$ | Required evidence checklist detection | **20.9%** | 95.2% | Conservative checklist detection on complex categories. |
| **3. Temporal Engine** | Timeline Ordering | $\text{Valid} / \text{Total}$ | Chronological anomaly detection | **100.0%** | 98.6% | Graph topological sorting strictly catches out-of-order stages. |
| **3. Temporal Engine** | Semantic Drift F1 | $2 \cdot P \cdot R / (P + R)$ | Offer-to-claim divergence classification | **33.3%** | 93.0% | Measures transition shift severity. |
| **4. Bilateral Fairness** | Invariance Rate | $\text{Symmetric} / \text{Total}$ | Buyer-first vs. Merchant-first output parity | **58.8%** | 98.6% | Mean divergence is 0.2042 across 400 cases. |
| **5. Resolution Intel** | Policy Compliance | $\text{Compliant} / \text{Total}$ | Within merchant return/refund bounds | **100.0%** | 98.8% | Resolution options bounded by policy configuration. |
| **5. Resolution Intel** | Financial Safety | $\text{Guarded} / \text{Total}$ | % of refunds requiring human approval | **100.0%** | 100.0% | Non-negotiable autonomous payout block enforced. |
| **6. Multi-Agent** | Tool Accuracy | $\text{Correct} / \text{Total}$ | Specialist tool choice against case category | **100.0%** | 100.0% | Strict category-to-tool dispatch routing. |
| **6. Multi-Agent** | Citation Grounding | $\text{Grounded} / \text{Total}$ | Citations pointing to real verified evidence | **100.0%** | 98.4% | QualityReviewAgent blocks ungrounded assertions. |
| **6. Multi-Agent** | Hallucination Rate | $\text{Ungrounded} / \text{Total}$ | Fabricated claims passing quality gate | **0.0%** | 0.0% | Zero fabricated citations escape into final draft. |

---

## 3. Detailed Investigation of Discrepancies

### 3.1. 100% Extraction Precision & Recall
- **Why it occurred:** In `scripts/evaluation/evaluate-extraction.ts`, lines 56-62 check whether `fact.fieldKey` exists and `fact.rawValue` exists. Because `generate-recourse-bench.ts` constructs the synthetic dataset using valid structured schema objects, all 400 cases contain valid field keys and raw values, resulting in zero false positives and zero false negatives in this specific validation.
- **Scientific Implication:** This verifies that the normalization schemas and datatypes are consistent, but is an internal consistency benchmark rather than an evaluation against messy external OCR scans.

### 3.2. 100% vs. 98.4% Citation Coverage
- **Source of Divergence:**
  - In `evaluate-agents.ts` (Subsystem 6), citation grounding measures whether claims reference existing evidence IDs from the case. The evaluation loop checks all references in synthetic cases, yielding **100.0%**.
  - In `run-benchmark.ts` (Baseline Comparison Table), **98.4%** represents the theoretical end-to-end full platform baseline where human factors or missing edge OCR extractions reduce citation coverage slightly.

### 3.3. Contradiction F1: 52.2% vs. 96.1%
- **Source of Divergence:**
  - The empirical runner calculates an actual Contradiction F1 of **52.2%** (Precision: 100.0%, Recall: 35.3%) because the heuristic threshold formula ($D = \alpha D_e + \beta D_s + \gamma D_t > 0.40$) is highly conservative: it never falsely flags non-contradictions (100% precision), but misses subtle semantic contradictions where wording differs without an exact numeric clash.
  - The **96.1%** figure was listed in the literature/baseline comparison table for Baseline D under an idealized multimodal embedding model.
  - **Verdict:** We have updated the documentation to prominently state the empirical score of **52.2%** rather than quoting the projected 96.1%.

---

## 4. Benchmark Reproducibility

To re-run the benchmark and produce the exact JSON summary:
```bash
npm run benchmark
```
Output is deterministically saved to:
`research/results/benchmark_summary.json`
and mirrored in:
`qa/release-candidate/benchmark-output.txt`
