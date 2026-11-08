# REPORT 09 — FEATURE 06: FORENSIC REPORTING & MULTI-FORMAT EXPORT

## 1. 4-Dimensional Evidence Verification
Every piece of ingested evidence is graded across:
1. **File Integrity:** SHA-256 verification (INTACT_SINCE_INGESTION).
2. **Source Verification:** SOURCE_VERIFIED, USER_SUBMITTED, MERCHANT_SUBMITTED.
3. **Extraction Calibration:** EXTRACTED, PARTIALLY_EXTRACTED, NEEDS_REVIEW.
4. **Relevance:** SUPPORTING, CONTRADICTORY, CONTEXTUAL.

## 2. Export Formats
- **Markdown / PDF:** Executive forensic dossier with PII masking.
- **JSON Dossier:** Full machine-readable investigation object.
- **CSV Ledger:** Tabular reconciliation ledger.
