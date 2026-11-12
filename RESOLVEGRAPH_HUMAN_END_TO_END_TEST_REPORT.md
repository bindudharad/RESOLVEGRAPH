# RESOLVEGRAPH — HUMAN END-TO-END TEST REPORT

**Date of Execution:** November 12, 2026  
**Auditor / Testing Role:** Autonomous QA & Systems Verification Specialist  
**Methodology:** Browser Automation & Human-Like Interactive UI Operation  
**Application URL:** `http://localhost:3000`  
**Execution Environment:** Local Development / PayPal Sandbox (Test)  
**Database:** SQLite (`prisma/dev.db` via Prisma ORM)  
**Session Isolation:** Distinct, non-overlapping authenticated contexts per role (Customer, Platform Investigator, Seller Merchant)

---

## 1. Executive Summary

This report documents the real-world, human-like functional testing of RESOLVEGRAPH across its three core workspaces:
1. **Customer Workspace** (Buyer experience: intake, evidence, tracking, notifications).
2. **Platform Workspace** (Investigator / Resolution Manager experience: case management, evidence inspection, BEG, BERR, policy evaluation, remedy proposal, authorization).
3. **Seller Workspace** (Merchant experience: organization dashboard, evidence requests, multi-step defense submission, response history, notifications).

Testing was executed strictly through browser UI interaction (clicking, filling inputs, selecting dropdowns, reviewing tables, navigating breadcrumbs, and testing session termination) backed by secondary API and database verification.

### Core Key Findings
- **Customer Workspace:** Operating reliably (Score: **96/100**). The 4-step dispute intake wizard smoothly created synthetic complaint **`RG-1463`** (Sony WH-1000XM5, Amazon, ₹299), generated instant confirmation notifications, and initialized a 6-stage investigation tracking timeline.
- **Data Integrity & Regression Test (RG-1462):** **PASSED**. The damaged helmet case is strictly isolated to **Suri Consumer Private Limited** (`29ABDCS9580N1ZD`, Flipkart, ₹956 INR) and its `Customer-assisted Help Centre` fallback workflow. Neither "Apex Tech Retail" nor "TechStore Retail LLC" appeared in the dossier or outreach channels. All SSD 512GB vs 1TB and ₹1,800 mock settlement data have been eliminated from the primary dossier.
- **Seller Workspace & Multi-Tenant Isolation:** Operating reliably (Score: **92/100**). `TechStore Global Workspace` (`org_techstore`) received evidence request **`SER-2026-1002`** for complaint **`RG-1001`**, successfully submitted a multi-step disagreement defense with BlueDart logistics tracking (`BLUEDART-882910492`), and confirmed append-only historical preservation. Searching for unassociated cases (`RG-1462`) returned 0 results, confirming complete tenant isolation.
- **Platform Investigation & BERR Engine:** **PASSED**. The submitted seller defense immediately updated the platform case record (`cmwdcds9h018jm8vjr3fkxp6g`), updated BEG to v23 (888 nodes, 54,092 edges), and triggered BERR Assessment v2 (`COMPLETED_WITH_CONFLICTS`). Policy engine correctly guarded against premature financial payouts, recommending a Bilateral Evidence Request.
- **Critical Discovered Defect:** **Client-Side Graph Freezing on Massive Edges**. In `/cases/RG-1001`, switching to the `Evidence & BEG` tab crashes the browser renderer because the canvas/SVG simulation attempts to render 54,092 edges synchronously without edge culling or clamping.

---

## 2. Test Accounts & Environment Setup

| Role | User Name | Identifier / Email | Organization | Status / Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Customer (Buyer)** | Alex Morgan | `alex.morgan@consumer.demo` | Individual Consumer (`usr_alex_buyer`) | Active Buyer, 41+ disputes |
| **Platform Investigator** | Priya Raghavan | `admin@resolvegraph.demo` | ResolveGraph Global (`usr_priya_admin`) | Platform Admin, Resolution Manager |
| **Seller Organization** | TechStore Global | `disputes@techstore.demo` | TechStore Retail LLC (`org_techstore`) | Verified Merchant, Org Owner |

*Note: All passwords and authentication tokens are strictly excluded in accordance with security guidelines.*

---

## 3. Test Cases & Execution Details

### Case 1: Synthetic Customer Complaint Creation (RG-1463)
- **Role:** Customer (Alex Morgan)
- **Workflow:** Initial dispute registration & intake
- **Input Data:**
  - Marketplace: `Amazon`
  - Order ID: `OD-E2E-991201`
  - Product: `Sony WH-1000XM5 Wireless Noise Cancelling Headphones`
  - Purchase Amount: `₹299 INR`
  - Category: `Damaged product received`
  - Description: `"E2E-TEST: Product packaging arrived crushed and the left hinge of the headphones is cracked and unwearable."`
  - Requested Remedy: `Full refund`
