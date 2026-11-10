# RESOLVEGRAPH 2.0 — Comprehensive Manual Testing & Demonstration Checklist

**Target:** PayPal AI Hackathon 2026 Manual Evaluator Guide  
**Application URL:** `http://localhost:3000`  
**Execution Environment:** Windows PowerShell / Node.js 18+ / SQLite (`dev.db`) / PayPal Sandbox  
**Branch:** `qa-hardening`

---

## 1. Quick Start & Installation Steps

### 1.1. Verify Prerequisites
Ensure Node.js 18.x or 20.x is installed:
```powershell
node -v
npm -v
```

### 1.2. Verify Repository State
Confirm you are on the `qa-hardening` branch:
```powershell
git branch --show-current
# Output should be: qa-hardening
```

### 1.3. Install Dependencies
```powershell
npm install
```

---

## 2. Environment Setup

The `.env` file is pre-configured for safe development and demonstration:
```env
DATABASE_URL="file:./dev.db"
NODE_ENV="development"
PORT=3000

# PayPal Configuration (Sandbox Mocks Active, Live Funds Disabled)
PAYPAL_ENV="sandbox"
PAYPAL_BASE_URL="https://api-m.sandbox.paypal.com"
PAYPAL_LIVE_ENABLED="false"
PAYPAL_DISPUTES_ENABLED="true"
PAYPAL_WEBHOOK_PROCESSING_ENABLED="true"
PAYPAL_CLIENT_ID="sb_sandbox_client_id"
PAYPAL_CLIENT_SECRET="sb_sandbox_client_secret"
PAYPAL_WEBHOOK_ID="sb_sandbox_webhook_id"

# Storage & AI
STORAGE_DRIVER="local"
```

---

## 3. Database Setup & Seed Data

Ensure Prisma client is generated and the SQLite database is seeded:
```powershell
npm run db:generate
npm run db:seed
```

---

## 4. Pre-Configured Demo Account Personas

The application features 4 pre-configured personas. On the `/sign-in` page, you can either click the **"Interactive Demo Personas"** quick-fill buttons or enter credentials manually:

| Persona Role | User Email | Password / Mode | Organization | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Buyer / Consumer** | `alex.chen@example.com` | `buyer123` | Individual Buyer | Submit dispute, upload evidence, accept/reject remedy proposals. |
| **Merchant Admin** | `carlos.mendez@example.com` | `merchant123` | TechStore Direct | Review incoming claims, inspect BEG graph, authorize refunds via SHA-256 sign-off. |
| **Resolution Specialist** | `elena.rostova@example.com` | `manager123` | Global Dispute Ops | Neutral arbitrator, run AI copilot, request missing facts, mediate disputes. |
| **Platform Administrator** | `priya.raghavan@example.com` | `admin123` | RESOLVEGRAPH Platform | Global visibility, emergency kill-switch, tamper-evident audit ledger inspection. |

---

## 5. Starting the Application

Launch the local development server:
```powershell
npm run dev
```
Open your browser to: **`http://localhost:3000`**

---

## 6. Step-by-Step Scenario Walkthroughs

### Workflow 1: Customer Portal & Dispute Intake
1. Navigate to `http://localhost:3000/sign-in`.
2. Click the **"Alex Chen (Buyer)"** quick-fill card and click **"Sign In"**.
3. You are redirected to `/dashboard`. Notice recent cases and active orders.
4. Click **"New Case"** or navigate to `/intake`.
5. Select category: **"Item Significantly Not as Described"**.
6. Enter Title: `"Received 512 GB SSD instead of 1024 GB"`.
7. In the Evidence upload box, select a sample PDF or JPEG invoice.
8. Click **"Submit Case"**.
9. **Expected Outcome:** Case is created with number `RG-1001` (or newly incremented number), redirecting to `/cases/[caseId]`. The Convergence Timeline shows `CASE_CREATED` and `EVIDENCE_SUBMITTED`.

### Workflow 2: Bilateral Evidence Graph (BEG) Inspection
1. From `/cases/[caseId]`, switch to the **"Evidence Graph"** tab or view the canvas.
2. Observe the interactive node layout:
   - Central Case Node (`RG-1001`).
   - Buyer Node (`Alex Chen`) & Merchant Node (`TechStore Direct`).
   - Evidence Nodes (`Invoice`, `Carrier Tracking Scan`).
