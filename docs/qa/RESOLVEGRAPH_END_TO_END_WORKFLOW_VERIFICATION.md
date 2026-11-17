# RESOLVEGRAPH END-TO-END WORKFLOW VERIFICATION
## Extreme Human-Level Manual Browser QA Audit — Workflows A Through G

**Audit Date:** 2026-11-17  
**Auditor Persona:** Senior Manual QA Engineer (TeamNexa)  
**Environment:** Next.js 16.4.6 (Turbopack), Local SQLite (`dev.db`), Google Chrome Headless/Interactive  
**Target URL:** `http://localhost:3000`  

---

### WORKFLOW SUMMARY MATRIX

| Workflow ID | Workflow Name | Workspace | Primary Actors | Tested Status | Verdict | Evidence References |
|---|---|---|---|---|---|---|
| **WFL-A** | Buyer Complaint Filing & Baseline Ingestion | Buyer | Consumer (Alex Morgan) | PASS | Functional with minor overflow | `BUY-003-purchases-modal-opened.png`, `BUY-004-intake-step1.png`, `BUY-011-divergence-check-result.png` |
| **WFL-B** | 4-Step Seller Response Wizard | Seller / Merchant | Merchant (TechStore Global) | PASS | Fully verified across all 4 steps | `SEL-008-wizard-step1-agree.png` to `SEL-008-wizard-step4-review.png` |
| **WFL-C** | Investigator Case Dossier & BEG/BERR Review | Investigator | Platform Investigator (Priya Raghavan) | PASS | All 6 dossier tabs rendered | `INV-1001-tab1-overview.png` to `INV-1001-tab6-activity-audit.png` |
| **WFL-D** | AI Investigation & Specialist Agents Execution | Investigator / AI | Platform Admin + Gemini Canary / Test Mock | PASS | 8 agents reviewed, deterministic safe mode verified | `AI-001-copilot-initial.png`, `AI-002-copilot-action-result.png` |
| **WFL-E** | Resolution Engine & Dual-Key Safeguards | Investigator | Platform Investigator | PASS (PROTECTED) | UI controls verified, real money prevented | `INV-1001-tab-resolution.png`, `INV-001-overview-desktop.png` |
| **WFL-F** | Forensic Investigation Report Export | Investigator | Platform Investigator | PASS | Markdown dossier generated (11.2 KB) | `REP-001-export-dossier-modal.png`, `RG-1001-investigation-report.md` |
| **WFL-G** | Case Integrity & Cross-Case Separation | Investigator | System Forensic Auditor | PASS | RG-1001 vs RG-1493 complete data isolation verified | `INV-1001-tab1-overview.png`, `INV-1493-dossier-overview.png` |

---

### DETAILED WORKFLOW VERIFICATION TRACES

#### Workflow A — Buyer Complaint Filing, Purchase Memory & Baseline Ingestion
1. **User Authentication:** Logged in as Buyer (`Alex Morgan`, `usr_alex_buyer`) via one-click demo card on `/sign-in`. Verified session token and redirection to `/overview`.
2. **Purchase Memory Inspection:** Navigated to `/purchases`. Examined 5-stage purchase memory rail ("Cryptographically Anchored: Advertised -> Confirmed -> Pre-Dispatch Warehouse -> Sealed Transit -> Dual-Sight Received").
3. **Baseline Ingestion Modal:** Clicked "Ingest Baseline". The modal opened smoothly, displaying order ID, SKU, specifications, and baseline hashing parameters. Tested "Cancel" button, which cleanly dismissed the modal without state leakage (`BUY-003-purchases-modal-opened.png`).
4. **Divergence Comparison:** Clicked "Compare Divergence" on an active purchase memory item. Verified that the divergence detector compared the immutable order baseline against the incoming claim, displaying variance dimensions and the snapshot hash (`BUY-013-compare-divergence-opened.png`).
5. **Universal Intake:** Navigated to `/intake`. Switched between "DOCUMENT" mode (UPI/Invoice receipt extraction) and "UNBOXING" mode (Dual-Sight video unboxing with challenge code display). Submitted empty fields to verify client validation banners.
6. **Persistence & Integrity:** Verified that existing baseline snapshots remain immutable and are not overwritten by incoming dispute claims.

#### Workflow B — 4-Step Seller Response Wizard
1. **User Authentication:** Logged in as Merchant (`TechStore Global`, `usr_techstore_merchant`) via `/sign-in`. Verified redirection to `/seller`.
2. **Request Selection:** Navigated to `/seller/requests`. Selected pending request `cmwdsunv300cr14vjkpa9kdbg` linked to dispute case `RG-1001`.
3. **Step 1 — Agree / Disagree / Clarify:** Examined counter-party claims and claim type. Selected position (`CONTEST`). Verified that instructions and form context updated dynamically (`SEL-008-wizard-step1-agree.png`). Clicked "Next".
4. **Step 2 — Product & Packing:** Rendered packing verification section, SKU verification input, warehouse CCTV timestamp, and packing inspector identity (`SEL-008-wizard-step2-packing.png`). Clicked "Next".
5. **Step 3 — Dispatch Details:** Rendered carrier dropdown (BlueDart, Delhivery, FedEx, UPS), dispatch tracking number input, dispatch weight, and manifest proof attachment (`SEL-008-wizard-step3-dispatch.png`). Clicked "Next".
6. **Step 4 — Review & Declaration:** Rendered consolidated counter-evidence brief, statutory seller declaration checkbox, and confirmation controls (`SEL-008-wizard-step4-review.png`).
7. **Safe Boundary:** Verified form controls without submitting irreversible changes to production database records.

