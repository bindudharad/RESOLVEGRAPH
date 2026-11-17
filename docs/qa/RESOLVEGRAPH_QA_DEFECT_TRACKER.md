# RESOLVEGRAPH QA DEFECT TRACKER
## Extreme Human-Level Manual Browser QA Audit Defect Log

**Date of Audit:** 2026-11-17  
**Auditor Persona:** Senior Manual QA Engineer (TeamNexa)  
**Environment:** Next.js 16.4.6 (Turbopack), Local SQLite (`dev.db`), Google Chrome Headless/Interactive  
**Repository Branch:** `completion/master-project-completion`  
**Commit:** `96bb8cc`  

---

### Issue ID: QA-001

**Title:** Buyer Resolution Room attempts unauthorized fetch to `/api/cases/RG-1529/berr-v2` resulting in HTTP 403 Forbidden  
**Severity:** High  
**Category:** Functional Defect / Authorization Leak  
**Affected workspace:** Buyer  
**Affected page:** Shared Resolution Room  
**URL:** `http://localhost:3000/resolution-room`  
**Environment:** Development / Test  
**Preconditions:** Logged in as Buyer (`Alex Morgan`, `usr_alex_buyer`).  

**Steps to reproduce:**
1. Navigate to `/sign-in` and click "Enter Buyer".
2. Open sidebar navigation and click "Resolution Room" or navigate directly to `/resolution-room`.
3. Open browser developer console and network tab.
4. Observe the page initialization requests.

**Expected behavior:**  
The Resolution Room should only query endpoints authorized for consumer participants (e.g., bilateral room chat messages, agreed milestones). It should not invoke investigator-restricted analytical endpoints such as BERR v2.

**Actual behavior:**  
The page automatically initiates a request to `http://localhost:3000/api/cases/RG-1529/berr-v2`. The server responds with `HTTP 403 Forbidden` (`{"error":"Unauthorized: Access restricted to platform investigators"}`), causing an unhandled console error and broken discrepancy widget.

**Browser evidence:**  
`docs/qa/evidence/01-buyer/BUY-008-resolution-room-desktop.png`  
Console Error: `Failed to load resource: the server responded with a status of 403 (Forbidden)`  

**Network evidence:**  
Request URL: `http://localhost:3000/api/cases/RG-1529/berr-v2`  
Response Status: `403 Forbidden`  

**Persistence verification:**  
N/A (Read-only data retrieval failure).  

**Reproducibility:** Always (100%).  

**Recommended correction:**  
In `src/app/(workspace)/resolution-room/page.tsx` or related child component, wrap the BERR v2 query in a role check (`user.role === 'ADMIN' || user.role === 'RESOLUTION_MANAGER'`) or omit investigator discrepancy reasoning when rendered in consumer view.

---

### Issue ID: QA-002

**Title:** Merchant Directory view triggers repeated HTTP 403 Forbidden errors on `/api/seller/directory`  
**Severity:** Medium  
**Category:** Functional Defect / Permission Configuration  
**Affected workspace:** Seller / Merchant  
**Affected page:** Seller Directory  
**URL:** `http://localhost:3000/seller/directory`  
**Environment:** Development / Test  
**Preconditions:** Logged in as Merchant (`TechStore Global`, `usr_techstore_merchant`).  

**Steps to reproduce:**
1. Log in via "Enter Merchant" on `/sign-in`.
2. Navigate to `http://localhost:3000/seller/directory`.
3. Inspect network activity and rendered table.

**Expected behavior:**  
The directory should display verified sellers or a scoped merchant listing permitted for merchant viewing, or clearly inform the merchant that the global directory requires administrative privileges.

**Actual behavior:**  
Two duplicate GET requests to `http://localhost:3000/api/seller/directory?` fail with `HTTP 403 Forbidden`. The directory table fails to render data, remaining in an empty/error state.

**Browser evidence:**  
`docs/qa/evidence/02-seller/SEL-005-directory-desktop.png`  
Console error: `Failed to load resource: the server responded with a status of 403 (Forbidden)`  

**Network evidence:**  
Request URL: `http://localhost:3000/api/seller/directory?`  
Response Status: `403 Forbidden`  

**Persistence verification:**  
N/A (Read query failure).  

