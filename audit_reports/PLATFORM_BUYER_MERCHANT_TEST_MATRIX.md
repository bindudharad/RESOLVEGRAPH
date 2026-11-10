# RESOLVEGRAPH 2.0 — THREE-PERSONA VERIFICATION MATRIX

**Date:** November 10, 2026  
**Auditor:** Senior Software Test Engineer & Full-Stack Engineer  
**Scope:** Authenticated Workspace Verification for Platform Admin, Buyer Consumer, and Merchant Agent  
**Testing Method:** Independent Authenticated Sessions via Chrome Headless (Zero Shared State / Cookies Cleared Between Personas)

---

## 1. Persona Profiles & Scopes Under Test

| Attribute | Persona A: PLATFORM | Persona B: BUYER | Persona C: MERCHANT |
|---|---|---|---|
| **Identity** | **Priya Raghavan** | **Alex Morgan** | **TechStore Global** |
| **Email** | `admin@resolvegraph.demo` | `alex.morgan@consumer.demo` | `disputes@techstore.demo` |
| **System Role** | `ADMIN` (`isPlatformAdmin: true`) | `BUYER` | `MERCHANT` |
| **Organization**| `ResolveGraph Global` | `Individual Consumer` | `TechStore Retail LLC` (`org-techstore`) |
| **Monitored Scope** | **Global Multi-Tenant Scope** | **Personal Consumer Scope** | **Store Workspace Scope** |
| **Ledger Volume** | **$158,485.41 USD** (346 cases) | **$1,299.98 USD** (2 cases) | **$84,920.00 USD** (Store transactions) |
| **Sidebar Groups**| 5 groups (13 items) | 4 groups (10 items) | 4 groups (10 items) |
| **Admin Controls**| Dual-key approval, Kill switch, Full Audit | None (Self-serve dispute claims) | Proposal draft, Package Passport, Dispute response |

---

## 2. Comprehensive Navigation & Feature Access Comparison

| Workspace Navigation Item | Path | Platform (Priya) | Buyer (Alex) | Merchant (TechStore) | Isolation Verdict |
|---|---|---|---|---|---|
| **Overview Dashboard** | `/overview` | **PASS (200)** - Global metrics ($158k vol, 310 cases) | **PASS (200)** - Scoped to Alex ($1,299 vol, 2 cases) | **PASS (200)** - Scoped to TechStore ($84k vol) | **STRICT TENANT ISOLATION** |
| **Payments Ledger** | `/payments` | **PASS (200)** - All 346 transactions | **PASS (200)** - 2 personal purchases | **PASS (200)** - TechStore transactions only | **STRICT TENANT ISOLATION** |
| **Case Management** | `/cases` | **PASS (200)** - Global case ledger | **PASS (200)** - Buyer-submitted cases only | **PASS (200)** - Merchant dispute cases only | **STRICT TENANT ISOLATION** |
| **Evidence Vault** | `/evidence` | **PASS (200)** - Full 103 evidence files | **PASS (200)** - Buyer-permitted items (99) | **PASS (200)** - Merchant-permitted items (100) | **VISIBILITY PERMISSION FILTER** |
| **Evidence Graph (BEG)** | `/cases/RG-1001` | **PASS (200)** - Complete 3D graph + manager notes | **PASS (200)** - Bipartite graph, internal notes masked | **PASS (200)** - Bipartite graph, internal notes masked | **ROLE-BASED GRAPH PROJECTION** |
| **Purchase Memory** | `/purchases` | **PASS (200)** - Read-only inspection | **PASS (200)** - Personal purchase warranties | **PASS (200)** - Merchant store orders | **SCOPED TO IDENTITY** |
| **Package & Delivery** | `/packages` | **PASS (200)** - All package passports | **PASS (200)** - Incoming consumer shipments | **PASS (200)** - Outbound package sealing & QR | **ROLE SPECIFIC ACTIONS** |
| **Resolution Room** | `/resolution-room`| **PASS (200)** - Oversight mode | **PASS (200)** - Buyer negotiation view | **PASS (200)** - Merchant negotiation view | **BILATERAL VIEW MAPPING** |
| **Reports & Analytics** | `/analytics` | **PASS (200)** - System-wide intelligence | **PASS (200)** - Personal spending insights | **PASS (200)** - Store dispute & win rates | **SCOPED AGGREGATION** |
| **AI Copilot** | `/copilot` | **PASS (200)** - Managerial escalation mode | **PASS (200)** - Buyer claim assistant | **PASS (200)** - Merchant defense drafter | **INTENT-SCOPED SPECIALISTS** |
| **Organizations & Roles**| `/organizations`| **PASS (200)** - Full org management | **BLOCKED FROM SIDEBAR** (200 by URL) | **BLOCKED FROM SIDEBAR** (200 by URL) | **UI HIDDEN / DIRECT ACCESS ISSUE** |
| **Security & Kill Switch**| `/admin/security`| **PASS (200)** - Kill switch toggle & chained audit | **BLOCKED FROM SIDEBAR** (200 by URL) | **BLOCKED FROM SIDEBAR** (200 by URL) | **UI HIDDEN / API ROLE GAP** |
| **Settings** | `/settings` | **PASS (200)** - System & profile settings | **PASS (200)** - Personal account settings | **PASS (200)** - Merchant store settings | **SCOPED PREFERENCES** |

---

## 3. Granular Role Action Verification

### 3.1 Platform Administrator (Priya Raghavan)
- **Overview KPI Cards:** Correctly displays $158,485.41 Total Monitored Volume, 310 Active Investigations, 0 Action Required, 77% Evidence Integrity.
- **Quick Actions:** Search Payment, View All Cases, Submit Evidence (Overseer), Dual-Key Approvals.
- **Dual-Key Approval Gate:** Can approve or reject high-risk merchant settlement proposals.
- **Kill-Switch Control:** Successfully toggles `isOutboundPayPalKilled`, `isExternalProviderKilled`, `isAutonomousAgentKilled`, and `isNotificationKilled` with mandatory audit reason.

### 3.2 Buyer Consumer (Alex Morgan)
- **Overview KPI Cards:** Correctly displays personal dispute volume ($1,299.98) across personal purchase orders.
- **Quick Actions:** Report Discrepancy, Check Unboxing Status, Track Delivery.
- **Evidence Submission:** Allowed to upload unboxing videos, receipts, and photos for personal cases.
- **Financial Boundary:** Non-negotiably forbidden from approving merchant refunds or accessing other buyers' files.

### 3.3 Merchant Agent (TechStore Global)
- **Overview KPI Cards:** Correctly displays TechStore workspace metrics ($84,920.00 volume).
- **Quick Actions:** Register Package Passport, Seal Outbound Shipment, Respond to PayPal Dispute, Draft Settlement Proposal.
- **Financial Boundary:** Proposed refunds cannot execute autonomously; must request human manager sign-off via cryptographic argument hash.
- **Dispute Handling:** Can submit merchant fulfillment evidence (carrier dispatch receipts, serial number logs).

---

## 4. Key Cross-Persona Findings & Isolation Gaps

1. **Strict Data Layer Isolation:** No persona was able to retrieve database records belonging to another tenant via `/api/cases`, `/api/payments`, or `/api/overview/summary`.
2. **UI Navigation Parity:** Sidebar properly collapses from 260px to 72px for all three personas.
3. **Authorization Leakage on Admin Security Dashboard:** While the sidebar correctly hides the *Administration* group from Buyer and Merchant personas, direct URL navigation to `/admin/security` loads the client page without redirecting to `/access-denied`.
