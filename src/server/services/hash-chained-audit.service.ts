/**
 * RESOLVEGRAPH Hackathon Expansion
 * Feature 09: Tamper-Evident Hash-Chained Audit Ledger
 * 
 * Provides an immutable, cryptographically chained audit log:
 * currentHash = SHA256(previousHash + payloadHash + sequenceNumber + action + timestamp)
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export interface RecordAuditEventInput {
  action: string;
  actorId?: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, unknown>;
}

export class HashChainedAuditService {
  private static readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Appends an audit event to the cryptographically linked ledger.
   */
  public static async recordEvent(input: RecordAuditEventInput) {
    const detailsJson = JSON.stringify(input.details);
    const payloadHash = createHash('sha256').update(detailsJson).digest('hex');

    // Find the latest audit record to get sequence number and previous hash
    const latestRecord = await prisma.hashChainedAuditRecord.findFirst({
      orderBy: { sequenceNumber: 'desc' },
    });

    const sequenceNumber = (latestRecord?.sequenceNumber ?? 0) + 1;
    const previousHash = latestRecord?.currentHash ?? this.GENESIS_HASH;
    const now = new Date();

    // Compute current cryptographic chain hash
    const currentHash = createHash('sha256')
      .update(`${previousHash}:${payloadHash}:${sequenceNumber}:${input.action}:${now.toISOString()}`)
      .digest('hex');

    const record = await prisma.hashChainedAuditRecord.create({
      data: {
        sequenceNumber,
        previousHash,
        currentHash,
        payloadHash,
        action: input.action,
        actorId: input.actorId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        detailsJson,
        createdAt: now,
      },
    });

    return record;
  }

  /**
   * Validates the cryptographic integrity of the entire audit chain.
   * Returns valid: true if every block's previousHash matches the prior currentHash.
   */
  public static async verifyChainIntegrity() {
    const records = await prisma.hashChainedAuditRecord.findMany({
      orderBy: { sequenceNumber: 'asc' },
    });

    if (records.length === 0) {
      return { isValid: true, totalRecords: 0, checkedAt: new Date() };
    }

    let expectedPrevHash = this.GENESIS_HASH;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Check sequence monotonicity
      if (record.sequenceNumber !== i + 1) {
        return {
          isValid: false,
          brokenAtSequence: record.sequenceNumber,
          reason: `Sequence break at record ${record.id}: expected ${i + 1}, found ${record.sequenceNumber}`,
        };
      }

      // Check link to previous hash
      if (record.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          brokenAtSequence: record.sequenceNumber,
          reason: `Cryptographic link severed at record ${record.id}: previousHash does not match prior currentHash`,
        };
      }

      // Verify payload integrity
      const recalculatedPayloadHash = createHash('sha256')
        .update(record.detailsJson)
        .digest('hex');

      if (recalculatedPayloadHash !== record.payloadHash) {
        return {
          isValid: false,
          brokenAtSequence: record.sequenceNumber,
          reason: `Payload tampering detected at record ${record.id}: recorded payloadHash does not match content hash`,
        };
      }

      expectedPrevHash = record.currentHash;
    }

    return {
      isValid: true,
      totalRecords: records.length,
      headHash: records[records.length - 1].currentHash,
      checkedAt: new Date(),
    };
  }

  /**
   * Queries audit trail for a specific resource.
   */
  public static async getAuditTrail(resourceType: string, resourceId?: string) {
    return prisma.hashChainedAuditRecord.findMany({
      where: {
        resourceType,
        ...(resourceId ? { resourceId } : {}),
      },
      orderBy: { sequenceNumber: 'desc' },
      take: 100,
    });
  }
}
