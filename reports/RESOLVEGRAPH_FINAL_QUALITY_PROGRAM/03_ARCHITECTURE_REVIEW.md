# REPORT 03 — ARCHITECTURAL INTEGRITY & GOVERNANCE

## 1. The Core Architecture Invariant
> **"Deterministic systems establish transaction relationships and enforce financial rules. AI assists with extraction, investigation, explanation and recommendations. Authorized humans approve consequential actions."**

## 2. Multi-Layer Security & Separation of Concerns
1. **Intake Layer:** Magic-bytes verification prevents disguised executable attacks; SHA-256 digests prevent duplicate or corrupted documents.
2. **Canonical Financial Engine:** Uses integer minor units arithmetic (paise/cents). No floating-point arithmetic is permitted in ledger calculations. Largest-remainder proportional distribution eliminates rounding drift.
3. **Deterministic 10-Tier Matching Hierarchy:**
   - Tier 1: Exact Provider Tx ID (Score 1.0)
   - Tier 2: Exact UTR / RRN (Score 0.98)
   - Tier 3: Order Reference (Score 0.95)
   - Tier 4: Amount + Timestamp Correlated (Score 0.85)
   - Tier 5: Heuristic Discrepancy (Score 0.1 - 0.3)
4. **12-Stage Root-Cause Investigation Pipeline:**
   - Classification into Verified Facts, Source Claims, Hypotheses, Contradictions, and Missing Information.
   - Statutory TAT compliance tracking under RBI DPSS.CO.PD No.629/02.01.014/2019-20 (T+1 auto-reversal, ₹100/day compensation).
5. **Cryptographic Hash-Chained Audit Ledger:**
   - Every administrative, investigative, and financial sign-off action is hashed into an unbroken SHA-256 block chain.
