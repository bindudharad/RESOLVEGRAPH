# RESOLVEGRAPH — Comprehensive Manual Testing Guide & Verification Workflows
**Document ID:** RG-TST-2026-V2  
**Target:** QA Engineers, Product Managers, Release Auditors  
**Application URL:** `http://localhost:3000`

---

## 1. Prerequisites & Environment Setup

Before executing manual testing, verify your local environment:

1. **System Health Check:**
   - Execute in terminal:
     ```powershell
     curl -i http://localhost:3000/api/health
     ```
   - Verify HTTP 200 with `status: "healthy"`.
2. **Database Verification:**
   - Verify `dev.db` is loaded:
     ```powershell
     npm run db:drill
     ```
   - Must output `DRILL OUTCOME: RESTORATION_VERIFIED`.
3. **Credentials Reference:**
   - Keep `docs/MANUAL_TEST_CREDENTIALS.md` open for login credentials.

---

## 2. Workflow 1: Cross-Provider Dispute Resolution

**Goal:** Test the 10-Tier Deterministic Matching Engine correlating disparate records between a bank, an intermediary UPI app (PhonePe/GPay), and a merchant settlement ledger.

### Steps:
1. **Sign In:** Navigate to `http://localhost:3000/auth/sign-in` and log in as `disputes@techstore.demo` (`Merchant@TechStore2026!`).
2. **Access Reconciliation Console:** Click **Reconciliation** in the top navigation (`/reconciliation`).
3. **Locate Discrepant Batch:** Locate the batch with Bank Settlement reference `AXIS-SETTLE-20260220`.
4. **Inspect Transaction Match:**
   - Click on transaction `TX-89214-UPI`.
   - Observe the matching hierarchy:
     - Tier 1: Canonical URN / NPCI RRN match (`928172648192`).
     - Tier 4: Exact amount ($₹4,500.00$) and currency (`INR`).
     - Tier 7: Timestamp delta ($+1.8\text{ seconds}$ between remitter debit and merchant terminal query).
5. **Trigger Root-Cause Analysis:**
   - Click **Run Forensic Pipeline**.
   - Observe the 12-stage pipeline executing: Stage 1 (Ingest) -> Stage 4 (Intermediary Switch Timeout) -> Stage 8 (Discrepancy Tagging).
6. **Verification Points:**
   - System categorizes discrepancy as `DEBITED_NOT_CREDITED`.
   - Statutory TAT window displays `T+1 day`.
   - Calculated compensation displays ₹100/day for each day past TAT.

---

## 3. Workflow 2: Dual-Sight Unboxing Evidence Submission

**Goal:** Verify CameraX dual-camera / sequential fallback recording, Package Passport verification, and perceptual image hashing.

### Steps:
1. **Sign In as Buyer:** Log out and sign in as `alex.morgan@consumer.demo` (`Buyer@ResolveGraph2026!`).
2. **Access Universal Intake:** Click **Intake** in the navigation (`/intake`).
3. **Input Package Passport:** Enter Passport Token `PKG-PASSPORT-2026-9921` (or scan package QR).
4. **Verify Passport Verification:**
   - The screen renders the verified purchase metadata: MacBook Pro M3, Serial `C02G8921MD6R`, Sealed at `TechStore Warehouse #4`.
5. **Start Dual-Sight Capture:**
   - Click **Launch Dual-Sight Unboxing**.
   - If testing on Desktop/Browser: The UI renders the web dual-stream emulator (Customer Facing Camera + Package Facing Camera).
   - If testing on Android Device: Open `ResolveGraph Capture` mobile app; points to `http://<your-lan-ip>:3000`.
6. **Upload & Digest:**
   - Submit the recorded unboxing video snippet.
7. **Verification Points:**
   - File is processed by `src/lib/storage/evidence-vault.ts`.
   - SHA-256 hash is computed and recorded in `Evidence` table.
   - EXIF metadata and perceptual dHash are evaluated against warehouse dispatch reference.
   - Evidence preview appears in the Case Dossier under `/cases/CASE-2026-MACBOOK-SEAL`.

---

## 4. Workflow 3: AI Forensic Root-Cause Pipeline & BERR v2

**Goal:** Inspect the Bilateral Evidence Graph (BEG), four-quadrant fact classification, and adversarial quality review gating.

