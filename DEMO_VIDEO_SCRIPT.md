# RESOLVEGRAPH 2.0 — Demonstration Video Script & Recording Blueprint

**Target Duration:** 2 minutes 55 seconds (< 3:00 official limit)  
**Language:** English  
**Target Audience:** PayPal AI Hackathon Judges, FinTech Engineers, Risk & Dispute Directors  
**Product:** RESOLVEGRAPH 2.0 — Agentic Payment Investigation, Evidence Intelligence & Authorized Resolution Platform  

---

## Storyboard Overview & Timing Map

| Timecode | Segment | Core Message / Feature Demonstrated |
| :--- | :--- | :--- |
| **00:00 – 00:25** | The Problem | The \$100B cross-provider dispute crisis & fragmented data silos |
| **00:25 – 00:50** | The Solution & Architecture | RESOLVEGRAPH 2.0: Canonical transactions, BEG, & PayPal integration |
| **00:50 – 01:30** | Live Demonstration: Autonomous Agent | Running the 13-stage agentic PayPal investigation at `/demo` |
| **01:30 – 02:00** | Reasoning & Evidence Intelligence | BERR v2 discrepancy scoring, policy grounding, and dossier view |
| **02:00 – 02:30** | Financial Safeguards & PayPal Refund | Cryptographic SHA-256 argument locking, human approval & authorized refund |
| **02:30 – 02:55** | Audit Ledger & Conclusion | Tamper-evident chained block ledger, benchmark stats, and closing |

---

## Detailed Scene-by-Scene Script

### Scene 1: The Cross-Provider Dispute Crisis (00:00 – 00:25)
* **Screen Display:**
  * Screen opens on the RESOLVEGRAPH 2.0 Homepage (`/overview`), showcasing the tagline: *"ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION."*
  * Quick pan showing fragmented transaction records: an unboxing photo, a PayPal capture notification, and an ERP inventory receipt.
* **On-Screen Text:**
  * *Global E-Commerce Dispute & Chargeback Friction: Tens of Billions Annually*
  * *Scattered Records · Opaque Denials · 30–90 Day Delays*
* **Voiceover (Narration):**
  > "Every year, tens of billions of dollars are lost to payment dispute friction and chargeback penalties. When a customer reports that an item arrived damaged or wasn't delivered, the facts are trapped in silos. The buyer has unboxing photos, the merchant has warehouse logs, and PayPal has the payment records. Today, resolving these disputes takes weeks of manual back-and-forth, resulting in unfair chargebacks and alienated customers."

---

### Scene 2: Introducing RESOLVEGRAPH 2.0 (00:25 – 00:50)
* **Screen Display:**
  * Click *"Interactive PayPal Demo"* or navigate directly to the Guided Demo Workspace at `/demo`.
  * Highlight the status badges at the top: `PAYPAL SANDBOX VERIFIED`, `HYBRID SANDBOX / REST READY`, `LIVE PRODUCTION HARD-BLOCKED`.
  * Quick transition showing the dual-mode architecture: 13-stage agentic pipeline and 8-stage dispute lifecycle.
* **On-Screen Text:**
  * *RESOLVEGRAPH 2.0: Agentic AI · FinTech · Payment Investigation*
  * *10-Tier Matching Engine + Bilateral Evidence Graph (BEG)*
* **Voiceover (Narration):**
  > "Meet RESOLVEGRAPH 2.0. We are an AI-powered payment investigation network that correlates scattered transaction records into an immutable timeline. Powered by a 10-tier matching engine, a Bilateral Evidence Graph, and deterministic BERR reasoning, RESOLVEGRAPH unifies buyer, merchant, and PayPal data into one explainable source of truth."

---

### Scene 3: Live Agentic PayPal Investigation in Action (00:50 – 01:30)
* **Screen Display:**
  * Cursor clicks the glowing button: **"Run Live Agentic PayPal Demo"**.
  * The processing card appears: `Executing 13-Stage Agentic PayPal Investigation`.
  * The screen smoothly updates as the 13 milestones populate in real time:
    1. Creating PayPal Commerce Order ($49.99 USD)
    2. Capturing payment on PayPal Sandbox
    3. Receiving and parsing verified PayPal webhook
    4. Ingesting cancellation proof
    5. Agent orchestrator triggering 19 PayPal investigation tools
    6. Constructing the Bilateral Evidence Graph
* **On-Screen Text:**
  * *19 Specialized PayPal Agent Tools*
  * *Sub-Second Graph Synthesis & Webhook Idempotency*
* **Voiceover (Narration):**
  > "Let's run a live demonstration. With one click, our specialized AI Payment Investigation Agent goes to work. It captures a forty-nine dollar and ninety-nine cent payment on the PayPal Sandbox, processes the verified webhook, and ingests the customer's dispute alongside the merchant's cancellation record. The agent queries nineteen native PayPal tools—inspecting transaction captures, fee structures, and dispute deadlines in milliseconds."

---

### Scene 4: Explainable Intelligence: BERR v2 & Case Dossier (01:30 – 02:00)
* **Screen Display:**
  * Click **"Inspect Case Dossier"** (`/cases/CASE-PAYPAL-...` or `/cases/RG-1001`).
  * Display the Bilateral Evidence Graph (bipartite visualization showing buyer claim, invoice, and tracking nodes).
  * Scroll down to the BERR v2 Analysis panel displaying:
    * Exact Factual Clash ($D_{\text{exact}} = 1.0$)
    * Total Discrepancy Score ($D = 0.88$)
    * Grounded Merchant Policy: `APEX-POL-HARDWARE`
