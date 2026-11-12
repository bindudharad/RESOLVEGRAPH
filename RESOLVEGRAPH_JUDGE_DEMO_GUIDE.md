# RESOLVEGRAPH — Judge Demonstration Guide & Presentation Script
## Recommended 3–5 Minute Evaluator Walkthrough & Script

**Platform URL:** `http://localhost:3000`  
**Target Audience:** Hackathon Judges, Enterprise Risk Officers, FinTech Evaluators  
**Execution Mode:** Local Development / Staging Server  

---

## 1. Demonstration Overview & Golden Rule

RESOLVEGRAPH is an **AI-powered purchase dispute investigation and resolution platform** operating across three separate, authenticated workspaces:
1. **Customer Workspace** (Dispute Lodging & Assisted Outreach)
2. **Platform Workspace** (Forensic Dossiers, BEG Visualizer, BERR Reasoning, Policy & Dual-Key Approval)
3. **Seller Workspace** (Evidence Requests, Courier Tracking, Declarations & Business Profile)

> **Golden Rule for Live Demonstrations:**  
> All financial operations run on verified **local simulation / sandbox rails**. Do **NOT** use real credit cards or live production banking credentials during demonstrations. All test accounts and cases are pre-seeded in the database.

---

## 2. Pre-Seeded Test Personas & Login Credentials

| Persona | Role | Email | Password | Recommended Entry Route |
|---|---|---|---|---|
| **Priya Raghavan** | Platform Admin / Investigator | `admin@resolvegraph.demo` | `Admin@ResolveGraph2026!` | `/overview` |
| **Alex Morgan** | Consumer / Buyer | `alex.morgan@consumer.demo` | `Buyer@ResolveGraph2026!` | `/cases/RG-1465` or `/cases/RG-1468` |
| **DigitalMart Rep** | Registered Merchant (E2E Test Org) | `support@digitalmart.demo` | `Merchant@DigitalMart2026!` | `/seller` |
| **TechStore Rep** | Registered Merchant | `disputes@techstore.demo` | `Merchant@TechStore2026!` | `/seller` |

---

## 3. Step-by-Step 5-Minute Demonstration Sequence

### Step 1: Landing Page & Problem Pitch (0:00 – 0:45)
1. Navigate to `http://localhost:3000`.
2. **Key Talking Points:**
   - Explain the \$100B global e-commerce dispute problem: buyers, merchants, and marketplaces are trapped in adversarial information silos.
   - Clarify that RESOLVEGRAPH is **NOT** an online shopping site; buyers purchase products on Amazon, Flipkart, or direct stores, and use RESOLVEGRAPH when something goes wrong.
   - Point out the core philosophical pillars: *BEG connects the evidence; BERR evaluates it; Policy determines eligibility; Dual-Key authorization releases funds.*

### Step 2: Customer Workspace & Case RG-1465 / RG-1468 (0:45 – 1:30)
1. Click **Sign In** and log in as Customer:
   - Email: `alex.morgan@consumer.demo`
   - Password: `Buyer@ResolveGraph2026!`
2. Navigate to `/cases` $\rightarrow$ Open **Case `RG-1465`** (*Logitech MX Master 3S*, ₹7,999 INR on Amazon India).
3. **Showcase:**
   - The clean, consumer-friendly dispute view without internal AI jargon.
   - Notice the complete physical replacement lifecycle: stock confirmation, BlueDart courier tracking (`BD-DM-REP-8829104`), and tamper-evident seal (`SEAL-DM-9941`).
   - Alternatively, open **Case `RG-1468`** (*Keychron K2 Keyboard*, ₹4,999 INR) to demonstrate full electronic payment refund execution.
   - For an unregistered seller fallback, view **Case `RG-1462`** (*VEGA Orion Motorbike Helmet*, ₹956 INR on Flipkart) demonstrating the customer-assisted Help Centre channel.
4. Log out via top-right menu.

### Step 3: Platform Workspace, BEG & BERR Forensics (1:30 – 3:15)
1. Sign in as Platform Investigator:
   - Email: `admin@resolvegraph.demo`
   - Password: `Admin@ResolveGraph2026!`
2. Navigate to `/overview`:
   - Point out the four authoritative database-backed KPI cards: **Open Cases**, **Awaiting Action**, **Needs Human Review**, and **Resolutions in Progress**.
   - Show the **Cases Requiring Attention** table with real-time search.
3. Open `/cases` $\rightarrow$ Click into **Case `RG-1001`**:
   - Show the **Overview** tab: notice the dynamic Convergence Timeline (Samsung 990 Pro SSD, ₹6,499 INR).
   - Switch to **Evidence & BEG** tab:
     - Point out the priority edge culling: bounded graph rendering guaranteeing fluid 60 FPS exploration even on large evidence graphs.
     - Click an evidence node to open the forensic inspector drawer.
   - Switch to **BERR Analysis** tab:
     - Show the mathematical discrepancy breakdown across `AGREED`, `VERIFIED`, `CONTESTED`, and `MISSING`.
     - Show the contested finding where merchant packaging serial diverges from buyer claim.
4. Switch to **Resolution** tab:
   - Show how the policy engine evaluates refund vs. replacement eligibility.
   - Point out the **Zero-Bypass Guardrail**: the system mandates human officer sign-off before releasing funds.
   - Click **Take Action** to demonstrate the two-party authorization modal.

### Step 4: Seller Workspace & Multi-Tenant Isolation (3:15 – 4:30)
1. Log out and sign in as Seller Organization member:
   - Email: `support@digitalmart.demo`
   - Password: `Merchant@DigitalMart2026!`
2. The user is automatically routed to `/seller` (Seller Dashboard):
   - Show the summary counts: **New Requests**, **In Progress**, **Submitted**.
3. Navigate to `/seller/requests`:
   - Open request `SER-2026-1004` (Case `RG-1465`).
   - Show the structured response wizard allowing merchants to submit declarations, replacement SKUs, and tracking info without irrelevant friction.
4. **Demonstrate Multi-Tenant Security:**
   - In the search bar on `/seller/requests`, search for `RG-1462` (Flipkart merchant Suri Consumer Private Limited) or cases belonging to TechStore.
   - Show that other organizations' disputes do not appear, proving absolute multi-tenant tenant isolation!

### Step 5: Wrap-Up & Conclusion (4:30 – 5:00)
- Highlight the production readiness: 87 routes compiled with Turbopack, 0 TypeScript errors, 100% test pass rate.
- Emphasize the core value: *Verifiable, cryptographic evidence intelligence replacing 60-day adversarial chargeback cycles.*

---

## 4. Demonstrator Cheat-Sheet

| Feature to Highlight | Where to Find It | Key Phrase to Say |
|---|---|---|
| **Symmetric Evidence Model** | `RG-1001?tab=evidence_beg` | *"We don't just take the customer's word or the seller's word—BEG models both sides into a symmetric bipartite graph."* |
| **Deterministic Reasoning** | `RG-1001?tab=berr` | *"BERR calculates a mathematical consistency index rather than letting an LLM guess a financial outcome."* |
| **Financial Safety** | `RG-1001?tab=resolution` | *"AI recommends; humans authorize. The AI has zero autonomous authority to touch funds."* |
| **Unregistered Seller Fallback** | `RG-1462?tab=seller_outreach` | *"When a seller isn't on our platform, we equip the customer with formal legal notices for marketplace Help Centres."* |
| **Multi-Tenant Protection** | `/seller/requests` | *"TechStore Global can never see Flipkart merchant cases. Boundaries are enforced at the database layer."* |
