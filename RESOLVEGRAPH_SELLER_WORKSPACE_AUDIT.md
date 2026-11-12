# RESOLVEGRAPH — SELLER WORKSPACE AUDIT REPORT

**Audit Date:** November 12, 2026  
**Auditor:** QA & Merchant Experience Specialist  
**Scope:** Functional, structural, security, multi-tenant isolation, and usability audit of the RESOLVEGRAPH Seller / Merchant Workspace (`http://localhost:3000/seller`)

---

## 1. Authentication & Organization Identity

| Verification Check | Target Expectation | Actual System Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| **Workspace Entry** | One-click entry or credential login | `Enter Merchant` card or `disputes@techstore.demo` | **PASS** |
| **Logged-in Organization** | Shows legal organization name | `TechStore Retail LLC` (`org_techstore`) | **PASS** |
| **Member Role** | Authenticated member role verified | `TechStore Global` (`Role: OWNER`) | **PASS** |
| **Approval / Verification** | Merchant onboarding state confirmed | `Verified status` (GSTIN `29ABCDE1234F1Z5`) | **PASS** |
| **Session Boundary** | Does not inherit platform or buyer state | Clean isolated session; no platform tools visible | **PASS** |

---

## 2. Page & Navigation Inventory

The Seller Workspace provides 5 focused routes:

| Route | View Name | Purpose | Observed State |
| :--- | :--- | :--- | :--- |
| `/seller` or `/dashboard` | Seller Dashboard | Real-time dispute operational metrics, quick actions, active requests queue | **Healthy (HTTP 200)** |
| `/seller/requests` | Evidence Requests | Bilateral requests received from platform investigators requiring merchant defense | **Healthy (HTTP 200)** |
| `/seller/requests/[id]` | Request Details & Response Form | 4-step multi-part response defense, packing declarations, logistics tracking | **Healthy (HTTP 200)** |
| `/seller/responses` | Submitted Responses | Immutable submission history, verification status, supplemental clarification | **Healthy (HTTP 200)** |
| `/seller/guidelines` | Seller Guidelines | Statutory evidentiary standards, acceptable file formats, SLA timetables | **Healthy (HTTP 200)** |
| `/seller/profile` | Business Profile | Registered GSTIN, warehouse addresses, support contacts, organization settings | **Healthy (HTTP 200)** |

---

## 3. Seller Usability & Visual Evaluation (1 to 5 Scale)

| Usability Dimension | Score (1-5) | Detailed Justification & Evidence |
| :--- | :---: | :--- |
| **Login & Identity Clarity** | **4.9 / 5.0** | Organization name (`TechStore Retail LLC`) and merchant badge are prominently anchored in the header. Switching workspaces leaves zero session residue. |
| **Dashboard Layout** | **4.6 / 5.0** | Clean, uncluttered operational cards: Total Requests (1), Pending Action (1), Under Verification (0), Avg Response Time (4.2h). Clear callouts for pending SLA deadlines. |
| **Evidence Request Visibility** | **4.8 / 5.0** | Requests are displayed in a clean card list with Complaint ID, Order ID, Product, Disputed Amount, SLA badge, and prominent "Review & Respond" actions. |
| **Complaint Details & Privacy** | **4.7 / 5.0** | Customer claims are clearly presented while sensitive personal buyer contact details are automatically masked. Pre-permitted evidence artifacts (invoices, photos) are viewable. |
| **Response Form Workflow** | **4.8 / 5.0** | The 4-step guided wizard (*Response Type -> Product & Packing -> Dispatch Details -> Review & Submit*) prevents missing required fields and provides contextual examples. |
| **Document Upload & Notes** | **4.5 / 5.0** | Flexible submission model: sellers can attach files or submit verified written declarations when specific physical photos are unavailable. |
| **Submitted Response History** | **4.8 / 5.0** | Responses are preserved in an append-only thread. Clicking into `cmwdcds9h018jm8vjr3fkxp6g` displays all submitted declarations, BlueDart tracking, and SKU details without data loss. |
| **Notification Integration** | **4.7 / 5.0** | Instant event dispatching. Notifications pushed when requests arrive, when additional info is sought, and immediately upon submission confirmation. |
| **Supplemental Clarification** | **4.6 / 5.0** | "Add Supplemental Clarification" action allows merchants to respond to investigator inquiries without overwriting earlier depositions. |
| **Overall Ease of Use** | **4.7 / 5.0** | Highly professional, purpose-built merchant portal. Significantly less complex than the platform admin console, making it accessible to warehouse and fulfillment staff. |

