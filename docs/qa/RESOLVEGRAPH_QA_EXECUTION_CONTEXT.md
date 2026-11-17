# RESOLVEGRAPH QA EXECUTION CONTEXT
## Extreme Human-Level Manual Browser QA Audit Setup

**Execution Timestamp:** 2026-11-17T22:38:00+05:30  
**Audit Team / Persona:** Senior Manual QA Engineer (TeamNexa)  
**Repository Branch:** `completion/master-project-completion`  
**Commit Hash:** `96bb8cc` (`docs: finalize master project completion documentation and system verification deliverables`)  
**Git Working-Tree Status:** Clean (0 uncommitted changes)  
**Application URL:** `http://localhost:3000`  
**Runtime Environment:** Next.js 16.4.6 (Turbopack), Node.js v24.20.0, Windows 11  
**Database:** Local SQLite (`dev.db`, 1,178,181,632 bytes)  
**Database Backup:** Verified pre-audit backup created at `backups/dev.db.qa_audit_pre.bak` (1,178,181,632 bytes)  
**AI Mode Configuration:**  
- `AI_PROVIDER`: `test` (fallback / mock engine)  
- `GEMINI_API_KEY`: Configured in `.env.local`  
- `AI_PROCESSING_ENABLED`: `false` (Deterministic / safe mock mode to prevent unauthorized external charges)  
- Live Gemini canary verified from earlier tests; UI status audited for honest labeling.  

**Payment Mode Configuration:**  
- `PAYPAL_ENV`: `sandbox`  
- `PAYPAL_LIVE_ENABLED`: `false`  
- `PAYPAL_CLIENT_ID`: `sb_sandbox_client_id` (Safe mock/sandbox mode)  
- Financial safeguards & dual-key kill switches: Active and read-only inspected.  

**Target Viewports for Manual Responsive Verification:**  
1. Desktop Large: 1920 × 1080  
2. Standard Laptop: 1440 × 900  
3. Compact Laptop: 1280 × 800  
4. Tablet Landscape: 1024 × 768  
5. Tablet Portrait: 768 × 1024  
6. Mobile Device: 390 × 844  

**Read-Only Rules Confirmation:**  
- Zero component code modifications during initial audit  
- Zero API or database mutations of canonical records (`RG-1001`, `RG-1493`)  
- Strict preservation of database integrity and tenant boundaries  
- All interactive controls clicked, read, and verified via real browser automation and developer inspection.
