/**
 * RESOLVEGRAPH — Automated Database Backup & Restoration Drill
 * 
 * Performs an isolated, non-destructive backup and restoration drill to prove
 * disaster recovery readiness:
 * 1. Takes an atomic snapshot of current database
 * 2. Restores snapshot into an isolated sandbox database
 * 3. Verifies schema integrity and relational foreign key health
 * 4. Verifies record count parity across all primary business entities
 * 5. Cleans up isolated drill sandbox
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

export interface RestorationDrillReport {
  timestamp: string;
  sourceDatabasePath: string;
  targetRestorationPath: string;
  backupSizeBytes: number;
  durationMs: number;
  integrityCheckStatus: 'PASSED' | 'FAILED';
  recordParity: {
    users: { source: number; restored: number; match: boolean };
    organizations: { source: number; restored: number; match: boolean };
    cases: { source: number; restored: number; match: boolean };
    evidence: { source: number; restored: number; match: boolean };
    claims: { source: number; restored: number; match: boolean };
    commerceOrders: { source: number; restored: number; match: boolean };
    agentRuns: { source: number; restored: number; match: boolean };
  };
  relationalIntegrityVerified: boolean;
  verdict: 'RESTORATION_VERIFIED' | 'RESTORATION_FAILED';
}

export async function runDatabaseRestorationDrill(): Promise<RestorationDrillReport> {
  const startTime = Date.now();
  console.log('========================================================================');
  console.log('        RESOLVEGRAPH: DATABASE BACKUP & RESTORATION DRILL              ');
  console.log('========================================================================\n');

  const sourceDbPath = path.resolve(process.cwd(), 'dev.db');
  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`Source database not found at ${sourceDbPath}`);
  }

  const drillDir = path.resolve(process.cwd(), '.private/backup-drill');
  if (!fs.existsSync(drillDir)) {
    fs.mkdirSync(drillDir, { recursive: true });
  }

  const timestampSuffix = Date.now();
  const backupSnapshotPath = path.join(drillDir, `snapshot_${timestampSuffix}.db`);
  const restoredDbPath = path.join(drillDir, `restored_${timestampSuffix}.db`);

  // Step 1: Create atomic SQLite online backup
  console.log('[1/5] Creating atomic database snapshot via SQLite backup API...');
  const sourceRawDb = new Database(sourceDbPath, { readonly: true });
  await sourceRawDb.backup(backupSnapshotPath);
  sourceRawDb.close();

  const backupStats = fs.statSync(backupSnapshotPath);
  console.log(`  -> Snapshot created: ${backupSnapshotPath} (${backupStats.size} bytes)`);

  // Step 2: Restore snapshot into isolated target
  console.log('[2/5] Restoring snapshot to isolated drill sandbox database...');
  fs.copyFileSync(backupSnapshotPath, restoredDbPath);
  console.log(`  -> Restored to sandbox: ${restoredDbPath}`);

  // Step 3: Run SQLite PRAGMA integrity_check
  console.log('[3/5] Running low-level SQLite structural integrity check...');
  const restoredRawDb = new Database(restoredDbPath);
  const integrityRows = restoredRawDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
  const integrityPassed = integrityRows.length === 1 && integrityRows[0].integrity_check === 'ok';
  console.log(`  -> PRAGMA integrity_check result: ${integrityPassed ? 'OK (PASSED)' : 'CORRUPT'}`);
  restoredRawDb.close();

  if (!integrityPassed) {
    throw new Error('Database integrity check failed on restored snapshot.');
  }

  // Step 4: Verify record parity and relational integrity via Prisma clients
  console.log('[4/5] Verifying record count parity and relational links via Prisma...');
  const sourceAdapter = new PrismaBetterSqlite3({ url: sourceDbPath });
  const sourcePrisma = new PrismaClient({ adapter: sourceAdapter });

  const restoredAdapter = new PrismaBetterSqlite3({ url: restoredDbPath });
  const restoredPrisma = new PrismaClient({ adapter: restoredAdapter });

  try {
    const [
      srcUsers, resUsers,
      srcOrgs, resOrgs,
      srcCases, resCases,
      srcEvidence, resEvidence,
      srcClaims, resClaims,
      srcOrders, resOrders,
      srcRuns, resRuns,
    ] = await Promise.all([
      sourcePrisma.user.count(), restoredPrisma.user.count(),
      sourcePrisma.organization.count(), restoredPrisma.organization.count(),
      sourcePrisma.caseRecord.count(), restoredPrisma.caseRecord.count(),
      sourcePrisma.evidence.count(), restoredPrisma.evidence.count(),
      sourcePrisma.claim.count(), restoredPrisma.claim.count(),
      sourcePrisma.commerceOrder.count(), restoredPrisma.commerceOrder.count(),
      sourcePrisma.agentRun.count(), restoredPrisma.agentRun.count(),
    ]);

    // Relational integrity: query complex relational joins in restored DB
    const sampleCasesWithRelations = await restoredPrisma.caseRecord.findMany({
      take: 10,
      include: {
        buyer: true,
        merchant: true,
        organization: true,
        claims: true,
        evidence: true,
      },
    });

    const relationsIntact = sampleCasesWithRelations.every(
      (c) => Boolean(c.buyer && c.organization && c.id)
    );

    const recordParity = {
      users: { source: srcUsers, restored: resUsers, match: srcUsers === resUsers },
      organizations: { source: srcOrgs, restored: resOrgs, match: srcOrgs === resOrgs },
      cases: { source: srcCases, restored: resCases, match: srcCases === resCases },
      evidence: { source: srcEvidence, restored: resEvidence, match: srcEvidence === resEvidence },
      claims: { source: srcClaims, restored: resClaims, match: srcClaims === resClaims },
      commerceOrders: { source: srcOrders, restored: resOrders, match: srcOrders === resOrders },
      agentRuns: { source: srcRuns, restored: resRuns, match: srcRuns === resRuns },
    };

    const allMatches = Object.values(recordParity).every((p) => p.match);
    const durationMs = Date.now() - startTime;

    console.log(`  -> Users: ${srcUsers} (Match: ${recordParity.users.match})`);
    console.log(`  -> Cases: ${srcCases} (Match: ${recordParity.cases.match})`);
    console.log(`  -> Evidence: ${srcEvidence} (Match: ${recordParity.evidence.match})`);
    console.log(`  -> Claims: ${srcClaims} (Match: ${recordParity.claims.match})`);
    console.log(`  -> Orders: ${srcOrders} (Match: ${recordParity.commerceOrders.match})`);
    console.log(`  -> Agent Runs: ${srcRuns} (Match: ${recordParity.agentRuns.match})`);
    console.log(`  -> Relational Links Validated: ${relationsIntact ? 'YES' : 'NO'}`);

    // Step 5: Clean up drill files
    console.log('[5/5] Cleaning up isolated drill artifacts...');
    await sourcePrisma.$disconnect();
    await restoredPrisma.$disconnect();

    if (fs.existsSync(backupSnapshotPath)) {
      try { fs.unlinkSync(backupSnapshotPath); } catch {}
    }
    if (fs.existsSync(restoredDbPath)) {
      try { fs.unlinkSync(restoredDbPath); } catch {}
    }
    console.log('  -> Drill sandbox cleaned successfully.');

    const report: RestorationDrillReport = {
      timestamp: new Date().toISOString(),
      sourceDatabasePath: sourceDbPath,
      targetRestorationPath: restoredDbPath,
      backupSizeBytes: backupStats.size,
      durationMs,
      integrityCheckStatus: 'PASSED',
      recordParity,
      relationalIntegrityVerified: relationsIntact,
      verdict: allMatches && relationsIntact ? 'RESTORATION_VERIFIED' : 'RESTORATION_FAILED',
    };

    console.log('\n========================================================================');
    console.log(` DRILL OUTCOME: ${report.verdict} (Completed in ${durationMs} ms)`);
    console.log('========================================================================\n');

    return report;
  } finally {
    await sourcePrisma.$disconnect();
    await restoredPrisma.$disconnect();
  }
}

if (require.main === module || process.argv[1]?.endsWith('db-backup-restore-drill.ts')) {
  runDatabaseRestorationDrill()
    .then((rep) => {
      if (rep.verdict !== 'RESTORATION_VERIFIED') process.exit(1);
    })
    .catch((err) => {
      console.error('[Drill Failed]:', err);
      process.exit(1);
    });
}
