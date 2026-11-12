/**
 * RESOLVEGRAPH — Evidence Storage Reconciliation Service
 * 
 * Verifies parity between physical object storage and database evidence records:
 * - Detects orphan files on disk not registered in database
 * - Detects missing files on disk registered in database
 * - Validates cryptographic SHA-256 hash integrity
 * - Purges stale temporary uploads older than retention thresholds
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

export interface StorageReconciliationReport {
  timestamp: string;
  storageDirectory: string;
  totalFilesOnDisk: number;
  totalRecordsInDb: number;
  verifiedMatchingCount: number;
  orphanFiles: Array<{ filePath: string; byteSize: number; modifiedAt: string }>;
  missingFiles: Array<{ evidenceId: string; storageKey: string; filename: string }>;
  hashMismatches: Array<{ evidenceId: string; expectedSha256: string; actualSha256: string }>;
  staleTempFilesCleaned: number;
  status: 'IN_SYNC' | 'DISCREPANCIES_DETECTED';
}

export class StorageReconciliationService {
  /**
   * Reconciles physical files on disk against database records.
   */
  public static async reconcileStorage(options: {
    cleanOrphans?: boolean;
    storageBaseDir?: string;
  } = {}): Promise<StorageReconciliationReport> {
    const baseDir =
      options.storageBaseDir ||
      path.resolve(
        process.cwd(),
        process.env.EVIDENCE_STORAGE_PATH ||
          process.env.EVIDENCE_STORAGE_DIR ||
          './.private/evidence'
      );
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // 1. Gather all files on disk
    const diskFiles: string[] = [];
    const collectFiles = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiles(fullPath);
        } else if (entry.isFile()) {
          diskFiles.push(fullPath);
        }
      }
    };

    collectFiles(baseDir);

    // 2. Query all database evidence records
    const dbEvidence = await prisma.evidence.findMany({
      select: {
        id: true,
        filename: true,
        storageKey: true,
        sha256: true,
        sizeBytes: true,
      },
    });

    const dbKeyMap = new Map<string, typeof dbEvidence[0]>();
    for (const ev of dbEvidence) {
      dbKeyMap.set(ev.storageKey, ev);
    }

    const orphanFiles: StorageReconciliationReport['orphanFiles'] = [];
    const missingFiles: StorageReconciliationReport['missingFiles'] = [];
    const hashMismatches: StorageReconciliationReport['hashMismatches'] = [];
    let verifiedCount = 0;
    let staleTempCleaned = 0;

    // 3. Check disk files against DB
    const diskKeysSet = new Set<string>();

    for (const filePath of diskFiles) {
      const relKey = path.relative(baseDir, filePath).replace(/\\/g, '/');
      diskKeysSet.add(relKey);

      const dbRecord = dbKeyMap.get(relKey) || dbKeyMap.get(`cases/${relKey}`) || dbKeyMap.get(filePath);

      if (!dbRecord) {
        const stat = fs.statSync(filePath);
        const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

        // Check if it's a stale temp upload
        if (filePath.includes('tmp') || filePath.includes('temp') || ageHours > 24) {
          if (options.cleanOrphans) {
            fs.unlinkSync(filePath);
            staleTempCleaned++;
            continue;
          }
        }

        orphanFiles.push({
          filePath,
          byteSize: stat.size,
          modifiedAt: new Date(stat.mtimeMs).toISOString(),
        });
      } else {
        // Validate SHA-256 hash
        try {
          const buffer = fs.readFileSync(filePath);
          const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');

          if (dbRecord.sha256 && dbRecord.sha256.length === 64 && computedHash !== dbRecord.sha256) {
            hashMismatches.push({
              evidenceId: dbRecord.id,
              expectedSha256: dbRecord.sha256,
              actualSha256: computedHash,
            });
          } else {
            verifiedCount++;
          }
        } catch {
          // File read error
        }
      }
    }

    // 4. Check DB records against disk
    for (const ev of dbEvidence) {
      const expectedPath = path.resolve(baseDir, ev.storageKey);
      const altPath = path.resolve(process.cwd(), ev.storageKey);

      if (!fs.existsSync(expectedPath) && !fs.existsSync(altPath)) {
        missingFiles.push({
          evidenceId: ev.id,
          storageKey: ev.storageKey,
          filename: ev.filename,
        });
      }
    }

    const hasDiscrepancies = orphanFiles.length > 0 || missingFiles.length > 0 || hashMismatches.length > 0;

    return {
      timestamp: new Date().toISOString(),
      storageDirectory: baseDir,
      totalFilesOnDisk: diskFiles.length - staleTempCleaned,
      totalRecordsInDb: dbEvidence.length,
      verifiedMatchingCount: verifiedCount,
      orphanFiles,
      missingFiles,
      hashMismatches,
      staleTempFilesCleaned: staleTempCleaned,
      status: hasDiscrepancies ? 'DISCREPANCIES_DETECTED' : 'IN_SYNC',
    };
  }
}
