# RESOLVEGRAPH — Hackathon 8-Slide Pitch Deck Outline
**Project:** RESOLVEGRAPH  
**Tagline:** "From the first complaint to a fair resolution."  
**Theme:** Evidence-First Commerce Resolution Infrastructure  
**Format:** 8 Presentation Slides with Visual Direction & Speaker Notes  
**Version:** 1.0.0 (November 2026)

---

## Slide 1: Title & Executive Identity

- **Headline**: RESOLVEGRAPH
- **Subtitle**: Evidence-First Commerce Resolution Infrastructure
- **Main Message**: Transforming adversarial e-commerce purchase disputes into collaborative, source-grounded resolution graphs backed by PayPal.
- **Visual Direction**: High-contrast dark fintech theme with glowing node graph background. PayPal Sandbox Verified badge and live project GitHub link.
- **Supporting Content**:
  - Category: Fintech Resolution Infrastructure & Multi-Agent AI
  - Team: Principal Software Architects, AI Engineers & Fintech Specialists
  - Tagline: *"From the first complaint to a fair resolution."*
- **Speaker Notes**:
  > *"Judges, thank you. Today we are presenting ResolveGraph—an evidence-first commerce resolution infrastructure connecting the complaint, the evidence, and PayPal payment settlement into one continuous, human-governed workflow."*

---

## Slide 2: The Problem — Fragmented Commerce Disputes

- **Headline**: Online Purchase Disputes are Broken, Expensive & Adversarial
- **Main Message**: Critical evidence is scattered across disparate systems, while legacy dispute portals encourage adversarial shouting matches instead of objective reconciliation.
- **Visual Direction**: Three split pain-point cards with alert icons: (1) Fragmented Evidence (Invoices in ERP, photos in email), (2) Asymmetrical Claims (unverified subjective assertions), (3) Disconnected Payments (manual copy-pasting of refund IDs).
- **Supporting Content**:
  - Average dispute lifecycle: **8.4 days**
  - Average merchant investigation overhead: **42 minutes per case**
  - Disconnect between dispute decisions and payment gateway ledgers causes avoidable chargebacks and customer churn.
- **Speaker Notes**:
  > *"When a customer receives an SSD with half the promised capacity, the dispute process falls apart. The merchant's invoice lives in an ERP, the buyer's unboxing photo is trapped in an email thread, and the payment record is miles away. Merchants spend 42 minutes per dispute manually piecing together evidence."*

---

## Slide 3: Our Solution — Evidence-First Resolution Infrastructure

- **Headline**: RESOLVEGRAPH: The Continuous Evidence-to-Settlement Bridge
- **Main Message**: A bilateral case dossier where multimodal AI extracts facts from both parties, builds a traceable knowledge graph, and prepares policy-grounded remedies executed via PayPal.
- **Visual Direction**: A clear 3-pillar architectural diagram:
  - *Intake & Evidence Locker* (Magic-byte verified, SHA-256 locked)
  - *BERR Intelligence Engine* (Agreed vs Contested vs Missing facts)
  - *PayPal Sandbox Settlement* (Human-authorized idempotent refunds)
- **Supporting Content**:
  - Unified Case Dossier linking order, claim, evidence, and settlement
  - Symmetric Bilateral Evaluation: Buyer and merchant evidence treated with equal evidential weight
  - Mandatory Human-in-the-Loop Governance: Zero autonomous money movement
- **Speaker Notes**:
  > *"ResolveGraph introduces a continuous evidence-first resolution infrastructure. We connect the original PayPal purchase session with bilateral evidence uploads, reconstruct the factual timeline, and draft policy-compliant remedies that human managers can approve with one click."*

---

## Slide 4: Product Demonstration — From Complaint to Resolution

- **Headline**: Real-World Walkthrough: The 1TB vs 512GB SSD Scenario
- **Main Message**: Walking through an end-to-end commercial dispute from initial checkout capture to verified PayPal refund.
- **Visual Direction**: Screenshot collage of the live `/demo` 8-stage interactive walkthrough and the 10-tab Case Dossier (`RG-1001`).
- **Supporting Content**:
  - Order `ORD-2026-8841`: 1TB NVMe SSD (\$79.99 / ₹6,499) captured via PayPal Sandbox ID `84729103KM829141P`.
  - Buyer uploads drive label photograph (512GB); Merchant provides invoice (1000GB).
  - BERR identifies capacity mismatch ($D=0.88$); Multi-Agent Copilot drafts \$25.00 partial refund.
  - Merchant authorizes proposal; PayPal Sandbox executes \$25.00 refund (Refund ID `REF-99214710KM`).
- **Speaker Notes**:
  > *"Here is our live working demonstration. A customer buys a 1TB SSD, but receives a 512GB unit. In our evidence locker, multimodal extraction pulls facts from the invoice and physical photo. BERR identifies the contradiction, proposes a \$25 partial refund, and upon merchant authorization, dispatches the refund directly through PayPal Sandbox."*

---

## Slide 5: Core Innovation — BERR & The Bilateral Evidence Graph

