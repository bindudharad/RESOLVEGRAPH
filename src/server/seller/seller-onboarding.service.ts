/**
 * RESOLVEGRAPH — Per-User Seller Workspace Onboarding Service
 *
 * Manages first-time Welcome Guide state strictly per authenticated seller user
 * (never shared across organization teammates).
 *
 * Persistence order:
 * 1. Primary normalized table `SellerOnboardingState` (additive schema/migration).
 * 2. Safe fallback to existing persisted `SecurityAuditEvent` snapshots when the
 *    additive table migration has not yet been executed on a persistent SQLite DB.
 */

import { prisma } from '@/lib/prisma';
import type { PrismaClient } from '@/generated/prisma/client';
import { UserRole } from '@/generated/prisma/client';
import type { AuthenticatedUser } from '@/server/auth/session';
import { SellerPortalAccessError } from './seller-response.service';

export type SellerOnboardingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SKIPPED'
  | 'COMPLETED';

export type SellerOnboardingAction =
  | 'VIEW_STEP'
  | 'SKIP'
  | 'COMPLETE'
  | 'REOPEN';

export interface SellerOnboardingStateDto {
  userId: string;
  status: SellerOnboardingStatus;
  lastViewedStep: number;
  completedAt: string | null;
  dismissedAt: string | null;
  updatedAt: string | null;
  shouldAutoShow: boolean;
  persistenceMode: 'database' | 'audit_fallback_pending_migration';
}

export interface UpdateSellerOnboardingInput {
  action: SellerOnboardingAction;
  step?: number;
  source?: string;
}

const AUDIT_SNAPSHOT_ACTION = 'SELLER_ONBOARDING_STATE_SYNC';
const AUDIT_TARGET_TYPE = 'SellerOnboardingState';

// In-process serialization per user prevents rapid clicks (e.g. step 4 + finish)
// from overwriting one another out of order.
const perUserMutationQueue = new Map<string, Promise<unknown>>();

function enqueueForUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = perUserMutationQueue.get(userId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(fn);
  perUserMutationQueue.set(userId, next);
  return next.finally(() => {
    if (perUserMutationQueue.get(userId) === next) {
      perUserMutationQueue.delete(userId);
    }
  });
}

function clampStep(step: number | undefined, fallback = 1): number {
  if (typeof step !== 'number' || !Number.isFinite(step)) {
    return fallback;
  }
  const rounded = Math.trunc(step);
  if (rounded < 1) return 1;
  if (rounded > 4) return 4;
  return rounded;
}

function normalizeStatus(raw: string | null | undefined): SellerOnboardingStatus {
  switch (raw) {
    case 'IN_PROGRESS':
    case 'SKIPPED':
    case 'COMPLETED':
    case 'NOT_STARTED':
      return raw;
    default:
      return 'NOT_STARTED';
  }
}

const verifiedNormalizedClients = new WeakSet<object>();

async function hasNormalizedOnboardingTable(db: PrismaClient): Promise<boolean> {
  if (verifiedNormalizedClients.has(db as unknown as object)) {
    return true;
  }
  try {
    const rows = await db.$queryRawUnsafe<Array<{ name?: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SellerOnboardingState' LIMIT 1"
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    if (exists) {
      verifiedNormalizedClients.add(db as unknown as object);
    }
    return exists;
  } catch {
    return true;
  }
}

function isMissingOnboardingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  if (code === 'P2021') return true;
  const message = (err as { message?: string }).message ?? '';
  return /no such table.*SellerOnboardingState/i.test(message);
}

interface StoredOnboardingRecord {
  status: SellerOnboardingStatus;
  lastViewedStep: number;
  completedAt: Date | null;
  dismissedAt: Date | null;
  updatedAt: Date | null;
}

function toDto(
  userId: string,
  record: StoredOnboardingRecord,
  persistenceMode: 'database' | 'audit_fallback_pending_migration'
): SellerOnboardingStateDto {
  return {
    userId,
    status: record.status,
    lastViewedStep: clampStep(record.lastViewedStep, 1),
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
    dismissedAt: record.dismissedAt ? record.dismissedAt.toISOString() : null,
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
    shouldAutoShow:
      record.status === 'NOT_STARTED' || record.status === 'IN_PROGRESS',
    persistenceMode,
  };
}

function parseAuditSnapshot(rawJson: string | null | undefined): StoredOnboardingRecord | null {
  if (!rawJson) return null;
  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    return {
      status: normalizeStatus(typeof parsed.status === 'string' ? parsed.status : undefined),
      lastViewedStep: clampStep(
        typeof parsed.lastViewedStep === 'number' ? parsed.lastViewedStep : undefined,
        1
      ),
      completedAt:
        typeof parsed.completedAt === 'string' && !Number.isNaN(Date.parse(parsed.completedAt))
          ? new Date(parsed.completedAt)
          : null,
      dismissedAt:
        typeof parsed.dismissedAt === 'string' && !Number.isNaN(Date.parse(parsed.dismissedAt))
          ? new Date(parsed.dismissedAt)
          : null,
      updatedAt:
        typeof parsed.updatedAt === 'string' && !Number.isNaN(Date.parse(parsed.updatedAt))
          ? new Date(parsed.updatedAt)
          : null,
    };
  } catch {
    return null;
  }
}