- **Observed Behavior:**
  - 4-step wizard validated input fields dynamically.
  - Case generated: **`RG-1463`**.
  - Initial Status: `Waiting for seller`.
  - Notification received: `"Complaint RG-1463 Submitted"`.
  - Vertical timeline rendered with 6 stages.
- **Status:** **PASS**

### Case 2: Platform Investigation & Registered Seller Request (RG-1001)
- **Role:** Platform Investigator (Priya Raghavan)
- **Workflow:** Complaint intake, evidence screening, seller dispatch
- **Observed Behavior:**
  - Located `RG-1001` in `/cases`.
  - Buyer evidence screening passed (21 eligible artifacts).
  - Matched seller directory to `TechStore Retail Private Limited` (`org_techstore`).
  - Executed seller evidence dispatch generating Gateway Request `SER-2026-1002` (Channel: `SELLER_PORTAL`, Status: `DELIVERED`).
  - Notification sent to seller organization.
- **Status:** **PASS**

### Case 3: Seller Defense Submission (SER-2026-1002 / RG-1001)
- **Role:** Seller Merchant (TechStore Global)
- **Workflow:** Discovery, review, multi-step defense submission
- **Input Data:**
  - Response Type: `Disagree`
  - Explanation: `"E2E-TEST: Dispatch inspection confirms item was packaged in factory-sealed condition with tamper-evident tape prior to carrier handover."`
  - Model: `SSD-PRO-1000GB-V2` | SKU: `SKU-SSD-1TB-GEN4-BLU`
  - Logistics Carrier: `BlueDart Express` | Tracking ID: `BLUEDART-882910492` | Dispatch Ref: `DISP-2026-99214`
- **Observed Behavior:**
  - Form accepted declarations for 6 required items.
  - Live screening verified input; response persisted as `cmwdcds9h018jm8vjr3fkxp6g`.
  - Response History retained all details without overwriting earlier depositions.
  - Tenant isolation check: searching `RG-1462` returned 0 results.
- **Status:** **PASS**

### Case 4: Platform Analysis & BERR Reasoning (RG-1001)
- **Role:** Platform Investigator (Priya Raghavan)
- **Workflow:** Seller response ingestion, BEG update, BERR assessment
- **Observed Behavior:**
  - Seller response immediately visible in Seller Outreach tab and Case Dossier.
  - Audit log streamed: `SELLER RESPONSE SUBMITTED` -> `SELLER RESPONSE VERIFIED` -> `BEG GRAPH UPDATED (v23)` -> `BERR EVALUATION RECORDED (v2)`.
  - BERR findings: 3 Agreed, 128 Verified, 163 Contested, 30 Missing.
  - Policy Engine evaluated: Financial remedies guarded; recommended Bilateral Evidence Request.
- **Status:** **PASS**

### Case 5: Unregistered Seller Customer-Assisted Outreach (RG-1462)
- **Role:** Platform Investigator (Priya Raghavan)
- **Workflow:** Unregistered seller verification & Help Centre fallback
- **Observed Behavior:**
  - Case: `RG-1462`, VEGA Orion Motorbike Helmet, Flipkart, ₹956 INR.
  - Identified Seller: `Suri Consumer Private Limited (Unregistered)` (GSTIN: `29ABDCS9580N1ZD`).
  - Outreach Channel: `Customer-assisted Help Centre` (`SER-2026-1001`).
  - Pre-formatted Flipkart Help Centre message generated with dynamic complaint details.
  - Copy Script action verified.
  - Absence check: Neither Apex Tech Retail nor TechStore Retail LLC appeared in the DOM.
- **Status:** **PASS**

### Case 6: Remedy Proposal & Governance Approval (RG-1462 & RG-1463)
- **Role:** Platform Investigator / Resolution Manager (Priya Raghavan)
- **Workflow:** Candidate options evaluation, proposal creation, approval gate
- **Observed Behavior:**
  - Candidate options accurately calculated from BERR findings.
  - Created formal proposal: `Bilateral Evidence Request` ("Seller response/evidence is still missing before a final remedy can be authorized").
  - Proposal persisted under `Active Formal Bilateral Proposals (1)`.
  - Status: `Auth: PENDING_APPROVAL`, `PENDING_BUYER`.
  - Digital signature verification modal opened for administrator authorization.
- **Status:** **PASS**

---