**Reproducibility:** Always (100%).  

**Recommended correction:**  
Update `src/app/api/seller/directory/route.ts` permission matrix to permit authenticated merchants to read standard merchant directory listings, or update navigation to restrict the link to platform administrators.

---

### Issue ID: QA-003

**Title:** Horizontal layout overflow and unwanted scrollbar on `/intake` across viewports from 1440px down to 390px  
**Severity:** Medium  
**Category:** Usability / Responsive Defect  
**Affected workspace:** Buyer  
**Affected page:** Universal Evidence Intake / Complaint Wizard  
**URL:** `http://localhost:3000/intake`  
**Environment:** Development / Test  
**Preconditions:** Any viewport between 390px and 1440px.  

**Steps to reproduce:**
1. Open `/intake` in browser at 1440x900, 1280x800, 1024x768, 768x1024, or 390x844.
2. Observe horizontal scrollbar at the bottom of the viewport.
3. Scroll horizontally.

**Expected behavior:**  
Page width should fit cleanly within 100vw with `max-w-full` and responsive padding without inducing horizontal scrolling on standard laptop, tablet, or mobile screens.

**Actual behavior:**  
- At 1440px: `scrollWidth = 1460px` (+20px overflow)
- At 1280px: `scrollWidth = 1342px` (+62px overflow)
- At 1024px: `scrollWidth = 1121px` (+97px overflow)
- At 768px: `scrollWidth = 873px` (+105px overflow)
- At 390px: `scrollWidth = 400px` (+10px overflow)

**Browser evidence:**  
`docs/qa/evidence/10-responsive/MOB-laptop-900p-buyer-intake.png`  
`docs/qa/evidence/10-responsive/MOB-tablet-portrait-buyer-intake.png`  
`docs/qa/evidence/10-responsive/MOB-mobile-390p-buyer-intake.png`  

**Network evidence:** N/A  

**Persistence verification:** N/A  

**Reproducibility:** Always (100%).  

**Recommended correction:**  
In `src/app/(workspace)/intake/page.tsx`, inspect grid and flex containers (especially file dropzone and preview card) and replace fixed minimum widths (`min-w-[...]`) with responsive constraints (`w-full max-w-full overflow-hidden`).

---

### Issue ID: QA-004

**Title:** Missing route-level workspace boundary guards between BUYER and MERCHANT roles  
**Severity:** High  
**Category:** Security / Authorization Defect  
**Affected workspace:** Buyer & Seller cross-boundary  
**Affected page:** `/seller`, `/seller/requests`, `/purchases`, `/intake`  
**URL:** Multiple  
**Environment:** Development / Test  
**Preconditions:** Logged in as BUYER or MERCHANT.  

**Steps to reproduce:**
1. Log in as BUYER (`alex.morgan@consumer.demo`).
2. Type `http://localhost:3000/seller` or `http://localhost:3000/seller/requests` directly into address bar.
3. Observe that the page loads without redirecting to `/access-denied`.
4. Log out and log in as MERCHANT (`disputes@techstore.demo`).
5. Type `http://localhost:3000/purchases` or `http://localhost:3000/intake` directly into address bar.
6. Observe that the page loads without redirecting to `/access-denied`.

**Expected behavior:**  
Route-level middleware/proxy should enforce that consumer users attempting to access `/seller/*` are redirected to `/access-denied`, and merchant users attempting to access `/purchases` or `/intake` are redirected to `/access-denied`.

**Actual behavior:**  
Cross-workspace route navigation is permitted. While individual write APIs enforce tenant checks, the UI and page layouts render for unauthorized roles.

**Browser evidence:**  
`docs/qa/evidence/08-security/rbac-audit-results.json`  

**Network evidence:** N/A (Client route transition).  

**Persistence verification:** N/A.  

**Reproducibility:** Always (100%).  

**Recommended correction:**  
Update `src/middleware.ts` to add role-to-route prefix validation:
- Block `role === 'BUYER'` from accessing `/seller(/.*)?`.
- Block `role === 'MERCHANT'` from accessing `/purchases(/.*)?` and `/intake(/.*)?`.

---

### Issue ID: QA-005

