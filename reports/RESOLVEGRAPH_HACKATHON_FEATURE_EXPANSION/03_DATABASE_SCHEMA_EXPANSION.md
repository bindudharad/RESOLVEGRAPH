# REPORT 03 — DATABASE SCHEMA EXPANSION & MIGRATION AUDIT

## 1. Extended Schema Models
1. **CanonicalTransaction:** Provider-neutral normalized transaction with decimal-safe integer minor units (`grossAmountMinor`, `feeAmountMinor`, `netAmountMinor`).
2. **TransactionSourceRecord:** Represents attested evidence sources (bank statements, gateway captures, UPI receipts).
3. **MatchingDecision:** Records deterministic 10-tier matching evaluations between source records and canonical transactions.
4. **ReconciliationMismatch:** Tracks discrepancies (AMOUNT_MISMATCH, FEE_DISCREPANCY, STATUS_MISMATCH, TIMING_GAP).
5. **PaymentIncident:** Governs the 12-stage root-cause investigation across 18 incident categories.
6. **InvestigationFinding:** Classifies findings into VERIFIED_FACT, SOURCE_SUPPORTED_CLAIM, HYPOTHESIS, CONTRADICTION, MISSING_INFORMATION.
7. **EvidenceFieldExtraction:** Calibrated field extractions with user correction flags.
8. **HashChainedAuditRecord:** Sequential tamper-evident SHA-256 block ledger.
9. **KillSwitchConfig:** Administrative emergency circuit breakers.
10. **MultilingualComplaint:** Preserves natural language complaints in English, Kannada, and Hindi.

## 2. Migration Execution
- **Method:** `npx prisma db push` against SQLite dev database.
- **Data Loss:** Zero rows lost.
- **Client Generation:** `npx prisma generate` updated types without TypeScript issues.
