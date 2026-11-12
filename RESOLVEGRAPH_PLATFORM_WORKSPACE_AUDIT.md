# RESOLVEGRAPH — PLATFORM WORKSPACE AUDIT REPORT

**Audit Date:** November 12, 2026  
**Auditor:** QA & Platform Usability Lead  
**Scope:** Complete functional, structural, data-integrity, and visual usability audit of the RESOLVEGRAPH Platform Workspace (`http://localhost:3000`)

---

## 1. Page & Navigation Inventory

The Platform Workspace primary navigation is structured around the 7 dispute lifecycle sections:

| # | Route | Page Title | Operational Purpose | Health / Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `/overview` | Overview Dashboard | Command center: 4 KPI metrics, priority cases table, recent audit events, environment mode | **Healthy (HTTP 200)** |
| **2** | `/cases` | Case Management | Unified dispute roster, real-time search, status/marketplace filtering, priority indicators | **Healthy (HTTP 200)** |
| **3** | `/evidence` | Evidence & BEG | Central evidence locker, file integrity hashes, cross-case artifact browser | **Healthy (HTTP 200)** |
| **4** | `/resolution` | Resolution Management | Cross-dispute remedy proposals, approval queue, policy evaluation, execution triggers | **Healthy (HTTP 200)** |
| **5** | `/payments` | Payments & Capture Analytics | Monitored volume, PayPal sandbox captures, refund ledger, dispute reconciliation | **Healthy (HTTP 200)** |
| **6** | `/organizations` | Organizations & Sellers | Registered seller directory, tenant management, onboarding status, GSTIN registry | **Healthy (HTTP 200)** |
| **7** | `/settings` | Administration Console | Security policies, kill-switch status, API webhooks, immutable hash-chain audit ledger | **Healthy (HTTP 200)** |

### Secondary Contextual Case Routes (`/cases/[caseId]`)
The individual case investigation interface is organized into 6 lifecycle tabs with an Advanced Tools dropdown:
1. `overview`: Case Dossier Header, AI Investigation Card, Claims Ledger, Key Facts, Dynamic Next Recommended Action, Human Review Gate, Case Notes.
2. `evidence_beg`: Evidence Vault & interactive EvidenceGraphExplorer.
3. `berr`: BERR Analysis Matrix, Discrepancy Findings, Human Review Override.
4. `seller_outreach`: Legal Seller Details, GSTIN, Registration Status, Seller Communication Gateway / Customer-Assisted Help Centre fallback.
5. `resolution`: Candidate Remedy Options, Proposal Form, Governance Approval Gate, Execution Actions.
6. `audit`: Chronological Event Timeline & Immutable Audit Ledger.
- **Advanced Tools Dropdown:** Contextual access to `Temporal Replay`, `PayPal Dispute Details`, `Order Ledger`, and `Claims Matrix`.

---

## 2. Platform Usability & Visual Evaluation (1 to 5 Scale)

| Evaluation Dimension | Score (1-5) | Detailed Justification & Evidence |
| :--- | :---: | :--- |
| **Navigation Clarity** | **4.8 / 5.0** | The 7-item navigation cleanly groups the platform tools into a logical workflow. Sub-tools (like Kill Switch and Temporal Replay) are contextually placed without cluttering the primary rail. |
| **Case Search & Discovery** | **4.7 / 5.0** | Instant client and server filtering by Case ID (`RG-1463`, `RG-1462`, `RG-1001`), customer name, or marketplace. Highlighted badges make case status immediately apparent. |
| **Complaint Detail Layout** | **4.5 / 5.0** | The 6-tab organization partitions complex investigations cleanly. Dossier header surfaces essential metadata (ID, Buyer, Seller, Amount, Order ID, Stage) at all times. |
| **Evidence Visibility** | **4.4 / 5.0** | Verified evidence vault provides clear thumbnail previews, MIME types, verification state pills, and SHA-256 integrity inspection. |
| **BEG Graph Usability** | **2.2 / 5.0** | **Critical Performance Defect**. While functional on standard cases (e.g. 8 nodes, 5 edges on `RG-1463`), on large cases with thousands of edges (e.g. `RG-1001` with 54,092 edges), the visualizer attempts full synchronous rendering and freezes the browser tab. |
| **BERR Readability** | **4.6 / 5.0** | Four clear quadrants (AGREED, VERIFIED, CONTESTED, MISSING) with statutory grounding citations and clear liability attribution. |
| **Seller Outreach Interface** | **4.8 / 5.0** | Highly intuitive. Cleanly branches between Registered (`SELLER_PORTAL`) and Unregistered (`CUSTOMER_ASSISTED_HELP_CENTRE`) channels. Copy-to-clipboard script and submission confirmation work seamlessly. |
| **Remedy Proposal Workflow** | **4.6 / 5.0** | Policy engine guards financial payouts when evidence is incomplete. Candidate options clearly explain policy eligibility reasons. |
| **Approval Process & Governance** | **4.7 / 5.0** | Clear separation between proposal submission and administrator authorization. Digital signature key modal prevents accidental or unauthorized execution. |
| **Error Handling & Feedback** | **4.3 / 5.0** | Form validations provide human-readable messages. Unexpected database errors are caught and sanitized, avoiding stack trace exposure. |
| **Responsive Layout** | **4.1 / 5.0** | Adapts cleanly on desktop (>1024px). On mobile viewports (<900px), sidebar collapses to bottom nav, which requires careful vertical space management. |
| **Overall Ease of Use** | **4.3 / 5.0** | Powerful enterprise platform with high forensic depth. Highly usable once the graph visualizer edge thresholding is addressed. |

