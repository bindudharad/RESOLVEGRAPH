# 12. Module 15: BERR Reasoning Engine v2 (Bilateral Evidence-to-Remedy Reasoning)

**Service File:** `src/server/ai/reasoning/berr-v2.service.ts`  
**API Endpoint:** `GET /api/cases/[caseId]/berr-v2`  
**Test Suite:** `tests/beg-and-berr-v2.test.ts`

---

## 1. Four-Category Fact Classification

BERR v2 evaluates bilateral evidence across four rigorous categories:
1. **`AGREED`**: Both buyer and merchant corroborate the fact (e.g. order date, payment amount, delivery address).
2. **`VERIFIED`**: Fact independently substantiated by cryptographic proof (e.g. carrier tracking scan, tamper seal hash, unboxing challenge verification).
3. **`CONTESTED`**: Mutual statements or evidence directly contradict each other (e.g. buyer claims 512 GB SSD received vs merchant manifest claiming 1 TB dispatched).
4. **`MISSING`**: Essential proof required to establish liability is absent (e.g. missing continuous unboxing video or missing warehouse packing log).

---

## 2. Objective Uncertainty Computation & Human Gate

BERR v2 strictly forbids autonomous financial decisions.
Whenever contested or missing facts are present, the engine computes an elevated objective uncertainty score:
$$U_{\text{objective}} = \frac{w_c \cdot N_{\text{contested}} + w_m \cdot N_{\text{missing}}}{N_{\text{total}}}$$

If $N_{\text{contested}} > 0$ or $N_{\text{missing}} > 0$:
- `uncertaintyAnalysis.riskScore` is elevated (0.65+).
- `uncertaintyAnalysis.requiresHumanReview` is locked to `true`.
- `recommendedRemedy.financialSafetyApproved` remains `false` until an authorized human resolution manager signs off.
