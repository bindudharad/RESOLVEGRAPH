# RESOLVEGRAPH Version 2.0: Installation & Setup Guide

This guide walks you through setting up and running RESOLVEGRAPH Version 2.0 locally for development, testing, and pilot deployment.

---

## 1. Prerequisites

- **Node.js:** v20.0.0 or higher (v24 LTS recommended)
- **npm:** v10.0.0 or higher
- **Operating System:** Windows, macOS, or Linux
- **Android Studio (Optional):** Iguana / Jellyfish or higher with Android SDK 34 (for mobile capture app)

---

## 2. Quickstart

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Database Setup & Synchronization
ResolveGraph uses an embedded SQLite database (`dev.db`). The schema incorporates all Version 2.0 tables:
```bash
# Generate Prisma Client
npm run db:generate

# Sync schema without resetting or wiping baseline cases
npx prisma db push
```

> [!IMPORTANT]
> Never run `npm run db:reset` or `prisma migrate reset --force` on an active development environment, as this will drop existing case and evidence records.

### Step 3: Verify Environment Configuration
Ensure your `.env` file contains the required local secrets:
```env
NODE_ENV=development
PORT=3000
BETTER_AUTH_SECRET="resolvegraph-secure-auth-secret-key-32-chars-min"
BETTER_AUTH_URL="http://localhost:3000"
RESOLVEGRAPH_SIGNING_KEY="resolvegraph-hmac-sha256-signing-secret"
DATABASE_URL="file:./dev.db"
PAYPAL_LIVE_ENABLED=false
PAYPAL_MODE=sandbox
STORAGE_DRIVER=local
```

### Step 4: Run Static Checks & Test Suite
```bash
# Type check with TypeScript compiler
npx tsc --noEmit

# Code quality check with ESLint
npm run lint

# Run all 209 automated tests across 48 suites
npm test
```

### Step 5: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Production Build & Start

To build and run the optimized production server:
```bash
npm run build
npm start
```
Next.js will compile all 50 routes and start the production server on port 3000.

---

## 4. Running the RECOURSE-BENCH Master Benchmark

To evaluate the BERR engine and multimodal pipeline against the 400 ground-truth cases:
```bash
# Generate / refresh the 400-case dataset
npx tsx scripts/evaluation/generate-recourse-bench.ts

# Execute the master evaluation runner
npm run benchmark
```
Evaluation metrics and baseline summaries are saved to `research/results/benchmark_summary.json`.

---

## 5. Android Mobile Capture Setup

The native Android CameraX application is located in `mobile/android/resolvegraph-capture/`.

### Building the APK
1. Open Android Studio.
2. Select **File > Open** and navigate to `C:\Projects\resolvegraph\mobile\android\resolvegraph-capture`.
3. Allow Gradle to sync dependencies (`androidx.camera`, `okhttp3`, `kotlinx-coroutines`).
4. Connect an Android device with USB debugging enabled (or start an emulator with camera support).
5. Configure the base API URL in `app/src/main/java/com/resolvegraph/capture/api/ResolveGraphApiClient.kt` to point to your development workstation IP (e.g. `http://10.0.2.2:3000` for standard emulator, or your LAN IP for physical device).
6. Click **Run > Run 'app'** or build the debug APK:
```bash
cd mobile/android/resolvegraph-capture
./gradlew assembleDebug
```
The APK will be generated at `app/build/outputs/apk/debug/app-debug.apk`.
