# RESOLVEGRAPH — Production Deployment Architecture & Guide

This document describes the enterprise production deployment specifications for **RESOLVEGRAPH** (Evidence-First Commerce Resolution Infrastructure).

---

## 1. System Topology Overview

```
                                [ Cloudflare Edge / WAF ]
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
       [ Next.js Web App / API ]                     [ Background Analysis Worker ]
          (Vercel / AWS ECS)                           (Persistent Node.js / Docker)
                  │                                               │
        ┌─────────┴─────────┐                           ┌─────────┴─────────┐
        ▼                   ▼                           ▼                   ▼
[ Neon PostgreSQL ]  [ AWS S3 / R2 ]            [ Neon PostgreSQL ]  [ OpenAI API ]
 (Database & Read)   (Evidence Vault)            (BERR Queue / DB)   (Multimodal Vision)
        │
        ▼
[ PayPal Sandbox / REST API ]
  - Orders V2 & Captures
  - Refunds & Webhooks
  - Customer Disputes V1
```

---

## 2. Infrastructure Requirements

| Component | Technology | Recommended Production Provider | Minimum Spec |
| :--- | :--- | :--- | :--- |
| **Frontend & API** | Next.js 16 (App Router) | Vercel Pro or AWS ECS Fargate | 2 vCPU, 4GB RAM (autoscaling) |
| **Database** | PostgreSQL 16+ | Neon, Supabase, or AWS Aurora RDS | 2 vCPU, 4GB RAM, PgBouncer pool |
| **Evidence Storage** | S3-Compatible Object Store | AWS S3 or Cloudflare R2 | Private bucket, SSE-S3 encryption |
| **Background Worker** | Node.js TSX Runner | Render, Railway, or AWS ECS | 1 vCPU, 2GB RAM |
| **Payments Gateway** | PayPal REST V2 / Webhooks | PayPal Developer Platform | Sandbox for evaluation; Live partner |
| **AI Inference** | Multimodal LLM + Embeddings | OpenAI API (`gpt-4o`, `text-embedding-3`) | Tier 2+ API limits |

---

## 3. Database Migration: SQLite to Managed PostgreSQL

In development, ResolveGraph uses SQLite (`dev.db`). For high-concurrency production deployments:

### Step 3.1: Switch Prisma Datasource Provider
In `prisma/schema.prisma`, update the datasource:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Step 3.2: Run Prisma Migrations
Execute against your production database using `DIRECT_URL`:
```bash
npx prisma migrate deploy
```

### Step 3.3: Verify Connection & Indexes
Run the automated database health verification:
```bash
curl -I https://your-domain.com/api/health
```

---

## 4. Private Evidence Locker (S3 / R2 Setup)

Evidence uploaded to ResolveGraph contains sensitive commercial documents, receipts, and condition photos.

1. **Bucket Privacy:** Set S3 bucket policy to **Private** (`Block all public access = ON`).
2. **Access Control:** Generate an IAM User or Role with scoped permissions:
   - `s3:GetObject`
   - `s3:PutObject`
   - `s3:DeleteObject` (optional for retention pruning)
3. **Signed URLs:** All evidence previews and downloads are streamed through signed authorization handlers (`/api/evidence/[evidenceId]/download`) requiring validated Better Auth sessions and multi-tenant permission checks (`canViewEvidence`).
4. **Magic Byte Inspection:** File uploads are checked against binary headers (JPEG, PNG, WEBP, PDF) before saving. Executables and scripts are rejected upfront.

---

## 5. PayPal Production Configuration & Security

### Hard-Coded Live Safety Guard
To eliminate accidental live monetary charges during hackathons and testing, `src/server/paypal/paypal-config.ts` enforces:
```ts
if (env === 'live' && process.env.PAYPAL_LIVE_ENABLED !== 'true') {
  throw new Error("CRITICAL SAFETY BLOCK: Live PayPal mode requested but PAYPAL_LIVE_ENABLED is not 'true'.");
}
```

### Webhook Verification
PayPal webhooks are validated by `WebhookVerificationService`:
- Validates transmission headers: `paypal-transmission-id`, `paypal-transmission-time`, `paypal-transmission-sig`, `paypal-cert-url`.
- SSRF Prevention: Confirms `paypal-cert-url` host matches `api.paypal.com` or `api.sandbox.paypal.com`.
- Webhooks are stored in `PayPalWebhookEvent` and processed idempotently via unique `paypalEventId`.

---

## 6. Zero-Downtime Deployment Steps (Vercel / Railway)

1. **Configure Environment Variables:**
   Populate all keys defined in `.env.production.example`.
2. **Build Verification:**
   Ensure zero TypeScript compilation errors and clean Turbopack build:
   ```bash
   npm run build
   ```
3. **Run Automated Test Suite:**
   ```bash
   npm test
   ```
4. **Deploy Application:**
   ```bash
   vercel --prod
   # or
   railway up
   ```
5. **Verify Endpoint Health:**
   ```bash
   curl https://resolvegraph.com/api/health
   # Expected response: 200 OK {"status":"healthy"}
   ```

---

## 7. Secrets Rotation & Security Best Practices

- **Quarterly Rotation:** Rotate `PAYPAL_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, and `OPENAI_API_KEY` every 90 days.
- **Idempotency Keys:** Every refund operation generates a unique idempotency key (`PayPal-Request-Id`). If network latency causes retries, the payment gateway safely returns the existing transaction without double-debiting.
- **Data Redaction:** Credit card numbers (Luhn checked), CVVs, and API keys are automatically masked by `DataRedactor` before being passed to AI inference or stored in metadata fields.