### Steps:
1. **Sign In as Investigator:** Sign in as `investigator@resolvegraph.demo` (`Investigator@RG2026!`).
2. **Navigate to Incident Cases:** Open `/incidents` and select `CASE-2026-CROSS-PHONEPE-AXIS`.
3. **Inspect Bilateral Evidence Graph (BEG):**
   - Click the **Evidence Graph** tab.
   - Observe graph nodes:
     - Blue nodes: Buyer claims and bank statement PDF.
     - Amber nodes: Merchant ERP order and carrier dispatch slip.
     - Purple/Green edges: Corroboration and contradiction relationships.
4. **Inspect BERR v2 Reasoning Engine:**
   - Click the **BERR v2** tab.
   - Review the four quadrants:
     - **Agreed Facts:** Both parties agree on payment timestamp and ordered item.
     - **Verified Facts:** Axis Bank debit confirmed via RRN.
     - **Contested Facts:** Merchant POS ledger claims transaction expired before credit confirmation.
     - **Missing Evidence:** Merchant bank gateway settlement webhook log.
5. **Inspect Adversarial Review Gate:**
   - Verify `hallucination_score == 0.0`.
   - Verify every cited claim links to an active evidence preview button.

---

## 5. Workflow 4: Financial Safeguards & Dual-Key Sign-Off

**Goal:** Test the 10-point financial safeguard gate, escrow balance verification, and dual-key manager authorization for monetary remedies.

### Steps:
1. **Access Shared Resolution Room:** Navigate to `/resolution-room` for case `CASE-2026-MACBOOK-SEAL`.
2. **Propose Financial Remedy:**
   - As Merchant (`disputes@techstore.demo`), propose a partial refund of $₹15,000$ for packaging cosmetic damage while retaining original hardware.
3. **Buyer Acceptance:**
   - In a secondary browser or incognito window, open `/resolution-room` as Buyer (`alex.morgan@consumer.demo`).
   - Click **Accept Remedy Proposal**.
4. **Trigger Financial Execution:**
   - Switch back to Merchant view. The system marks proposal status as `ACCEPTED`.
   - Click **Execute Resolution Payout**.
5. **Verify Financial Safeguard Gate:**
   - The modal triggers the **Dual-Key Sign-Off** prompt because the amount exceeds the $₹10,000$ risk threshold.
   - Enter Manager Approval Key: `MGR-AUTH-TECHSTORE-SECURE`.
   - Click **Authorize and Sign**.
6. **Verification Points:**
   - Financial Safeguards Service verifies:
     - Check 1: Mutually agreed proposal (`PASS`).
     - Check 2: Refund $\le$ captured amount (`PASS`).
     - Check 3: Dual-key signature valid (`PASS`).
     - Check 4: Idempotency token generated (`PASS`).
     - Check 5: `PAYPAL_LIVE_ENABLED=false` enforced (dispatches to sandbox / internal ledger).
   - Proposal status updates to `EXECUTED`.

---

## 6. Workflow 5: Administrative Security & Kill-Switch

**Goal:** Test global and per-provider circuit breakers, HMAC-authenticated administrative controls, and the hash-chained audit ledger.

### Steps:
1. **Sign In as Administrator:** Sign in as `admin@resolvegraph.demo` (`Admin@ResolveGraph2026!`).
2. **Access Admin Security Console:** Navigate to `/admin/security`.
3. **Inspect Hash-Chained Audit Ledger:**
   - Scroll to the **Chained Audit Ledger** table.
   - Click **Verify Cryptographic Chain**.
   - Observe block-by-block SHA-256 verification ($B_0 \rightarrow B_1 \rightarrow \dots \rightarrow B_N$).
   - Chain status must report: `CHAIN_VALID (0 Tampered Blocks)`.
4. **Test Administrative Kill Switch:**
   - Locate the **Global System Kill Switch** toggle.
   - Toggle to **ACTIVE (HALT ALL OPERATIONS)**.
   - The UI requests Master Admin Secret. Enter: `Admin@ResolveGraph2026!`.
   - Confirm activation.
5. **Verify Defensive Lockdown:**
   - Open a new tab and attempt any financial operation or API call:
     ```powershell
     curl -X POST http://localhost:3000/api/payments/pay_test_01/refund
     ```
   - Response must be: HTTP 503 Service Unavailable `{"error": "ADMINISTRATIVE_KILL_SWITCH_ACTIVE"}`.
6. **Deactivate Kill Switch:**
   - In `/admin/security`, toggle the switch back to **INACTIVE (NORMAL OPERATIONS)**.
   - Re-verify normal operations resume.
