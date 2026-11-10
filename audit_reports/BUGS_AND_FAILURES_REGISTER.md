# RESOLVEGRAPH 2.0 — BUGS AND FAILURES REGISTER

**Date:** November 10, 2026  
**Auditor:** Principal QA Architect & Security Testing Specialist  
**Standard:** Enterprise Defect & Security Vulnerability Registry  
**Branch:** `qa-hardening`  
**Total Defects Documented:** 8 (2 High, 3 Medium, 3 Low)

---

### BUG-AUTH-001
- **Feature:** Emergency Platform Kill Switch
- **Page or API:** `GET /api/admin/kill-switch`
- **Persona:** Buyer (`alex.morgan@consumer.demo`), Merchant (`disputes@techstore.demo`)
- **Severity:** **HIGH**
- **Preconditions:** User is signed in with any valid non-admin account (e.g. Consumer Buyer).
- **Steps to reproduce:**
  1. Authenticate as Buyer Alex Morgan (`alex.morgan@consumer.demo`).
  2. Send a `GET` request to `http://localhost:3000/api/admin/kill-switch` with session cookies.
  3. Inspect HTTP response status and body.
- **Expected result:** API returns `HTTP 403 Forbidden` (`{ "error": "Access denied: Platform administrator privileges required." }`).
- **Actual result:** API returns `HTTP 200 OK` with full kill switch state:
  ```json
  {
    "success": true,
    "data": {
      "isOutboundPayPalKilled": false,
      "isExternalProviderKilled": false,
      "isAutonomousAgentKilled": false,
      "isNotificationKilled": false,
      "reason": "Routine system health verification",
      "updatedBy": "admin@resolvegraph.demo"
    }
  }
  ```
- **Evidence:** Verified in `src/app/api/admin/kill-switch/route.ts` line 8: only calls `await requireAuth(request);` without role assertion.
- **Related file or component:** `src/app/api/admin/kill-switch/route.ts`
- **Possible cause (Hypothesis):** The developer implemented role checking in the `POST` handler (`if (!user.isPlatformAdmin && user.role !== 'RESOLUTION_MANAGER')`), but inadvertently omitted it in the `GET` handler.
- **Recommended future fix:** Replace `await requireAuth(request);` with `await requirePlatformAdmin(request);` in the `GET` route handler.

---

### BUG-AUTH-002
- **Feature:** Cryptographic Chained Audit Ledger
- **Page or API:** `GET /api/audit/chained`
- **Persona:** Buyer (`alex.morgan@consumer.demo`), Merchant (`disputes@techstore.demo`)
- **Severity:** **HIGH**
- **Preconditions:** User is authenticated as a regular buyer or merchant.
- **Steps to reproduce:**
  1. Authenticate as Buyer Alex Morgan.
  2. Fetch `GET /api/audit/chained?limit=50`.
  3. Inspect response data.
- **Expected result:** `HTTP 403 Forbidden`. Audit ledger access restricted to Platform Security Officers and Admins.
- **Actual result:** `HTTP 200 OK` returning 50 global audit trail records across multiple organizations and tenants, including chained hashes, previous hashes, and entity IDs.
- **Evidence:** Verified in `src/app/api/audit/chained/route.ts` line 8: calls `await requireAuth(request);` without checking `user.isPlatformAdmin`.
- **Related file or component:** `src/app/api/audit/chained/route.ts`
- **Possible cause (Hypothesis):** The endpoint was initially created for a unified frontend dashboard and was never guarded with `requirePlatformAdmin`.
- **Recommended future fix:** Enforce `requirePlatformAdmin(request)` or scope audit trail retrieval strictly to the authenticated user's tenant organization.

---

### BUG-AUTH-003
- **Feature:** Admin Security Dashboard Route Guard
- **Page or API:** `/admin/security` (Page)
- **Persona:** Buyer, Merchant
- **Severity:** **MEDIUM**
- **Preconditions:** User is signed in with a non-admin account.
- **Steps to reproduce:**
  1. Authenticate as Buyer Alex Morgan.
  2. Enter `http://localhost:3000/admin/security` directly into the browser URL bar.
  3. Press Enter.
- **Expected result:** Browser redirects to `/access-denied` or displays an unauthorized banner.
- **Actual result:** Page renders with HTTP 200, displaying the Security, Kill Switch & Cryptographic Audit Ledger interface (though mutation buttons fail with 403).
- **Evidence:** `public/audit-data.json` shows `/admin/security` returned `Status: 200 | Heading: "Security, Kill Switch & Cryptographic Au"` for both Buyer and Merchant personas.
- **Related file or component:** `src/app/(workspace)/admin/security/page.tsx`, `src/middleware.ts`
- **Possible cause (Hypothesis):** Role-based navigation was implemented solely by hiding sidebar navigation links (`filter(item => isPlatformAdmin)`), without a server component check or middleware route guard.
- **Recommended future fix:** Add server-side session role validation in a layout or wrapper, redirecting non-admin users to `/access-denied`.

---

