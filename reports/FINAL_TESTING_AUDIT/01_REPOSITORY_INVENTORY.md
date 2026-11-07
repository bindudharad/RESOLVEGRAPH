# RESOLVEGRAPH — Technical Repository Inventory & Architecture Map
**Audit Stage:** Phase 1 — Full Repository Discovery  
**Audit Date:** November 2026  
**Auditor:** Senior QA Automation Engineer, DevOps Engineer & Principal System Architect  
**Location:** `reports/FINAL_TESTING_AUDIT/01_REPOSITORY_INVENTORY.md`

---

## 1. Environment & Runtime Specifications

| Attribute | Detected Value in Repository | Configuration Source |
|---|---|---|
| **Project Name** | `rg-scaffold` (ResolveGraph) | `package.json` |
| **Node.js Target** | `>= 20.x` (`v24.x` recommended) | `package.json`, `docs/SETUP_GUIDE.md` |
| **Package Manager** | `npm` (Lockfile: `package-lock.json` v3) | `package-lock.json` (346 KB) |
| **Frontend Framework** | Next.js `16.4.4` (App Router with Turbopack) | `package.json` |
| **UI Library & State** | React `19.3.0`, React DOM `19.3.0` | `package.json` |
| **Styling & Tokens** | Tailwind CSS `^4.0.0`, `@tailwindcss/turbopack` | `package.json`, `src/app/globals.css` |
| **Icons & Charts** | `lucide-react 1.66.0`, `recharts 3.10.1` | `package.json` |
| **Database & ORM** | Prisma ORM `7.10.1`, `@prisma/adapter-better-sqlite3 7.10.1` | `package.json`, `prisma/schema.prisma` |
| **Database Engine** | SQLite in dev (`dev.db`), PostgreSQL ready in prod | `prisma/schema.prisma`, `src/lib/prisma.ts` |
| **Authentication** | Better-Auth `1.7.15` (Prisma adapter) | `package.json`, `src/server/auth/` |
| **AI SDK & Parsing** | OpenAI SDK `7.47.0`, `unpdf 2.1.0` (zero-dep) | `package.json`, `src/server/ai/` |
| **Validation** | Zod `4.6.7` | `package.json`, `src/server/validators/` |
| **Language & Transpiler** | TypeScript `5.x`, `tsx 4.23.15` | `package.json`, `tsconfig.json` |
| **Testing Harness** | Node.js Test Runner via `tsx --test --test-concurrency=1` | `package.json` (`npm test`) |

---

## 2. Directory Structure & Layer Responsibilities

```
c:\Projects\resolvegraph\
├── .next/                                # Next.js optimized production build output (36 routes)
├── .private/                             # Private object storage root (.private/evidence)
│   └── evidence/                         # Magic-byte sniffed binary uploads with SHA-256 hashes
├── docs/                                 # 38 architecture, audit, governance, and SOP documents
├── prisma/                               # Prisma 7 schema and seed scripts
│   ├── schema.prisma                     # 27 relational models with SQLite datasource
│   └── seed.ts                           # Multi-tenant users, sample cases, and baseline scenario seed
├── public/                               # Static client assets (SVG logos, favicons)
├── reports/                              # Formal engineering and testing audit artifacts
│   └── FINAL_TESTING_AUDIT/              # Phase 1-20 Comprehensive Verification Reports
├── research/                             # Step 9 empirical benchmark scripts and ablation outputs
├── scripts/                              # SRE scripts and operational verification tools
│   ├── evaluation/                       # RECOURSE-BENCH benchmark harness (300 cases)
│   ├── ai-worker.ts                      # Background AI analysis queue consumer
│   ├── bootstrap-admin.ts                # One-time administrative bootstrap CLI
│   ├── db-backup-restore-drill.ts        # Automated atomic DB backup & restore drill (891ms RTO)
│   ├── reconcile-payments.ts             # Internal ledger vs PayPal provider reconciliation
│   ├── reconcile-storage.ts              # Physical files vs DB records reconciliation
│   ├── run-agent-eval.ts                 # Multi-agent copilot evaluation runner
│   └── run-ai-eval.ts                    # 100-scenario multimodal extraction benchmark
├── src/                                  # Application Source Code
│   ├── app/                              # Next.js 16 App Router hierarchy
│   │   ├── (auth)/                       # Sign-in, Sign-up, Password recovery routes
│   │   ├── (workspace)/                  # Authenticated fintech workspace
│   │   │   ├── analytics/                # Aggregated dispute and MTTR analytics
│   │   │   ├── cases/                    # Case management & 10-tab dossier (/cases/[caseId])
│   │   │   ├── copilot/                  # Multi-agent copilot conversation UI
│   │   │   ├── dashboard/                # Main overview dashboard
│   │   │   ├── demo/                     # Failure-proof 8-stage interactive guided walkthrough
│   │   │   ├── evidence/                 # Workspace-wide evidence locker
│   │   │   ├── help/                     # Documentation & user help center
│   │   │   ├── investigation/            # Bilateral investigation workspace
│   │   │   ├── organizations/            # Multi-tenant team & organization management
│   │   │   ├── payments/                 # Financial ledger, captures & refunds
│   │   │   ├── paypal/                   # PayPal disputes synchronization console
│   │   │   ├── resolution/               # Remedy proposal & acceptance center
│   │   │   └── settings/                 # Account, policy & integration configuration
│   │   └── api/                          # 22 REST Route Handlers (JSON & Multipart)
│   ├── components/                       # Accessible React 19 UI Components
│   │   ├── cases/                        # Dossier tabs: EvidenceGraphExplorer, TemporalExplorer, etc.
│   │   ├── common/                       # Toast, badges, navigation headers
│   │   ├── dashboard/                    # Metric cards, volume charts
│   │   └── ui/                           # Button, Input, Modal, Table primitives
│   ├── generated/                        # Generated Prisma client bindings (`src/generated/prisma`)
│   ├── hooks/                            # Custom React hooks (`useDemoCases`, etc.)
│   ├── lib/                              # Shared libraries
│   │   ├── env-validator.ts              # Strict startup environment assertions
│   │   ├── feature-flags.ts              # Centralized safety toggles (PAYPAL_LIVE_ENABLED=false)
│   │   ├── logger.ts                     # Structured JSON logger with PII/PAN redaction
│   │   ├── prisma.ts                     # Singleton Prisma client with BetterSqlite3 adapter
│   │   └── utils.ts                      # Minor currency unit math and string formatters
│   └── server/                           # Domain Services & Business Logic
│       ├── agents/                       # Multi-agent Copilot (Orchestrator, Specialists, Gate)
│       ├── ai/                           # Extraction pipelines, prompt boundaries, Luhn check
│       ├── auth/                         # Better-Auth server configuration & RBAC rules
│       ├── dal/                          # Data Access Layer queries
│       ├── drift/                        # Semantic drift cosine distance engine
│       ├── graph/                        # Bilateral Knowledge Graph builder & BFS queries
│       ├── orchestration/                # Unified Case Lifecycle & Event Broker
│       ├── paypal/                       # Orders V2, Captures, Refunds, Disputes, Webhooks
│       ├── resolution/                   # Policy evaluation & remedy matching
│       ├── services/                     # PrivacyService (DSAR & 7-year legal holds)
│       ├── storage/                      # LocalEvidenceStorage & storage reconciliation
│       ├── temporal/                     # Temporal sequence sorting & counterfactual replay
│       └── validators/                   # Zod schemas for cases, claims, evidence, payments
├── submission/                           # Complete 17-file Hackathon Submission Package
└── tests/                                # 23 Automated Test Files (39 Test Suites, 170 Tests)
```

