-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "avatarUrl" TEXT,
    "phone" TEXT,
    "organization" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CaseRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "amountMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "buyerId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "assignedManagerId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'INTAKE',
    "recommendedRemedy" TEXT,
    "resolutionSummary" TEXT,
    "resolvedAt" DATETIME,
    "closedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseRecord_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseRecord_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseRecord_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "partyRole" TEXT NOT NULL DEFAULT 'BUYER',
    "claimType" TEXT NOT NULL DEFAULT 'OTHER',
    "statement" TEXT NOT NULL,
    "requestedRemedy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Claim_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "claimId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "description" TEXT,
    "evidenceType" TEXT NOT NULL DEFAULT 'OTHER',
    "sourceType" TEXT NOT NULL DEFAULT 'BUYER_UPLOAD',
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CaseRecord_caseNumber_key" ON "CaseRecord"("caseNumber");

-- CreateIndex
CREATE INDEX "CaseRecord_caseNumber_idx" ON "CaseRecord"("caseNumber");

-- CreateIndex
CREATE INDEX "CaseRecord_status_idx" ON "CaseRecord"("status");

-- CreateIndex
CREATE INDEX "CaseRecord_priority_idx" ON "CaseRecord"("priority");

-- CreateIndex
CREATE INDEX "CaseRecord_category_idx" ON "CaseRecord"("category");

-- CreateIndex
CREATE INDEX "CaseRecord_buyerId_idx" ON "CaseRecord"("buyerId");

-- CreateIndex
CREATE INDEX "CaseRecord_merchantId_idx" ON "CaseRecord"("merchantId");

-- CreateIndex
CREATE INDEX "CaseRecord_assignedManagerId_idx" ON "CaseRecord"("assignedManagerId");

-- CreateIndex
CREATE INDEX "CaseRecord_createdAt_idx" ON "CaseRecord"("createdAt");

-- CreateIndex
CREATE INDEX "Claim_caseId_idx" ON "Claim"("caseId");

-- CreateIndex
CREATE INDEX "Claim_authorId_idx" ON "Claim"("authorId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Evidence_caseId_idx" ON "Evidence"("caseId");

-- CreateIndex
CREATE INDEX "Evidence_uploadedById_idx" ON "Evidence"("uploadedById");

-- CreateIndex
CREATE INDEX "Evidence_claimId_idx" ON "Evidence"("claimId");

-- CreateIndex
CREATE INDEX "Evidence_verificationStatus_idx" ON "Evidence"("verificationStatus");

-- CreateIndex
CREATE INDEX "CaseEvent_caseId_idx" ON "CaseEvent"("caseId");

-- CreateIndex
CREATE INDEX "CaseEvent_actorId_idx" ON "CaseEvent"("actorId");

-- CreateIndex
CREATE INDEX "CaseEvent_eventType_idx" ON "CaseEvent"("eventType");

-- CreateIndex
CREATE INDEX "CaseEvent_createdAt_idx" ON "CaseEvent"("createdAt");