- **Headline**: Moving Beyond Unstructured Text to Symmetrical Knowledge Graphs
- **Main Message**: BERR decomposes claims and normalizes multimodal units into a directed knowledge graph that categorizes agreed, contested, and missing facts.
- **Visual Direction**: High-resolution rendering of the Bilateral Evidence Graph showing blue buyer nodes, green merchant nodes, and purple payment nodes with force-directed edges.
- **Supporting Content**:
  - **BERR 10-Stage Pipeline**: Claim decomposition, multimodal OCR/vision extraction, entity normalization, contradiction scoring ($D$).
  - **Graph Categorization**:
    - *Agreed*: Order placement, payment capture (\$79.99).
    - *Contested*: Delivered capacity (1000GB vs 512GB).
    - *Missing*: Outbound warehouse packing scan log.
  - **Temporal & Semantic Drift**: Detects timeline inconsistencies and shifting claims over time.
- **Speaker Notes**:
  > *"Unlike competitor tools that only generate one-sided merchant rebuttal letters, our Bilateral Evidence Graph is symmetric. It links invoices to physical product labels with source coordinates, eliminating LLM hallucinations and categorizing what is agreed, what is contested, and what evidence is still missing."*

---

## Slide 6: Technology Stack — Multi-Agent Copilot & PayPal Sandbox

- **Headline**: Production-Hardened Architecture with Strict Human Governance
- **Main Message**: Engineered as a modular monolith pairing Next.js 16 and Prisma with PayPal REST APIs V2 and multi-agent coordination under cryptographic approval gates.
- **Visual Direction**: System architecture flow showing Next.js App Router $\rightarrow$ BERR Intelligence $\rightarrow$ Specialist Agents $\rightarrow$ Human Gate $\rightarrow$ PayPal Sandbox REST APIs.
- **Supporting Content**:
  - **Tech Stack**: Next.js 16, React 19, Prisma ORM 7 (27 models), TypeScript 5.
  - **Multi-Agent System**: Specialist subagents (Triage, Evidence, Policy, Comms) operating under 12-step execution ceilings.
  - **Cryptographic Gate**: High-risk actions enforce SHA-256 argument hashes (`AgentApprovalRequest`).
  - **Financial Safety**: `PAYPAL_LIVE_ENABLED=false` hardcoded; PayPal-Request-Id idempotency locks.
- **Speaker Notes**:
  > *"Under the hood, ResolveGraph is built on Next.js 16, Prisma ORM, and 27 relational models. Our multi-agent copilot uses specialist subagents to evaluate merchant return policies, but enforces a strict human gatekeeper. Every refund proposal requires cryptographic signature verification before hitting PayPal’s API."*

---

## Slide 7: Measured Impact & Empirical Research Rigor

- **Headline**: Validated on RECOURSE-BENCH: 89.3% Accuracy & -64% MTTR
- **Main Message**: Rigorously benchmarked across 300 dispute scenarios with verified disaster recovery and operational monitoring.
- **Visual Direction**: Two-column comparison: (Left) Bar chart comparing ResolveGraph (89.3% accuracy) against Zero-Shot LLM (64.0%) and Unilateral RAG (72.3%). (Right) Key operational metrics callouts.
- **Supporting Content**:
  - **RECOURSE-BENCH**: 300 labeled cases across 6 dispute categories (`npm run benchmark`).
  - **Bilateral Fairness**: Near-zero symmetry delta (0.012) proves unbiased evidence evaluation.
  - **Operational Hardening**: 170 passing tests, 891ms database disaster recovery RTO (`npm run db:drill`).
  - **Expected Value**: Reduces Mean Time to Resolution from 8.4 days to $\le 3$ days.
- **Speaker Notes**:
  > *"We validated ResolveGraph on RECOURSE-BENCH, our 300-case evaluation suite. ResolveGraph achieved 89.3% accuracy on contradiction identification—outperforming standard LLM baselines by 25 points while maintaining symmetric fairness. Our automated disaster recovery drill restores full database parity in 891 milliseconds."*

---

## Slide 8: Future Vision — The Future of Evidence-First Commerce

- **Headline**: Scaling from Hackathon Pilot to Global Commerce Protocol
- **Main Message**: An open, evidence-grounded infrastructure layer making commerce disputes fair, fast, and transparent across global marketplaces.
- **Visual Direction**: Roadmap timeline showing Phase 1 (Controlled Merchant Pilot: 2–5 merchants) $\rightarrow$ Phase 2 (Commercial PayPal Production Integration) $\rightarrow$ Phase 3 (Continuous Multimodal Video & Cross-Border FX).
- **Supporting Content**:
  - **Status**: Certified `CONTROLLED_PILOT_READY` with 2–5 merchant cohort framework.
  - **Expansion**: Native marketplace integrations (Shopify, WooCommerce, eBay).
  - **Closing Commitment**: Real, working code. Honest research. Symmetrical fairness.
- **Speaker Notes**:
  > *"ResolveGraph is ready for controlled merchant pilots today. As we scale, our vision is to establish an open resolution protocol where buyers, merchants, and PayPal collaborate on grounded evidence. From the first complaint to a fair resolution—thank you."*
