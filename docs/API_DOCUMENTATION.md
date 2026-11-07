# RESOLVEGRAPH — Complete REST API Specification
**Phase:** Step 11 Final Submission & Presentation Readiness  
**Base URL:** `http://localhost:3000/api` (Local) / `https://app.resolvegraph.com/api` (Production)  
**Authentication:** Cookie Session / Bearer Token (`Better-Auth`)  
**Format:** JSON (`Content-Type: application/json` or `multipart/form-data`)  
**Version:** 1.0.0 (November 2026)

---

## 1. Core Dispute & Case Management APIs

### 1.1 List & Filter Cases
- **Endpoint**: `GET /api/cases`
- **Query Parameters**:
  - `status`: CaseStatus enum filter (`SUBMITTED`, `IN_REVIEW`, `RESOLVED`, etc.)
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`)
- **Response**:
  ```json
  {
    "cases": [
      {
        "id": "cmw0m6n310000fcvjzk8r347a",
        "caseNumber": "RG-1001",
        "title": "Hardware Storage Capacity Discrepancy",
        "category": "NOT_AS_DESCRIBED",
        "status": "SUBMITTED",
        "amountMinor": 7999,
        "currency": "USD"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 109 }
  }
  ```

### 1.2 Get Case Dossier
- **Endpoint**: `GET /api/cases/:caseId`
- **Response**: Full case object including relations: `claims`, `evidence`, `timelineEvents`, `proposals`, `order`.

### 1.3 Create Case
- **Endpoint**: `POST /api/cases`
- **Body**:
  ```json
  {
    "title": "Delivered Drive 512GB instead of 1TB",
    "description": "Purchased ApexDrive 1TB NVMe, packaging contained 512GB.",
    "category": "NOT_AS_DESCRIBED",
    "amountMinor": 7999,
    "currency": "USD",
    "buyerId": "usr_alex_buyer",
    "merchantId": "usr_carlos_merchant"
  }
  ```

---

## 2. Evidence & File Locker APIs

### 2.1 Upload Evidence Document
- **Endpoint**: `POST /api/cases/:caseId/evidence`
- **Content-Type**: `multipart/form-data`
- **Payload**: Form fields `file` (binary), `evidenceType` (`PHOTO`, `INVOICE`, `RECEIPT`), `description`.
- **Validation**:
  - Magic-byte binary sniffing (`image/jpeg`, `image/png`, `application/pdf`).
  - Strict size limit (10 MB).
  - SHA-256 hash automatically computed and stored in database.

---

## 3. Multimodal AI & BERR Reasoning APIs

### 3.1 Trigger AI Investigation Run
- **Endpoint**: `POST /api/cases/:caseId/analysis`
- **Body**: `{ "priority": "HIGH", "includeVision": true }`
- **Response**:
  ```json
  {
    "runId": "run_berr_demo_01",
    "status": "COMPLETED",
    "discrepancyScore": 0.88,
    "findings": [
      {
        "discrepancyType": "NUMERICAL_CAPACITY_MISMATCH",
        "severity": "CRITICAL",
        "buyerClaimFact": "512 GB",
        "merchantInvoiceFact": "1000 GB",
        "confidence": 0.94
      }
    ]
  }
  ```

---

## 4. Multi-Agent Copilot APIs

### 4.1 Dispatch Agent Copilot Workflow
- **Endpoint**: `POST /api/copilot/runs`
- **Body**:
  ```json
  {
    "caseId": "cmw0m6n310000fcvjzk8r347a",
    "prompt": "Investigate capacity discrepancy and prepare eligible partial refund proposal."
  }
  ```

### 4.2 Sign Human Approval Request
- **Endpoint**: `POST /api/copilot/approvals/:approvalId/respond`
- **Body**:
  ```json
  {
    "decision": "APPROVED",
    "signedArgumentsHash": "a7f9c2d...",
    "managerNotes": "Verified capacity clash. Approving $25 partial refund."
  }
  ```

---

## 5. PayPal Payments & Disputes APIs

### 5.1 Initialize PayPal Order Session
- **Endpoint**: `POST /api/payments/paypal/orders`
- **Body**: `{ "orderId": "ORD-2026-8841", "amountMinor": 7999, "currency": "USD" }`

### 5.2 Capture PayPal Order
- **Endpoint**: `POST /api/payments/paypal/orders/:orderId/capture`
- **Body**: `{ "paypalOrderId": "5O190127TN364715T" }`

### 5.3 Execute Human-Authorized Refund
- **Endpoint**: `POST /api/payments/:paymentId/refund`
- **Body**:
  ```json
  {
    "proposalId": "prop_demo_7721",
    "amountMinor": 2500,
    "currency": "USD",
    "reason": "Agreed partial refund for 512GB vs 1TB specification difference"
  }
  ```

### 5.4 PayPal Webhook Ingress
- **Endpoint**: `POST /api/webhooks/paypal`
- **Headers Required**: `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-TIME`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-CERT-URL`.

---

## 6. System Health & Observability APIs

### 6.1 Subsystem Health Probe
- **Endpoint**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-04T07:00:00.000Z",
    "database": { "status": "connected", "latencyMs": 4 },
    "ai": { "configured": true, "model": "gpt-4o-mini", "mode": "openai" },
    "paypal": { "configured": true, "mode": "sandbox", "liveEnabled": false },
    "flags": {
      "aiAnalysisEnabled": true,
      "agentCopilotEnabled": true,
      "paypalLiveEnabled": false
    }
  }
  ```
