-- ============================================================================
-- RESOLVEGRAPH Version 2.0: PostgreSQL & pgvector Production Migration Script
-- ============================================================================

-- 1. Enable pgvector extension for semantic evidence search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User & Organization Tables
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "organization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Purchase Memory & Baseline Tables
CREATE TABLE IF NOT EXISTS "PurchaseMemory" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT UNIQUE,
    "merchantOrganizationId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "immutableSnapshotHash" TEXT NOT NULL,
    "totalAmountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PurchaseSpecification" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "purchaseMemoryId" TEXT NOT NULL REFERENCES "PurchaseMemory"("id") ON DELETE CASCADE,
    "specKey" TEXT NOT NULL,
    "specValue" TEXT NOT NULL,
    "importance" TEXT NOT NULL DEFAULT 'HIGH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Package Passport & Custody Chain
CREATE TABLE IF NOT EXISTS "PackagePassport" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "merchantOrganizationId" TEXT NOT NULL,
    "orderId" TEXT,
    "purchaseMemoryId" TEXT REFERENCES "PurchaseMemory"("id") ON DELETE SET NULL,
    "uniquePackageId" TEXT UNIQUE NOT NULL,
    "qrVerificationToken" TEXT UNIQUE NOT NULL,
    "integrityHashChain" TEXT NOT NULL,
    "carrierName" TEXT,
    "trackingNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Evidence Vault with Vector Search Embeddings
CREATE TABLE IF NOT EXISTS "Evidence" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT,
    "filename" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "verificationState" TEXT NOT NULL DEFAULT 'PENDING',
    "embedding" vector(1536), -- OpenAI text-embedding-3-small or Gemini embed
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. High-Performance HNSW Vector Index for Semantic Evidence Retrieval
CREATE INDEX IF NOT EXISTS "idx_evidence_embedding_hnsw"
ON "Evidence" USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 7. Payment Complaints & UPI
CREATE TABLE IF NOT EXISTS "PaymentComplaint" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT,
    "paymentProvider" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "complaintCategory" TEXT NOT NULL,
    "senderVpa" TEXT,
    "recipientVpa" TEXT,
    "receiptEvidenceId" TEXT,
    "providerVerificationStatus" TEXT NOT NULL DEFAULT 'CUSTOMER_SUBMITTED',
    "escalationGuidanceProvided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Shared Resolution Room Messages
CREATE TABLE IF NOT EXISTS "SharedRoomMessage" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "caseId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL REFERENCES "User"("id"),
    "content" TEXT NOT NULL,
    "isInternalOnly" BOOLEAN NOT NULL DEFAULT false,
    "attachmentEvidenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_shared_room_case_messages"
ON "SharedRoomMessage" ("caseId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_package_passport_token"
ON "PackagePassport" ("qrVerificationToken");

CREATE INDEX IF NOT EXISTS "idx_payment_complaint_ref"
ON "PaymentComplaint" ("transactionReference");
