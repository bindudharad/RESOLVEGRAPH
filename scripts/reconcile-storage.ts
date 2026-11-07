/**
 * RESOLVEGRAPH — Storage Reconciliation Command
 * 
 * Executes an offline/online scan verifying parity between physical evidence files
 * and Prisma database records.
 */

import { StorageReconciliationService } from '../src/server/storage/storage-reconciliation.service';

async function main() {
  console.log('========================================================================');
  console.log('        RESOLVEGRAPH: EVIDENCE STORAGE RECONCILIATION JOB               ');
  console.log('========================================================================\n');

  const report = await StorageReconciliationService.reconcileStorage();

  console.log(`Directory Scanned:       ${report.storageDirectory}`);
  console.log(`Files on Disk:           ${report.totalFilesOnDisk}`);
  console.log(`Database Records:        ${report.totalRecordsInDb}`);
  console.log(`Verified Matching:       ${report.verifiedMatchingCount}`);
  console.log(`Orphan Files on Disk:    ${report.orphanFiles.length}`);
  console.log(`Missing from Disk:       ${report.missingFiles.length}`);
  console.log(`Hash Mismatches:         ${report.hashMismatches.length}`);
  console.log(`Stale Temp Cleaned:      ${report.staleTempFilesCleaned}`);
  console.log(`\nReconciliation Status:   ${report.status}`);

  if (report.missingFiles.length > 0) {
    console.log('\n[WARNING] Missing Evidence Items:');
    report.missingFiles.slice(0, 5).forEach((m) => {
      console.log(`  - ID: ${m.evidenceId} | Key: ${m.storageKey} (${m.filename})`);
    });
    if (report.missingFiles.length > 5) {
      console.log(`  ... and ${report.missingFiles.length - 5} more.`);
    }
  }

  console.log('\n========================================================================');
  console.log(` RECONCILIATION COMPLETE: ${report.status}`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('[Storage Reconciliation Failed]:', err);
  process.exit(1);
});
