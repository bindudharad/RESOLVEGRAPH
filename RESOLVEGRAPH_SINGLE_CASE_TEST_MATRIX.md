# RESOLVEGRAPH — Complete Single-Case Test & Verification Matrix

**Test Subject ID:** `RG-1465`  
**Database Primary Key:** `cmwdh9tcs01rcm8vj88xkqa6i`  
**Document Reference:** `TEST-MATRIX-RG-1465-VERIFIED`  
**Execution Date:** 2026-11-12  
**Overall E2E Status:** **27/27 PASSED (100%)**  
**Negative Matrix Status:** **6/6 PASSED (100%)**

---

## 1. End-to-End Positive Test Journey (27 Audited Steps)

| Step # | Workspace | Persona & Actor | Action & Payload | Expected Behavior | Actual Behavior | Status | Visual Evidence Link |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :--- |
| **01** | Customer | Alex Morgan (`CONSUMER`) | Navigate to `/sign-in` | Render clean sign-in screen with role cards | Page rendered with Buyer, Merchant, Platform cards | **PASS** | [01_customer_sign_in_page.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/01_customer_sign_in_page.png) |
| **02** | Customer | Alex Morgan (`CONSUMER`) | Authenticate via `/api/auth/demo-login` & navigate to `/overview` | Buyer dashboard loaded with active wizard | Dashboard rendered with complaint intake form | **PASS** | [02_customer_portal_overview.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/02_customer_portal_overview.png) |
| **03** | Customer | Alex Morgan (`CONSUMER`) | Complete Wizard Step 1: Platform: `Amazon`, Order: `OD-AMZ-2026-994411`, Product: `Logitech MX Master 3S`, Amount: `7999`, Date: `2026-11-10` | Form validates purchase information | All Step 1 fields accepted and stored in form state | **PASS** | [03_wizard_step1_order_info.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/03_wizard_step1_order_info.png) |
| **04** | Customer | Alex Morgan (`CONSUMER`) | Wizard Step 2: Select `Damaged product received` & enter issue description | Issue category highlighted, description validated | Category marked active, description recorded | **PASS** | [04_wizard_step2_problem_details.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/04_wizard_step2_problem_details.png) |
| **05** | Customer | Alex Morgan (`CONSUMER`) | Wizard Step 3: Select remedy preference `Replacement` | Remedy card selected with visual indicator | `Replacement` preference highlighted | **PASS** | [05_wizard_step3_remedy_choice.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/05_wizard_step3_remedy_choice.png) |
| **06** | Customer | Alex Morgan (`CONSUMER`) | Wizard Step 4: Upload `tax-invoice-digitalmart.pdf` and `product-damage-mouse.png` | Dropzone slots accept files with size & type check | Both files previewed in respective slots | **PASS** | [06_wizard_step4_evidence_uploaded.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/06_wizard_step4_evidence_uploaded.png) |
| **07** | Customer | Alex Morgan (`CONSUMER`) | Wizard Step 5: Review complaint summary screen | Summarizes order, category, remedy, and attached files | Review screen presents verified data accurately | **PASS** | [07_wizard_step5_review_summary.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/07_wizard_step5_review_summary.png) |
| **08** | Customer | Alex Morgan (`CONSUMER`) | Final submit click & capture generated reference | Atomic DB transaction creates case `RG-1465` | Created `RG-1465` (ID: `cmwdh9tcs01rcm8vj88xkqa6i`) | **PASS** | [08_wizard_step6_submission_success.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/08_wizard_step6_submission_success.png) |
| **09** | Customer | Alex Morgan (`CONSUMER`) | View customer complaint tracker at `/cases/RG-1465` | Displays case dossier, timeline, and evidence | Case rendered with submitted status and 2 files | **PASS** | [09_customer_case_detail_view.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/09_customer_case_detail_view.png) |
| **10** | Platform | Priya Raghavan (`MANAGER`) | Sign in as Platform Investigator & open `/overview` | Operational dispute overview displayed | Platform admin metrics and queues loaded | **PASS** | [10_platform_overview_dashboard.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/10_platform_overview_dashboard.png) |
| **11** | Platform | Priya Raghavan (`MANAGER`) | Navigate to `/cases` roster | Locate `RG-1465` in case list | `RG-1465` listed with Alex Morgan and ₹7,999 | **PASS** | [11_platform_case_roster.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/11_platform_case_roster.png) |
| **12** | Platform | Priya Raghavan (`MANAGER`) | Open case dossier at `/cases/RG-1465` | Investigation workbench loaded with tab controls | Overview tab shows order details and buyer evidence | **PASS** | [12_platform_case_dossier.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/12_platform_case_dossier.png) |
| **13** | Platform | Priya Raghavan (`MANAGER`) | Inspect Seller Outreach tab on `RG-1465` | Directory match connects DigitalMart; issues `SER-2026-1004` | Matched `sel_digitalmart_verified`; request created | **PASS** | [13_platform_seller_outreach_tab.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/13_platform_seller_outreach_tab.png) |
| **14** | Seller | DigitalMart (`MERCHANT`) | Sign in as merchant & open `/seller/requests` | List active evidence requests for `org_digitalmart` | `SER-2026-1004` visible in table for `RG-1465` | **PASS** | [14_seller_requests_roster.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/14_seller_requests_roster.png) |
| **15** | Seller | DigitalMart (`MERCHANT`) | Open request detail at `/seller/requests/cmwdh9tgz01rpm8vjfzk8nc4p` | Displays order information and requested checklist | Request details rendered with damage claim statement | **PASS** | [15_seller_request_detail.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/15_seller_request_detail.png) |
| **16** | Seller | DigitalMart (`MERCHANT`) | Submit response: Stance `AGREE`, replacement SKU, and inspection declaration | Persist `SellerEvidenceResponse` `cmwdhaqhy01ucm8vjcpgco35s` | Stance `AGREE` recorded; 2 files attached | **PASS** | [16_seller_response_submitted.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/16_seller_response_submitted.png) |
| **17** | Seller | DigitalMart (`MERCHANT`) | View response audit history at `/seller/responses` | Historical audit record preserved | Response listed with timestamp and declaration data | **PASS** | [17_seller_responses_history.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/17_seller_responses_history.png) |
| **18** | Platform | Priya Raghavan (`MANAGER`) | Platform Investigator views seller response on `RG-1465` | Outreach tab updates to display verified merchant stance | Merchant agreement and inspection declaration visible | **PASS** | [18_platform_seller_response_retrieved.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/18_platform_seller_response_retrieved.png) |
| **19** | Platform | Priya Raghavan (`MANAGER`) | Inspect BEG Graph at `/cases/RG-1465?tab=evidence_beg` | BEG Graph v2 compiled with bilateral evidence nodes | Graph displays 12 nodes, 15 edges, 0 contradictions | **PASS** | [19_platform_beg_graph.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/19_platform_beg_graph.png) |
| **20** | Platform | Priya Raghavan (`MANAGER`) | Inspect BERR reasoning at `/cases/RG-1465?tab=berr` | Reasoning categorizes agreed findings with 0 conflicts | BERR v2 assessment `cmwdhaqmk01uym8vjr9jj0yzn` verified | **PASS** | [20_platform_berr_assessment.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/20_platform_berr_assessment.png) |
| **21** | Platform | Priya Raghavan (`MANAGER`) | Open Resolution tab & evaluate DigitalMart policy | Evaluates return window, evidence, and remedy eligibility | `REPLACEMENT` evaluated as eligible remedy | **PASS** | [21_platform_policy_evaluation.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/21_platform_policy_evaluation.png) |
| **22** | Platform | Priya Raghavan (`MANAGER`) | Create formal Proposal: `REPLACEMENT` for ₹7,999.00 | Proposal `cmwdhbeak01v7m8vjg2z5qbit` created in DB | Proposal in `PENDING_BUYER` status | **PASS** | [22_platform_proposal_created.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/22_platform_proposal_created.png) |
| **23** | Buyer & Manager | Alex Morgan & Priya Raghavan | Buyer accepts (`ACCEPTED`); Manager approves (`APPROVED`) | Proposal authorized; `ReplacementFulfillment` created | Fulfillment `cmwdhbhvr01vim8vjns23vh0d` initiated | **PASS** | [23_platform_remedy_authorized_and_executing.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/23_platform_remedy_authorized_and_executing.png) |
| **24** | Seller & Carrier | DigitalMart & BlueDart | Confirm stock `LOGI-MXM3S-GRAPHITE` & dispatch unit | Tracking `BD-DM-REP-8829104` attached; status `DISPATCHED` | Unit dispatched with carrier tracking | **PASS** | [24_platform_replacement_dispatched.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/24_platform_replacement_dispatched.png) |
| **25** | Buyer & Platform | Alex Morgan & Priya Raghavan | Confirm physical delivery; finalize case | Fulfillment `COMPLETED`; Case marked `RESOLVED` | Final status `RESOLVED`, remedy `REPLACEMENT` | **PASS** | [25_platform_case_resolved_final.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/25_platform_case_resolved_final.png) |
| **26** | Customer | Alex Morgan (`CONSUMER`) | Verify customer case view at `/cases/RG-1465` | Green `Resolved` badge, completed timeline, tracking | Customer sees resolved status and carrier tracking | **PASS** | [26_final_sync_customer_workspace.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/26_final_sync_customer_workspace.png) |
| **27** | Multi-Workspace | All Actors | Verify persistence after refresh; inspect complete audit ledger | 27 chronological events forming unbroken audit trail | Ledger verified; state 100% consistent across 3 portals | **PASS** | [27_final_sync_customer_persisted.png](file:///c:/Projects/resolvegraph/public/screenshots/e2e-single-case/27_final_sync_customer_persisted.png) |

---

## 2. Controlled Negative & Failure Scenario Matrix (Part 16)

Tested in dedicated isolated test execution without corrupting or modifying primary case `RG-1465`:

| Scenario ID | Name & Description | Tested Component | Expected Behavior | Actual Outcome | Status |
| :-: | :--- | :--- | :--- | :--- | :-: |
| **NEG-01** | **Unauthorized Proposal Approval Block (RBAC)** | `/api/resolution-proposals/[id]/review` | Non-manager (Buyer `usr_alex_buyer`) attempting approval receives HTTP 403 Forbidden | HTTP 403 Forbidden: `"Forbidden: Only Resolution Managers or Admins can review proposals."` | **PASS** |
| **NEG-02** | **Cross-Tenant Evidence Request Isolation** | `/api/seller/requests/[id]` | Merchant from Org A (`TechStore`) attempting to view Org B (`DigitalMart`) request receives HTTP 401/403 | HTTP 401 Unauthorized. Access strictly gated to `org_digitalmart` memberships. | **PASS** |
| **NEG-03** | **Duplicate Proposal Execution Prevention (Idempotency)** | `/api/resolution-proposals/[id]/review` | Attempting to re-execute or modify an already finalized proposal returns HTTP 400 Bad Request | HTTP 400 Bad Request: `"Completed proposal cannot be modified."` Double-fulfillment blocked. | **PASS** |
| **NEG-04** | **Policy Engine Strict Eligibility Gating** | `ResolutionEngine.evaluateCase` | Claims outside return window or exceeding policy ceiling are disqualified from automated remedies | Case evaluated with 3 policy violations; automatically routed to `HUMAN_REVIEW` fallback. | **PASS** |
| **NEG-05** | **Missing Evidence Policy Enforcement** | `ResolutionEngine.evaluateCase` | Claims lacking mandatory invoice or photographic evidence cannot receive automated approval | Automated remedy blocked; system generated `INFORMATION_REQUEST` demanding required evidence. | **PASS** |
| **NEG-06** | **Unregistered Seller Fallback Routing** | `SellerDirectoryService.checkRegistrationStatus` | Querying unverified or unlinked marketplace seller cleanly routes to customer-assisted help flow | Matched to `IDENTIFIED_UNREGISTERED` with null organization; fallback flow triggered without crashing. | **PASS** |

---

## 3. Real-World vs Mock Boundary Specification

| Operational Subsystem | Execution Method in Test | Real-World Behavior | Test / Sandbox Adaptation |
| :--- | :--- | :--- | :--- |
| **Browser User Interface** | Real Headless Chrome (Puppeteer) | Live human browser interaction | Native Chrome execution via Chromium automation |
| **Session Authentication** | Real Better Auth DB Sessions | Secure HTTP-only cookie sessions | Automated demo session generation via `/api/auth/demo-login` |
| **Database Persistence** | Real SQLite via Prisma ORM | Relational ACID database | Real disk-backed SQLite database (`prisma/dev.db`) |
| **Evidence Storage** | Local FS Uploads & SHA-256 | S3/Cloud Storage object vault | Local disk storage with real cryptographic SHA-256 calculation |
| **OCR & Text Extraction** | Deterministic Layout OCR | Cloud Vision / Azure Document AI | Deterministic pattern parser extracting GSTIN & order references |
| **Carrier Fulfillment** | Sandbox Carrier Dispatch API | Live BlueDart API / FedEx Webhook | Sandbox adapter issuing tracking numbers (`BD-DM-REP-8829104`) |
| **Multi-Tenant Authorization** | Strict RBAC Middleware | Enterprise role & tenant gates | Real database query enforcement of `OrganizationMember` records |
