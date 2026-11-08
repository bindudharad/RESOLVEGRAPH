# RESOLVEGRAPH — Production Deployment Architecture & Guide
**Document ID:** RG-DEP-2026-V2  
**Classification:** Enterprise Systems & Infrastructure Standard  
**Runtime:** Next.js 16 (Turbopack) on Node.js 20+ LTS  
**Process Topology:** Dual-Tier (Web API Cluster + Persistent Background Worker)

---

## 1. System Topology Overview

```
                                [ Cloudflare Edge / WAF / SSL ]
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
          [ Nginx Reverse Proxy (Rate Limiting) ]             [ Direct Webhooks ]
                       │                                               │
                       ▼                                               ▼
          [ Next.js Web App / API ] (PM2 Cluster)       [ Background Analysis Worker ]
             - Port 3000                                   - ai-worker.ts (Durable Queue)
             - 67 Routes                                   - payments:reconcile cron
                       │                                               │
             ┌─────────┴─────────┐                           ┌─────────┴─────────┐
             ▼                   ▼                           ▼                   ▼
     [ PostgreSQL 16+ ]   [ S3 / R2 Vault ]          [ PostgreSQL 16+ ]   [ OpenAI API ]
      (or SQLite WAL)     (SHA-256 Vault)             (BERR Queue / DB)    (Vision/Embeddings)
             │
             ▼
    [ Payment Gateways ]
      - PayPal Orders V2 / Webhooks / Disputes
      - UPI / NPCI UDIR Switch Simulation
      - Card Network Gateways
```

---

## 2. Production Environment Variables Reference

| Variable Name | Required | Default / Example | Purpose / Security Guard |
|---|:---:|---|---|
| `NODE_ENV` | Yes | `production` | Enables production optimizations and disables debug traces. |
| `DATABASE_URL` | Yes | `file:./dev.db` or `postgresql://...` | Prisma database connection string. |
| `BETTER_AUTH_SECRET` | Yes | `[256-bit cryptographically secure string]` | Signs session cookies and auth tokens. |
| `BETTER_AUTH_URL` | Yes | `https://resolvegraph.internal` | Canonical app URL for callback validation. |
| `PAYPAL_CLIENT_ID` | Yes | `sb-client-id-...` | PayPal REST API client identifier. |
| `PAYPAL_CLIENT_SECRET` | Yes | `sb-secret-...` | PayPal REST API client secret. |
| `PAYPAL_MODE` | Yes | `sandbox` | `sandbox` or `live`. |
| `PAYPAL_LIVE_ENABLED` | **CRITICAL** | `false` | **MUST BE FALSE** in non-live environments to prevent live charges. |
| `PAYPAL_WEBHOOK_ID` | Yes | `WH-...` | Verifies incoming PayPal dispute webhooks. |
| `OPENAI_API_KEY` | Optional | `sk-...` | Multimodal fact extraction and BERR reasoning. |
| `EVIDENCE_STORAGE_DIR` | Yes | `C:\Projects\resolvegraph\.private\evidence` | Local directory or mount for Evidence Vault. |
| `S3_BUCKET_NAME` | Optional | `resolvegraph-vault` | S3 bucket name if using object storage. |
| `S3_REGION` | Optional | `us-east-1` | AWS region for evidence bucket. |
| `ADMIN_MASTER_SECRET` | Yes | `[HMAC secret]` | Required to toggle the Administrative Kill-Switch. |
| `PORT` | Optional | `3000` | HTTP port for the Next.js server. |

---

## 3. Reverse Proxy Configuration (Nginx)

For self-hosted Linux or Windows deployments, place Nginx in front of Next.js for TLS termination, compression, and request buffering:

```nginx
upstream resolvegraph_web {
    server 127.0.0.1:3000 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 80;
    server_name resolvegraph.internal;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name resolvegraph.internal;

    ssl_certificate /etc/ssl/certs/resolvegraph.crt;
    ssl_certificate_key /etc/ssl/private/resolvegraph.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req zone=api_limit burst=50 nodelay;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com; connect-src 'self' https://api.openai.com https://api.sandbox.paypal.com;" always;

    location / {
        proxy_pass http://resolvegraph_web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }
}
```

---

## 4. Process Management (PM2)

ResolveGraph requires two managed processes in production:
1. The **Next.js Web Server** (`npm start`).
2. The **Durable Background AI Worker** (`npm run ai:worker`).

Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'resolvegraph-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '1G'
    },
    {
      name: 'resolvegraph-worker',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'scripts/ai-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '1G'
    }
  ]
};
```

Run with:
```powershell
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 5. Health Checks & Verification Endpoints

- **System Health:** `GET /api/health`
  - Validates SQLite / PostgreSQL database connectivity.
  - Verifies Evidence Vault read/write capability.
  - Returns HTTP 200 `{"status": "healthy", "timestamp": "...", "database": "connected"}`.
- **Audit Verification:** `GET /api/audit/chained`
  - Verifies cryptographic continuity of the hash-chained audit ledger.
- **Admin Kill-Switch Status:** `GET /api/admin/kill-switch`
  - Reports operational status of individual payment provider connectors.

---

## 6. Zero-Downtime Deployment Runbook

1. **Pull and Install Dependencies:**
   ```powershell
   git checkout main && git pull
   npm ci
   ```
2. **Build and Validate Quality Gates:**
   ```powershell
   npx tsc --noEmit
   npm run lint
   npm test
   npm run build
   ```
3. **Database Migration:**
   ```powershell
   npm run db:drill
   npx prisma migrate deploy
   ```
4. **Reload PM2 Cluster:**
   ```powershell
   pm2 reload ecosystem.config.cjs --update-env
   ```
5. **Verify Live Health:**
   ```powershell
   curl http://localhost:3000/api/health
   ```
