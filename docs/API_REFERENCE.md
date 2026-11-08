# RESOLVEGRAPH — Complete REST API Reference Manual
**Document ID:** RG-API-2026-V2  
**Base URL:** `http://localhost:3000` (Local) / `https://resolvegraph.internal` (Production)  
**Standard Response Formats:** JSON (`application/json`), Multi-part Form Data (`multipart/form-data`) for Evidence Uploads  
**Authentication Scheme:** Better-Auth Session Cookies / Bearer API Tokens / HMAC Signature Headers

---

## 1. System & Operational Endpoints

### 1.1 Health Check
- **`GET /api/health`**
  - **Auth Required:** No
  - **Description:** Verifies SQLite/PostgreSQL connection health, Evidence Vault status, and database metrics.
  - **Response 200 OK:**
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-11-08T09:30:00.000Z",
      "uptimeSeconds": 3600,
      "database": {
        "connected": true,
        "type": "sqlite",
        "stats": { "users": 13, "cases": 154, "evidence": 117 }
      }
    }
    ```

### 1.2 Hash-Chained Audit Ledger
- **`GET /api/audit/chained`**
  - **Auth Required:** Yes (`ADMIN` or `INVESTIGATOR`)
  - **Description:** Verifies cryptographic continuity of all historical audit blocks using SHA-256 link validation.
  - **Response 200 OK:**
    ```json
    {
      "status": "VERIFIED",
      "totalBlocks": 154,
      "headBlockHash": "3a8f...9b2c",
      "tamperDetected": false
    }
    ```

### 1.3 Administrative Kill-Switch
- **`GET /api/admin/kill-switch`**
  - **Auth Required:** Yes (`ADMIN`)
  - **Description:** Returns the global kill-switch status and per-provider circuit-breaker statuses.
- **`POST /api/admin/kill-switch`**
  - **Auth Required:** Yes (`ADMIN` with Master Secret)
  - **Body:**
    ```json
    {
      "scope": "GLOBAL" | "PAYPAL" | "UPI" | "CARRIER",
      "active": true | false,
      "adminSecret": "Admin@ResolveGraph2026!"
    }
    ```
  - **Response 200 OK:** Updated kill switch configuration.

---

## 2. Universal Evidence Intake & Vault

### 2.1 Universal Evidence Upload
- **`POST /api/evidence/intake`**
  - **Auth Required:** Yes (`BUYER`, `MERCHANT`, `SUPPORT`, `ADMIN`)
  - **Content-Type:** `multipart/form-data`
  - **Form Fields:**
    - `file`: Binary file (PDF, JPEG, PNG, MP4)
    - `caseId`: UUID of associated case
    - `title`: Short title
    - `category`: `INVOICE` | `TRACKING_PROOF` | `DAMAGE_PHOTO` | `BANK_STATEMENT` | `UNBOXING_VIDEO`
    - `perspective`: `BUYER` | `MERCHANT` | `CARRIER`
  - **Security Enforcement:** Magic byte inspection, SHA-256 digest computation, path traversal isolation.
  - **Response 201 Created:**
    ```json
    {
      "id": "ev_89214981",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "fileSize": 204859,
      "mimeType": "application/pdf"
    }
    ```

### 2.2 Secure Stream Download
- **`GET /api/evidence/[evidenceId]/download`**
  - **Auth Required:** Yes (Tenant membership check)
  - **Headers Emitted:** `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment`
  - **Response:** Raw binary stream.

---

## 3. Canonical Transactions & 10-Tier Reconciliation

### 3.1 Ingest Canonical Transaction
- **`POST /api/transactions/canonical`**
  - **Auth Required:** Yes (`MERCHANT`, `ADMIN`)
  - **Body:**
    ```json
    {
      "provider": "PHONEPE" | "PAYPAL" | "AXIS_BANK" | "SBI",
      "providerTransactionId": "TX-89214-UPI",
      "urn": "UPI/AXIS/405829103948",
      "amountMinor": 450000,
      "currency": "INR",
      "status": "CAPTURED" | "PENDING" | "FAILED",
      "timestamp": "2026-02-24T14:22:00Z"
    }
    ```

### 3.2 Execute 10-Tier Batch Reconciliation
- **`POST /api/transactions/reconcile`**
  - **Auth Required:** Yes (`INVESTIGATOR`, `ADMIN`)
  - **Body:** `{"batchId": "AXIS-SETTLE-20260220"}`
  - **Response 200 OK:**
    ```json
    {
      "matchedPairs": 48,
      "unmatchedCount": 2,
      "discrepancies": [
        {
          "transactionId": "TX-89214-UPI",
          "matchedTier": 1,
          "discrepancyType": "DEBITED_NOT_CREDITED",
          "confidence": 1.0
        }
      ]
    }
    ```

---

## 4. Case Management & Bilateral Evidence Graph

### 4.1 List Cases
- **`GET /api/cases`**
  - **Query:** `page`, `limit`, `status`, `search`, `category`
  - **Response 200 OK:** Paginated list of cases scoped to the requesting user's tenant organization.

### 4.2 Bilateral Evidence Graph
- **`GET /api/cases/[caseId]/graph`**
  - **Response 200 OK:**
    ```json
    {
      "nodes": [
        { "id": "ev_01", "label": "Bank Statement", "party": "BUYER", "type": "EVIDENCE" },
        { "id": "ev_02", "label": "Carrier Slip", "party": "MERCHANT", "type": "EVIDENCE" }
      ],
      "edges": [
        { "source": "ev_01", "target": "ev_02", "relationship": "CONTRADICTS", "discrepancyScore": 0.85 }
      ]
    }
    ```

### 4.3 BERR v2 Reasoning & Gating
- **`GET /api/cases/[caseId]/berr-v2`**
  - **Response 200 OK:** Four-quadrant classification (`agreedFacts`, `verifiedFacts`, `contestedFacts`, `missingEvidence`), `objectiveUncertainty`, and `adversarialReviewVerdict`.

---

## 5. Preventive Commerce: Purchase Memory & Package Passport

### 5.1 Create Purchase Memory
- **`POST /api/purchases/memory`**
  - **Body:** `{"orderId": "ORD-2026-MBP-8921", "specifications": { "ram": "16GB", "storage": "512GB" }}`
  - **Response 201 Created:** Immutable snapshot with SHA-256 seal.

### 5.2 Compare Dispute Against Purchase Memory
- **`POST /api/purchases/[id]/compare-dispute`**
  - **Body:** `{"claimedSpecs": { "storage": "256GB" }}`
  - **Response 200 OK:** Computes spec drift delta and flags mismatch.

### 5.3 Public Package Verification
- **`GET /api/packages/verify/[token]`**
  - **Auth Required:** No (Public endpoint)
  - **Response 200 OK:** Verified dispatch metadata, carrier tracking status, and seal integrity state.

---

## 6. Dual-Sight Unboxing Engine

### 6.1 Initiate Unboxing Session
- **`POST /api/unboxing/sessions`**
  - **Body:** `{"packagePassportId": "PKG-PASSPORT-2026-9921"}`
  - **Response 201 Created:** `{"sessionToken": "SESS-UNBOX-8912", "expiresAt": "...", "challenge": "..."}`

### 6.2 Upload Video Chunk
- **`POST /api/unboxing/sessions/[token]/upload`**
  - **Content-Type:** `multipart/form-data`
  - **Body:** `chunkIndex`, `totalChunks`, `chunk` (video/mp4 binary)
  - **Response 200 OK:** Chunk accepted and reassembled.

---

## 7. Shared Resolution Room & Financial Safeguards

### 7.1 Bilateral Messaging
- **`POST /api/cases/[caseId]/messages`**
  - **Body:** `{"content": "...", "visibility": "SHARED" | "INTERNAL_MERCHANT"}`

### 7.2 Propose Remedy
- **`POST /api/resolution-proposals`**
  - **Body:** `{"caseId": "...", "type": "PARTIAL_REFUND", "amountMinor": 1500000, "currency": "INR"}`
  - **Response 201 Created:** Proposal in status `OFFERED`.

### 7.3 Respond to Proposal
- **`POST /api/resolution-proposals/[proposalId]/respond`**
  - **Body:** `{"action": "ACCEPT" | "REJECT" | "COUNTER", "counterAmountMinor": 2000000}`

### 7.4 Execute Financial Payout with Safeguards Gate
- **`POST /api/cases/[caseId]/financial-safeguards`**
  - **Body:**
    ```json
    {
      "proposalId": "prop_8921",
      "managerApprovalKey": "MGR-AUTH-TECHSTORE-SECURE",
      "idempotencyKey": "IDEMP-8921-REFUND"
    }
    ```
  - **Enforcement:** 10-point safeguard gate, dual-key verification, balance ceiling check.
  - **Response 200 OK:** `{"payoutStatus": "EXECUTED", "receiptId": "REC-8921"}`.
