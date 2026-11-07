# RESOLVEGRAPH — REST API Documentation

All API endpoints reside under `/api/*` and return standard JSON payloads.

---

## 1. System Health

### `GET /api/health`
Inspects database connectivity, SQLite physical file metrics, uptime, and table statistics.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-03T11:45:00.000Z",
  "uptimeSeconds": 142,
  "environment": "development",
  "database": {
    "type": "sqlite",
    "adapter": "@prisma/adapter-better-sqlite3",
    "connected": true,
    "sqliteFileExists": true,
    "sqliteSizeBytes": 131072,
    "stats": {
      "users": 7,
      "cases": 14,
      "evidence": 4
    }
  },
  "prismaVersion": "7.10.1"
}
```

---

## 2. Case Management

### `GET /api/cases`
Lists cases with query filtering, searching, and pagination.

**Query Parameters:**
- `page` (number, default: `1`)
- `limit` (number, default: `20`, max: `100`)
- `search` (string, searches caseNumber, title, description, customer, merchant)
- `status` (string, e.g. `UNDER_ANALYSIS`, `SUBMITTED`, `EVIDENCE_REQUESTED`, `RESOLVED`)
- `priority` (string, `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `category` (string, `NOT_AS_DESCRIBED`, `NON_DELIVERY`, etc.)
- `sortBy` (`createdAt`, `amountMinor`, `priority`, `caseNumber`)
- `sortOrder` (`asc`, `desc`, default: `desc`)

**Response `200 OK`:**
```json
{
  "items": [
    {
      "id": "RG-1001",
      "dbId": "cm123456",
      "caseNumber": "RG-1001",
      "title": "Wrong Product Received",
      "description": "Customer ordered a Portable SSD 1 TB...",
      "amount": 6499.00,
      "amountMinor": 649900,
      "currency": "INR",
      "category": "NOT_AS_DESCRIBED",
      "status": "UNDER_ANALYSIS",
      "priority": "HIGH",
      "customer": "Alex Morgan",
      "merchant": "TechStore Global",
      "createdAt": "2026-10-28T09:14:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 14,
    "totalPages": 1
  }
}
```

---

### `POST /api/cases`
Creates a new dispute case inside a transaction and records an append-only `CASE_CREATED` audit event.

**Request Body:**
```json
{
  "title": "Damaged Display on Delivery",
  "description": "Packaging arrived crushed with deep fracture across the LCD.",
  "category": "DAMAGED_GOODS",
  "priority": "HIGH",
  "amountMinor": 1899900,
  "currency": "INR",
  "buyerId": "usr_alex_buyer",
  "merchantId": "usr_techstore_merchant"
}
```

**Response `201 Created`:**
Returns the newly created case record with generated sequential `caseNumber` (`RG-1015`).

---

### `GET /api/cases/[caseId]`
Retrieves full case details including relations: `buyer`, `merchant`, `assignedManager`, `claims`, `evidence`, and `events`.

`[caseId]` can be either the caseNumber (e.g. `RG-1001`) or CUID primary key.

---

### `PATCH /api/cases/[caseId]`
Updates case status, priority, assignments, remedies, or appends notes.

**Request Body:**
```json
{
  "status": "RESOLVED",
  "recommendedRemedy": "REPLACEMENT",
  "resolutionSummary": "Replacement unit dispatched via courier.",
  "note": "Agreed to settlement with merchant",
  "actorId": "usr_priya_admin"
}
```

**State Validation:**
Rejects invalid status transitions with `422 Unprocessable Entity`.

---

## 3. Bilateral Claims

### `GET /api/cases/[caseId]/claims`
Lists all claims submitted by buyer, merchant, or manager for the specified case.

### `POST /api/cases/[caseId]/claims`
Submits a new claim and appends a `CLAIM_ADDED` event.

**Request Body:**
```json
{
  "authorId": "usr_alex_buyer",
  "partyRole": "BUYER",
  "claimType": "SIGNIFICANTLY_NOT_AS_DESCRIBED",
  "statement": "Storage unit reports 512 GB formatted capacity rather than 1 TB.",
  "requestedRemedy": "REPLACEMENT"
}
```

---

## 4. Evidence Metadata

### `GET /api/cases/[caseId]/evidence`
Lists all evidence files uploaded for a given case.

### `POST /api/cases/[caseId]/evidence`
Registers evidence file metadata and appends an `EVIDENCE_UPLOADED` event.

**Request Body:**
```json
{
  "uploadedById": "usr_alex_buyer",
  "filename": "disk-management-screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 1120000,
  "storageKey": "evidence/rg-1001/disk-mgmt.png",
  "sha256": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  "evidenceType": "PHOTO",
  "sourceType": "BUYER_UPLOAD",
  "verificationStatus": "VERIFIED"
}
```

### `GET /api/evidence`
Workspace-wide evidence search across all cases with filters for type, verification, and filename search.

---

## 5. Event Audit Ledger

### `GET /api/cases/[caseId]/events`
Returns chronological audit events (`CaseEvent`) recording creation, state changes, evidence uploads, and mediator notes.

---

## 6. Dashboard & Aggregations

### `GET /api/dashboard/summary`
Returns database-computed KPI metrics:
- Total cases, open cases, awaiting responses, resolved cases
- Real group-by category distribution and percentages
- Recent 6 cases with full participant names
- Recent 12 activity events with actor identities
- Attention list (High priority or awaiting evidence)

---

## 7. Users

### `GET /api/users`
Lists all registered users. Optional query `?role=BUYER` or `?role=MERCHANT`.
