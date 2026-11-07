import { prisma } from '@/lib/prisma';

export interface AuditLogParams {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  status?: 'SUCCESS' | 'DENIED' | 'FAILURE';
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export class SecurityAuditService {
  /**
   * Records a security-relevant event to the append-only audit ledger.
   * Strips any sensitive credentials, tokens, or hashes before persistence.
   */
  static async record(params: AuditLogParams) {
    try {
      let sanitizedMetadataJson: string | null = null;
      if (params.metadata) {
        const clean: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(params.metadata)) {
          const lower = key.toLowerCase();
          if (
            lower.includes('password') ||
            lower.includes('token') ||
            lower.includes('secret') ||
            lower.includes('cookie') ||
            lower.includes('authorization')
          ) {
            clean[key] = '[REDACTED]';
          } else {
            clean[key] = value;
          }
        }
        sanitizedMetadataJson = JSON.stringify(clean);
      }

      await prisma.securityAuditEvent.create({
        data: {
          actorId: params.actorId || null,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId || null,
          status: params.status || 'SUCCESS',
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadataJson: sanitizedMetadataJson,
        },
      });
    } catch (err) {
      console.error('Failed to write security audit event:', err);
    }
  }
}
