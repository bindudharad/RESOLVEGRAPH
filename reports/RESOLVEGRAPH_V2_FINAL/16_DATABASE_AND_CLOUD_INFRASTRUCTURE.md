# 16. Database Architecture & Cloud Infrastructure Readiness

**Database Artifacts:** `prisma/schema.prisma`, `prisma/dev.db`, `prisma/postgres-migration.sql`  
**Cloud Workers:** `src/server/jobs/durable-worker.ts`  
**Storage Architecture:** `src/server/storage/s3-evidence-storage.ts`

---

## 1. Database Schema & Preservation

The database schema encompasses 50 relational models supporting both Phase 1 dispute arbitration and Version 2.0 preventive commerce:
- **Baseline SQLite Database (`dev.db`):** Preserves 133 CaseRecords, intact organization memberships, and historical claims without data truncation or reset.
- **Enterprise PostgreSQL Migration (`prisma/postgres-migration.sql`):** Full DDL migration script with native UUID primary keys, composite B-tree indices on `[organizationId, caseNumber]`, JSONB column types for snapshots, and foreign key cascades.

---

## 2. Durable Background Job Queue

Asynchronous tasks (scheduled unboxing reminders, batch invoice OCR, courier polling) execute via `durable-worker.ts`:
- **At-Least-Once Delivery:** Uses atomic database leases (`lockedAt`, `lockedBy`) to prevent split-brain worker executions.
- **Automatic Exponential Backoff:** Failed jobs retry up to 3 times with jittered exponential delay before dead-letter quarantine.
- **Graceful Shutdown:** Implements OS `SIGINT` and `SIGTERM` signal traps to allow running tasks to complete.
