# REPORT 06 — FEATURE 03: CROSS-PLATFORM TRANSACTION MATCHING ENGINE

## 1. 10-Tier Deterministic Matching Hierarchy
1. **Tier 1:** Exact Provider Transaction ID (Confidence 1.0)
2. **Tier 2:** Exact UTR / RRN (12-digit standard) (Confidence 1.0)
3. **Tier 3:** Exact Merchant Order Reference + Amount (Confidence 0.95)
4. **Tier 4:** Exact Amount + Temporal Correlation Window (<= 120 min) (Confidence 0.85)
5. **Tier 5:** Fuzzy Reference Matching + Exact Amount (Confidence 0.80)
6. **Tier 6:** Split Payment Subset Matching (Sum equals total) (Confidence 0.75)
7. **Tier 7:** Cross-Currency Minor Deviation Window (Confidence 0.70)
8. **Tier 8:** Acquirer Clearing Batch Correlation (Confidence 0.65)
9. **Tier 9:** Heuristic Partial Match (Requires Operator Review) (Confidence 0.50)
10. **Tier 10:** Conflicting / Unmatched Discrepancy

## 2. Discrepancy Isolation
Automatically identifies and logs:
- Amount Mismatches
- Fee Divergences
- Status Contradictions (e.g., Bank debited vs Merchant pending)
- Temporal Gaps
