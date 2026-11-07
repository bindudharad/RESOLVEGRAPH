# RESOLVEGRAPH — Complete Local & Production Setup Guide
**Phase:** Step 11 Final Submission & Presentation Readiness  
**Target:** Developers, Evaluators, Infrastructure Engineers  
**Version:** 1.0.0 (November 2026)

---

## 1. System Requirements

- **Node.js**: `v20.10.0` or higher (`v24.0.0` recommended)
- **NPM**: `v10.0.0` or higher
- **RAM**: Minimum 4 GB (8 GB recommended for build & AI workers)
- **Disk Space**: 1 GB free space for node_modules and SQLite database

---

## 2. Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/resolvegraph.git
cd resolvegraph
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Choose the template that fits your environment:
```bash
# For local evaluation and demo testing:
cp .env.example .env
```

Verify that `.env` includes:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="dev-better-auth-secret-minimum-32-chars-long!"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AI_PROCESSING_ENABLED=true
AI_PROVIDER=openai
OPENAI_API_KEY="" # Optional: fallback heuristic active if empty
PAYPAL_ENV=sandbox
PAYPAL_LIVE_ENABLED=false
```

### Step 4: Initialize the Database
```bash
# Generate the Prisma Client
npm run db:generate

# Seed multi-tenant users, sample cases, and RG-1001 demo baseline
npm run db:seed
```

### Step 5: Start the Local Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.  
To jump directly to the 8-stage interactive demo, open **`http://localhost:3000/demo`**.

---

## 3. Running Verification Drills & Automated Tests

ResolveGraph provides comprehensive scripts to verify all aspects of the application:

```bash
# Run all 170 unit and integration tests (39 test suites)
npm test

# Run the 300-case RECOURSE-BENCH evaluation suite
npm run benchmark

# Run the 891ms database backup-and-restoration drill
npm run db:drill

# Run the physical evidence storage parity audit
npm run storage:reconcile

# Run the payment ledger discrepancy reconciliation audit
npm run payments:reconcile

# Run strict TypeScript compiler verification
npx tsc --noEmit

# Run ESLint style & Next.js agent rule audit
npm run lint

# Build the optimized production application (36 routes)
npm run build
```

---

## 4. PayPal Sandbox Configuration (Optional)

If you wish to test live PayPal Sandbox popups with your own developer account:
1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com).
2. Create a REST API app under **Sandbox Accounts**.
3. Copy **Client ID** and **Secret Key**.
4. Set in your `.env`:
   ```env
   PAYPAL_CLIENT_ID="your_sandbox_client_id"
   PAYPAL_CLIENT_SECRET="your_sandbox_client_secret"
   NEXT_PUBLIC_PAYPAL_CLIENT_ID="your_sandbox_client_id"
   ```
5. Restart the server (`npm run dev`).
