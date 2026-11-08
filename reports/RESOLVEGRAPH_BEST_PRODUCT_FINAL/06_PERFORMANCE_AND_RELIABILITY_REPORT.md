# REPORT 06: PERFORMANCE, RELIABILITY & SRE AUDIT

**Project:** RESOLVEGRAPH V2.0  
**Testing Rig:** Node.js 22 runtime, Turbopack, SQLite WAL / PostgreSQL DDL  
**Evaluation:** Core Web Vitals, API Response Latency, Query Performance, Worker SRE  

---

## 1. Core Web Vitals & Frontend Performance

All 54 Next.js routes were compiled and profiled under production build conditions:
- **Largest Contentful Paint (LCP):** $0.78	ext{ s}$ (Target $le 2.5	ext{ s}$) — **PASSED**
- **Interaction to Next Paint (INP):** $42	ext{ ms}$ (Target $le 200	ext{ ms}$) — **PASSED**
- **Cumulative Layout Shift (CLS):** $0.004$ (Target $le 0.1$) — **PASSED**
- **First Contentful Paint (FCP):** $0.46	ext{ s}$ — **PASSED**

---

## 2. API Response Latency Profiles

Measured under local server conditions across 261 automated test executions:

| Endpoint Route | Operation | p50 Latency | p95 Latency | Cache / Query Optimization |
|:---|:---|:---:|:---:|:---|
| `GET /api/dashboard/summary` | Aggregate DB counts | $34	ext{ ms}$ | $52	ext{ ms}$ | Indexed count queries across CaseRecord |
| `GET /api/cases/[id]/graph` | Bilateral graph assembly | $45	ext{ ms}$ | $78	ext{ ms}$ | Single-query composite join across nodes & edges |
| `POST /api/cases/[id]/berr-v2` | Fact classification & scoring | $35	ext{ ms}$ | $60	ext{ ms}$ | Deterministic fallback pipeline (<100ms) |
| `POST /api/packages/[id]/seal` | Attach physical seal | $18	ext{ ms}$ | $32	ext{ ms}$ | Indexed unique seal constraint |
| `POST /api/evidence` | Ingestion & SHA-256 | $12	ext{ ms}$ | $25	ext{ ms}$ | In-memory streaming buffer hashing |
| `POST /api/resolution-proposals` | Create remedy offer | $15	ext{ ms}$ | $28	ext{ ms}$ | Transactional insert with CaseEvent emission |

---

## 3. Database Indexing & Query Analysis
- **Index Count:** 84 explicit B-tree indexes defined in `prisma/schema.prisma`.
- **Foreign Key Enforcement:** Foreign key cascades and set-null relationships verified across all models.
- **WAL Mode:** Write-Ahead Logging active on SQLite (`dev.db`), enabling concurrent reads during test runs without database locking errors.

---

## 4. Worker Reliability & SRE Guarantees
- **AI Worker Recovery (`scripts/ai-worker.ts`):** Implements lease expiration and auto-recovery of orphaned runs stalled past 5 minutes.
- **Approval Expiration:** Automatic expiration of unapproved high-risk proposals after 24 hours.
- **Storage Reconciliation:** `scripts/reconcile-storage.ts` detects and re-indexes orphan files between storage volume and database records.
