/**
 * RESOLVEGRAPH — Privacy & Data Governance Service
 * 
 * Implements privacy operations compliant with GDPR, CCPA, and India's DPDPA:
 * - Data Subject Access Requests (DSAR) / Data Export
 * - Right to Rectification / Correction
 * - Legal Preservation & Financial Hold Assessment
 * - User Anonymization & Controlled Deletion
 */

import { prisma } from '@/lib/prisma';

export interface UserDataExport {
  exportDate: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    createdAt: Date;
  };
  organizationMemberships: Array<{
    organizationId: string;
    organizationName: string;
    role: string;
  }>;
  cases: Array<{
    id: string;
    caseNumber: string;
    title: string;
    category: string;
    status: string;
    role: 'BUYER' | 'MERCHANT';
    createdAt: Date;
  }>;
  claims: Array<{
    id: string;
    caseId: string;
    claimType: string;
    statement: string;
    createdAt: Date;
  }>;
  evidenceItems: Array<{
    id: string;
    caseId: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }>;
  auditEvents: Array<{
    id: string;
    eventType: string;
    description: string;
    createdAt: Date;
  }>;
}

export interface DeletionAssessmentResult {
  canDeleteImmediately: boolean;
  activeLegalHolds: string[];
  preservedRecordsCount: {
    activeCases: number;
    financialSettlements: number;
    paypalDisputes: number;
  };
  actionTaken: 'ANONYMIZED_WITH_LEGAL_HOLD' | 'PURGED' | 'BLOCKED_BY_ACTIVE_DISPUTE';
  message: string;
}

export class PrivacyService {
  /**
   * Generates a complete DSAR data export package for a user.
   */
  public static async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const [buyerCases, merchantCases, claims, evidence, auditEvents] = await Promise.all([
      prisma.caseRecord.findMany({
        where: { buyerId: userId },
        select: { id: true, caseNumber: true, title: true, category: true, status: true, createdAt: true },
      }),
      prisma.caseRecord.findMany({
        where: { merchantId: userId },
        select: { id: true, caseNumber: true, title: true, category: true, status: true, createdAt: true },
      }),
      prisma.claim.findMany({
        where: { authorId: userId },
        select: { id: true, caseId: true, claimType: true, statement: true, createdAt: true },
      }),
      prisma.evidence.findMany({
        where: { uploadedById: userId },
        select: { id: true, caseId: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true },
      }),
      prisma.caseEvent.findMany({
        where: { actorId: userId },
        select: { id: true, eventType: true, description: true, createdAt: true },
      }),
    ]);

    const combinedCases = [
      ...buyerCases.map((c) => ({ ...c, role: 'BUYER' as const })),
      ...merchantCases.map((c) => ({ ...c, role: 'MERCHANT' as const })),
    ];

    return {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.name || 'User',
        role: user.role,
        createdAt: user.createdAt,
      },
      organizationMemberships: user.orgMemberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organization.name,
        role: m.role,
      })),
      cases: combinedCases,
      claims,
      evidenceItems: evidence,
      auditEvents,
    };
  }

  /**
   * Evaluates and executes a Right-to-be-Forgotten deletion request
   * respecting financial compliance and legal hold exceptions.
   */
  public static async processDeletionRequest(userId: string, reason: string): Promise<DeletionAssessmentResult> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 1. Check active cases that cannot be deleted
    const activeCasesCount = await prisma.caseRecord.count({
      where: {
        OR: [{ buyerId: userId }, { merchantId: userId }],
        status: { in: ['SUBMITTED', 'IN_REVIEW', 'EVIDENCE_REQUESTED', 'EVIDENCE_SUBMITTED', 'UNDER_ANALYSIS'] },
      },
    });

    if (activeCasesCount > 0) {
      return {
        canDeleteImmediately: false,
        activeLegalHolds: ['ACTIVE_COMMERCIAL_DISPUTE'],
        preservedRecordsCount: {
          activeCases: activeCasesCount,
          financialSettlements: 0,
          paypalDisputes: 0,
        },
        actionTaken: 'BLOCKED_BY_ACTIVE_DISPUTE',
        message: `Deletion request blocked: User is an active party in ${activeCasesCount} open dispute(s). Disputes must reach resolution before personal records can be processed for erasure.`,
      };
    }

    // 2. Check settled financial records (Statutory 5-7 year tax and AML retention)
    const financialOrdersCount = await prisma.commerceOrder.count({
      where: { buyerId: userId },
    });

    const legalHolds: string[] = [];
    if (financialOrdersCount > 0) {
      legalHolds.push('FINANCIAL_LEDGER_STATUTORY_RETENTION_7_YEARS');
    }

    // Execute Pseudonymization / Anonymization of user profile
    const anonymousEmail = `anonymized_${userId.slice(0, 8)}@privacy.resolvegraph.internal`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymousEmail,
        fullName: 'Redacted Subject',
        name: 'Redacted Subject',
        isActive: false,
      },
    });

    // Record privacy audit log
    await prisma.securityAuditEvent.create({
      data: {
        actorId: null,
        action: 'USER_PRIVACY_ERASURE_PROCESSED',
        targetType: 'USER',
        targetId: userId,
        status: 'SUCCESS',
        metadataJson: JSON.stringify({
          originalUserId: userId,
          reason,
          legalHoldsActive: legalHolds,
          financialOrdersPreserved: financialOrdersCount,
        }),
      },
    });

    return {
      canDeleteImmediately: legalHolds.length === 0,
      activeLegalHolds: legalHolds,
      preservedRecordsCount: {
        activeCases: 0,
        financialSettlements: financialOrdersCount,
        paypalDisputes: 0,
      },
      actionTaken: 'ANONYMIZED_WITH_LEGAL_HOLD',
      message: `User identity has been anonymized. Historical financial order records (${financialOrdersCount}) are preserved under statutory financial recordkeeping obligations.`,
    };
  }
}
