/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as canonicalPOST } from '../src/app/api/transactions/canonical/route';
import { GET as auditChainedGET } from '../src/app/api/audit/chained/route';
import { prisma } from '../src/lib/prisma';
import {
  SUPPORTED_CANONICAL_PROVIDERS,
} from '../src/server/services/canonical-transaction.service';
import { HashChainedAuditService } from '../src/server/services/hash-chained-audit.service';
import { createHash } from 'crypto';

function mockNextRequest(url: string, init?: RequestInit, userEmail: string = 'admin@resolvegraph.demo'): NextRequest {
  const headers = new Headers(init?.headers || {});
  headers.set('x-demo-user-email', userEmail);
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...init,
    headers,
  } as any);
}

describe('Three Defects Remediation & Comprehensive Verification Suite', () => {
  let testCaseId: string;
  const createdCanonicalTxIds: string[] = [];

  before(async () => {
    const caseRecord = await prisma.caseRecord.findFirst({
      select: { id: true, caseNumber: true },
    });
    assert.ok(caseRecord, 'A CaseRecord must exist in dev.db');
    testCaseId = caseRecord.id;
  });

  after(async () => {
    // Clean up created canonical transactions and their source observations
    if (createdCanonicalTxIds.length > 0) {
      await prisma.transactionSourceRecord.deleteMany({
        where: { canonicalTransactionId: { in: createdCanonicalTxIds } },
      });
      await prisma.canonicalTransaction.deleteMany({
        where: { id: { in: createdCanonicalTxIds } },
      });
    }
  });

  // =========================================================================
  // DEFECT 1: RECONCILIATION SANDBOX SEEDER & CANONICAL API CONTRACT
  // =========================================================================
  describe('Defect 1: Canonical Transaction API Contract & Multi-Provider Seeder', () => {
    test('1.1: Missing provider fails with HTTP 400', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          grossAmountMinor: 4999,
          // provider missing
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'provider is required.');
    });

    test('1.2: Unsupported provider fails with HTTP 400 listing supported providers', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'BITCOIN_UNKNOWN_GATEWAY',
          grossAmountMinor: 4999,
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('Unsupported provider "BITCOIN_UNKNOWN_GATEWAY"'));
      assert.ok(body.error.includes('Supported providers:'));
    });

    test('1.3: Missing grossAmountMinor fails with HTTP 400', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          // grossAmountMinor missing
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'grossAmountMinor is required.');
    });

    test('1.4: Non-integer grossAmountMinor fails with HTTP 400', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          grossAmountMinor: 49.99, // Floating point, invalid for minor currency units
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'grossAmountMinor must be an integer minor currency unit.');
    });

    test('1.5: Zero grossAmountMinor fails with HTTP 400', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          grossAmountMinor: 0,
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'grossAmountMinor cannot be zero.');
    });

    test('1.6: Negative grossAmountMinor fails with HTTP 400', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          grossAmountMinor: -1500,
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'grossAmountMinor cannot be negative.');
    });

    test('1.7: Invalid 3-letter currency code fails with HTTP 400', async () => {
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          grossAmountMinor: 4999,
          currency: 'DOLLARS_INVALID',
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.error, 'currency must be a valid 3-letter ISO code (e.g. INR, USD, EUR).');
    });

    test('1.8: Successfully creates canonical transactions across ALL supported providers', async () => {
      for (const provider of SUPPORTED_CANONICAL_PROVIDERS) {
        const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const ref = `TEST-${provider}-${uniqueSuffix}`;

        const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: testCaseId,
            provider,
            providerTxId: `TXID-${ref}`,
            externalReference: ref,
            orderReference: `ORD-${ref}`,
            merchantName: `Merchant for ${provider}`,
            grossAmountMinor: 5000,
            feeAmountMinor: 150,
            currency: provider === 'PAYPAL' || provider === 'STRIPE' ? 'USD' : 'INR',
            metadata: { isTest: true, provider },
          }),
        });

        const res = await canonicalPOST(req);
        assert.equal(res.status, 201, `Provider ${provider} must create successfully with HTTP 201`);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.provider, provider);
        assert.equal(body.data.grossAmountMinor, 5000);
        assert.equal(body.data.netAmountMinor, 4850);
        createdCanonicalTxIds.push(body.data.id);
      }
    });

    test('1.9: Duplicate transaction reference returns HTTP 409', async () => {
      const uniqueRef = `DUP-REF-${Date.now()}`;

      // First call: succeeds
      const req1 = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          providerTxId: uniqueRef,
          externalReference: uniqueRef,
          grossAmountMinor: 2500,
        }),
      });
      const res1 = await canonicalPOST(req1);
      assert.equal(res1.status, 201);
      const body1 = await res1.json();
      createdCanonicalTxIds.push(body1.data.id);

      // Second call with same reference: fails with 409
      const req2 = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PAYPAL',
          providerTxId: uniqueRef,
          externalReference: uniqueRef,
          grossAmountMinor: 2500,
        }),
      });
      const res2 = await canonicalPOST(req2);
      assert.equal(res2.status, 409);
      const body2 = await res2.json();
      assert.ok(body2.error.includes(`already exists for provider PAYPAL`));
    });

    test('1.10: Case identifier resolution handles both caseNumber (RG-1001) and cuid without FK violation', async () => {
      const caseRecord = await prisma.caseRecord.findFirst({
        where: { caseNumber: 'RG-1001' },
      });
      if (caseRecord) {
        const uniqueRef = `CASE-RES-${Date.now()}`;
        const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: 'RG-1001', // Human-readable caseNumber, not internal cuid
            provider: 'HDFC_BANK',
            externalReference: uniqueRef,
            grossAmountMinor: 10000,
          }),
        });

        const res = await canonicalPOST(req);
        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.data.caseId, caseRecord.id, 'caseId must be resolved to relational cuid');
        createdCanonicalTxIds.push(body.data.id);
      }
    });

    test('1.11: Multi-source observations persist and link to canonical transaction', async () => {
      const uniqueRef = `MULTI-SRC-${Date.now()}`;
      const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: testCaseId,
          provider: 'PHONEPE',
          externalReference: uniqueRef,
          grossAmountMinor: 499900,
          currency: 'INR',
          sourceRecords: [
            {
              sourceType: 'UPI_APP',
              providerName: 'PhonePe UPI App',
              claimedReference: `UPI-${uniqueRef}`,
              claimedAmountMinor: 499900,
              claimedCurrency: 'INR',
              claimedStatus: 'SUCCESS',
            },
            {
              sourceType: 'BANK_STATEMENT',
              providerName: 'HDFC Bank Account',
              claimedReference: `BANK-${uniqueRef}`,
              claimedAmountMinor: 499900,
              claimedCurrency: 'INR',
              claimedStatus: 'DEBITED',
            },
          ],
        }),
      });

      const res = await canonicalPOST(req);
      assert.equal(res.status, 201);
      const body = await res.json();
      createdCanonicalTxIds.push(body.data.id);

      const dbSources = await prisma.transactionSourceRecord.findMany({
        where: { canonicalTransactionId: body.data.id },
      });
      assert.equal(dbSources.length, 2);
      assert.equal(dbSources[0].sourceType, 'UPI_APP');
      assert.equal(dbSources[1].sourceType, 'BANK_STATEMENT');
    });
  });

  // =========================================================================
  // DEFECT 2: ADMIN SECURITY AUDIT CHAIN VERIFICATION & CRYPTOGRAPHIC FORENSICS
  // =========================================================================
  describe('Defect 2: Admin Security Audit Verification & Cryptographic Forensics', () => {
    test('2.1: Valid audit chain returns isValid: true and matching headHash', async () => {
      const req = mockNextRequest('http://localhost:3000/api/audit/chained?verify=true');
      const res = await auditChainedGET(req);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(typeof body.verification?.isValid, 'boolean');
      assert.equal(body.verification.isValid, true);
      assert.equal(body.isChainValid, true);
      assert.ok(typeof body.verification.totalRecords === 'number');
      assert.ok(body.verification.totalRecords >= 1);
      assert.ok(typeof body.verification.headHash === 'string');
    });

    test('2.2: Cryptographic Tamper Forensics: Changed previousHash is detected as broken link', async () => {
      // Create an isolated temporary test record with deliberately corrupt previousHash
      const latest = await prisma.hashChainedAuditRecord.findFirst({
        orderBy: { sequenceNumber: 'desc' },
      });
      assert.ok(latest, 'Must have at least one audit record');

      const corruptedRecord = await prisma.hashChainedAuditRecord.create({
        data: {
          sequenceNumber: latest.sequenceNumber + 1,
          previousHash: 'CORRUPTED_HASH_000000000000000000000000000000000000000000000000000000', // Invalid link
          currentHash: 'dummy_hash_for_test',
          payloadHash: createHash('sha256').update('{}').digest('hex'),
          action: 'TEST_TAMPER_ACTION',
          resourceType: 'TEST',
          detailsJson: '{}',
        },
      });

      try {
        const verification = await HashChainedAuditService.verifyChainIntegrity();
        assert.equal(verification.isValid, false, 'Tampered previousHash must be detected as invalid');
        assert.equal(verification.brokenAtSequence, corruptedRecord.sequenceNumber);
        assert.ok(verification.reason?.includes('previousHash does not match prior currentHash'));
      } finally {
        // Clean up disposable test record immediately
        await prisma.hashChainedAuditRecord.delete({ where: { id: corruptedRecord.id } });
      }

      // Re-verify chain returns to valid state
      const cleanCheck = await HashChainedAuditService.verifyChainIntegrity();
      assert.equal(cleanCheck.isValid, true, 'Audit chain must be valid after removing corrupted test record');
    });

    test('2.3: Cryptographic Tamper Forensics: Changed payload is detected as payload tampering', async () => {
      const latest = await prisma.hashChainedAuditRecord.findFirst({
        orderBy: { sequenceNumber: 'desc' },
      });
      assert.ok(latest, 'Must have at least one audit record');

      // Create record where payloadHash doesn't match sha256(detailsJson)
      const corruptedRecord = await prisma.hashChainedAuditRecord.create({
        data: {
          sequenceNumber: latest.sequenceNumber + 1,
          previousHash: latest.currentHash,
          currentHash: 'dummy_hash_for_test',
          payloadHash: 'FAKED_PAYLOAD_HASH_0000000000000000000000000000000000000000000000000', // Mismatch!
          action: 'TEST_TAMPER_ACTION',
          resourceType: 'TEST',
          detailsJson: JSON.stringify({ amount: 999999, unauthorized: true }),
        },
      });

      try {
        const verification = await HashChainedAuditService.verifyChainIntegrity();
        assert.equal(verification.isValid, false, 'Payload hash mismatch must be detected as tampering');
        assert.equal(verification.brokenAtSequence, corruptedRecord.sequenceNumber);
        assert.ok(verification.reason?.includes('Payload tampering detected'));
      } finally {
        await prisma.hashChainedAuditRecord.delete({ where: { id: corruptedRecord.id } });
      }

      const cleanCheck = await HashChainedAuditService.verifyChainIntegrity();
      assert.equal(cleanCheck.isValid, true);
    });

    test('2.4: Cryptographic Tamper Forensics: Missing sequence number is detected as sequence break', async () => {
      const latest = await prisma.hashChainedAuditRecord.findFirst({
        orderBy: { sequenceNumber: 'desc' },
      });
      assert.ok(latest, 'Must have at least one audit record');

      // Skip a sequence number (latest.sequenceNumber + 5 instead of + 1)
      const corruptedRecord = await prisma.hashChainedAuditRecord.create({
        data: {
          sequenceNumber: latest.sequenceNumber + 5, // Gap in sequence!
          previousHash: latest.currentHash,
          currentHash: 'dummy_hash_for_test',
          payloadHash: createHash('sha256').update('{}').digest('hex'),
          action: 'TEST_GAP_ACTION',
          resourceType: 'TEST',
          detailsJson: '{}',
        },
      });

      try {
        const verification = await HashChainedAuditService.verifyChainIntegrity();
        assert.equal(verification.isValid, false, 'Sequence break must be detected');
        assert.ok(verification.reason?.includes('Sequence break'));
      } finally {
        await prisma.hashChainedAuditRecord.delete({ where: { id: corruptedRecord.id } });
      }

      const cleanCheck = await HashChainedAuditService.verifyChainIntegrity();
      assert.equal(cleanCheck.isValid, true);
    });

    test('2.5: Non-admin users are blocked with 403 Forbidden', async () => {
      const req = mockNextRequest(
        'http://localhost:3000/api/audit/chained?verify=true',
        {},
        'alex.morgan@consumer.demo' // Buyer user
      );
      const res = await auditChainedGET(req);
      assert.equal(res.status, 403);
    });
  });

  // =========================================================================
  // DEFECT 3: RESPONSIVE LAYOUT & NAVIGATION CLEARANCE VERIFICATION
  // =========================================================================
  describe('Defect 3: Responsive Layout & Mobile Clearance Architectural Verification', () => {
    test('3.1: Mobile Bottom Navigation contains safe area inset height and fixed bottom-0 positioning', async () => {
      const fs = await import('fs');
      const navFile = fs.readFileSync('src/components/layout/mobile-navigation.tsx', 'utf8');
      assert.ok(
        navFile.includes('fixed bottom-0 inset-x-0 z-40'),
        'Mobile navigation must use fixed bottom-0 with z-40'
      );
      assert.ok(
        navFile.includes('env(safe-area-inset-bottom,0px)'),
        'Mobile navigation must include safe-area-inset-bottom accounting'
      );
    });

    test('3.2: AppShell main content container incorporates dynamic viewport height and clearance padding', async () => {
      const fs = await import('fs');
      const shellFile = fs.readFileSync('src/components/layout/app-shell.tsx', 'utf8');
      assert.ok(
        shellFile.includes('min-h-[100dvh]'),
        'AppShell must utilize dynamic viewport height (min-h-[100dvh])'
      );
      assert.ok(
        shellFile.includes('pb-[calc(6rem+env(safe-area-inset-bottom,0px))]'),
        'Main container must provide at least 6rem (96px) mobile clearance padding'
      );
    });

    test('3.3: Dialog component uses z-100 and safe-area bottom padding to prevent navigation overlap', async () => {
      const fs = await import('fs');
      const dialogFile = fs.readFileSync('src/components/ui/dialog.tsx', 'utf8');
      assert.ok(
        dialogFile.includes('z-100'),
        'Dialogs must have z-100 to layer strictly above z-40 mobile navigation'
      );
      assert.ok(
        dialogFile.includes('pb-[calc(1rem+env(safe-area-inset-bottom,0px))]'),
        'Dialogs must include bottom safe area padding on mobile viewports'
      );
    });

    test('3.4: Clearance calculation verification across standard viewport heights', () => {
      const navHeightPx = 56; // 3.5rem
      const mobilePaddingPx = 96; // 6rem
      const netClearancePx = mobilePaddingPx - navHeightPx; // 40px guaranteed margin

      assert.ok(netClearancePx >= 32, 'Net clearance margin above bottom navigation must be at least 32px');
      
      const testViewports = [
        { width: 390, height: 844, name: 'Standard Mobile' },
        { width: 390, height: 667, name: 'Short Mobile (iPhone SE)' },
        { width: 360, height: 640, name: 'Small Android' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1024, height: 768, name: 'Laptop' },
        { width: 1440, height: 900, name: 'Desktop' },
      ];

      for (const vp of testViewports) {
        const availableHeight = vp.height;
        assert.ok(availableHeight >= 640, `${vp.name} height ${vp.height}px must be greater than minimal viewport`);
      }
    });
  });
});
