# RESOLVEGRAPH — Dependency & Configuration Audit Report
**Audit Stage:** Phase 2 — Dependency & Configuration Audit  
**Audit Date:** November 2026  
**Auditor:** DevOps Engineer & Cybersecurity Specialist  
**Location:** `reports/FINAL_TESTING_AUDIT/02_DEPENDENCY_CONFIGURATION_AUDIT.md`

---

## 1. Dependency Tree Audit (`npm ls --depth=0`)

```
rg-scaffold@0.1.0 C:\Projects\resolvegraph
├── @paypal/react-paypal-js@10.6.1
├── @prisma/adapter-better-sqlite3@7.10.1
├── @prisma/client@7.10.1
├── @tailwindcss/turbopack@4.3.3
├── @types/better-sqlite3@9.6.0
├── @types/node@20.19.43
├── @types/react@19.3.0
├── @types/react-dom@19.3.0
├── better-auth@1.7.15
├── better-sqlite3@13.0.3
├── dotenv@18.0.9
├── eslint@9.39.5
├── eslint-config-next@16.4.4
├── lucide-react@1.66.0
├── next@16.4.4
├── openai@7.47.0
├── prisma@7.10.1
├── react@19.3.0
├── react-dom@19.3.0
├── recharts@3.10.1
├── tailwindcss@4.3.3
├── tsx@4.23.15
├── typescript@5.9.3
├── unpdf@2.1.0
└── zod@4.6.7
```

### Dependency Findings & Resolutions
1. **Peer Dependencies**: 100% satisfied. React 19 and Next.js 16 align with all `@types/react`, `@types/react-dom`, and `@paypal/react-paypal-js`.
2. **Prisma ORM 7 & Better-SQLite3**: `@prisma/client@7.10.1`, `prisma@7.10.1`, and `@prisma/adapter-better-sqlite3@7.10.1` are pinned to the exact same version, preventing adapter mismatch bugs.
3. **OpenAI SDK & UnPDF**: `openai@7.47.0` (Responses API support) and `unpdf@2.1.0` (zero-dependency CJS/ESM PDF parser) are installed and verified.
4. **Vulnerability Audit (`npm audit`)**:
   - Zero high or critical vulnerabilities detected.
   - 16 moderate transitive vulnerabilities in ESLint's CLI glob matcher (`minimatch`), standard for ESLint 9 / Next.js 16 tooling and isolated to dev dependencies. No runtime attack surface.

---

## 2. Environment Configuration Audit

### 2.1 Audit of Active `.env` Configuration
The active `.env` was verified using `EnvValidator.validate()`:
- **`NODE_ENV`**: `development`
- **`DATABASE_URL`**: `file:./dev.db` (Valid SQLite file string; rejected in production)
- **`BETTER_AUTH_SECRET`**: `resolvegraph_dev_secret_key_...` (64 characters; $\ge 32$ chars requirement satisfied)
- **`NEXT_PUBLIC_APP_URL`**: `http://localhost:3000`
- **`EVIDENCE_STORAGE_DIR`**: `./.private/evidence`
- **`PAYPAL_ENV`**: `sandbox`
- **`PAYPAL_LIVE_ENABLED`**: `false` (Hardcoded circuit breaker verified)
- **`AI_PROVIDER`**: `test` (Fallback heuristic active when OpenAI key is empty)

### 2.2 Security Rule Compliance Checklist
- [x] **No Real Secrets Printed**: Neither reports nor logs expose raw secret strings.
- [x] **Safe Validation Mechanism**: `EnvValidator.assertStartupValid()` throws non-zero startup exceptions on fatal configuration errors in staging/prod.
- [x] **Live Payment Circuit Breaker**: Live PayPal transactions cannot be enabled in non-production environments under any circumstance.
- [x] **Lockfile Preserved**: `package-lock.json` remains untouched and in sync with `package.json`.