**Title:** Direct navigation to `/paypal` returns HTTP 404 Not Found due to missing index route  
**Severity:** Low  
**Category:** Content / Routing Defect  
**Affected workspace:** Investigator / Fintech  
**Affected page:** PayPal Disputes  
**URL:** `http://localhost:3000/paypal`  
**Environment:** Development / Test  
**Preconditions:** Logged in as Investigator.  

**Steps to reproduce:**
1. Navigate directly to `http://localhost:3000/paypal`.
2. Observe 404 page.

**Expected behavior:**  
Navigating to `/paypal` should automatically redirect to `/paypal/disputes` or render a PayPal fintech overview dashboard.

**Actual behavior:**  
Next.js returns HTTP 404 Not Found because `src/app/(workspace)/paypal/disputes/page.tsx` exists, but there is no `src/app/(workspace)/paypal/page.tsx` or redirect in `next.config.ts`.

**Browser evidence:**  
`docs/qa/evidence/07-payments/PAY-002-paypal-disputes-desktop.png`  
Console error: `Failed to load resource: the server responded with a status of 404 (Not Found)`  

**Network evidence:**  
Request URL: `http://localhost:3000/paypal`  
Response Status: `404 Not Found`  

**Persistence verification:** N/A.  

**Reproducibility:** Always (100%).  

**Recommended correction:**  
Add a permanent redirect in `next.config.ts` from `/paypal` to `/paypal/disputes`, or create `src/app/(workspace)/paypal/page.tsx`.

---

### Issue ID: QA-006

**Title:** Forensic Incidents page triggers HTTP 500 on `/api/investigations/RG-SEC-CURR-1794929369080`  
**Severity:** High  
**Category:** Functional Defect / Backend Unhandled Exception  
**Affected workspace:** Investigator  
**Affected page:** Security & Incidents  
**URL:** `http://localhost:3000/incidents`  
**Environment:** Development / Test  
**Preconditions:** Logged in as Investigator/Admin.  

**Steps to reproduce:**
1. Log in as Platform Admin (`Priya Raghavan`).
2. Navigate to `http://localhost:3000/incidents`.
3. Inspect browser console and network response.

**Expected behavior:**  
The incidents dashboard should query incident records and render the forensics list without server-side 500 exceptions.

**Actual behavior:**  
The endpoint `/api/investigations/RG-SEC-CURR-1794929369080` fails with `HTTP 500 Internal Server Error`, indicating an unhandled exception or missing record mapping in the investigation DAL.

**Browser evidence:**  
`docs/qa/evidence/03-investigator/INV-005-incidents-desktop.png`  
Console error: `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`  

**Network evidence:**  
Request URL: `http://localhost:3000/api/investigations/RG-SEC-CURR-1794929369080`  
Response Status: `500 Internal Server Error`  

**Persistence verification:** N/A.  

**Reproducibility:** Always (100%).  

**Recommended correction:**  
Check `src/app/api/investigations/[caseId]/route.ts` to handle cases where an incident ID with prefix `RG-SEC-CURR-*` does not exist in `dev.db`, returning a clean 404 or empty incident object instead of throwing an unhandled exception.

---

### Issue ID: QA-007

**Title:** Deprecated Next.js middleware file convention warning on development server startup  
**Severity:** Low  
**Category:** Code Hygiene / Framework Deprecation  
**Affected workspace:** Global Application Infrastructure  
**Affected page:** All routes  
**URL:** N/A  
**Environment:** Development  
**Preconditions:** Next.js 16.4.6 dev server startup.  

**Actual behavior:**  
Next.js outputs: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`  

**Recommended correction:**  
Migrate `src/middleware.ts` to Next.js 16 proxy convention when updating server infrastructure.

---

### Issue ID: QA-008

**Title:** Smooth scrolling on root `<html>` element triggers Next.js route transition warning  
**Severity:** Low  
**Category:** Usability / Browser Observation  
**Affected workspace:** Global UI  
**Affected page:** All routes  
**URL:** `http://localhost:3000/*`  
**Environment:** Development / Test  

**Actual behavior:**  
Console logs: `Detected scroll-behavior: smooth on the <html> element. To disable smooth scrolling during route transitions, add data-scroll-behavior="smooth" to your <html> element.`  

**Recommended correction:**  
Add `data-scroll-behavior="smooth"` to the `<html>` tag in `src/app/layout.tsx`.
