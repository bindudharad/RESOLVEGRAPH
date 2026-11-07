# RESOLVEGRAPH — Database Architecture & Persistence Specification

## 1. Overview

RESOLVEGRAPH uses **Prisma ORM 7** with **SQLite** (`better-sqlite3` driver adapter) for local development and edge compatibility. The database schema models the bilateral commerce dispute domain with strict transactional integrity, minor currency integer precision, and an immutable event ledger.

---

## 2. Technology Stack & Driver Adapter

- **Prisma Version:** `7.10.1`
- **Datasource Provider:** `sqlite` (local file `dev.db`)
- **Driver Adapter:** `@prisma/adapter-better-sqlite3` with `better-sqlite3`
- **Prisma Config File:** `prisma7.config.ts` (using `defineConfig` from `prisma/config`)
- **Generated Client Path:** `src/generated/prisma`

---

## 3. Entity-Relationship Data Model

```
 ┌───────────────┐               1:N              ┌────────────────┐
 │     User      │ ─────────────────────────────< │   CaseRecord   │
 │───────────────│                                │────────────────│
 │ id (cuid)     │                                │ id (cuid)      │
 │ email (uniq)  │                                │ caseNumber     │
 │ fullName      │                                │ amountMinor    │
 │ role          │                                │ currency       │
 └───────────────┘                                │ status         │
        │                                         │ priority       │
        │ 1:N                                     └────────────────┘
        │                                           │   │         │
        │                                1:N        │   │         │ 1:N
        ├───────────────────────────────────────────┤   │         ▼
        │                                           │   │  ┌──────────────┐
        ▼                                           ▼   │  │  CaseEvent   │
 ┌───────────────┐        1:N                     ┌───┐ │  │──────────────│
 │     Claim     │ <──────────────────────────────│   │ │  │ id           │
 │───────────────│                                └───┘ │  │ eventType    │
 │ id            │                                  │   │  │ description  │
 │ partyRole     │                                  │   │  │ metadataJson │
 │ claimType     │                                  │   │  │ createdAt    │
 │ statement     │                                  │   │  └──────────────┘
 └───────────────┘                                  │   │
        │ 1:N                                       │   │
        ▼                                           ▼   ▼
 ┌─────────────────────────────────────────────────────────┐
 │                        Evidence                         │
 │─────────────────────────────────────────────────────────│
 │ id (cuid)                                               │
 │ caseId (FK -> CaseRecord)                               │
 │ uploadedById (FK -> User)                               │
 │ claimId (FK -> Claim, nullable)                         │
 │ filename, mimeType, sizeBytes, storageKey, sha256       │
 │ evidenceType, sourceType, verificationStatus            │
 └─────────────────────────────────────────────────────────┘
```

---

## 4. Models Detailed Specification

### `User`
Identities involved in dispute resolution workflows:
- `id`: String, CUID primary key
- `email`: String, unique
- `fullName`: String
- `role`: Enum `UserRole` (`BUYER`, `MERCHANT`, `RESOLUTION_MANAGER`, `ADMIN`)
- `avatarUrl`: Optional string
- `phone`: Optional string
- `organization`: Optional organization/company name
- `createdAt`, `updatedAt`: Automatic ISO timestamps