* **On-Screen Text:**
  * *BERR v2: Bilateral Evidence-to-Remedy Reasoning*
  * *Mathematical Discrepancy Matrix: D = 0.88 (Factual Clash)*
  * *Zero Black-Box Guesswork*
* **Voiceover (Narration):**
  > "Inside the case dossier, we see why RESOLVEGRAPH is fundamentally different. Instead of a black-box AI recommendation, our BERR v2 engine calculates an exact mathematical Discrepancy Score. It detects that payment was captured, the merchant marked the order cancelled, yet no refund was issued. The engine grounds this finding in the merchant's refund policy, recommending an immediate authorized restitution."

---

### Scene 5: Cryptographic Guardrails & Human-Authorized PayPal Refund (02:00 – 02:30)
* **Screen Display:**
  * Transition to the Financial Safeguards & Proposal Box.
  * Highlight the **Proposal Arguments Hash** (SHA-256 string).
  * Show the Merchant Manager review screen: The human officer clicks **"Authorize Refund ($49.99 USD)"**.
  * Show the green confirmation banner: `PayPal Refund ID: REF-...` and `Payment Status: REFUNDED`.
* **On-Screen Text:**
  * *Zero Autonomous Bypass: AI Proposes, Human Authorizes*
  * *SHA-256 Cryptographic Parameter Lock*
  * *Idempotent PayPal Sandbox Refund Execution*
* **Voiceover (Narration):**
  > "Crucially, RESOLVEGRAPH enforces a strict zero-bypass financial guardrail. The AI agent can never unilaterally move funds. Instead, it generates a proposal cryptographically sealed with a SHA-256 argument hash. The human merchant officer reviews the evidence and signs off. Only upon human authorization does the system dispatch an idempotent refund call to the PayPal API, returning forty-nine dollars and ninety-nine cents directly to the buyer's PayPal account."

---

### Scene 6: Chained Audit Ledger & Conclusion (02:30 – 02:55)
* **Screen Display:**
  * Click **"Chained Audit Ledger"** (`/audit`).
  * Display the chronological blocks showing the Genesis block, the evidence hashes, the human approval signature, and the PayPal refund transaction block with verified hash links.
  * Cut to closing slide showing project metrics: 367 automated tests passing, 65 suites, 0 TypeScript errors, open-source Apache 2.0 repository.
* **On-Screen Text:**
  * *Tamper-Evident SHA-256 Hash-Chained Audit Ledger*
  * *367 Automated Tests Passing · 65 Test Suites · Zero Compile Errors*
  * *RESOLVEGRAPH 2.0: ONE PAYMENT. EVERY SOURCE. ONE EXPLAINABLE RESOLUTION.*
* **Voiceover (Narration):**
  > "Every single action—from the initial payment capture to the human approval—is sealed into an immutable, SHA-256 hash-chained audit ledger. With 367 automated tests passing, nineteen PayPal tools, and complete evidence traceability, RESOLVEGRAPH turns disputed payments into resolved partnerships. One payment. Every source. One explainable resolution. Thank you."

---

## Backup Demonstration Sequence (Offline / Fallback Resilience)

If external PayPal credentials are unavailable or if sandbox network latency occurs during video recording:

1. **Fallback Sequence (Zero Network Dependency):**
   * Keep the default `PAYPAL_CLIENT_ID="mock_paypal_client_id_dev"` in `.env`.
   * Navigate to `http://localhost:3000/demo`.
   * The top banner displays: `HYBRID SANDBOX / REST READY` and `MOCK / SIMULATED SANDBOX (DEFAULT)`.
   * Click **"Run Live Agentic PayPal Demo"**.
   * All 13 stages execute deterministically in ~1.2 seconds, generating simulated PayPal identifiers (`5O190127TN364715T`, `84729103KM829141P`, `REF-99214710KM`).
   * Click **"Inspect RG-1001 Dossier"** to show the pre-seeded Bilateral Evidence Graph, BERR reasoning ($D = 0.88$), and store policies.
   * This guarantees a completely flawless video recording without external network latency, 429 rate limits, or PayPal Sandbox API outages.

2. **Live External Sequence (When Sandbox Credentials Are Provided):**
   * Configure valid PayPal Developer credentials in `.env` (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
   * Navigate to `http://localhost:3000/demo`.
   * Click **"Run Live Agentic PayPal Demo"**.
   * The badge indicates `PROVIDER: LIVE PAYPAL SANDBOX (REST)`. Real HTTP calls dispatch to `api-m.sandbox.paypal.com`.

---

## Recording Checklist for Creator
1. **Resolution:** 1080p (1920x1080) at 60 fps.
2. **Audio:** High-fidelity microphone with pop filter, normalized to -14 LUFS.
3. **Pacing:** Clear, confident, professional cadence (~140 words per minute).
4. **Browser Setup:** Chrome maximized, 100% zoom, dark mode enabled, bookmarks bar hidden.
5. **Video Host:** YouTube (unlisted or public), category: Science & Technology.
6. **Video Link Policy:** Do not invent or fabricate a video link in advance. Record the actual software, upload to YouTube, and paste the live URL into the Devpost submission form.
