# RESOLVEGRAPH — Hackathon 3-Minute Presentation Demo Script

> **Product:** RESOLVEGRAPH (AI-Powered Commerce Resolution Infrastructure)  
> **Tagline:** "From the first complaint to a fair resolution."  
> **Target Duration:** Exactly 3 minutes (180 seconds)

---

## [0:00 – 0:30] The Problem: The Broken World of Commerce Disputes

**Speaker Visual:** Show ResolveGraph Dashboard (`/dashboard`) or Landing Page (`/`).

**Talking Points:**
> "Hello everyone. Every year, over 200 million online shoppers receive the wrong item, a damaged package, or an empty box.
> Today, dispute resolution is an adversarial mess: disjointed emails, angry customer service calls, weeks of waiting for bank chargebacks, and heavy merchant penalties.
> We built **RESOLVEGRAPH** to change that.
> ResolveGraph is an **Evidence-First Commerce Resolution Infrastructure** that connects buyers, merchants, purchase records, and PayPal payments into one intelligent, auditable workspace."

---

## [0:30 – 1:15] The Core Architecture & Guided Demo Workspace

**Speaker Visual:** Navigate to `/demo` (Guided Demo Workspace).

**Talking Points:**
> "Let me walk you through our live end-to-end resolution pipeline.
> Here is a realistic scenario: Customer Alex Johnson purchases an ApexDrive Pro 1TB NVMe SSD for \$79.99 from merchant Apex Tech Retail.
> In Stage 1 and 2, our system creates the internal commerce order and captures payment in PayPal Sandbox under Capture ID `84729103KM829141P`. All monetary math is strictly computed in integer minor units to eliminate floating-point rounding errors.
> When the package arrives, the buyer discovers a 512GB SSD inside the box. They file a dispute and upload two pieces of evidence: their invoice and a photo of the drive label.
> Notice our security layer: every file upload is validated against binary magic bytes to block disguised executables, sealed with SHA-256 hashes, and verified for explicit AI processing consent."

---

## [1:15 – 2:00] BERR Multimodal AI & Bilateral Evidence Graph

**Speaker Visual:** Click `"Execute Stage 5"` in `/demo` or open `/cases/RG-1001` tab `"Evidence Graph"` and `"AI Investigation"`.

**Talking Points:**
> "Now, our proprietary **BERR** engine—Bilateral Evidence-to-Remedy Reasoning—goes to work.
> Rather than relying on ungrounded LLM guessing, BERR decomposes text and images into structured facts with exact bounding box citations.
> It normalizes units: 1TB becomes 1024GB, compared against the 512GB on the drive label.
> It computes a multi-factor discrepancy score:
> $$D = \alpha D_{exact} + \beta D_{semantic} + \gamma D_{temporal}$$
> flagging a high contradiction score of 0.88.
> And here in our Bilateral Evidence Graph, both parties can visually trace how every claim connects directly to evidence, eliminating ambiguity and emotional friction."

---

## [2:00 – 2:40] Policy Grounding, Bilateral Agreement & Automated PayPal Refund

**Speaker Visual:** Switch to Tab `"Resolution"` in `/cases/RG-1001` or Stage 7 & 8 in `/demo`.

**Talking Points:**
> "Crucially, AI never authorizes refunds unilaterally.
> Instead, our Resolution Engine evaluates the findings against the merchant's pre-configured return policies.
> Here, the policy suggests two options: a full refund upon physical return, or a \$25.00 partial refund where the buyer keeps the 512GB drive.
> The merchant offers the \$25 partial refund. The buyer accepts.
> As soon as bilateral agreement is reached, ResolveGraph calls the PayPal Sandbox Refund API using a unique idempotency key.
> \$25.00 is refunded to the buyer immediately. The merchant's ledger updates to a net balance of \$54.99. And the case transitions to `RESOLVED`."

---

## [2:40 – 3:00] Conclusion & Enterprise Readiness

**Speaker Visual:** Open Tab `"Audit History"` in `/cases/RG-1001` or `/payments`.

**Talking Points:**
> "Look at our immutable Audit History: every case event, timeline milestone, security scan, and PayPal webhook is cryptographically logged.
> ResolveGraph features:
> - 112 passing automated tests across 25 suites.
> - Zero TypeScript and zero ESLint errors.
> - A hard-coded safety guard blocking live payments.
> - And 98.6% Evidence Traceability Coverage.
> RESOLVEGRAPH transforms disputes from an adversarial battle into a structured, fair, and automated resolution.
> Thank you."
