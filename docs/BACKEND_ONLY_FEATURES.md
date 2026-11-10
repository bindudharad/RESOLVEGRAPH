# RESOLVEGRAPH — Backend-Only & Previously Hidden Features Audit

**Audit Date:** November 2026  
**Status:** All Investigative & Operational Workflows Fully Connected to Frontend  
**Governance:** Automated Webhooks & Health Monitors Kept Intentionally Headless

---

## 1. Executive Summary

During our systematic API vs. UI audit, 5 critical operational workflows were discovered to have full backend route handlers, schemas, and database services implemented, but lacked interactive frontend controls. 

In this remediation phase, all 5 capabilities were integrated into their corresponding workspace pages with responsive UI modals, action buttons, and user feedback mechanisms.

In addition, 4 backend endpoints are intentionally retained as headless APIs (without direct user UI triggers) due to architectural, security, or webhook standards.

---

## 2. Remediated & Frontend-Exposed Capabilities

### 1. Carrier Handover & Dispatch (`POST /api/packages/[id]/dispatch`)
- **Previous State:** The Package Passport table displayed tracking status and seal verification, but had no button to hand off a sealed package to a carrier.
- **Frontend Integration:** Added an interactive "Dispatch" action button in [`src/app/(workspace)/packages/page.tsx`](file:///C:/Projects/resolvegraph/src/app/(workspace)/packages/page.tsx#L180-L210) with an inline modal for Carrier selection (`FedEx`, `UPS`, `BlueDart`, `Delhivery`), tracking number entry, and estimated delivery date.
- **Result:** Directly changes package status to `DISPATCHED` and logs an immutable handover event.

### 2. Carrier Checkpoint Tracking Events (`POST /api/delivery/events`)
- **Previous State:** Delivery events could only be posted via automated worker or API test.
- **Frontend Integration:** Added a "Checkpoint" action button on packages with a checkpoint logging dialog (Checkpoint City, Event Code, Timestamp, Anomaly notes).
- **Result:** Posts real-time shipment milestones to [`src/app/api/delivery/events/route.ts`](file:///C:/Projects/resolvegraph/src/app/api/delivery/events/route.ts) and appends to the delivery event timeline.

### 3. Delivery Receipt Confirmation (`POST /api/delivery/confirm-receipt`)
- **Previous State:** No UI mechanism for a merchant or courier to confirm delivery receipt and unlock buyer unboxing.
- **Frontend Integration:** Added a "Confirm Receipt" button in the passport ledger that allows confirming arrival, recipient signature timestamp, and physical condition.
- **Result:** Advances package to `DELIVERED`, triggering the unboxing notification flow.

### 4. Dual-Sight Unboxing Protocol (`/api/unboxing/sessions/*`)
- **Previous State:** The CameraX and unboxing verification backend was implemented across 4 endpoints (`/api/unboxing/sessions`, `/upload`, `/complete`), but `/intake` only presented document and invoice upload.
- **Frontend Integration:** Built a dual-mode tab switcher on [`src/app/(workspace)/intake/page.tsx`](file:///C:/Projects/resolvegraph/src/app/(workspace)/intake/page.tsx):
  1. *Document & Statement Intake*
  2. *Dual-Sight Unboxing Verification (CameraX)*
- **Interactive Controls:**
  - Case selector and "Initiate Dual-Sight Session" button.
  - Active 6-digit challenge banner with 30-minute real-time expiration countdown.
  - Video stream chunk upload simulator with chunk size progress bar.
  - "Complete & Certify Unboxing" verification button linking challenge and video hash to the case.

### 5. India UPI Dispute Registration & Statutory TAT Ledger (`POST /api/payments/complaints/upi` & `GET /api/payments/complaints`)
- **Previous State:** UPI dispute intake and statutory RBI guidelines (2019/10/22) were backend services only.
- **Frontend Integration:** Added a "Register UPI Dispute" modal in [`src/app/(workspace)/incidents/page.tsx`](file:///C:/Projects/resolvegraph/src/app/(workspace)/incidents/page.tsx) with VPA fields, RRN, debit/credit timestamps, and created a dedicated "Registered Payment Complaints & UPI Disputes Ledger" displaying statutory turnaround times (T+1 / T+5 days), status, and penalties.

---

## 3. Intentionally Restricted / Headless Backend Endpoints

The following endpoints do not feature direct manual UI triggers in workspace navigation, in accordance with industry security best practices:

| Endpoint | Method | Intended Caller | Rationale for Headless Architecture |
| :--- | :--- | :--- | :--- |
| `/api/webhooks/paypal` | POST | External PayPal IPN / Webhook Servers | Automated machine-to-machine callback signed with PayPal HMAC signatures. Triggering this from user UI would bypass webhook signature verification. |
| `/api/health` | GET | Kubernetes / Docker Healthcheck Probes | High-frequency liveness and readiness probe for load balancers. Does not require user interaction. |
| `/api/auth/[...all]` | ALL | BetterAuth / Auth Provider Client SDK | Authentication protocol handshake; handled exclusively by the auth client session layer. |
| `/api/admin/kill-switch` | POST | Admin Security Console Only | Guarded behind strict `ADMIN` role checks and cryptographic session elevation; prohibited from standard user workspace views. |