3. Click any node to inspect extracted metadata, perceptual hashes, and timestamp offsets.
4. **Expected Outcome:** Graph renders smoothly without overlapping, highlighting bilateral relationships.

### Workflow 3: BERR v2 Reasoning & Conflict Isolation
1. Click the **"BERR Reasoning"** tab.
2. Inspect the 4-Quadrant Fact Matrix:
   - **AGREED FACTS:** Payment amount ($49.99), Order Date, Product Line.
   - **VERIFIED FACTS:** Carrier Delivery Scan, Package Weight (0.42 kg).
   - **CONTESTED FACTS:** Storage Capacity Clash ($1024\text{ GB} \neq 512\text{ GB}$, Discrepancy metric $D = 0.88$).
   - **MISSING EVIDENCE:** Flags absence of internal warehouse packaging scan.
3. **Expected Outcome:** Clear, factual discrepancy explanation without AI hallucinations or vague assertions.

### Workflow 4: AI Copilot & Multi-Agent Investigation
1. Navigate to `/copilot` or open the Copilot drawer on `/cases/[caseId]`.
2. Click **"Run Full Investigation"**.
3. Watch the specialist agents execute sequentially:
   - `CaseTriageAgent`: Formulates investigation strategy.
   - `EvidenceInvestigatorAgent`: Queries BEG graph and extracts fact discrepancies.
   - `PolicyRemedyAgent`: Analyzes TechStore return policy ($49.99 partial refund eligible).
   - `QualityReviewAgent`: Validates citation coverage (100% verified citations).
4. **Expected Outcome:** Copilot prepares a structured proposal: *"Partial Refund of $49.99"*. The status changes to `PENDING_APPROVAL`. **Zero funds are moved autonomously.**

### Workflow 5: Human-Authorized Financial Sign-Off & Refund Execution
1. Sign in as Merchant Admin (`carlos.mendez@example.com`).
2. Navigate to `/cases/[caseId]` and click the **"Resolution"** tab.
3. Review the pending proposal. Inspect the **Cryptographic Verification Box**:
   - Shows computed SHA-256 argument hash.
   - Links to PayPal payment record.
4. Click **"Authorize & Sign Proposal"**.
5. **Expected Outcome:** Server verifies merchant `OWNER` role, signs the argument hash, records the acceptance, and submits the idempotent refund. The proposal transitions to `COMPLETED`. An immutable block is appended to the tamper-evident audit ledger.

### Workflow 6: PayPal Live Investigation Demo (One-Click Showcase)
1. Navigate directly to `http://localhost:3000/demo`.
2. Click **"Launch PayPal Live Investigation Demo"**.
3. Watch all 6 stages execute automatically in real time with visual feedback:
   - Stage 1: Order Creation ($49.99).
   - Stage 2: Sandbox Capture.
   - Stage 3: Dispute Ingestion (`CUSTOMER_DISPUTE_CREATED`).
   - Stage 4: BEG Graph Assembly & BERR v2 Contradiction Isolation ($D = 0.88$).
   - Stage 5: Multi-Agent Copilot Proposal Drafting.
   - Stage 6: Authorized Refund Execution & Audit Chain Verification.
4. **Expected Outcome:** 100% green checkmarks across all stages, with expandable raw JSON payloads and cryptographic hashes.

### Workflow 7: Security Console & Audit Ledger Inspection
1. Sign in as Platform Admin (`priya.raghavan@example.com`).
2. Open `http://localhost:3000/admin/security`.
3. Review the **Tamper-Evident Audit Ledger**:
   - Inspect blocks showing $H_i = \text{SHA256}(H_{i-1} \parallel \text{Event})$.
4. Review the **Emergency AI Kill-Switch**:
   - Toggle AI autonomous drafting off/on to verify global kill-switch operation.
5. **Expected Outcome:** Audit chain displays unbroken cryptographic links from Genesis block ($H_0$).

---

## 7. Troubleshooting & Recovery

### How to Reset the Isolated Test Database
If you wish to return the database to a completely fresh state:
```powershell
npx prisma migrate reset --force
npm run db:seed
```

### Port 3000 Already in Use
If port 3000 is occupied by another process:
```powershell
npm run dev -- -p 3001
```
Then access `http://localhost:3001`.

### Clearing Browser State
If session cookies cause unexpected redirects:
1. Open Developer Tools (F12) > Application > Cookies.
2. Clear cookies for `localhost:3000`.
3. Re-navigate to `http://localhost:3000/sign-in`.