### `CaseRecord`
Core resolution dispute entity:
- `id`: String, CUID primary key
- `caseNumber`: String, unique identifier (e.g., `RG-1001`, sequential)
- `title`: Short descriptive title (3-200 chars)
- `description`: Detailed buyer complaint narrative
- `category`: Enum `CaseCategory` (`NON_DELIVERY`, `NOT_AS_DESCRIBED`, `DAMAGED_GOODS`, `UNAUTHORIZED_TRANSACTION`, `BILLING_ERROR`, `REFUND_DISPUTE`, `OTHER`)
- `status`: Enum `CaseStatus` (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `EVIDENCE_REQUESTED`, `EVIDENCE_SUBMITTED`, `UNDER_ANALYSIS`, `RESOLVED`, `CLOSED`, `ARCHIVED`)
- `priority`: Enum `CasePriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `amountMinor`: **Integer representing minor currency units** (e.g., ₹6,499.00 = `649900` paise, $149.00 = `14900` cents). Floating point numbers are strictly avoided in database storage.
- `currency`: ISO 4217 currency code (default: `"USD"` or `"INR"`)
- `buyerId`: Foreign key to `User`
- `merchantId`: Foreign key to `User`
- `assignedManagerId`: Nullable foreign key to `User`
- `stage`: Enum `CaseStage` (`INTAKE`, `EVIDENCE_GATHERING`, `INVESTIGATION`, `RESOLUTION_PROPOSED`, `FINALIZED`)
- `recommendedRemedy`: Nullable enum `RemedyType` (`FULL_REFUND`, `PARTIAL_REFUND`, `REPLACEMENT`, `STORE_CREDIT`, `RETURN_FOR_REFUND`, `REJECT_CLAIM`)
- `resolutionSummary`: Nullable text summary of final settlement
- `resolvedAt`, `closedAt`, `archivedAt`: Timestamps populated on lifecycle changes

### `Claim`
Contested statements made by buyer or merchant:
- `id`: CUID primary key
- `caseId`: Foreign key to `CaseRecord` (cascades on delete)
- `authorId`: Foreign key to `User`
- `partyRole`: Enum `PartyRole` (`BUYER`, `MERCHANT`, `MANAGER`)
- `claimType`: Enum `ClaimType` (`ITEM_NOT_RECEIVED`, `SIGNIFICANTLY_NOT_AS_DESCRIBED`, `DEFECTIVE_OR_DAMAGED`, `INCORRECT_QUANTITY`, `UNAUTHORIZED_CHARGE`, `RETURN_REJECTED`, `OTHER`)
- `statement`: Narrative text statement
- `requestedRemedy`: Nullable `RemedyType`
- `status`: Enum `ClaimStatus` (`ACTIVE`, `ACCEPTED`, `CONTESTED`, `DISMISSED`, `RESOLVED`)

### `Evidence`
File artifacts and documentation metadata:
- `id`: CUID primary key
- `caseId`: Foreign key to `CaseRecord` (cascades on delete)
- `uploadedById`: Foreign key to `User`
- `claimId`: Nullable foreign key to `Claim`
- `filename`: Stored file name (e.g., `invoice-10842.pdf`)
- `mimeType`: MIME identifier (e.g., `application/pdf`, `image/png`)
- `sizeBytes`: File size in integer bytes
- `storageKey`: Canonical object storage path (e.g., `evidence/rg-1001/doc.pdf`)
- `sha256`: Cryptographic checksum hash for tamper detection
- `evidenceType`: Enum `EvidenceType` (`RECEIPT`, `PHOTO`, `CHAT_LOG`, `TRACKING_INFO`, `RETURN_LABEL`, `INVOICE`, `OTHER`)
- `sourceType`: Enum `EvidenceSource` (`BUYER_UPLOAD`, `MERCHANT_PORTAL`, `CARRIER_API`, `SYSTEM_AUDIT`)
- `verificationStatus`: Enum `VerificationStatus` (`UNVERIFIED`, `VERIFIED`, `SUSPICIOUS`, `REJECTED`)

### `CaseEvent` (Append-Only Event Ledger)
Immutable audit trail recording state transitions, evidence submissions, and operator actions:
- `id`: CUID primary key
- `caseId`: Foreign key to `CaseRecord`
- `actorId`: Nullable foreign key to `User`
- `eventType`: Enum `EventType` (`CASE_CREATED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `CLAIM_ADDED`, `EVIDENCE_UPLOADED`, `MANAGER_ASSIGNED`, `NOTE_ADDED`, `REMEDY_PROPOSED`, `CASE_RESOLVED`, `CASE_CLOSED`)
- `description`: Human-readable event description
- `metadataJson`: Structured JSON payload with event parameters
- `createdAt`: Immutable ISO timestamp

---

## 5. State Machine & Transition Rules

```
     ┌──────────────┐
     │    DRAFT     │
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │  SUBMITTED   │ ◄────────────────────────┐
     └──────┬───────┘                          │
            │                                  │
      ┌─────┴──────────────────┐               │
      │                        │               │
      ▼                        ▼               │
┌──────────────┐        ┌──────────────┐       │
│  IN_REVIEW   │ ◄────► │UNDER_ANALYSIS│       │
└──────┬───────┘        └──────┬───────┘       │
       │                       │               │
       ├──────────────┬────────┘               │
       ▼              ▼                        │
┌──────────────┐ ┌──────────────┐              │
│EVIDENCE_REQ. │ │EVIDENCE_SUBM.│              │
└──────────────┘ └──────────────┘              │
       │                 │                     │
       ▼                 ▼                     │
┌──────────────┐  ┌──────────────┐             │
│   RESOLVED   │  │    CLOSED    │ ────────────┘ (Re-open)
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
         ┌──────────────┐
         │   ARCHIVED   │
         └──────────────┘
```

The `CaseService.updateCase()` method enforces this transition matrix inside a database transaction, rejecting invalid state changes with HTTP 422 errors.

---

## 6. Database Operations & CLI Scripts

| Command | Description |
|---|---|
| `npm run db:generate` | Compiles schema and generates Prisma Client to `src/generated/prisma` |
| `npm run db:migrate` | Runs Prisma development migration on `dev.db` |
| `npm run db:seed` | Idempotently populates initial users, 14 cases, claims, evidence, and events |
| `npm run db:studio` | Launches interactive Prisma Studio web interface |
| `npm run db:reset` | Resets the SQLite database and re-applies migrations |
| `npm test` | Runs the automated backend and API route test suite |
