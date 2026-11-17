import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: 'file:./dev.db' }) });

const EVIDENCE_DIR = path.resolve(process.cwd(), '.private/evidence');

async function inspectRG1001Details() {
  console.log('--- RG-1001 GRANULAR DETAILS ---');
  const c = await prisma.caseRecord.findFirst({
    where: { caseNumber: 'RG-1001' },
    include: {
      buyer: true,
      merchant: true,
      evidence: true,
      orders: true,
      sellerEvidenceRequests: {
        include: {
          evidenceItems: true,
          responses: true
        }
      },
      resolutionProposals: {
        include: { responses: true }
      }
    }
  });

  if (!c) {
    console.error('RG-1001 not found');
    return;
  }

  console.log(`Case ID: ${c.id}, CaseNumber: ${c.caseNumber}, Title: ${c.title}`);
  console.log(`Evidence count: ${c.evidence.length}`);

  let onDiskCount = 0;
  let missingCount = 0;
  const sourceTypes: Record<string, number> = {};
  const evidenceTypes: Record<string, number> = {};
  const sampleEvidence: any[] = [];

  for (const ev of c.evidence) {
    sourceTypes[ev.sourceType] = (sourceTypes[ev.sourceType] || 0) + 1;
    evidenceTypes[ev.evidenceType] = (evidenceTypes[ev.evidenceType] || 0) + 1;
    
    // Check path
    let exists = false;
    let fullPath = path.resolve(EVIDENCE_DIR, path.basename(ev.storageKey));
    if (fs.existsSync(fullPath)) {
      exists = true;
    } else {
      fullPath = path.resolve(process.cwd(), ev.storageKey);
      if (fs.existsSync(fullPath)) {
        exists = true;
      }
    }

    if (exists) {
      onDiskCount++;
    } else {
      missingCount++;
    }

    if (sampleEvidence.length < 8) {
      sampleEvidence.push({
        id: ev.id,
        filename: ev.filename,
        sourceType: ev.sourceType,
        evidenceType: ev.evidenceType,
        storageKey: ev.storageKey,
        exists,
        sizeBytes: ev.sizeBytes,
        sha256Prefix: ev.sha256?.substring(0, 16) + '...'
      });
    }
  }

  console.log(`Evidence on disk: ${onDiskCount}, missing: ${missingCount}`);
  console.log('Source Types:', sourceTypes);
  console.log('Evidence Types:', evidenceTypes);
  console.log('Sample evidence items:', JSON.stringify(sampleEvidence, null, 2));

  console.log('\n--- SELLER EVIDENCE REQUESTS ---');
  for (const req of c.sellerEvidenceRequests) {
    const rAny = req as any;
    console.log(`Request ID: ${req.id}, Status: ${req.status}, Items: ${req.evidenceItems.length}, Responses: ${req.responses.length}`);
    for (const resp of req.responses) {
      const respAny = resp as any;
      console.log(`    Response ID: ${resp.id}, Verification: ${resp.verificationStatus}, SubmittedAt: ${resp.submittedAt}`);
    }
  }

  console.log('\n--- RG-1493 AND ORDER REF CHECK ---');
  const rg1493 = await prisma.caseRecord.findFirst({
    where: { caseNumber: 'RG-1493' }
  });
  console.log(`RG-1493 found: ${Boolean(rg1493)}, Title: ${rg1493?.title}, Status: ${rg1493?.status}`);

  const orderRefs = await prisma.commerceOrder.findMany({
    where: {
      orderNumber: { contains: '2026-0412' }
    },
    include: {
      case: true
    }
  });
  console.log(`CommerceOrders with orderNumber containing 2026-0412: ${orderRefs.length}`);
  for (const oc of orderRefs) {
    console.log(`  OrderNumber: ${oc.orderNumber}, Linked Case: ${oc.case?.caseNumber}, CaseTitle: ${oc.case?.title}`);
  }
}

inspectRG1001Details()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