export function computeNextOnboardingRecord(
  current: StoredOnboardingRecord,
  input: UpdateSellerOnboardingInput,
  now: Date
): StoredOnboardingRecord {
  const step = clampStep(input.step, current.lastViewedStep || 1);

  switch (input.action) {
    case 'VIEW_STEP': {
      // Preserve terminal/explicit states so revisiting Getting Started does
      // not unexpectedly re-enable auto-show or clear completion timestamps.
      const nextStatus: SellerOnboardingStatus =
        current.status === 'COMPLETED' || current.status === 'SKIPPED'
          ? current.status
          : 'IN_PROGRESS';

      return {
        status: nextStatus,
        lastViewedStep: step,
        completedAt: current.completedAt,
        dismissedAt: current.dismissedAt,
        updatedAt: now,
      };
    }

    case 'SKIP': {
      // If already completed, dismissing a reopened tour keeps completion intact.
      if (current.status === 'COMPLETED') {
        return {
          status: 'COMPLETED',
          lastViewedStep: step,
          completedAt: current.completedAt,
          dismissedAt: current.dismissedAt,
          updatedAt: now,
        };
      }
      return {
        status: 'SKIPPED',
        lastViewedStep: step,
        completedAt: current.completedAt,
        dismissedAt: now,
        updatedAt: now,
      };
    }

    case 'COMPLETE': {
      return {
        status: 'COMPLETED',
        lastViewedStep: 4,
        completedAt: current.completedAt ?? now,
        dismissedAt: current.dismissedAt,
        updatedAt: now,
      };
    }

    case 'REOPEN': {
      return {
        status:
          current.status === 'NOT_STARTED' ? 'IN_PROGRESS' : current.status,
        lastViewedStep: clampStep(input.step, 1),
        completedAt: current.completedAt,
        dismissedAt: current.dismissedAt,
        updatedAt: now,
      };
    }
  }
}

export class SellerOnboardingService {
  /**
   * Verifies that the authenticated user is an active Seller Workspace member.
   * Rejects buyers, deactivated accounts, non-seller admins, and users without an
   * active merchant organization membership.
   */
  public static async assertAuthorizedSellerUser(
    user: AuthenticatedUser,
    db: PrismaClient = prisma
  ): Promise<{ organizationIds: string[] }> {
    if (!user.isActive) {
      throw new SellerPortalAccessError(
        'Your user account is inactive and cannot access Seller Workspace onboarding.',
        403
      );
    }

    if (user.isPlatformAdmin || user.role === UserRole.ADMIN) {
      throw new SellerPortalAccessError(
        'Seller onboarding state is reserved for active merchant seller accounts.',
        403
      );
    }

    if (user.role !== UserRole.MERCHANT) {
      throw new SellerPortalAccessError(
        'Only authorized seller workspace accounts can access Seller onboarding.',
        403
      );
    }

    const activeMemberships = await db.organizationMember.findMany({
      where: {
        userId: user.id,
        isActive: true,
        organization: { isActive: true },
      },
      select: { organizationId: true },
    });

    if (activeMemberships.length === 0) {
      throw new SellerPortalAccessError(
        'Active merchant organization membership is required to access Seller onboarding.',
        403
      );
    }

    return {
      organizationIds: activeMemberships.map((m) => m.organizationId),
    };
  }

