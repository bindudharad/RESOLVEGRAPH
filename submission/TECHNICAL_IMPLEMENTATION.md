# Technical Implementation Blueprint

## 1. Architecture Overview
ResolveGraph is engineered as a high-performance **Modular Monolith** using modern TypeScript and Node.js standards:

- **Framework**: Next.js 16.4.4 (App Router with Turbopack)
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Recharts
- **Database & ORM**: Prisma ORM 7 (`@prisma/client 7.10.1`, `@prisma/adapter-better-sqlite3 7.10.1`) with 27 relational models in `prisma/schema.prisma`.
- **Authentication & RBAC**: Better-Auth (`1.7.15`) with multi-tenant organization isolation (`OrganizationMember`).
- **AI Infrastructure**: OpenAI SDK (`openai 7.47.0`), zero-dependency PDF parser (`unpdf 2.1.0`), deterministic regex/AST fallbacks.
- **Payment Integration**: PayPal REST APIs V2 (Orders, Captures, Refunds) and Customer Disputes API V1 (Sandbox).
- **Validation & Safety**: Zod v4, strict startup `EnvValidator`, centralized `FeatureFlags`.

---

## 2. Granular Directory Structure

```
c:\Projects\resolvegraph\
├── src\
│   ├── app\
│   │   ├── (auth)\                 # Login, Registration, Password Reset
│   │   ├── (workspace)\            # Authenticated Core Experience
│   │   │   ├── dashboard\          # Platform Metrics & KPI Overview
│   │   │   ├── demo\               # 8-Stage Guided Judge Demonstration
│   │   │   ├── cases\              # Case Dossier (10 Tabs: Graph, BERR, etc.)
│   │   │   ├── payments\           # Financial Ledger & Refund Management
│   │   │   └── paypal\             # Customer Disputes Ingress Console
│   │   └── api\                    # Next.js Route Handlers (REST)
│   ├── components\                 # Accessible React 19 UI Primitives
│   ├── lib\                        # Prisma client, Logger, FeatureFlags, EnvValidator
│   └── server\                     # Core Backend & Domain Services
│       ├── orchestration\          # Case Lifecycle & Event Broker
│       ├── intelligence\           # BERR Engine, Temporal, Semantic Drift
│       ├── agents\                 # Multi-Agent Copilot & Approval Gatekeeper
│       ├── paypal\                 # Orders, Captures, Refunds, Disputes, Webhooks
│       └── storage\                # Binary Magic-Byte Storage & Reconciliation
├── prisma\                         # Prisma 7 Schema (27 Models) & Seeds
├── tests\                          # 170 Unit & Integration Tests (39 Suites)
├── scripts\                        # SRE Drills (db:drill, storage:reconcile, etc.)
└── docs\                           # 35+ Architecture, Audit & Runbook Documents
```

---

## 3. Verified Verification Metrics

```
┌──────────────────────────────────────┬──────────────────────────────┬──────────────┐
│ Verification Suite                   │ Command                      │ Result       │
├──────────────────────────────────────┼──────────────────────────────┼──────────────┤
│ 1. Static Type Checking              │ npx tsc --noEmit             │ 0 Errors     │
│ 2. Code Quality & Linting            │ npm run lint                 │ 0 Warnings   │
│ 3. Automated Test Suite              │ npm test                     │ 170 / 170    │
│ 4. Step 10 Pilot Readiness Tests     │ tests/pilot-readiness.test.ts│ 15 / 15      │
│ 5. RECOURSE-BENCH Benchmark          │ npm run benchmark            │ 89.3% Acc    │
│ 6. Database Restoration Drill        │ npm run db:drill             │ 891 ms RTO   │
│ 7. Next.js Production Build          │ npm run build                │ 36/36 Routes │
└──────────────────────────────────────┴──────────────────────────────┴──────────────┘
```
