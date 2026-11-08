# RESOLVEGRAPH — Manual Testing Personas, Credentials & Test Accounts
**Document ID:** RG-CRED-2026-V2  
**Environment:** Staging / Local Demo (`http://localhost:3000`)  
**Security Status:** Test / Development Credentials Only (Non-Production)

---

## 1. Test Personas & Role Boundaries

ResolveGraph provides pre-configured test personas representing the primary stakeholder roles in the cross-provider dispute ecosystem:

| Persona Name | Email | Password | Role | Organization Scope | Primary Responsibility |
|---|---|---|---|---|---|
| **Priya Raghavan** | `admin@resolvegraph.demo` | `Admin@ResolveGraph2026!` | `ADMIN` | Platform-Wide | Platform Administration, Kill-Switch, Chained Audit Inspection |
| **Alex Morgan** | `alex.morgan@consumer.demo` | `Buyer@ResolveGraph2026!` | `BUYER` | Consumer Space | Buyer Dispute Filing, Dual-Sight Unboxing, Counter-offers |
| **Sarah Johnson** | `sarah.johnson@consumer.demo` | `Buyer@ResolveGraph2026!` | `BUYER` | Consumer Space | Non-Delivery Claim, UPI Ghost Debit Claim |
| **TechStore Disputes** | `disputes@techstore.demo` | `Merchant@TechStore2026!` | `MERCHANT` | TechStore Global (`org_techstore_global`) | Package Passport Creation, Carrier Proof Upload, Dispute Defense |
| **DigitalMart Support** | `support@digitalmart.demo` | `Merchant@DigitalMart2026!` | `MERCHANT` | DigitalMart Express (`org_digitalmart_express`) | In-store POS UPI Dispute Reconciliation |
| **Vikram Malhotra** | `investigator@resolvegraph.demo` | `Investigator@RG2026!` | `INVESTIGATOR` | FinTech Operations | Cross-Provider Forensic Root-Cause Analysis, TAT Audit |
| **Elena Rostova** | `support@resolvegraph.demo` | `Support@RG2026!` | `SUPPORT` | Customer Care | Evidence Intake Triage, Ticket Routing, Message Relays |

---

## 2. Sample Reference Transaction & Case IDs

Use these pre-seeded identifiers when testing specific workflows in the application:

### 2.1 UPI & Bank Dispute Cases
- **Case ID:** `CASE-UPI-2026-GHOST-01`
  - **Transaction URN / RRN:** `UPI/AXIS/405829103948`
  - **Scenario:** Debited from customer SBI account, timeout at NPCI switch, not credited to TechStore HDFC account.
  - **Statutory TAT:** T+1 day breach. Statutory compensation: ₹200.
- **Case ID:** `CASE-2026-CROSS-PHONEPE-AXIS`
  - **Transaction URN / RRN:** `PHNP/20260218/984729102`
  - **Scenario:** Dual debit on PhonePe QR payment for ₹4,500.

### 2.2 Physical Commerce & Unboxing Cases
- **Case ID:** `CASE-2026-MACBOOK-SEAL`
  - **Order ID:** `ORD-2026-MBP-8921`
  - **Package Passport ID:** `PKG-PASSPORT-2026-9921`
  - **Tamper Seal Hash:** `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
  - **Scenario:** MacBook Pro delivered with broken physical security seal; dual-sight unboxing video submitted by buyer.
- **Case ID:** `CASE-2026-CAMERA-WRONG-ITEM`
  - **Order ID:** `ORD-2026-SONY-4412`
  - **Scenario:** Sony A7IV ordered; unboxing reveals refurbished lens brick inside box.

### 2.3 PayPal Dispute Test IDs (Sandbox Mode)
- **Dispute ID:** `PP-D-84920194`
  - **Dispute Reason:** `MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED`
  - **Disputed Amount:** $1,249.00 USD
  - **Status:** `UNDER_REVIEW`

---

## 3. Quick Persona Sign-In Walkthrough

1. Go to `http://localhost:3000/auth/sign-in`.
2. Enter the Email and Password for the desired persona above.
3. Upon authentication:
   - **`ADMIN`** redirects to `/admin/security` or `/dashboard`.
   - **`MERCHANT`** redirects to `/reconciliation` or `/cases`.
   - **`BUYER`** redirects to `/intake` or `/resolution-room`.
4. Role permissions and tenant boundaries are enforced at the API layer for all subsequent requests.
