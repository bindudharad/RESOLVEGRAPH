# RESOLVEGRAPH — Production Deployment, Infrastructure & Operations Guide

**Project:** RESOLVEGRAPH  
**Team:** TeamNexa  
**Date:** 2026-11-17  
**Branch:** `completion/master-project-completion`  
**Target Environments:** Railway / AWS ECS / Google Cloud Run / Self-Hosted Docker  
**Lead:** Senior DevOps & Cloud Infrastructure Engineer  

---

## 1. Executive Summary

This guide provides the complete architectural specification, environment configuration, containerization instructions, database migration strategies, monitoring runbooks, and disaster recovery procedures necessary to deploy RESOLVEGRAPH in a secure, hardened production environment.

---

## 2. Infrastructure Architecture

```
                  Internet / Cloudflare CDN (WAF + DDoS Protection)
                                      │
                                      ▼
             Ingress / Reverse Proxy (HTTPS TLS 1.3 / Port 443)
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
            App Instance 1 (Next.js)    App Instance 2 (Next.js)
            - Port: 3000                - Port: 3000
            - Node.js 20 LTS            - Node.js 20 LTS
            - Turbopack optimized       - Turbopack optimized
                        └─────────────┬─────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
PostgreSQL Database           Cloudflare R2 / S3            External APIs
- PgBouncer Connection Pool   - Private Evidence Bucket     - Google AI Studio (Gemini)
- Encrypted at rest (AES-256) - Encrypted Storage           - PayPal Sandbox / Live
- Automated Point-in-time     - Signed URL Access Only      - Carrier Tracking Webhooks
```

---

## 3. Production Dockerfile Specification

```dockerfile
# Multi-stage production build for RESOLVEGRAPH
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root security user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set up evidence directory permissions
RUN mkdir -p /app/.private/evidence && chown -R nextjs:nodejs /app/.private

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

---

## 4. Environment Variables Matrix & Secret Management

All production secrets must be managed via secure secret managers (e.g., Railway Variables, AWS Secrets Manager, or HashiCorp Vault). Never commit real secrets to source control.

| Environment Variable | Description | Recommended Production Setting |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment | `production` |
| `DATABASE_URL` | PostgreSQL or SQLite connection string | `postgresql://user:pass@ep-host.aws.neon.tech/resolvegraph?sslmode=require` |
| `NEXTAUTH_SECRET` | Secret key for session encryption & JWT signing | 64-character random hex string (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Canonical public URL of the application | `https://resolvegraph.teamnexa.com` |
| `GEMINI_API_KEY` | Google AI Studio API Key for Gemini 3.5 Flash Lite | `AIzaSy...` (Stored in Secret Manager) |
| `GEMINI_MODEL` | Production LLM model | `gemini-3.5-flash-lite` |
| `EVIDENCE_STORAGE_PATH`| Absolute path for physical digital evidence | `/app/.private/evidence` or persistent mounted volume |
| `PAYPAL_CLIENT_ID` | PayPal REST API Client ID | Enterprise live merchant client ID |
| `PAYPAL_CLIENT_SECRET`| PayPal REST API Client Secret | Enterprise live merchant client secret |
| `PAYPAL_ENVIRONMENT` | PayPal execution mode | `sandbox` (for test/demo) or `live` |
| `FINANCIAL_KILL_SWITCH`| Emergency master breaker | `false` (Set to `true` to immediately lock all financial routes) |
| `NTAG424_MASTER_KEY` | AES-128 cryptographic key for NFC SUN verification | 32-character hex key stored in HSM / Secret Manager |

---

## 5. Database Migration & Deployment Runbook

### 5.1 Deployment Sequence
1. **Pre-flight Checks:**
   - Execute `npm audit` (verify 0 vulnerabilities).
   - Execute `npx tsc --noEmit` and `npm test` in CI runner.
2. **Database Migration:**
   ```bash
   npx prisma migrate deploy
   ```
3. **Application Rollout:**
   - Deploy container instances with zero-downtime rolling restart (Blue/Green or Canary).
   - Verify `/api/health` returns status `UP` with database and AI health checks passing.
4. **Post-Deployment Verification:**
   - Run automated smoke test verifying `/overview`, `/cases`, and `/api/ai/gemini/health`.

### 5.2 Database Backup & Disaster Recovery Drill
- **Scheduled Automated Backups:** Hourly snapshot backups of the database with 30-day retention.
- **SQLite Single-Instance Backup:**
  ```bash
  sqlite3 dev.db ".backup 'backups/backup_$(date +%Y%m%d_%H%M%S).db'"
  ```
- **PostgreSQL Disaster Recovery:**
  ```bash
  pg_dump -Fc $DATABASE_URL > backup.dump
  pg_restore --clean --no-acl --no-owner -d $TARGET_DATABASE_URL backup.dump
  ```

---

## 6. Incident Response & Emergency Procedures

### 6.1 Emergency Financial Kill Switch
In the event of an identified fraud pattern, payment gateway outage, or suspicious automated refund behavior, the platform investigator or DevOps engineer can activate the global financial kill switch:

```bash
# Emergency Kill Switch Activation
curl -X POST https://resolvegraph.teamnexa.com/api/admin/kill-switch \
  -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "reason": "Immediate security audit triggered"}'
```

**Result:** All refund requests, payout disbursements, and financial executions will immediately fail closed with HTTP 503 and log audit alerts.

### 6.2 Application Observability & Logs
- All structured logs are written in JSON to `stdout` / `stderr`.
- Health check endpoint `/api/health` reports status on:
  - Database connectivity and response latency.
  - Active AI provider status (`LIVE_AI`, `DETERMINISTIC`, or `DEGRADED`).
  - Evidence filesystem accessibility and free disk space.
  - Financial kill switch status.
