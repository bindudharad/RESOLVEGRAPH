# RESOLVEGRAPH — Guided Demo Workspace User Guide

This guide describes how to run and demonstrate the end-to-end resolution pipeline in the **Guided Demo Workspace** (`/demo`).

---

## 1. Accessing the Demo Workspace

1. Start the ResolveGraph application:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to:
   `http://localhost:3000/demo`
3. Notice the top banner badges confirming:
   - `PAYPAL SANDBOX VERIFIED`
   - `LIVE PAYMENTS HARD-BLOCKED`
   - `HACKATHON GUIDED WALKTHROUGH`

---

## 2. Walkthrough Steps: The 8-Stage Pipeline

The demo features an interactive 8-stage stepper. You can click through stage by stage, or click **"Simulate Entire Lifecycle"** in the top right to execute the full sequence deterministically.

### Stage 1: Checkout
- **Scenario:** Customer Alex Johnson purchases an ApexDrive Pro 1TB NVMe PCIe 4.0 SSD for \$79.99 (₹6,499 equivalent / 7999 cents) from merchant Apex Tech Retail.
- **Action:** Click `"Execute Stage 1"`.
- **Outcome:** Generates `CommerceOrder` `ORD-2026-8841` and initializes PayPal Order V2 checkout session.

### Stage 2: PayPal Capture
- **Scenario:** Payment is authorized in PayPal Sandbox.
- **Action:** Click `"Execute Stage 2"`.
- **Outcome:** Payment marked `COMPLETED` under Capture ID `84729103KM829141P`.

### Stage 3: Complaint Filing
- **Scenario:** The package arrives, but upon opening, the buyer discovers a 512GB SSD inside the box instead of the ordered 1TB drive.
- **Action:** Click `"Execute Stage 3"`.
- **Outcome:** Case `RG-1001` created with category `NOT_AS_DESCRIBED`, linking buyer's claim.

### Stage 4: Evidence Upload
- **Scenario:** Parties submit supporting documents: Invoice PDF (1TB) and photograph of the physical drive label (512GB).
- **Action:** Click `"Execute Stage 4"`.
- **Outcome:** Magic byte headers verified (`image/jpeg`, `application/pdf`), SHA-256 hashes sealed, and AI processing consent registered.

### Stage 5: BERR AI Analysis
- **Scenario:** The multimodal BERR engine evaluates claims and evidence.
- **Action:** Click `"Execute Stage 5"`.
- **Outcome:** Fact normalizer parses 1000GB vs 512GB. BERR flags high discrepancy score $D=0.88$ and compiles the Bilateral Evidence Graph.

### Stage 6: Policy Grounding
- **Scenario:** Merchant policy `APEX-POL-HARDWARE` is evaluated against findings.
- **Action:** Click `"Execute Stage 6"`.
- **Outcome:** Identifies eligible settlement options: Partial refund (\$25.00) without requiring return, or Full refund (\$79.99) upon return.

### Stage 7: Bilateral Agreement
- **Scenario:** Merchant proposes a \$25.00 partial refund settlement. The buyer reviews and accepts.
- **Action:** Click `"Execute Stage 7"`.
- **Outcome:** Proposal status shifts to `AGREED`.

### Stage 8: PayPal Refund & Final History
- **Scenario:** The bilateral agreement triggers automated refund settlement.
- **Action:** Click `"Execute Stage 8"`.
- **Outcome:** Dispatches \$25.00 refund to PayPal Sandbox with idempotency key, records immutable ledger transaction, updates net balance to \$54.99, and transitions case to `RESOLVED`.

---

## 3. Deep-Dive Links
From the bottom of the demo workspace, you can jump directly into:
- **Case Dossier (`/cases/RG-1001`):** Explore the 10 tabs including the Evidence Graph, Timeline, and Audit History.
- **Payment Ledger (`/payments`):** Inspect gross authorizations, capture IDs, and refund accounting.
- **PayPal Dispute Center (`/paypal/disputes`):** Review dispute synchronization.