#### Workflow C — Investigator Case Dossier & BEG/BERR Review
1. **User Authentication:** Logged in as Platform Investigator (`Priya Raghavan`, `usr_priya_admin`) via `/sign-in`.
2. **Cases Roster:** Navigated to `/cases`. Verified case filters ("All", "In Review", "Evidence Required", "Escalated", "Resolved"), search bar, and priority badges.
3. **Dossier RG-1001 Navigation:** Opened canonical case `/cases/RG-1001`.
4. **Tab 1 — Overview & Case Dossier:** Inspected high-level dispute metadata: Amazon India Order `ORD-20261103-8821`, Amount `₹6,499`, Buyer `Alex Morgan`, Merchant `TechStore Global`, Status `Open`, Priority `HIGH`.
5. **Tab 2 — Evidence & BEG:** Clicked "Evidence & BEG". Interactive bilateral evidence graph rendered nodes (Buyer Claim, Seller Packing Manifest, Delivery Log, Carrier Proof). Inspected visual node relationships and provenance SHA-256 links.
6. **Tab 3 — BERR Analysis:** Clicked "BERR Analysis". Displayed the multimodal discrepancy reasoning engine:
   - Total Discrepancy (D): `0.00`
   - Exact Discrepancy ($\alpha=0.4$): Direct spec mismatch
   - Semantic Discrepancy ($\beta=0.4$): Contradictory condition claims
   - Temporal Discrepancy ($\gamma=0.2$): Delivery and unboxing timing
   - Subtabs: Bilateral Matrix, Extracted Facts, Findings & Human Review.
7. **Tab 4 — Seller Outreach:** Clicked "Seller Outreach". Displayed registered seller matching, SLA timer, follow-up timeline, and counter-evidence intake status.
8. **Tab 5 — Resolution:** Clicked "Resolution". Rendered permitted remedy proposals: Full Refund, Partial Refund, Replacement, Store Credit, and Reject Claim.
9. **Tab 6 — Activity & Audit:** Clicked "Activity & Audit". Displayed chronological tamper-evident ledger with cryptographic event hashes and user attribution.

#### Workflow D — AI Investigation & Specialist Agents
1. **AI Copilot Navigation:** Navigated to `/copilot`.
2. **Specialist Agents Inventory:** Inspected the eight visible AI specialist agents:
   - Discrepancy Investigator (Forensic)
   - Policy & Settlement Evaluator (Policy)
   - Bilateral Communicator (Communication)
   - PayPal Fintech Dossier Specialist (Fintech)
   - OCR & Multimodal Fact Extractor
   - Package Passport Seal Verifier
   - Temporal Replay Reconciler
   - Consensus Arbitration Engine
3. **Execution Review:** Inspected execution history for historical completed runs (`Scenario C Refund Proposal Run`, `PayPal Refund Investigation Run`). Tested preset execution in safe test mode.
4. **Provider Mode Honesty:** Verified that environment configuration (`AI_PROVIDER="test"`, `AI_PROCESSING_ENABLED="false"`) prevents unexpected live API token consumption while rendering deterministic test results accurately.

#### Workflow E — Resolution Proposal & Dual-Key Safeguards
1. **Remedy Comparison:** In case dossier `/cases/RG-1001`, selected "Resolution" tab.
2. **Remedy Calculations:** Reviewed proposed remedies:
   - Full Refund: ₹6,499.00
   - Partial Refund: Custom percentage calculation
   - Replacement: Hardware replacement SKU dispatch
   - Claim Rejection: Formal grounds under merchant terms
3. **Approval Flow & Financial Safety:** Inspected "Take Action" confirmation dialog. Verified dual-key authorization requirements. Canceled dialog safely before financial execution. Verified zero funds moved in test/sandbox accounts.

#### Workflow F — Forensic Report Generation & Export
1. **Dossier Action:** On `/cases/RG-1001`, clicked "Export Dossier".
2. **API Endpoint Verification:** Initiated export via `/api/investigations/RG-1001/report?format=markdown`.
3. **Output Inspection:** Received HTTP 200 with `text/markdown; charset=utf-8`. Successfully exported full 11.2 KB markdown dossier containing:
   - Case Number: RG-1001
   - Dispute Amount: INR 6,499.00
   - Incident Category: DEBITED_NOT_CREDITED
   - Multi-dimensional evidence ledger and hash verification
   - Discrepancy scoring and proposed resolution terms
4. **Storage:** Saved copy to `docs/qa/evidence/09-reports/RG-1001-investigation-report.md`.

#### Workflow G — Case Integrity & Cross-Case Separation
1. **Canonical Case Check:** Examined case `RG-1001` in the database and browser.
2. **Comparison Case Check:** Navigated to `http://localhost:3000/cases/RG-1493`.
3. **Separation Verification:**
   - Case ID on page rendered explicitly as `RG-1493`.
   - Buyer details, order numbers, and timeline events for `RG-1493` did not leak into or merge with `RG-1001`.
   - Evidence records attached to `RG-1493` remain partitioned in their respective case scope.
   - Zero accidental case merging observed.
