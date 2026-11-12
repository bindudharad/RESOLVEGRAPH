-- Additive migration: per-user Seller Workspace onboarding state
-- Prepared for approval; NOT executed automatically against persistent databases.

CREATE TABLE IF NOT EXISTS "SellerOnboardingState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "lastViewedStep" INTEGER NOT NULL DEFAULT 1,
    "completedAt" DATETIME,
    "dismissedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SellerOnboardingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerOnboardingState_userId_key" ON "SellerOnboardingState"("userId");
CREATE INDEX IF NOT EXISTS "SellerOnboardingState_status_idx" ON "SellerOnboardingState"("status");
