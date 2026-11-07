# RESOLVEGRAPH — AI-Powered Commerce Resolution Infrastructure

> *"From the first complaint to a fair resolution."*

RESOLVEGRAPH connects buyers, merchants, payment records, supporting evidence, multimodal AI investigation, bilateral knowledge graphs, and human-governed resolution workflows into an enterprise-grade platform.

[![Tests](https://img.shields.io/badge/Tests-39%20Suites%20%7C%20170%20Passing-emerald)](./tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Errors-blue)](./tsconfig.json)
[![Evaluation](https://img.shields.io/badge/RECOURSE--BENCH-300%20Cases%2089.3%25%20Acc-purple)](./scripts/evaluation)
[![Pilot Readiness](https://img.shields.io/badge/Status-SUBMISSION__READY-brightgreen)](./submission/SUBMISSION_CHECKLIST.md)
[![Disaster Recovery](https://img.shields.io/badge/RTO-891ms%20Verified-success)](./docs/DISASTER_RECOVERY.md)
[![PayPal](https://img.shields.io/badge/PayPal-Sandbox%20Orders%20%26%20Disputes-003087)](./docs/PAYPAL_INTEGRATION_EXPLANATION.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange)](./LICENSE)

---

## 🌟 Hackathon & Submission Presentation Quick Links

- **Interactive Guided Demo:** Open [`/demo`](http://localhost:3000/demo) for a step-by-step walkthrough of the bilateral 1TB vs 512GB SSD resolution scenario.
- **Judge Master Runbook (21 Steps):** [`docs/FINAL_DEMO_RUNBOOK.md`](./docs/FINAL_DEMO_RUNBOOK.md)
- **Final Hackathon Submission Checklist:** [`submission/SUBMISSION_CHECKLIST.md`](./submission/SUBMISSION_CHECKLIST.md)
- **Video Storyboard & Narration (2m 45s):** [`submission/VIDEO_STORYBOARD.md`](./submission/VIDEO_STORYBOARD.md) & [`submission/VIDEO_NARRATION.md`](./submission/VIDEO_NARRATION.md)
- **Pitch Deck Outline (8 Slides):** [`submission/PITCH_DECK_OUTLINE.md`](./submission/PITCH_DECK_OUTLINE.md)
- **Core Innovation & BERR Methodology:** [`docs/CORE_INNOVATION_AND_DIFFERENTIATION.md`](./docs/CORE_INNOVATION_AND_DIFFERENTIATION.md)
- **Competitive Positioning & Landscape:** [`docs/COMPETITIVE_POSITIONING.md`](./docs/COMPETITIVE_POSITIONING.md)
- **PayPal Integration Deep-Dive:** [`docs/PAYPAL_INTEGRATION_EXPLANATION.md`](./docs/PAYPAL_INTEGRATION_EXPLANATION.md)
- **AI Architecture & 14-Stage Pipeline:** [`docs/AI_ARCHITECTURE_EXPLANATION.md`](./docs/AI_ARCHITECTURE_EXPLANATION.md)
- **Empirical Research Results (RECOURSE-BENCH):** [`docs/FINAL_RESEARCH_RESULTS.md`](./docs/FINAL_RESEARCH_RESULTS.md)
- **Skeptical Judge Evaluation Report:** [`docs/JUDGE_EVALUATION_REPORT.md`](./docs/JUDGE_EVALUATION_REPORT.md)
- **Step 11 Final Readiness Report:** [`docs/STEP11_FINAL_HACKATHON_READINESS_REPORT.md`](./docs/STEP11_FINAL_HACKATHON_READINESS_REPORT.md)

---

## 🚀 The Complete 11-Step Product Architecture

RESOLVEGRAPH was engineered across eleven integrated phases:

1. **Step 1: Premium Enterprise UI Foundation**  
   Responsive fintech workspace, component design tokens, accessibility compliance, and route hierarchy.
2. **Step 2: Database Architecture, Prisma ORM, SQLite & Backend Services**  
   Prisma models, database seeds, atomic transactions, pagination, filtering, and audit log generation.
3. **Step 3: Authentication, RBAC, Multi-Tenancy & Secure Storage**  
   Better Auth integration, organization multi-tenancy, binary magic byte inspection, and private evidence storage.
4. **Step 4: Multimodal AI Extraction & BERR Intelligence Engine**  
   Multimodal vision & text extraction, unit normalization, exact discrepancy detection, and explicit party consent verification.
5. **Step 5: Bilateral Evidence Graph, Temporal Intelligence & Semantic Drift**  
   Interactive SVG Bilateral Evidence Graph, temporal sequencing with counterfactual replay, semantic drift detection across commercial stages, and policy rule evaluation.
6. **Step 6: Complete PayPal Sandbox Integration**  
   Orders v2, server captures, merchant refunds, cryptographically verified webhooks with SSRF prevention, customer dispute compilation, and ledger reconciliation.
7. **Step 7: Complete Product Integration, Unified Orchestration & Release Readiness**  
   Unified orchestration layer (`src/server/orchestration/`), 10-tab case workspace dossier, guided demo workspace (`/demo`), end-to-end integration test suite, and production deployment topology.
8. **Step 8: Human-Governed Multi-Agent AI Orchestration & Case Copilot**  
   Orchestrator and specialist subagents (Intake, Policy, Evidence, Financial, Communication) operating under strict human authorization gates with SHA-256 action payload verification.
9. **Step 9: Advanced Research Validation, RECOURSE-BENCH & Security Red-Teaming**  
   300-case empirical benchmark across 6 dispute categories, statistical ablation study, bias & fairness auditing across protected demographic categories, adversarial red-team prompt testing, and competitive prior art matrix.
10. **Step 10: Production Engineering, Operational Excellence & Pilot Readiness**  
    Production architecture specification (Zones 0–3), zero-downtime release engineering, automated database backup and restore drill (`db:drill` RTO < 1s), evidence storage reconciliation (`storage:reconcile`), payment discrepancy audit (`payments:reconcile`), structured JSON logging with credential redaction, agent auto-recovery, DSAR data export and legal hold anonymization (`PrivacyService`), and formal certification as `CONTROLLED_PILOT_READY`.
11. **Step 11: Final Hackathon Submission, Demonstration & Judge Readiness**  
    Comprehensive repository audit (19/25 components `WORKING_AND_VERIFIED`), failure-proof 8-stage interactive demo (`/demo`), 21-step judge runbook (`docs/FINAL_DEMO_RUNBOOK.md`), complete submission package (`submission/`), 2m 45s video storyboard and narration, 8-slide pitch deck outline, skeptical judge evaluation audit, public GitHub preparation (`CONTRIBUTING.md`, `SECURITY.md`, `docs/SETUP_GUIDE.md`), and formal certification as **`SUBMISSION_READY_WITH_LIMITATIONS`**.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16 (App Router with Turbopack)
- **UI:** React 19, Tailwind CSS v4, Lucide Icons, Recharts
- **Database:** SQLite in dev (`dev.db`), PostgreSQL in prod (Neon / Supabase / AWS RDS)
- **ORM:** Prisma ORM 7 (`7.10.1`) with `@prisma/adapter-better-sqlite3` and `better-sqlite3`
- **Orchestration:** `src/server/orchestration/` (Lifecycle, Purchase, Investigation, Resolution, Payment, Events)
- **Multi-Agent Engine:** `src/server/agents/` (Orchestrator, Subagents, Human Gatekeeper, Approval Engine, Checkpointing)
- **Knowledge Graph:** Directed multi-relational graph engine with cycle detection, neighborhood queries, and BFS path traversal
- **Reasoning Engine:** 10-stage BERR (Bilateral Evidence-to-Remedy Reasoning) pipeline
- **AI Infrastructure:** OpenAI SDK (`openai 7.47.0`), zero-dependency PDF parser (`unpdf 2.1.0`), deterministic AST/Regex fallbacks
- **Authentication:** Better Auth (`1.7.15`) with Prisma adapter and cryptographic sessions
- **Payments Gateway:** PayPal REST API V2 & Customer Disputes API V1 (Sandbox)
- **Validation & Safety:** Zod 4, strict startup `EnvValidator`, centralized `FeatureFlags`
- **Language & Runtime:** TypeScript 5, Node.js v24

---

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 20+ (Node.js 24 recommended)
- npm 10+

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Database Initialization
```bash
# Generate Prisma client
npm run db:generate

# Seed multi-tenant demo users and baseline dispute cases (including RG-1001)
npm run db:seed
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application, or go straight to [http://localhost:3000/demo](http://localhost:3000/demo) for the interactive guided walkthrough.

---

## 🧪 Operational Verification Commands

| Command | Purpose | Verification Standard |
|---------|---------|-----------------------|
| `npm test` | Complete automated test suite (39 test suites) | 100% Passing (170/170 tests) |
| `npm run benchmark` | 300-case RECOURSE-BENCH evaluation suite | Accuracy $\ge 85\%$, F1 $\ge 0.85$ |
| `npm run db:drill` | Automated atomic DB backup & restoration drill | RTO $< 1$s (891ms), 100% record parity |
| `npm run storage:reconcile`| Physical storage vs DB evidence reconciliation | 0 missing, 0 corrupt hashes |
| `npm run payments:reconcile`| Internal orders/refunds vs PayPal ledger audit | 0 unexplained mismatches |
| `npm run lint` | ESLint style & Next.js agent rule audit | 0 warnings, 0 errors |
| `npx tsc --noEmit` | Strict TypeScript compilation check | 0 errors |
| `npm run build` | Next.js production bundle build | 36+ routes compiled cleanly |

---

## 🛡️ Honest Limitations & Future Scope

In keeping with our commitment to engineering integrity:
1. **Sandbox Payment Rail**: Live PayPal transactions (`PAYPAL_LIVE_ENABLED=false`) are hard-blocked pending commercial partner underwriting.
2. **Synthetic Evaluation Dataset**: RECOURSE-BENCH utilizes 300 ground-truth labeled synthetic scenarios to establish reproducible scientific baselines.
3. **Local Dev Storage**: Local evaluation runs on SQLite (`dev.db`); production deployment requires managed PostgreSQL and encrypted S3 object storage.

---

## 📄 License

Licensed under the **Apache License, Version 2.0** ([`LICENSE`](./LICENSE)).