---

## 3. Detailed Forensic Audit Findings

### A. Data Integrity & RG-1462 Verification
- **Verified Fact:** Case `RG-1462` (VEGA Orion Motorbike Helmet, Flipkart, ₹956 INR) is strictly connected to **Suri Consumer Private Limited** (`29ABDCS9580N1ZD`).
- **Absence Confirmed:** 0 occurrences of "Apex Tech Retail" or "TechStore Retail LLC" in the case dossier, outreach panel, or notifications.
- **Demo Contamination Elimination:** Synthetic Samsung SSD 512GB vs 1TB and ₹1,800 settlement recommendations have been removed from the live dossier and BERR tabs.

### B. BEG Visualizer Rendering Freeze (Defect PLT-001)
- **Observed Behavior:** On case `RG-1001`, navigating to `/cases/RG-1001?tab=evidence` freezes the browser rendering engine indefinitely.
- **Root Cause:** The database contains an accumulated mesh of 888 nodes and 54,092 edges from repeated test syncs. `EvidenceGraphExplorer` mounts a force-directed D3/SVG simulation that attempts to calculate physics and render all 54,092 DOM edge elements synchronously on the main UI thread.
- **Impact:** Investigators cannot view the visual graph on high-density cases without the tab hanging.
- **Recommended Fix:** Implement edge clamping (e.g. `edges.slice(0, 250)`), degree-based thresholding, or a depth-limited neighborhood filter (`maxHops = 2` from selected node) in `src/components/cases/evidence-graph-explorer.tsx`.

### C. Static Copy in Secondary Convergence Timeline (Defect PLT-002)
- **Observed Behavior:** On `/cases/[caseId]` under the `Activity & Audit` tab, the secondary card titled `Convergence Timeline` displays static sample text: *"1TB NVMe SSD for ₹6,499. The buyer claims a 512GB model was inside... ₹1,800 Partial Refund Proposed"*.
- **Impact:** While the primary audit log immediately below it is 100% dynamic and accurately bound to the current case, this secondary mockup card creates confusion for non-SSD cases.
- **Recommended Fix:** Bind `ConvergenceTimeline` to real case events or hide it on cases where `caseId !== 'RG-2026-0412'`.

### D. Periodic 404 Polling for Evaluation Fixture (Defect PLT-003)
- **Observed Behavior:** Browser console logs show periodic background polling for `/api/cases/RG-2026-0412/analysis` and `/api/cases/RG-2026-0412/berr-v2` returning HTTP 404.
- **Root Cause:** A background hook or evaluation listener in the copilot/overview polling loop defaults to fixture ID `RG-2026-0412` when no active case is in focus.
- **Impact:** Non-fatal, but adds unnecessary 404 noise to network logs.
- **Recommended Fix:** Guard the polling hook to only execute when an active case is loaded and verified to exist.

---

## 4. Recommended Platform Improvements

1. **Graph Explorer Edge Culling & Level of Detail (LOD):**
   - Implement an edge density cap (`MAX_RENDERED_EDGES = 300`) with a "High-Density Case: Showing top 300 relevant connections" notice and filter controls by node type.
2. **Purge Static Convergence Timeline Text:**
   - Wire `ConvergenceTimeline` props to read from the case's real `timelineEvents` or dynamically substitute the active case's product name and amount.
3. **Filter Active Disputes on Cases Table:**
   - Add a default filter view ("Needs Attention" / "Open Cases") on `/cases` to prevent investigators from having to scroll past closed legacy records.
4. **Export Dossier as Single-Page PDF:**
   - Complete the "Export Dossier" header button action to generate a comprehensive forensic PDF containing the claims, BEG summary, BERR findings, and audit trail for external legal and arbitration proceedings.