---

## 3. Database Schema Overview (27 Models)

The SQLite database (`dev.db`) contains 27 interconnected models in `prisma/schema.prisma`:
1. **Identity & Auth**: `User`, `Session`, `Account`, `Verification`
2. **Multi-Tenancy**: `Organization`, `OrganizationMember`, `OrganizationInvitation`
3. **Core Dispute & Case Management**: `CaseRecord`, `Claim`, `Evidence`, `CaseEvent`, `CaseNote`
4. **Multimodal AI & Consents**: `AIProcessingConsent`, `AIAnalysisRun`, `ExtractedFact`, `BerrFinding`, `AIReviewFeedback`
5. **Bilateral Graph & Temporal**: `FactRelation`, `CaseTimelineEvent`, `GraphSnapshot`
6. **Resolution Intelligence**: `ResolutionPolicy`, `ResolutionRule`, `ResolutionProposal`, `ResolutionPartyResponse`
7. **PayPal & Payments**: `CommerceOrder`, `CommerceOrderItem`, `PayPalPayment`, `RefundTransaction`, `PayPalDisputeRecord`, `PayPalApiOperation`
8. **Multi-Agent Copilot**: `AgentRun`, `AgentStep`, `AgentToolInvocation`, `AgentApprovalRequest`, `AgentArtifact`
9. **Governance & Audit**: `SecurityAuditEvent`

---

## 4. Test Suites Inventory (23 Files, 39 Suites, 170 Tests)

1. `tests/agent-orchestration.test.ts` (Multi-agent orchestration, specialist roles, human approval gates)
2. `tests/ai-evaluation.test.ts` (Synthetic evaluation benchmark suite)
3. `tests/ai-extraction.test.ts` (Multimodal fact extraction, unit normalization)
4. `tests/ai-routes.test.ts` (AI analysis enqueuing, review, and consent APIs)
5. `tests/ai-security.test.ts` (Luhn algorithm card validation, PII redaction, prompt injection defense)
6. `tests/api-routes.test.ts` (Core Next.js route handlers: cases, claims, evidence, dashboard)
7. `tests/authorization.test.ts` (RBAC enforcement, tenant isolation across Org A vs Org B)
8. `tests/backend.test.ts` (Prisma service CRUD, atomic transactions, status transitions)
9. `tests/berr-engine.test.ts` (BERR contradiction scoring, missing evidence detection)
10. `tests/e2e-workflow.test.ts` (End-to-end multi-role buyer/merchant dispute lifecycle)
11. `tests/fairness.test.ts` (Bilateral symmetry, order-permutation invariance)
12. `tests/file-storage.test.ts` (Magic-byte detection, path traversal prevention, SHA-256)
13. `tests/graph.test.ts` (Bilateral graph construction, BFS queries, cycle detection)
14. `tests/hackathon-acceptance.test.ts` (21-step master end-to-end acceptance test)
15. `tests/paypal-auth.test.ts` (OAuth token caching, single-flight promises)
16. `tests/paypal-disputes.test.ts` (Customer disputes ingestion, evidence dossier compiler)
17. `tests/paypal-orders.test.ts` (Orders V2, server captures, minor unit math)
18. `tests/paypal-reconciliation.test.ts` (Payment ledger reconciliation vs provider state)
19. `tests/paypal-refunds.test.ts` (Idempotent refunds, partial balances, balance exhaustion)
20. `tests/paypal-webhooks.test.ts` (Webhook signature validation, SSRF cert protection)
21. `tests/pilot-readiness.test.ts` (EnvValidator, FeatureFlags, PrivacyService, Agent SRE)
22. `tests/resolution.test.ts` (Policy evaluation, remedy lifecycle to AGREED status)
23. `tests/temporal.test.ts` (Temporal sequence ordering, counterfactual replay as of T)
