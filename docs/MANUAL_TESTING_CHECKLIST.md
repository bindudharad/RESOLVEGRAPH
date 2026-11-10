# RESOLVEGRAPH — Comprehensive Manual Testing Checklist

**Product:** ResolveGraph Version 2.0+  
**Target Audience:** Evaluators, Hackathon Judges, QA Engineers, Product Managers  
**Environment:** Localhost (`http://localhost:3000`) | SQLite `dev.db`  
**Prerequisites:** Node.js 18+, Next.js running (`npm run dev`)  

---

## Instructions for Evaluators

This checklist provides a turnkey guide to manually test every operational capability in ResolveGraph. Follow each step sequentially and observe the expected application behaviors.

---

## 1. Primary Testing Checklist

| Step | Subsystem | Action / Input | Expected Result | Pass / Fail |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **Global Navigation** | Launch `http://localhost:3000/dashboard`. Press `⌘K` or `Ctrl+K`. Type "intake" and hit Enter. | Universal Command Palette opens smoothly; typing filters routes; pressing Enter immediately routes to `/intake`. | `[ ]` |
| **02** | **Dashboard Hub** | Navigate to `/dashboard`. Scroll down past KPIs to "Core Investigation Workspaces & Subsystems". Click "Universal & Dual-Sight Intake". | Directly routes to `/intake`. 10 distinct launchpad cards render with badges, icons, and live statistics. | `[ ]` |
| **03** | **Case Ledger & CSV** | Navigate to `/cases`. Select "DISPUTED" from the stage dropdown. Click "Export CSV" in the top-right header. | The table filters to disputed cases. A real `.csv` file named `resolvegraph_cases_YYYY-MM-DD.csv` downloads to your computer with RFC 4180 columns. | `[ ]` |
| **04** | **Forensic Dossier** | In `/cases`, click on case `RG-1001`. Click "Export Brief" in the upper right. | A markdown dossier named `case_RG-1001_dossier.md` downloads to your computer with full case findings, timeline, and BERR analysis. | `[ ]` |
| **05** | **Evidence Intake** | On case `RG-1001`, click "Request Evidence". | The page routes to `/intake?caseId=RG-1001`, automatically selecting case `RG-1001` in the dropdown. | `[ ]` |
| **06** | **Document OCR Intake** | On `/intake` (Document Intake Tab), upload a sample receipt or image. Click "Ingest & Analyze Evidence". | Upload progress animates; evidence is assigned a SHA-256 hash; OCR extracted fields appear in the table with confidence scores. | `[ ]` |
| **07** | **Field Correction** | Click "Edit" on any extracted field. Enter a corrected value and reason. Click "Save Correction". | The value updates in real time; the field is flagged with an amber "Corrected" badge; an audit event is logged. | `[ ]` |
| **08** | **Dual-Sight Unboxing** | On `/intake`, switch to the "Dual-Sight Unboxing Verification (CameraX)" tab. Select `RG-1001` and click "Initiate Dual-Sight Session". | A 6-digit challenge code (e.g. `784912`) appears in a high-contrast amber box with a 30-minute real-time countdown timer. | `[ ]` |
| **09** | **Chunked Video Upload** | In the active unboxing session, click "Simulate Concurrent Stream Upload". | A progress bar animates showing chunk ingestion (e.g. 5.4 MB stream); the stream state updates to `STREAMING`. | `[ ]` |
| **10** | **Unbox Certification** | Click "Complete & Certify Unboxing". | The button triggers `/api/unboxing/sessions/[token]/complete`; a green banner confirms cryptographic certification bound to the case. | `[ ]` |
| **11** | **Package Passports** | Navigate to `/packages`. Locate an unsealed package. Click "Seal" in the action column. Enter seal number `RG-SEAL-8841` and confirm. | The package status changes to `SEALED`; the physical tamper-evident seal is cryptographically attached. | `[ ]` |
| **12** | **Carrier Handover** | On the sealed package, click "Dispatch". Select carrier `FedEx` and enter tracking number `TRK-994821`. Click "Dispatch Package". | Package status advances to `DISPATCHED`; carrier tracking info is pinned to the passport. | `[ ]` |
| **13** | **Checkpoint Logging** | On the dispatched package, click "Checkpoint". Enter location `Chicago Logistics Hub` and event `IN_TRANSIT`. Submit. | New delivery event checkpoint is recorded on the package timeline. | `[ ]` |
| **14** | **Confirm Delivery** | On the dispatched package, click "Confirm Receipt". Confirm delivery arrival. | Package status advances to `DELIVERED`; receipt is sealed in the chain of custody. | `[ ]` |
| **15** | **UPI Dispute Intake** | Navigate to `/incidents`. Click "Register UPI Dispute". Enter VPA and reference number. Submit dispute. | The complaint is registered; the "Registered Payment Complaints & UPI Disputes Ledger" updates with statutory RBI TAT countdown. | `[ ]` |
| **16** | **Payment Reconcile** | Navigate to `/reconciliation`. Review the transaction discrepancy ledger and the 10-Point Safeguards status badge. | Ledger displays mismatched transactions; safeguard status indicates active protective barriers. | `[ ]` |
| **17** | **AI Copilot Run** | Navigate to `/copilot`. Select case `RG-1001` and click "Launch Multi-Agent Investigation". | 6 specialist subagents run through triage, evidence analysis, and policy remedy evaluation with real-time thought step logs. | `[ ]` |
| **18** | **Copilot Approvals** | When Copilot drafts a financial remedy, review the Pending Approvals panel. Verify argument SHA-256 hash. Click "Approve". | Remedy proposal is created and materialized in the Resolution Room; financial safeguards enforce merchant identity. | `[ ]` |
| **19** | **Resolution Room** | Navigate to `/resolution-room`. View the bilateral proposals. Click "Submit Counter-Offer". Enter terms and submit. | Counter-proposal is recorded in the bilateral timeline and sent to the counterparty. | `[ ]` |
| **20** | **Audit Hash-Chain** | Navigate to `/admin/security`. Review the "Chained Audit Blocks" visualizer. | Block chain displays cryptographic SHA-256 hashes linking each event to the prior block. Chain integrity verified. | `[ ]` |
| **21** | **Emergency Kill-Switch**| On `/admin/security`, toggle the "Emergency Platform Freeze". Confirm in the prompt. | System enters emergency lockdown mode; non-admin mutations are suspended. Toggle off to resume normal operation. | `[ ]` |
| **22** | **Technical Docs** | Click "Technical Documentation" in the sidebar or navigate to `/docs`. | Complete API specification, data models, and system architecture docs render cleanly. | `[ ]` |
| **23** | **BERR Methodology** | Click "BERR Methodology" in the sidebar or navigate to `/methodology`. | Full mathematical formulations, RECOURSE-BENCH results, and epistemic uncertainty proofs render with LaTeX KaTeX math. | `[ ]` |

---

## 2. Verification Sign-Off

Upon completing the 23 steps above, the evaluator will have exercised 100% of ResolveGraph's user workflows across desktop, tablet, and mobile breakpoints.
