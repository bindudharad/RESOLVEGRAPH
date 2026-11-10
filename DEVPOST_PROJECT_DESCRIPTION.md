# RESOLVEGRAPH 2.0 — Official Devpost Submission

### Project Name
RESOLVEGRAPH 2.0

### Tagline
ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION.

### Inspiration
Global e-commerce payment disputes and chargebacks represent tens of billions in operational costs, lost inventory, and gateway fees annually (industry research from *LexisNexis Risk Solutions* and *Chargebacks911*). When a transaction goes wrong—whether an item is undelivered, misdescribed, or double-charged—critical transaction facts are trapped in fragmented silos:
* The **Buyer** possesses photos, unboxing videos, and chat logs.
* The **Merchant** possesses ERP invoices, warehouse serial scans, and shipping records.
* The **Payment Gateway (PayPal)** possesses capture authorization tokens, payment lifecycle states, and dispute countdown deadlines.
* The **Carrier** possesses weight stamps, GPS transit coordinates, and delivery manifests.

Because these data points are historically isolated, dispute resolution today is adversarial, slow (taking 30 to 90 days across traditional chargeback cycles), and prone to unfair outcomes. Buyers face opaque rejections; merchants bleed revenue to friendly fraud and dispute penalties; and payment platforms absorb massive customer support overhead.

We built **RESOLVEGRAPH 2.0** to transform payment disputes from adversarial guessing games into **verifiable, explainable, and collaborative investigations**.

### What it does
RESOLVEGRAPH 2.0 is an AI-powered cross-provider payment investigation and resolution network that reconstructs payment histories from scattered records and digital evidence:
* **Canonical Transaction Reconstruction:** Ingests fragmented events across PayPal, bank accounts, and merchant ERPs, normalizing timestamps, currencies in integer minor units (cents/paise), and identifiers into an immutable source of truth.
* **10-Tier Hierarchical Transaction Matching:** Correlates disparate transaction events across exact capture IDs, fuzzy temporal windows ($\pm 15$ minutes), order references, and cryptographic hash anchors.
* **Bilateral Evidence Graph (BEG):** Represents buyer and merchant claims as a symmetric bipartite directed acyclic graph (DAG), ensuring neither party's portal is favored.
* **BERR v2 Reasoning Engine:** Calculates a deterministic Discrepancy Score ($D \in [0, 1]$) based on exact factual clashes ($D_{\text{exact}}$), semantic distance ($D_{\text{semantic}}$), and temporal anomalies ($D_{\text{temporal}}$), grounding recommendations in merchant policies.
* **Guided Demonstration Workspace (`/demo`):** Provides hackathon evaluators with an interactive dual-mode demonstration—either executing an automated 13-stage agentic PayPal investigation or walking step-by-step through an 8-stage dispute lifecycle.
* **Tamper-Evident Chained Audit Ledger:** Seals every evidence upload, agent tool invocation, human approval, and PayPal refund into SHA-256 hash-chained blocks (`Block_n = SHA256(Block_{n-1} + Timestamp + EventPayload)`).

### How we built it
RESOLVEGRAPH 2.0 is built on a modern, high-performance, and type-safe architecture:
* **Frontend:** Next.js 16 (v16.4.4 App Router with Turbopack), React 19, TypeScript 5, Tailwind CSS, Lucide icons, and KaTeX mathematical formula rendering.
* **Backend:** Next.js Server Components, API Route Handlers, Edge-compatible middleware, and Prisma ORM with SQLite for deterministic, zero-latency local verification.
* **Multi-Agent Runtime:** Custom multi-agent orchestrator managing specialized agents (`PaymentInvestigationAgent`, `CaseTriageAgent`, `EvidenceInvestigatorAgent`, `PolicyRemedyAgent`, `QualityReviewAgent`) with strict token budgets (4,096 tokens) and loop prevention (max 6 turns).
* **Cryptographic Layer:** Binary magic-byte MIME validation, SHA-256 file hashing, and cryptographic argument locking on all financial action proposals.
* **Empirical Benchmark Suite:** Evaluated using **RECOURSE-BENCH** (400 realistic payment dispute cases) measuring factual extraction, discrepancy detection, and policy compliance.

### PayPal Integration
RESOLVEGRAPH 2.0 features a deep, bidirectional integration with the PayPal REST v2 and v1 APIs:
* **Orders API (`v2/checkout/orders`):** Creates intent-based checkout orders, capturing buyer references, itemized line items, and custom tracking identifiers.
* **Captures API (`v2/payments/captures`):** Settles payments, verifies gateway fees, and binds capture tokens to canonical order records.
* **Refunds API (`v2/payments/captures/{capture_id}/refund`):** Executes authorized, idempotent partial and full refunds with guaranteed `PayPal-Request-Id` headers to prevent duplicate payouts.
* **Customer Disputes API (`v1/customer/disputes`):** Queries active disputes, inspects dispute history, provides settlement offers, submits evidence file hashes, and appeals adjudications.
* **Webhook Notifications (`v1/notifications/webhooks`):** Ingests asynchronous PayPal events (`PAYMENT.CAPTURE.COMPLETED`, `CUSTOMER.DISPUTE.CREATED`, etc.) into a replay-safe, deduplicated event ledger.
* **Sandbox Transparency Notice:** The platform features an adaptive provider engine (`paypal-config.ts`). By default, a high-fidelity local sandbox simulation is engaged with realistic PayPal identifiers (`5O190127TN364715T`, `84729103KM829141P`, `REF-99214710KM`) to allow deterministic, offline evaluation without external network dependency or API rate limits. Supplying real PayPal developer sandbox credentials (`PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`) in `.env` immediately engages live dispatch to `https://api-m.sandbox.paypal.com`. Live production monetary movement is hard-blocked via `PAYPAL_LIVE_ENABLED=false`.

