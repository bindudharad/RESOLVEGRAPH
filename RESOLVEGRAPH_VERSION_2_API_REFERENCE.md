# RESOLVEGRAPH Version 2.0: API Reference Manual

Complete reference for all RESOLVEGRAPH Version 2.0 REST API endpoints.

---

## 1. Authentication & Security Headers

All requests to workspace routes require an active session cookie managed by Better Auth, or an authorization header:
```http
Cookie: better-auth.session_token=<SESSION_TOKEN>
```
Public routes (`/api/packages/verify/[token]`, `/api/health`) require no session authentication.

---

## 2. Purchase Memory & Detection (Modules 05 & 06)

### `POST /api/purchases/detect`
Parses raw order input (email confirmation, invoice text, CSV) and normalizes specifications.
- **Request Body:**
  ```json
  {
    "source": "EMAIL_TEXT",
    "rawContent": "Order Confirmation #ORD-9821...\nTotal: $1,249.00 USD..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "parsed": {
      "orderNumber": "ORD-9821",
      "totalAmountMinor": 124900,
      "currency": "USD",
      "specifications": [
        { "key": "Storage", "value": "1TB NVMe SSD", "importance": "CRITICAL" }
      ],
      "promises": [
        { "claim": "Brand New Factory Sealed Box", "source": "SELLER_LISTING" }
      ]
    }
  }
  ```

### `POST /api/purchases/memory`
Crystallizes detected specifications into an immutable Purchase Memory baseline.
- **Request Body:**
  ```json
  {
    "orderNumber": "ORD-9821",
    "merchantOrganizationId": "org_techstore",
    "buyerId": "usr_alex_buyer",
    "totalAmountMinor": 124900,
    "currency": "USD",
    "specifications": [{ "key": "Storage", "value": "1TB NVMe SSD", "importance": "CRITICAL" }],
    "promises": [{ "claim": "Brand New Factory Sealed Box", "source": "SELLER_LISTING" }]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "purchaseMemory": {
      "id": "pm_cm3...",
      "immutableSnapshotHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "createdAt": "2026-11-08T00:00:00.000Z"
    }
  }
  ```

### `GET /api/purchases/memory`
Retrieves all recorded Purchase Memories for the current tenant or user.

### `POST /api/purchases/[id]/compare-dispute`
Compares an immutable Purchase Memory baseline against incoming buyer/merchant dispute claims.
- **Request Body:**
  ```json
  { "disputeClaims": "Customer received 512GB SSD instead of 1TB NVMe." }
  ```
- **Response (200 OK):**
  ```json
  {
    "divergenceDetected": true,
    "baselineSummary": "1TB NVMe SSD",
    "divergencePoints": [{ "key": "Storage", "baseline": "1TB NVMe SSD", "disputeClaim": "512GB SSD" }]
  }
  ```

---

## 3. Package Passport System (Module 08)

### `POST /api/packages`
Registers a new Package Passport with item manifest and generates a signed QR token.
- **Request Body:**
  ```json
  {
    "carrierName": "FedEx Express",
    "trackingNumber": "TRK-774910293",
    "items": [
      { "title": "UltraPro Laptop 15\"", "sku": "SKU-UP-15", "quantity": 1, "serialNumber": "SN-9988" }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "package": {
      "id": "pkg_cm3...",
      "uniquePackageId": "PKG-2026-99210",
      "status": "REGISTERED",
      "qrVerificationToken": "tok_hmac_sha256...",
      "integrityHashChain": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  }
  ```

### `POST /api/packages/[id]/seal`
Applies a physical tamper-evident seal and updates the cryptographic hash chain.
- **Request Body:**
  ```json
  {
    "sealNumber": "SEAL-SEC-44019",
    "sealType": "TAMPER_EVIDENT_BARCODE",
    "appliedByUserId": "usr_techstore_merchant"
  }
  ```

### `POST /api/packages/[id]/dispatch`
Marks package dispatched and records courier carrier event.

### `GET /api/packages/verify/[token]`
**Public Endpoint:** Validates signed QR token and returns privacy-safe package verification.
- **Response (200 OK):**
  ```json
  {
    "valid": true,
    "uniquePackageId": "PKG-2026-99210",
    "status": "SEALED",
    "merchantOrganization": "TechStore Official",
    "sealsCount": 1,
    "itemsCount": 1,
    "privacyRedaction": "Buyer PII, street address, and payment PANs redacted for privacy."
  }
  ```

---

## 4. Smart Delivery & Reminders (Module 09)

### `POST /api/delivery/events`
Records courier transit events (`OUT_FOR_DELIVERY`, `DELIVERED`, `EXCEPTION`).
### `POST /api/delivery/confirm-receipt`
Records buyer delivery confirmation and triggers prompt for camera unboxing.
### `GET /api/notifications`
Retrieves pre-delivery reminders and unboxing notifications.

---

## 5. Dual-Sight Camera Sessions (Module 10)

### `POST /api/unboxing/sessions`
Initiates camera unboxing session and generates 6-digit challenge code.
- **Request Body:**
  ```json
  { "packageId": "pkg_cm3...", "deviceModel": "Pixel 8 Pro" }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "sessionToken": "ses_998124...",
    "challengeCode": "739201",
    "expiresAt": "2026-11-08T00:15:00.000Z"
  }
  ```

### `POST /api/unboxing/sessions/[token]/upload`
Streams unboxing video chunks to server storage.
### `POST /api/unboxing/sessions/[token]/complete`
Finalizes session, calculates SHA-256 hash, and binds unboxing video to Evidence Vault.

---

