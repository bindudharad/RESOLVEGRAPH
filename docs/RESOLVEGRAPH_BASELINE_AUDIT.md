# RESOLVEGRAPH — Baseline System Audit

## 1. Executive Baseline Summary

This document captures the baseline state of the **RESOLVEGRAPH** repository, application architecture, test infrastructure, database parity, and operational workflows prior to executing full-stack defect remediation.

RESOLVEGRAPH is an AI-assisted bilateral dispute investigation and resolution platform bridging Buyers (Consumers), Merchants (Sellers), and Platform Dispute Investigators (Resolution Managers).

---

## 2. Environment & Architectural Baseline

| Component | Baseline Technology / Config | Initial Health / Verification Status |
|---|---|---|
| **Frontend Framework** | Next.js App Router 16.4.6 (Turbopack) | Started; client components had static demo fallbacks and mock banners |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | Operational; minor responsive clipping on smaller mobile viewports |
| **Backend & APIs** | Next.js App Router Route Handlers | 88 routes; several critical endpoints threw HTTP 400/404/500 on valid inputs |
| **Database & ORM** | Prisma 7.10.1 / SQLite (`dev.db`, 1.19 GB) | Foreign key mismatches; corrupted year dates (`61110-02-20`); repo root path vs `prisma/` confusion |
| **Evidence Vault** | Local Storage & Cryptographic Hashing | SHA-256 implemented; UI rendered synthetic hardcoded slots instead of genuine files |
| **AI Systems** | Google Gemini 2.5 Flash & Rule Fallbacks | Operational prompt injection boundaries; offline deterministic fallbacks functional |
| **Authentication & RBAC** | Custom session tokens / NextAuth DAL | Tenant isolation functional; case identifier resolution required harmonization |

---

## 3. Initial Baseline Feature Matrix

### 3.1 Working Features (Verified at Baseline)
- **Multi-Agent Orchestrator:** Prompt injection detection, XML tag quarantine, and Luhn-valid PAN masking.
- **Bilateral Evidence Graph (BEG):** Topological DAG construction with order-permutation invariance.
- **BERR Reasoning Engine (BERR v2):** 4-category classification (Agreed, Verified, Contested, Missing).
- **10-Point Financial Action Guardrails:** AI autonomous payout prevention and SHA-256 argument hashing.
- **Overview & 3D Graph Preview:** Visualization of nodes and edges for canonical dataset.

### 3.2 Failing & Partially Broken Features (At Baseline)
- **Case Identifier Inconsistency:** Searching or navigating with `RG-2026-0412` threw 404s or failed API lookups due to CUID vs case number mismatch.
- **Package Passport Ingestion:** `POST /api/packages` threw HTTP 500 (`Argument productName is missing`) due to client/server property name divergence (`productName` vs `title`).
- **Camera Session Foreign Key Violation:** `POST /api/unboxing/sessions` crashed when provided a human-readable case number (`RG-1001`) instead of a Prisma CUID.
- **Purchase Memory Dispute Comparison:** `POST /api/purchases/[id]/compare-dispute` threw HTTP 400 (`Missing required field: claimStatement`) because UI submitted `disputeClaims`.
- **Evidence Previewer Synthetic Mocking:** Case dossier evidence viewer rendered hardcoded static preview cards (`FEATURED_EVIDENCE_SLOTS`) rather than rendering genuine case files.
- **Convergence Milestone Visual Glitch:** Fully resolved cases displayed an animated infinite pulsing ring instead of terminal resolution completion.
- **Buyer Screening Logic Gate:** Flagged evidence in test suites erroneously marked the whole screening check as `passed = false`, blocking downstream seller workflow tests.
- **Database Timestamp Corruption:** 5 anomalous records in `dev.db` had corrupted calendar years (`61110-02-20` and `61111-02-20`), causing temporal engine assertion failures.

### 3.3 Incomplete / Mocked Features (At Baseline)
- **Seller Outreach Tab:** Displayed static `[DEMO / TEST]` badges and simulation disclaimers.
- **Case Audit Tab:** Used hardcoded synthetic fallback audit events if initial fetch returned empty arrays.
- **Seller Submission Wizard:** Contained hardcoded demo badges rather than authentic bilateral cryptographic sealing indicators.

---

## 4. Known Blockers & External Dependencies

1. **Live Payment Gateway Execution:** Live PayPal transfers (`PAYPAL_LIVE_ENABLED="false"`) and live UPI banking rail movements are intentionally gated behind certified sandbox/simulation modes to prevent unauthorized financial loss during automated testing and demonstrations.
2. **Native Physical Hardware Validation:** Hardware-level Android CameraX concurrent camera dual-stream capture is simulated and gracefully falls back to sequential single-camera mode with cryptographically chained challenge tokens when running in desktop browsers.
3. **External Merchant Portal Dispatch:** Direct outbound external email and carrier webhook transmissions use local verified simulation channels unless live API keys are provided in environment variables.
