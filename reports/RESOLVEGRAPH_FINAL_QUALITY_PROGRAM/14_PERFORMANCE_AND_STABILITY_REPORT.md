# REPORT 14 — PERFORMANCE, LATENCY & STABILITY METRICS

## 1. Key Performance Benchmarks
- **Next.js Production Build:** 65 routes compiled with Turbopack in 1.7 seconds.
- **10-Tier Deterministic Matching:** Under 1 ms per record pair.
- **Full 40-Scenario Adversarial Suite:** 40 tests executed in 1.7 seconds.
- **Full Repo Test Suite:** 321 tests across 61 suites executed in ~116 seconds.
- **Database Indexing:** Indexed on `caseId`, `providerTxId`, `externalReference`, and `reconciliationState` to prevent table scans.