### BUG-SEC-004
- **Feature:** Global HTTP Security Headers & Information Leakage
- **Page or API:** All Application Routes (`/`, `/api/*`, `/overview`)
- **Persona:** All / External Web Traffic
- **Severity:** **MEDIUM**
- **Preconditions:** None (observable on standard HTTP responses).
- **Steps to reproduce:**
  1. Execute `curl -I http://localhost:3000/` or inspect response headers via Node `fetch`.
  2. Review returned headers.
- **Expected result:** Response contains standard security headers (`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`). `x-powered-by` header should be omitted.
- **Actual result:** Security headers are completely missing. `x-powered-by: Next.js` is leaked in headers.
- **Evidence:**
  ```json
  {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
    "x-powered-by": "Next.js"
  }
  ```
- **Related file or component:** `next.config.ts`, `src/middleware.ts`
- **Possible cause (Hypothesis):** `next.config.ts` only specifies Turbopack Tailwind rules and does not define a `headers()` configuration.
- **Recommended future fix:** Add a `headers()` block in `next.config.ts` declaring CSP, HSTS, X-Frame-Options, and set `poweredByHeader: false`.

---

### BUG-AUTH-005
- **Feature:** Authentication Rate Limiting
- **Page or API:** `POST /api/auth/sign-in/email`
- **Persona:** Unauthenticated / Attacker
- **Severity:** **MEDIUM**
- **Preconditions:** Unauthenticated visitor.
- **Steps to reproduce:**
  1. Dispatch 15 rapid consecutive `POST` requests to `/api/auth/sign-in/email` with incorrect password.
  2. Inspect HTTP status codes across all 15 attempts.
- **Expected result:** Request 6 or 10 returns `HTTP 429 Too Many Requests`.
- **Actual result:** All 15 requests return `HTTP 401 Unauthorized` without throttling or blocking the IP.
- **Evidence:** Verified in `audit_reports/test_auth_system.js` (Case 20).
- **Related file or component:** `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`
- **Possible cause (Hypothesis):** Better-Auth default configuration was initialized without the optional `rateLimit` plugin.
- **Recommended future fix:** Enable Better-Auth rate limit plugin or configure sliding-window IP rate limiting in Next.js middleware.

---

### BUG-AUTH-006
- **Feature:** Password Recovery & Verification Workflows
- **Page or API:** `/forgot-password`, `/reset-password`, `/verify-email`
- **Persona:** All users
- **Severity:** **LOW**
- **Preconditions:** Visitor on forgot-password screen.
- **Steps to reproduce:**
  1. Navigate to `/forgot-password`.
  2. Enter an email address and click Submit.
  3. Inspect network activity.
- **Expected result:** System dispatches password reset token via email and records token in database.
- **Actual result:** Frontend uses `setTimeout(() => setSubmitted(true), 600)` without making any network request.
- **Evidence:** `src/app/(auth)/forgot-password/page.tsx` lines 17-21:
  ```ts
  // In local demo environment, simulate immediate recovery email dispatch
  setTimeout(() => { setLoading(false); setSubmitted(true); }, 600);
  ```
- **Related file or component:** `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`
- **Possible cause (Hypothesis):** The feature was implemented as a frontend prototype / mock for demonstration purposes without integrating an email transport service (e.g. Resend / SendGrid).
- **Recommended future fix:** Wire `betterAuth.api.forgetPassword` and configure a real transactional email provider.

---

### BUG-DEP-007
- **Feature:** Next.js Routing Architecture
- **Page or API:** `src/middleware.ts`
- **Persona:** Platform Architecture
- **Severity:** **LOW**
- **Preconditions:** Running `npm run build` or Next.js Turbopack compiler.
- **Steps to reproduce:**
  1. Run `npm run build`.
  2. Observe console compiler output.
- **Expected result:** Clean build with zero deprecation warnings.
- **Actual result:** Next.js 16.4.4 logs:
  `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
- **Evidence:** Captured in `audit_reports/npm_build_output.log`.
- **Related file or component:** `src/middleware.ts`
- **Possible cause (Hypothesis):** Next.js 16 introduces the `proxy.ts` convention to supersede `middleware.ts`.
- **Recommended future fix:** Run `npx @next/codemod@canary middleware-to-proxy .` to rename and migrate `src/middleware.ts` to `src/proxy.ts`.

---

### BUG-PERF-008
- **Feature:** Dashboard Chart Layout Stability
- **Page or API:** `/overview`, `/dashboard`
- **Persona:** All users
- **Severity:** **LOW**
- **Preconditions:** Loading `/overview` on desktop or mobile.
- **Steps to reproduce:**
  1. Navigate to `/overview` with a fresh cache.
  2. Measure Cumulative Layout Shift (CLS) via PerformanceObserver.
- **Expected result:** `CLS < 0.10` (Google Core Web Vitals ideal score).
- **Actual result:** `CLS = 0.1363`.
- **Evidence:** Captured in `audit_reports/performance_test_results.json`.
- **Related file or component:** `src/components/overview/unified-overview-dashboard.tsx`
- **Possible cause (Hypothesis):** SVG chart containers render with 0 height initially and expand once client-side dimensions are measured by Recharts.
- **Recommended future fix:** Add explicit `min-h-[300px]` and skeleton placeholder to chart parent divs.