  private static async readAuditFallback(
    userId: string,
    db: PrismaClient
  ): Promise<StoredOnboardingRecord | null> {
    const latest = await db.securityAuditEvent.findFirst({
      where: {
        actorId: userId,
        action: AUDIT_SNAPSHOT_ACTION,
        targetType: AUDIT_TARGET_TYPE,
        targetId: userId,
        status: 'SUCCESS',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) return null;
    return parseAuditSnapshot(latest.metadataJson);
  }

  private static async writeAuditSnapshot(
    userId: string,
    record: StoredOnboardingRecord,
    action: string,
    db: PrismaClient,
    source?: string
  ): Promise<void> {
    await db.securityAuditEvent.create({
      data: {
        actorId: userId,
        action,
        targetType: AUDIT_TARGET_TYPE,
        targetId: userId,
        status: 'SUCCESS',
        metadataJson: JSON.stringify({
          status: record.status,
          lastViewedStep: record.lastViewedStep,
          completedAt: record.completedAt ? record.completedAt.toISOString() : null,
          dismissedAt: record.dismissedAt ? record.dismissedAt.toISOString() : null,
          updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
          source: source ?? null,
        }),
      },
    });
  }

  public static async getStateForUser(
    user: AuthenticatedUser,
    db: PrismaClient = prisma
  ): Promise<SellerOnboardingStateDto> {
    await this.assertAuthorizedSellerUser(user, db);

    const defaultRecord: StoredOnboardingRecord = {
      status: 'NOT_STARTED',
      lastViewedStep: 1,
      completedAt: null,
      dismissedAt: null,
      updatedAt: null,
    };

    if (!(await hasNormalizedOnboardingTable(db))) {
      const fallback = await this.readAuditFallback(user.id, db);
      return toDto(
        user.id,
        fallback ?? defaultRecord,
        'audit_fallback_pending_migration'
      );
    }

    try {
      const row = await db.sellerOnboardingState.findUnique({
        where: { userId: user.id },
      });

      if (row) {
        return toDto(
          user.id,
          {
            status: normalizeStatus(row.status),
            lastViewedStep: row.lastViewedStep,
            completedAt: row.completedAt,
            dismissedAt: row.dismissedAt,
            updatedAt: row.updatedAt,
          },
          'database'
        );
      }

      // If table exists after migration, preserve any prior audit fallback snapshot once.
      const fallback = await this.readAuditFallback(user.id, db);
      if (fallback) {
        return toDto(user.id, fallback, 'database');
      }

      return toDto(user.id, defaultRecord, 'database');
    } catch (err) {
      if (!isMissingOnboardingTableError(err)) {
        throw err;
      }

      const fallback = await this.readAuditFallback(user.id, db);
      return toDto(
        user.id,
        fallback ?? defaultRecord,
        'audit_fallback_pending_migration'
      );
    }
  }

  public static async updateStateForUser(
    user: AuthenticatedUser,
    input: UpdateSellerOnboardingInput,
    db: PrismaClient = prisma
  ): Promise<SellerOnboardingStateDto> {
    await this.assertAuthorizedSellerUser(user, db);

    return enqueueForUser(user.id, async () => {
      const now = new Date();
      const defaultRecord: StoredOnboardingRecord = {
        status: 'NOT_STARTED',
        lastViewedStep: 1,
        completedAt: null,
        dismissedAt: null,
        updatedAt: null,
      };

      if (!(await hasNormalizedOnboardingTable(db))) {
        const existingFallback =
          (await this.readAuditFallback(user.id, db)) ?? defaultRecord;
        const next = computeNextOnboardingRecord(existingFallback, input, now);

        await this.writeAuditSnapshot(
          user.id,
          next,
          AUDIT_SNAPSHOT_ACTION,
          db,
          input.source
        );

        return toDto(user.id, next, 'audit_fallback_pending_migration');
      }

      try {
        const existingRow = await db.sellerOnboardingState.findUnique({
          where: { userId: user.id },
        });
        const fallbackSnapshot = existingRow
          ? null
          : await this.readAuditFallback(user.id, db);

        const current: StoredOnboardingRecord = existingRow
          ? {
              status: normalizeStatus(existingRow.status),
              lastViewedStep: existingRow.lastViewedStep,
              completedAt: existingRow.completedAt,
              dismissedAt: existingRow.dismissedAt,
              updatedAt: existingRow.updatedAt,
            }
          : fallbackSnapshot ?? defaultRecord;

        const next = computeNextOnboardingRecord(current, input, now);

        const saved = await db.sellerOnboardingState.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            status: next.status,
            lastViewedStep: next.lastViewedStep,
            completedAt: next.completedAt,
            dismissedAt: next.dismissedAt,
          },
          update: {
            status: next.status,
            lastViewedStep: next.lastViewedStep,
            completedAt: next.completedAt,
            dismissedAt: next.dismissedAt,
          },
        });

        await this.writeAuditSnapshot(
          user.id,
          next,
          `SELLER_ONBOARDING_${input.action}`,
          db,
          input.source
        ).catch(() => undefined);

        return toDto(
          user.id,
          {
            status: normalizeStatus(saved.status),
            lastViewedStep: saved.lastViewedStep,
            completedAt: saved.completedAt,
            dismissedAt: saved.dismissedAt,
            updatedAt: saved.updatedAt,
          },
          'database'
        );
      } catch (err) {
        if (!isMissingOnboardingTableError(err)) {
          throw err;
        }

        const existingFallback =
          (await this.readAuditFallback(user.id, db)) ?? defaultRecord;
        const next = computeNextOnboardingRecord(existingFallback, input, now);

        await this.writeAuditSnapshot(
          user.id,
          next,
          AUDIT_SNAPSHOT_ACTION,
          db,
          input.source
        );

        return toDto(user.id, next, 'audit_fallback_pending_migration');
      }
    });
  }
}