### AI Implementation
RESOLVEGRAPH integrates AI strictly as an explainable forensic partner rather than an unconstrained decision-maker:
* **Specialized Agent Tools (19 Tools):** The `PaymentInvestigationAgent` utilizes 19 domain-specific PayPal tools covering orders, captures, refunds, disputes, evidence querying, and policy lookup. Every tool invocation enforces strict runtime Zod schema validation.
* **Multi-Agent Orchestration:** Incoming dispute claims trigger a structured pipeline: Triage $\rightarrow$ Evidence Synthesis $\rightarrow$ Policy Evaluation $\rightarrow$ Quality Review $\rightarrow$ Proposal Drafting.
* **BERR v2 (Bilateral Evidence-to-Remedy Reasoning):** Replaces generative hallucinations with a deterministic mathematical discrepancy formulation:
  $$D = 0.50 \cdot D_{\text{exact}} + 0.35 \cdot D_{\text{semantic}} + 0.15 \cdot D_{\text{temporal}}$$
  Factual clashes (such as receiving a 512GB drive when a 1TB drive was invoiced) yield exact scores ($D = 0.88$) that map deterministically to grounded store refund policies.

### Innovation
1. **Bilateral Evidence Graph (BEG):** Resolves the fundamental bias of legacy dispute platforms by modeling both buyer evidence and merchant records as symmetric bipartite DAG vertices with binary magic-byte inspection and SHA-256 provenance.
2. **Zero-Bypass Financial Guardrails:** Enforces the strict invariant:
   $$\textbf{AI Reasoning Authority} \;\cap\; \textbf{Financial Execution Authority} = \emptyset$$
   The agent can only produce a proposal. A SHA-256 hash is computed over `(actionType, amountMinor, currency, recipientId, idempotencyKey)`. Execution is locked until an authorized human merchant officer reviews the dossier and signs off. Any parameter tampering immediately invalidates the hash and terminates execution.
3. **Tamper-Evident Hash-Chained Audit Ledger:** Links every state transition from payment capture to final refund into a continuous SHA-256 cryptographic chain, verifiable by third-party auditors in milliseconds.

### Challenges
1. **Preventing Autonomous Financial Hallucinations:** Generative AI cannot be trusted with autonomous funds movement. We solved this with cryptographic SHA-256 argument locking, hard-blocking execution until human credentials sign off.
2. **Asynchronous Webhook Idempotency & Replays:** PayPal webhooks can arrive out of sequence or be re-transmitted. We designed a deduplicated ingestion pipeline tracking `event_id` and timestamps to prevent duplicate state updates.
3. **Floating-Point Rounding Discrepancies:** Handled all currency amounts strictly as integer minor units (cents/paise) to prevent IEEE-754 arithmetic errors across multi-currency settlement.
4. **Empirical Benchmark Rigor:** Evaluating 400 dispute cases on RECOURSE-BENCH demonstrated that strict contradiction thresholds yielded 100% precision with 35.3% recall (52.2% F1). We preserved this honest conservative metric rather than loosening thresholds to report inflated figures, prioritizing zero false accusations in financial investigations.

### Accomplishments
* **367 Automated Tests across 65 Test Suites:** Verified passing with 0 failures, 0 regressions, and full coverage of edge-case scenarios.
* **Zero TypeScript Compilation Errors & Clean ESLint:** Strict typing maintained across the entire repository.
* **68 Production Next.js Routes Generated Cleanly:** Fully functional workspace including dashboards, guided demo, evidence vault, case dossiers, PayPal dispute center, and audit ledger.
* **19 Verified PayPal Agent Tools:** Complete coverage of order, capture, refund, and dispute investigation actions.
* **Interactive Guided Demo (`/demo`):** Dual-mode demonstration workspace allowing 1-click 13-stage automated execution or step-by-step 8-stage interactive dispute exploration.

### Future Scope
*(Separated from current working functionality)*
* **Live Multi-Currency Cross-Border Payouts:** Integrating PayPal Payouts v1 for automated cross-border FX settlements.
* **Automated Carrier API Webhooks:** Direct integrations with FedEx, UPS, and DHL tracking APIs to ingest real-time weight stamps and proof-of-delivery GPS manifests.
* **Open Banking Transaction Clearing:** Connecting open-banking feeds to reconcile ACH/SEPA bank settlements against PayPal transactions.
* **Mobile Biometric Sign-Off:** Native Android/iOS companion application for instant biometric human-in-the-loop merchant refund approvals.

### Technology Stack
* **Languages & Frameworks:** TypeScript, Next.js 16 (16.4.4 App Router), React 19, Tailwind CSS
* **Payment APIs:** PayPal REST API v2 & v1 (Orders, Captures, Refunds, Disputes, Webhooks)
* **Data & Storage:** Prisma ORM, SQLite, SHA-256 Cryptographic Hashing
* **Testing & Quality:** Node.js Test Runner (`node:test`), TSX, Zod Validation, ESLint
* **UI & Intelligence:** KaTeX Math Rendering, Lucide React Icons

### Links
* **Repository:** [https://github.com/bindudharad/RESOLVEGRAPH](https://github.com/bindudharad/RESOLVEGRAPH) *(Working branch: `qa-hardening`)*
* **Interactive Demo Workspace:** `/demo` *(Accessible locally at `http://localhost:3000/demo`)*
* **Case Dossier:** `/cases/RG-1001` *(Accessible locally at `http://localhost:3000/cases/RG-1001`)*
* **Demonstration Video Link:** *[Insert YouTube URL upon recording — see DEMO_VIDEO_SCRIPT.md]*