---

## 4. Multi-Tenant Isolation & Security Audit

### Security Test: Cross-Merchant Information Leakage
- **Objective:** Verify that a logged-in seller organization cannot access or discover complaints belonging to other merchants.
- **Test Action:** While authenticated as `TechStore Global` (`org_techstore`), searched for complaint `RG-1462` (Flipkart / Suri Consumer Private Limited) and `RG-1463` (Amazon Unregistered Seller).
- **Result:** **0 results returned**. Direct navigation returned an access-denied / not-found response.
- **Conclusion:** **PASS**. Backend DAL queries strictly enforce `where: { organizationId: user.organizationId }`, ensuring complete tenant isolation.

---

## 5. End-to-End Seller Response Verification (SER-2026-1002)

| Step | Action Taken | UI / Backend Result | Status |
| :--- | :--- | :--- | :--- |
| **1. Request Discovery** | Opened `/seller/requests` | Found `SER-2026-1002` for Case `RG-1001` (Amount: `₹6,499.00`) | **PASS** |
| **2. Request Examination** | Opened `/seller/requests/cmwdc7dqt017cm8vjz7qjybi5` | Inspected 6 requested evidence items; masked customer evidence loaded | **PASS** |
| **3. Defense Submission** | Filled 4-step response wizard | Disagree response, SKU `SKU-SSD-1TB-GEN4-BLU`, BlueDart tracking `BLUEDART-882910492` | **PASS** |
| **4. Live Screening** | Submitted response | Screening progress completed (55% -> 100%), status switched to `Submitted` | **PASS** |
| **5. Response Persistence** | Checked `/seller/responses` | Record `cmwdcds9h018jm8vjr3fkxp6g` listed as `Under Verification` | **PASS** |
| **6. Preservation Check** | Opened `/seller/responses/cmwdcds9h018jm8vjr3fkxp6g` | All text, SKU, logistics tracking, and declaration notes 100% intact | **PASS** |
| **7. Real-Time Alert** | Checked notification bell | Notification `"Seller Response Submitted — RG-1001"` pushed at 2:55 PM | **PASS** |

---

## 6. Functional Defects & Usability Observations

### Defect SEL-001: File Count Indicator on Declaration-Only Submissions (Minor Usability)
- **Observed Behavior:** On `/seller/responses`, the response summary card displays `"0 files attached"` in a neutral tone when a response is submitted with verified declarations and tracking IDs rather than binary file attachments.
- **Impact:** While functionally correct and accepted by the verification engine, merchants might perceive "0 files attached" as an incomplete upload.
- **Recommended Fix:** Update badge copy to `"Declaration & Tracking Provided (0 files)"` when formal declarations and logistics IDs are present.

### Defect SEL-002: Notification Counter Redundancy
- **Observed Behavior:** When multiple events occur for a single request (e.g. Initial Dispatch + Additional Info Request), the unread counter increments for each message independently without grouping under the parent case.
- **Impact:** Minor clutter in the notification dropdown for active cases.
- **Recommended Fix:** Implement notification grouping by Case ID or Request ID in the seller notification panel.

---

## 7. Recommended Seller Workspace Enhancements

1. **Carrier API Live Webhook Tracking:**
   - Integrate automated AWB tracking updates for BlueDart, Delhivery, and FedEx so sellers only need to enter the tracking number to pull live transit logs.
2. **Bulk CSV Dispatch Upload:**
   - Allow enterprise merchants handling dozens of daily disputes to upload a CSV with Order ID, SKU, Serial Number, and Carrier Tracking number.
3. **Automated Evidence Template Library:**
   - Provide downloadable PDF templates for standard warehouse inspection declarations and packing station camera logs.
