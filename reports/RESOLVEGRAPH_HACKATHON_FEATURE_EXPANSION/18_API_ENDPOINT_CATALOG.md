# REPORT 18 — API ENDPOINT CATALOG & INTEGRATION REFERENCE

## New Fintech Endpoints Implemented
- `POST /api/evidence/intake`: Multi-format evidence ingestion and calibrated extraction.
- `PATCH /api/evidence/extractions/[id]`: In-place human field correction.
- `GET /api/transactions/canonical`: Lists canonical transactions for case.
- `POST /api/transactions/canonical`: Creates canonical transaction with sources.
- `POST /api/transactions/reconcile`: Runs 10-tier matching hierarchy.
- `GET /api/investigations/[caseId]`: Fetches root-cause investigation status.
- `POST /api/investigations/[caseId]`: Runs 12-stage forensic investigation.
- `GET /api/investigations/[caseId]/report`: Exports forensic dossier (Markdown, JSON, CSV).
- `POST /api/complaints/multilingual`: Processes voice/text in EN, KN, HI.
- `GET /api/admin/kill-switch`: Reads administrative kill switch configuration.
- `POST /api/admin/kill-switch`: Updates emergency circuit breakers.
- `GET /api/audit/chained`: Fetches and verifies hash-chained audit ledger.