## 6. EvidenceGuard AI Forensics (Modules 11 & 12)

### `POST /api/evidence/[id]/analyze`
Executes forensic analysis on evidence item (EXIF, perceptual dHash, OCR cross-check).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "analysis": {
      "assessmentState": "VERIFIED_SOURCE",
      "integrityScore": 0.98,
      "perceptualHash": "d8f0e0f0c0800000",
      "findings": ["EXIF camera metadata verified", "OCR matches Purchase Memory SKU"]
    }
  }
  ```

---

## 7. Multimodal Case Intelligence (Module 13)

### `GET /api/cases/[caseId]/lifecycle`
Aggregates multimodal facts across 6 milestones and identifies divergence points.
- **Response (200 OK):**
  ```json
  {
    "caseId": "case_101",
    "milestones": ["PURCHASE", "PACKING", "SEAL", "DISPATCH", "DELIVERY", "CLAIM"],
    "divergenceDetected": true,
    "divergenceMilestone": "CLAIM",
    "explanation": "Order and packing manifests confirm 1 TB SSD; buyer claim asserts 512 GB SSD."
  }
  ```

---

## 8. BERR Reasoning Engine v2 (Modules 14 & 15)

### `POST /api/cases/[caseId]/berr-v2`
Executes Bilateral Evidence-to-Remedy Reasoning v2.
- **Response (200 OK):**
  ```json
  {
    "agreedFacts": ["Order placed", "Carrier delivered"],
    "verifiedFacts": ["Invoice OCR confirms 1 TB SSD", "Unboxing video SHA-256 verified"],
    "contestedFacts": ["Delivered drive capacity (1 TB vs 512 GB)"],
    "missingFacts": [],
    "uncertaintyScore": 14,
    "recommendedRemedy": "PARTIAL_REFUND",
    "requiresHumanReview": true
  }
  ```

---

## 9. Shared Resolution Room & Safeguards (Module 16)

### `GET /api/cases/[caseId]/messages`
Retrieves bilateral messages. Filters `isInternalOnly` messages for non-admin callers.

### `POST /api/cases/[caseId]/messages`
Posts a message.
- **Request Body:**
  ```json
  { "content": "We can offer a replacement drive.", "isInternalOnly": false }
  ```

### `POST /api/cases/[caseId]/financial-safeguards`
Audits the 10 execution safeguards before authorizing a remedy payout.
- **Request Body:**
  ```json
  { "remedyType": "PARTIAL_REFUND", "amountMinor": 25000 }
  ```
- **Response (200 OK):**
  ```json
  {
    "safeguardsPassed": true,
    "auditChecks": {
      "preExecutionAuth": true,
      "humanInTheLoop": true,
      "vaultIntegrity": true,
      "currencyMatch": true,
      "ledgerBalance": true,
      "liveFundLock": true
    }
  }
  ```

---

## 10. Multi-Payment Resolution Engine & UPI (Module 07)

### `POST /api/payments/complaints/upi`
Registers customer-submitted UPI complaints with honest status labeling and statutory guidance.
- **Request Body:**
  ```json
  {
    "paymentProvider": "PHONEPE",
    "transactionReference": "412345678901",
    "amountMinor": 249900,
    "currency": "INR",
    "complaintCategory": "DEBITED_NOT_CREDITED",
    "senderVpa": "buyer@ybl"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "complaint": {
      "transactionReference": "412345678901",
      "providerVerificationStatus": "CUSTOMER_SUBMITTED"
    },
    "guidance": {
      "regulatoryFramework": "RBI Circular DPSS.CO.PD No.629 (Harmonisation of TAT)",
      "tatSummary": "Auto-reversal expected within T+1 day. Compensation of ₹100/day applies thereafter.",
      "disclaimer": "Recorded as CUSTOMER_SUBMITTED. ResolveGraph does not perform autonomous bank clearing."
    }
  }
  ```


---

## 11. Enterprise Merchant APIs

Enterprise merchants automate fulfillment registration directly through secured endpoints using \`x-resolvegraph-api-key\`.

### \`POST /api/enterprise/orders\`
Batch import merchant orders into immutable Purchase Memory.
- **Headers:** \`x-resolvegraph-api-key: rg_ent_...\`
- **Request Body:**
  \`\`\`json
  {
    "orders": [
      {
        "orderNumber": "ORD-ENT-1001",
        "title": "UltraPro 1TB NVMe SSD",
        "totalAmountMinor": 649900,
        "currency": "INR",
        "specifications": [{ "key": "storage_capacity", "value": "1 TB" }]
      }
    ]
  }
  \`\`\`
- **Response (201 Created):**
  \`\`\`json
  {
    "success": true,
    "count": 1,
    "memories": [...]
  }
  \`\`\`

### \`POST /api/enterprise/packages\`
Registers outbound package manifests and assigns signed QR verification tokens.
- **Headers:** \`x-resolvegraph-api-key: rg_ent_...\`
- **Request Body:**
  \`\`\`json
  {
    "carrierName": "Blue Dart Express",
    "trackingNumber": "BD-99881122",
    "items": [
      { "productName": "UltraPro 1TB NVMe SSD", "sku": "SKU-SSD-1TB", "quantity": 1 }
    ]
  }
  \`\`\`

### \`POST /api/enterprise/dispatch\`
Confirms parcel handover to the carrier.
- **Headers:** \`x-resolvegraph-api-key: rg_ent_...\`
- **Request Body:**
  \`\`\`json
  {
    "packageId": "pkg_clx...",
    "carrierName": "Blue Dart Express",
    "trackingNumber": "BD-99881122"
  }
  \`\`\`
