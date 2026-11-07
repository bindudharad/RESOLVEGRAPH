import { prisma } from '@/lib/prisma';

export interface ConsentCheckResult {
  hasConsent: boolean;
  consentId?: string;
  provider: string;
  reason?: string;
}

export interface CaseConsentedScope {
  caseId: string;
  allowedEvidence: Array<{
    id: string;
    title: string;
    evidenceType: string;
    storagePath: string | null;
    source: string;
    fileSize: number | null;
    mimeType: string | null;
  }>;
  allowedClaims: Array<{
    id: string;
    claimType: string;
    claimantRole: string;
    statement: string;
    demandedAmountCents: number | null;
    demandedCurrency: string | null;
  }>;
  excludedItems: Array<{
    id: string;
    type: 'EVIDENCE' | 'CLAIM';
    title: string;
    exclusionReason: string;
  }>;
}

export class ConsentManager {
  /**
   * Check whether a specific evidence item or claim has active, unrevoked consent for a provider.
   */
  public static async checkConsent(
    targetType: 'EVIDENCE' | 'CLAIM',
    targetId: string,
    provider = 'openai'
  ): Promise<ConsentCheckResult> {
    const consent = await prisma.aIProcessingConsent.findFirst({
      where: {
        ...(targetType === 'EVIDENCE' ? { evidenceId: targetId } : { claimId: targetId }),
        provider,
        revokedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!consent) {
      return {
        hasConsent: false,
        provider,
        reason: 'NO_ACTIVE_CONSENT_GRANTED'
      };
    }

    return {
      hasConsent: true,
      consentId: consent.id,
      provider
    };
  }

  /**
   * Grant AI processing consent for an evidence item or claim.
   */
  public static async grantConsent(params: {
    targetType: 'EVIDENCE' | 'CLAIM';
    targetId: string;
    grantedById: string;
    caseId?: string;
    provider?: string;
    purpose?: string;
  }) {
    const provider = params.provider || 'openai';
    const purpose = params.purpose || 'EVIDENCE_INVESTIGATION';

    let resolvedCaseId = params.caseId;
    if (!resolvedCaseId) {
      if (params.targetType === 'EVIDENCE') {
        const ev = await prisma.evidence.findUnique({
          where: { id: params.targetId },
          select: { caseId: true }
        });
        resolvedCaseId = ev?.caseId;
      } else {
        const cl = await prisma.claim.findUnique({
          where: { id: params.targetId },
          select: { caseId: true }
        });
        resolvedCaseId = cl?.caseId;
      }
    }

    if (!resolvedCaseId) {
      throw new Error(`Target ${params.targetType} ${params.targetId} is not associated with a case.`);
    }

    const consent = await prisma.aIProcessingConsent.create({
      data: {
        caseId: resolvedCaseId,
        evidenceId: params.targetType === 'EVIDENCE' ? params.targetId : null,
        claimId: params.targetType === 'CLAIM' ? params.targetId : null,
        grantedById: params.grantedById,
        provider,
        purpose,
        noticeVersion: '2026.1'
      }
    });

    // Record audit case event
    await prisma.caseEvent.create({
      data: {
        caseId: resolvedCaseId,
        actorId: params.grantedById,
        eventType: 'AI_CONSENT_GRANTED',
        description: `User consented to AI processing with provider ${provider} for purpose ${purpose}`,
        metadataJson: JSON.stringify({
          targetType: params.targetType,
          targetId: params.targetId,
          provider,
          consentId: consent.id
        })
      }
    });

    return consent;
  }

  /**
   * Revoke existing active consent.
   */
  public static async revokeConsent(params: {
    targetType: 'EVIDENCE' | 'CLAIM';
    targetId: string;
    revokedById: string;
    reason?: string;
    provider?: string;
  }) {
    const provider = params.provider || 'openai';

    const consents = await prisma.aIProcessingConsent.findMany({
      where: {
        ...(params.targetType === 'EVIDENCE' ? { evidenceId: params.targetId } : { claimId: params.targetId }),
        provider,
        revokedAt: null
      }
    });

    const now = new Date();
    for (const c of consents) {
      await prisma.aIProcessingConsent.update({
        where: { id: c.id },
        data: {
          revokedAt: now
        }
      });
    }

    let caseId: string | null = null;
    if (params.targetType === 'EVIDENCE') {
      const ev = await prisma.evidence.findUnique({
        where: { id: params.targetId },
        select: { caseId: true }
      });
      caseId = ev?.caseId || null;
    } else {
      const cl = await prisma.claim.findUnique({
        where: { id: params.targetId },
        select: { caseId: true }
      });
      caseId = cl?.caseId || null;
    }

    if (caseId) {
      await prisma.caseEvent.create({
        data: {
          caseId,
          actorId: params.revokedById,
          eventType: 'AI_CONSENT_REVOKED',
          description: `Consent revoked for provider ${provider}. Reason: ${params.reason || 'User revoked consent'}`,
          metadataJson: JSON.stringify({
            targetType: params.targetType,
            targetId: params.targetId,
            provider,
            revocationCount: consents.length,
            reason: params.reason
          })
        }
      });
    }

    return { revokedCount: consents.length };
  }

  /**
   * Filter and return consented and secure items for a full case AI analysis run.
   */
  public static async getCaseConsentedScope(
    caseId: string,
    provider = 'openai'
  ): Promise<CaseConsentedScope> {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: caseId },
      include: {
        evidence: true,
        claims: true
      }
    });

    if (!caseRecord) {
      throw new Error(`Case ${caseId} not found`);
    }

    const allowedEvidence: CaseConsentedScope['allowedEvidence'] = [];
    const allowedClaims: CaseConsentedScope['allowedClaims'] = [];
    const excludedItems: CaseConsentedScope['excludedItems'] = [];

    // Check evidence
    for (const ev of caseRecord.evidence) {
      if (ev.scanStatus === 'INFECTED') {
        excludedItems.push({
          id: ev.id,
          type: 'EVIDENCE',
          title: ev.filename,
          exclusionReason: `SECURITY_MALWARE_${ev.scanStatus}`
        });
        continue;
      }

      const consent = await this.checkConsent('EVIDENCE', ev.id, provider);
      if (!consent.hasConsent) {
        excludedItems.push({
          id: ev.id,
          type: 'EVIDENCE',
          title: ev.filename,
          exclusionReason: 'MISSING_AI_CONSENT'
        });
        continue;
      }

      allowedEvidence.push({
        id: ev.id,
        title: ev.filename,
        evidenceType: ev.evidenceType,
        storagePath: ev.storageKey,
        source: ev.sourceType,
        fileSize: ev.sizeBytes,
        mimeType: ev.mimeType
      });
    }

    // Check claims
    for (const cl of caseRecord.claims) {
      const consent = await this.checkConsent('CLAIM', cl.id, provider);
      if (!consent.hasConsent) {
        excludedItems.push({
          id: cl.id,
          type: 'CLAIM',
          title: `${cl.partyRole} Claim: ${cl.claimType}`,
          exclusionReason: 'MISSING_AI_CONSENT'
        });
        continue;
      }

      allowedClaims.push({
        id: cl.id,
        claimType: cl.claimType,
        claimantRole: cl.partyRole,
        statement: cl.statement,
        demandedAmountCents: null,
        demandedCurrency: caseRecord.currency
      });
    }

    return {
      caseId,
      allowedEvidence,
      allowedClaims,
      excludedItems
    };
  }
}
