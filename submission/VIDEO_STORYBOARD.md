# RESOLVEGRAPH — Hackathon Demonstration Video Storyboard
**Target Duration:** 2 Minutes 45 Seconds (165 Seconds)  
**Maximum Allowed:** 3 Minutes 00 Seconds (180 Seconds)  
**Resolution:** 1080p (1920x1080, 60fps)  
**Presenter Audio:** Confident, Clear, Engineering-Grounded Tone  
**Application URL:** `http://localhost:3000/demo` & `http://localhost:3000/cases/RG-1001`  
**Version:** 1.0.0 (November 2026)

---

## Storyboard Overview & Timeline Breakdown

```
[0:00 - 0:15]  Act 1: The Dispute Problem & Product Intro
[0:15 - 0:35]  Act 2: The SSD Purchase & Buyer Complaint Filing
[0:35 - 0:55]  Act 3: Bilateral Evidence Locker & Magic-Byte Validation
[0:55 - 1:20]  Act 4: Multimodal Fact Extraction & Bilateral Knowledge Graph
[1:20 - 1:45]  Act 5: BERR Reasoning Engine: Agreed vs Contested vs Missing
[1:45 - 2:05]  Act 6: Multi-Agent Copilot Assistance & Human Approval Gate
[2:05 - 2:25]  Act 7: PayPal Sandbox Settlement & Verified Ledger Update
[2:25 - 2:45]  Act 8: Empirical Research, Impact & Vision
```

---

## Detailed Scene-by-Scene Storyboard

### Scene 1: Opening Problem & Product Introduction (0:00 – 0:15 | 15s)
- **Visual**: Screen recording opens on `http://localhost:3000` showing the hero section: *"From the first complaint to a fair resolution"*.
- **Graphic**: Quick callout highlights: *PayPal Sandbox Verified* | *Bilateral Evidence Graph* | *BERR AI Engine*.
- **Audio Cue**: Confident voiceover begins immediately.
- **Narrator**: *"Every year, millions of online purchases end in frustrating disputes. Invoices live in ERPs, customer photos sit in email inboxes, and payment refunds require manual clerical effort. This is ResolveGraph: evidence-first commerce resolution infrastructure connecting the complaint, the evidence, and PayPal settlement in one continuous workflow."*

### Scene 2: Purchase & Complaint Filing (0:15 – 0:35 | 20s)
- **Visual**: Smooth transition to `/demo`. Highlights Stage 1 (*Checkout*) and Stage 2 (*PayPal Capture*). Zooms in on Order `ORD-2026-8841`: 1TB NVMe SSD purchased for \$79.99 (₹6,499), captured via PayPal Sandbox ID `84729103KM829141P`.
- **Action**: Presenter advances to Stage 3 (*Complaint Filing*).
- **Narrator**: *"Let’s look at a realistic dispute. Alex purchases an ApexDrive 1TB SSD. But when the package arrives, the drive inside has only 512GB of storage. Alex opens a dispute. In a traditional portal, this begins an adversarial shouting match. In ResolveGraph, it initiates a structured investigation."*

### Scene 3: Bilateral Evidence Locker (0:35 – 0:55 | 20s)
- **Visual**: Clicks through to Case `RG-1001` > **"Evidence Locker"** tab (or Stage 4 on `/demo`).
- **Screen**: Displays `Invoice_ApexDrive_1TB.pdf` (Merchant) and `Drive_Label_512GB.jpg` (Buyer). Shows green verification badges: *Magic Bytes Clean (image/jpeg, application/pdf)* and *SHA-256 Hash Locked*.
- **Narrator**: *"Both sides submit their documentation into an evidence locker. The system validates binary magic bytes to block disguised executables and locks cryptographic SHA-256 checksums to ensure proof cannot be altered."*

### Scene 4: Multimodal Extraction & Evidence Graph (0:55 – 1:20 | 25s)
- **Visual**: Highlights normalized facts table (Invoice: 1000GB | Label: 512GB), then clicks the **"Evidence Graph"** tab.
- **Screen**: Interactive SVG Knowledge Graph animates onto screen. Nodes expand showing connections between Buyer Claims (blue), Merchant Invoices (green), and PayPal Payments (purple).
- **Narrator**: *"Multimodal AI reads the invoice table and parses the serial label on the physical SSD, normalizing 1000GB and 512GB into standardized units. The Bilateral Evidence Graph visually links every claim to its underlying document, providing full provenance for both buyer and merchant."*

### Scene 5: BERR Reasoning Engine Findings (1:20 – 1:45 | 25s)
- **Visual**: Clicks **"BERR Analysis"** tab.
- **Screen**: Discrepancy score card displays **$D = 0.88$**.
- **Graphic Overlay**: Highlights three categorized buckets:
  - **Agreed Facts**: Order placed, \$79.99 captured, delivered to buyer.
  - **Contested Facts**: 1000GB ordered vs 512GB delivered.
  - **Missing Evidence**: Outbound warehouse packaging scan log.
- **Narrator**: *"Our BERR engine evaluates exact numerical contradictions, semantic drift, and timeline order. It mathematically calculates a discrepancy score of 0.88 and separates the facts: order and payment are agreed; storage capacity is contested; and warehouse packing logs are missing."*

### Scene 6: Multi-Agent Copilot & Human Approval Gate (1:45 – 2:05 | 20s)
- **Visual**: Clicks **"Copilot Agent"** tab.
- **Screen**: Multi-agent conversation stream runs. `PolicyRemedyAgent` evaluates merchant policy `APEX-POL-HARDWARE` and drafts an `AgentApprovalRequest` for a \$25.00 partial refund.
- **Action**: Presenter hovers over the cryptographic argument hash (`a7f9c2...`) and clicks **"Approve Proposal"**.
- **Narrator**: *"Our multi-agent copilot assists with triage, policy evaluation, and remedy drafting. Crucially, the AI is not an autonomous adjudicator. High-risk financial operations generate a cryptographically hashed approval request that requires explicit human merchant signoff."*

### Scene 7: PayPal Sandbox Settlement & Immutable Ledger (2:05 – 2:25 | 20s)
- **Visual**: Clicks **"Execute Settlement via PayPal"**.
- **Screen**: Instant modal execution. Shows PayPal Sandbox Refund ID `REF-99214710KM` returned, case status updating to `RESOLVED`, and net balance adjusting to \$54.99.
- **Action**: Quick click to **"Audit Ledger"** tab showing the append-only event trail.
- **Narrator**: *"With human authorization, ResolveGraph invokes the PayPal Sandbox Refunds API with an idempotent request key. The 25-dollar refund is disbursed, the dispute transitions to Resolved, and the entire provenance is permanently recorded in the audit ledger."*

### Scene 8: Research Rigor, Impact & Vision (2:25 – 2:45 | 20s)
- **Visual**: Transition to summary graphic showing RECOURSE-BENCH benchmark metrics: *89.3% Contradiction Accuracy* | *891ms Disaster Recovery RTO* | *170 Automated Tests Passing*.
- **Graphic**: Clean closing title card: **RESOLVEGRAPH — Evidence-First Commerce Resolution Infrastructure**.
- **Narrator**: *"In benchmark evaluations across 300 cases, ResolveGraph achieved 89.3% accuracy while maintaining strict bilateral fairness. By connecting complaints, evidence, and PayPal payments in one human-governed system, ResolveGraph brings clarity, speed, and fairness to global commerce. Thank you."*