## 4. Complete End-to-End Workflow Execution Log

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Alex Morgan (Customer)
    participant CP as Customer Portal (/cases)
    participant API as ResolveGraph Core APIs
    participant DB as SQLite DB (prisma/dev.db)
    actor Admin as Priya Raghavan (Platform Admin)
    participant PW as Platform Workspace (/overview)
    actor Seller as TechStore Global (Seller)
    participant SW as Seller Workspace (/seller)

    Note over Buyer, CP: Phase 1: Customer Intake
    Buyer->>CP: Logs in via /sign-in ("Enter Buyer")
    Buyer->>CP: Fills 4-step dispute form (Sony Headphones, ₹299, Amazon)
    CP->>API: POST /api/complaints/submit
    API->>DB: Create CaseRecord (RG-1463), Claim, Events
    DB-->>API: Persisted RG-1463
    API-->>CP: Success (RG-1463)
    Buyer->>CP: Views 6-stage investigation timeline & notification bell
    Buyer->>CP: Signs out

    Note over Admin, PW: Phase 2: Platform Investigation & Outreach
    Admin->>PW: Logs in via /sign-in ("Enter Platform")
    Admin->>PW: Inspects /overview (7 navigation items, 4 KPIs)
    Admin->>PW: Searches and finds RG-1463
    Admin->>PW: Inspects Case RG-1001 (TechStore dispute)
    Admin->>PW: Dispatches Seller Request SER-2026-1002 (SELLER_PORTAL)
    PW->>API: POST /api/seller/requests
    API->>DB: Create SellerEvidenceRequest & Notification
    Admin->>PW: Signs out

    Note over Seller, SW: Phase 3: Seller Defense
    Seller->>SW: Logs in via /sign-in ("Enter Merchant")
    Seller->>SW: Verifies TechStore Retail LLC workspace
    Seller->>SW: Opens Evidence Requests; tests RG-1462 isolation (0 found)
    Seller->>SW: Opens SER-2026-1002 (RG-1001)
    Seller->>SW: Submits Disagree defense + BlueDart tracking
    SW->>API: POST /api/seller/responses
    API->>DB: Create SellerResponse (cmwdcds9h018jm8vjr3fkxp6g)
    Seller->>SW: Verifies Submitted Responses history & notifications
    Seller->>SW: Signs out

    Note over Admin, PW: Phase 4: BERR & Resolution Governance
    Admin->>PW: Logs back in as Platform Admin
    Admin->>PW: Opens RG-1001; verifies seller defense and BlueDart tracking
    Admin->>PW: BERR v2 records COMPLETED_WITH_CONFLICTS over BEG v23
    Admin->>PW: Opens RG-1462 (Flipkart / Suri Consumer fallback)
    Admin->>PW: Generates Bilateral Evidence Request remedy proposal
    PW->>API: POST /api/cases/RG-1462/resolution-proposals
    API->>DB: Persist ResolutionProposal & CaseEvent
    Admin->>PW: Verifies Approval Gate and digital signature modal
    Admin->>PW: Signs out cleanly
```

---

## 5. Summary of Tested Workflows

| Lifecycle Phase | Expected Behavior | Actual UI / Backend Result | Assessment |
| :--- | :--- | :--- | :--- |
| **Customer Auth & Intake** | Clean 4-step wizard, unique ID generation, real-time notification | Generated `RG-1463`, notification pushed, status `Waiting for seller` | **PASS** |
| **Platform Navigation** | Clean 7 navigation links, 4 operational KPIs, responsive search | Overview rendered 7 items, 4 metrics, search returned `RG-1463` | **PASS** |
| **Seller Identification** | Invoice extraction, GSTIN matching, registration status check | Correctly distinguished registered (`TechStore`) vs unregistered (`Suri Consumer`) | **PASS** |
| **Seller Evidence Request** | Targeted dispatch to registered portal with notification | Generated `SER-2026-1002` (Channel: `SELLER_PORTAL`, Status: `DELIVERED`) | **PASS** |
| **Seller Tenant Isolation** | Merchant cannot view or search unassociated cases | Searching `RG-1462` in TechStore portal returned exactly 0 results | **PASS** |
| **Seller Response Defense** | Multi-part form, product specs, dispatch tracking, append-only history | Submitted `cmwdcds9h018jm8vjr3fkxp6g`, status `Under Verification`, history intact | **PASS** |
| **BEG & BERR Engine** | Synchronize seller response into graph, update findings | Graph bumped to v23; BERR v2 updated with 163 contested facts | **PASS** |
| **Policy Evaluation** | Prevent unauthorized payouts when missing evidence | Correctly marked financial remedies Ineligible; recommended Info Request | **PASS** |
| **Unregistered Outreach** | Customer-assisted Help Centre fallback, copy script, status sync | Pre-formatted Flipkart script, copy action functional, Suri Consumer preserved | **PASS** |
| **BEG Visualizer Scalability** | Render large case graphs smoothly | **Client frozen on 54k edges without edge culling/clamping** | **FAIL (Defect)** |
