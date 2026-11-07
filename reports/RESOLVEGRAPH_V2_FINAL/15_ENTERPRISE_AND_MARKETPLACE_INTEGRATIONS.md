# 15. Enterprise Merchant APIs & Marketplace Integrations

**Directory:** `src/app/api/enterprise/`, `src/server/integrations/marketplace/`  
**Authentication:** `src/server/auth/enterprise-api-auth.ts`  
**Test Verification:** `tests/v2-full-lifecycle.test.ts`

---

## 1. Marketplace Adapters

ResolveGraph integrates seamlessly with major e-commerce marketplaces:
- **Amazon SP-API Adapter (`amazon.adapter.ts`):** Validates HMAC SHA-256 signatures, extracts Amazon Order ID, buyer email, order total, and item specifications.
- **Flipkart Adapter (`flipkart.adapter.ts`):** Ingests Flipkart Assured webhooks, maps FSN inventory identifiers, and creates Purchase Memory.
- **Merchant Custom Webhook Adapter (`merchant-webhook.adapter.ts`):** Standardized schema for direct Shopify, WooCommerce, and custom headless storefronts.

---

## 2. Enterprise REST API Suite

Enterprise merchants automate fulfillment registration directly through secured endpoints:
- **`POST /api/enterprise/orders`:** Batch order intake into immutable Purchase Memory.
- **`POST /api/enterprise/packages`:** Outbound package passport registration and seal binding.
- **`POST /api/enterprise/dispatch`:** Carrier dispatch confirmation.
- **`GET /api/enterprise/proposals`:** Bilateral dispute settlement query.

**Security & Rate Limiting:**
- Authenticated via `x-resolvegraph-api-key` header.
- Scoped permissions (`orders:write`, `packages:write`, `dispatch:write`).
- Enforces enterprise rate limits with `x-ratelimit-limit` and `x-ratelimit-remaining` response headers.
