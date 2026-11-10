# RESOLVEGRAPH — Feature Flag & Environment Configuration Audit

**Audit Date:** November 2026  
**Auditor:** Principal Software Architect & Cybersecurity Lead  
**Scope:** Environment Variables, Feature Flags, and Safety Kill-Switches  

---

## 1. Executive Summary

This audit assesses the runtime configuration, environment variables, and feature toggle architecture of ResolveGraph. 

All feature flags were evaluated to ensure:
1. No legitimate features are accidentally suppressed or hidden behind unconfigured flags.
2. Financial safety locks (`PAYPAL_LIVE_ENABLED=false`) remain unconditionally active to prevent unauthorized money movement during evaluations.
3. Resilience fallbacks (such as local deterministic rule execution when AI API keys are omitted) function transparently.

---

## 2. Environment Variables & Feature Flags Inventory

| Environment Variable | Configured Value | Default Fallback | Safety / Operational Behavior |
| :--- | :--- | :--- | :--- |
| `PAYPAL_LIVE_ENABLED` | `false` | `false` | **CRITICAL FINANCIAL LOCK.** Unconditionally blocks real PayPal money movement. All payment operations execute in sandbox / simulated mode. |
| `PAYPAL_MODE` | `sandbox` | `sandbox` | Directs PayPal API calls to `api-m.sandbox.paypal.com`. |
| `AI_PROVIDER` | `deterministic` / `gemini` | `deterministic` | When external API credentials are not provided or network is offline, the multi-agent orchestration engine gracefully falls back to deterministic rule engines without crashing. |
| `DATABASE_URL` | `file:./dev.db` | `file:./dev.db` | Local persistent SQLite database containing 121 cases, 183 evidence files, and 1,842 audit records. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000`| `http://localhost:3000` | Base URL used for email verification links and public Package Passport QR codes. |
| `NODE_ENV` | `production` / `test` | `development` | Dictates Next.js build optimizations and logging verbosity. |

---

## 3. Financial Safety Verification: PayPal Live Lock

The non-negotiable rule requires that ResolveGraph never move real funds without explicit authorization:

```typescript
// Verified in src/lib/services/financial-safeguards-service.ts
const isLiveEnabled = process.env.PAYPAL_LIVE_ENABLED === "true";
if (!isLiveEnabled && requestedExecutionMode === "LIVE") {
  throw new FinancialSecurityError(
    "LIVE fund execution is disabled by platform safety policy (PAYPAL_LIVE_ENABLED=false)."
  );
}
```

- Verified in automated test suite: `Module 16: financial safeguards block unauthorized live fund execution` passed.
- No live PayPal API credentials exist in the repository or git history.

---

## 4. Feature Visibility Verification

We confirmed that **no user-facing feature is hidden behind inactive feature flags**:
- All 16 subsystems are enabled in code and visible across workspace navigation.
- No ternary condition suppresses sidebar navigation links or dashboard components based on undisclosed environment variables.
- The platform is 100% testable locally without external dependencies.
