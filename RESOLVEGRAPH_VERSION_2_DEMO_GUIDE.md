# RESOLVEGRAPH Version 2.0: Interactive Demo & Walkthrough Guide

Follow this guided walkthrough to demonstrate the full Version 2.0 preventive commerce protection and resolution workflow in 5 minutes.

---

## 1. Demo Roles & Test Accounts

ResolveGraph includes pre-seeded accounts for each participant:
- **Buyer Account:** Alex Morgan (`alex.buyer@example.com` / `buyer123`)
- **Merchant Account:** TechStore Operator (`techstore.merchant@example.com` / `merchant123`)
- **Resolution Manager:** Priya Admin (`priya.admin@example.com` / `admin123`)

---

## 2. Five-Minute End-to-End Walkthrough Script

### Act 1: The Purchase Baseline (Buyer & Merchant)
1. **Navigate to Purchase Memory:** Open [http://localhost:3000/purchases](http://localhost:3000/purchases).
2. **Observe Immutable Baselines:** Review existing orders (e.g. `ORD-98231` with 1 TB NVMe SSD and 32GB RAM). Notice the `SHA-256 Chain Integrity: 100% Verified` badge.
3. **Ingest a New Order:**
   - Click **Ingest Purchase Memory**.
   - Review or modify the sample order confirmation email.
   - Click **Extract & Save Baseline**.
   - Notice that specifications (Storage: 1TB NVMe, RAM: 32GB) and seller promises are extracted and cryptographically anchored into `dev.db`.

---

### Act 2: Fulfillment & Package Passport (Merchant)
1. **Navigate to Package Passports:** Open [http://localhost:3000/packages](http://localhost:3000/packages).
2. **Inspect Existing Passports:** View package identifiers (`PKG-2026-XXXXX`), carrier tracking numbers, and HMAC-SHA256 verification tokens.
3. **Register a New Package:**
   - Click **Register Package Passport**.
   - Enter carrier (`FedEx Express`), tracking number, and manifest items.
   - Click **Generate Passport**.
4. **Attach Tamper-Evident Seal:**
   - Click **Attach Seal** on any registered package.
   - Enter seal barcode (e.g. `SEAL-SEC-99012`) and click **Apply & Seal**.
   - Notice the cumulative integrity hash chain updates immediately.
5. **Verify QR Code (Privacy Safety Check):**
   - Click **Verify QR**.
   - Notice that the public verification page confirms the package is sealed and authentic, but **completely redacts** the buyer's name, email, street address, and payment card numbers.

---

### Act 3: Delivery Alert & Unboxing Preparation
1. **Check Pre-Delivery Notifications:**
   - Open `/notifications` or query `GET /api/notifications`.
   - Observe the proactive unboxing prep alert notifying the buyer before courier delivery:
     > *"Your TechStore package is out for delivery. Remember to launch Dual-Sight capture before breaking physical tamper seals."*

---

### Act 4: The Dispute & Divergence Detection
1. **Compare Divergence against Baseline:**
   - Return to [http://localhost:3000/purchases](http://localhost:3000/purchases).
   - Click **Compare Divergence** on an order.
   - Enter a dispute claim: *"Customer received 512GB SSD instead of 1TB NVMe."*
   - Click **Run Divergence Comparison**.
   - Observe the result: **DIVERGENCE CONFIRMED**. The original 1 TB SSD baseline is proven intact and protected against retroactive modification.

---

### Act 5: Shared Resolution Room & 10-Point Safeguards
1. **Navigate to Resolution Room:** Open [http://localhost:3000/resolution-room](http://localhost:3000/resolution-room).
2. **Select Active Case:** Choose `CASE-101` from the dropdown.
3. **Inspect BERR Reasoning Matrix:**
   - Review the 4 fact categories: **Agreed Facts**, **Forensically Verified**, **Contested Claims**, and **Objective Uncertainty** (14%).
   - Review recommended remedy: *Partial Refund / Hardware Replacement*.
4. **Post Bilateral Message:**
   - Type a message visible to both parties: *"We acknowledge the variance and can offer a $250 partial refund or replacement drive."*
   - Click **Send**.
5. **Demonstrate Internal Manager Shielding:**
   - Toggle **Internal Private Note (Shielded)**.
   - Type an internal risk note: *"Supplier serial batch shows 3 other mispacked boxes. Recommend immediate settlement."*
   - Notice the note is styled in amber with a lock icon. Explain to the audience that non-manager buyer and merchant clients are strictly shielded from seeing this message.
6. **Trigger 10-Point Financial Safeguards Gate:**
   - Click **Validate Execution Safeguards** in the right column.
   - Observe the pre-flight audit: verifies human sign-off, vault hash, ledger balance, and confirms `PAYPAL_LIVE=FALSE`.
   - The execution gate passes cleanly with zero live fund leakage.

---

### Act 6: India UPI Complaint Intake & Statutory Guidance
1. **Simulate UPI Claim Intake:**
   - Post to `/api/payments/complaints/upi` with `UNAUTHORIZED_TRANSACTION` or `DEBITED_NOT_CREDITED`.
   - Observe the honest status: `CUSTOMER_SUBMITTED`.
   - Review the attached statutory advice: quotes RBI 3-day zero-liability circular and outputs the National Cyber Crime Helpline `1930` and NPCI dispute redressal URL.
