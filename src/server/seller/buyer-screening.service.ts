/**
 * RESOLVEGRAPH — Buyer Evidence Screening Gate
 *
 * Ensures seller identification and outreach begin ONLY after buyer evidence
 * verification screening passes on submitted complaint documents.
 */

import { prisma } from '@/lib/prisma';
import { EvidenceGuardService } from '@/server/services/evidenceguard.service';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { CaseStatus, EvidenceSource, VerificationStatus } from '@/generated/prisma/client';

export interface BuyerScreeningGateResult {
  passed: boolean;
  caseId: string;
  caseNumber: string;
  screeningState: 'PASSED' | 'BLOCKED_NO_EVIDENCE' | 'BLOCKED_REJECTED_OR_INFECTED' | 'BLOCKED_CASE_STATE';
  reason: string;
  screenedEvidenceIds: string[];
  eligibleDocumentIds: string[];
  flaggedEvidenceIds: string[];
  warnings: string[];
}

export class BuyerScreeningService {
  /**
   * Evaluates whether a case has passed Buyer Evidence Verification screening
   * and is eligible to proceed to Seller Identification & Outreach.
   */
  public static async evaluateCaseScreening(
    caseIdOrNumber: string,
    options?: { runGuardIfMissing?: boolean }
  ): Promise<BuyerScreeningGateResult> {
    const runGuardIfMissing = options?.runGuardIfMissing ?? true;

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ id: caseIdOrNumber }, { caseNumber: caseIdOrNumber }] },
      include: {
        evidence: {
          include: { analysisResults: { orderBy: { createdAt: 'desc' } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!caseRecord) {
      throw new Error(`Case ${caseIdOrNumber} not found.`);
    }

    if (caseRecord.status === CaseStatus.DRAFT || caseRecord.status === CaseStatus.ARCHIVED) {
      return {
        passed: false,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        screeningState: 'BLOCKED_CASE_STATE',
        reason: `Case ${caseRecord.caseNumber} is in ${caseRecord.status} state and cannot enter seller identification.`,
        screenedEvidenceIds: [],
        eligibleDocumentIds: [],
        flaggedEvidenceIds: [],
        warnings: [],
      };
    }

    const buyerUploads = caseRecord.evidence.filter(
      (ev) => ev.sourceType === EvidenceSource.BUYER_UPLOAD
    );

    if (buyerUploads.length === 0) {
      return {
        passed: false,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        screeningState: 'BLOCKED_NO_EVIDENCE',
        reason:
          'Buyer evidence screening requires at least one customer-submitted evidence file before seller identification can proceed.',
        screenedEvidenceIds: [],
        eligibleDocumentIds: [],
        flaggedEvidenceIds: [],
        warnings: [],
      };
    }

    const screenedEvidenceIds: string[] = [];
    const eligibleDocumentIds: string[] = [];
    const flaggedEvidenceIds: string[] = [];
    const warnings: string[] = [];

    for (const ev of buyerUploads) {
      if (ev.scanStatus === 'INFECTED' || ev.verificationStatus === VerificationStatus.REJECTED) {
        flaggedEvidenceIds.push(ev.id);
        warnings.push(`Buyer evidence ${ev.filename} blocked (${ev.scanStatus}/${ev.verificationStatus}).`);
        continue;
      }

      let latestAnalysis = ev.analysisResults[0] || null;
      if (!latestAnalysis && runGuardIfMissing) {
        let buffer: Buffer | undefined;
        if (ev.storageKey) {
          buffer = (await evidenceStorage.readFileBuffer(ev.storageKey)) ?? undefined;
        }
        try {
          const analysis = await EvidenceGuardService.analyzeEvidence(ev.id, buffer);
          latestAnalysis = {
            id: `run_${ev.id}`,
            evidenceId: ev.id,
            assessmentState: analysis.assessmentState,
            confidence: analysis.confidence,
            exifMetadataJson: null,
            perceptualHash: analysis.perceptualHash || null,
            isDuplicateImage: analysis.isDuplicateImage,
            duplicateEvidenceId: analysis.duplicateEvidenceId || null,
            videoFrameSamplingJson: null,
            suspiciousTransitionsDetected: false,
            aiGenerationIndicatorsDetected: false,
            invoiceOcrCrossCheckJson: null,
            findingsSummary: analysis.findingsSummary,
            humanReviewRecommended: analysis.humanReviewRecommended,
            analysisMethod: analysis.analysisMethod,
            createdAt: new Date(),
          };
        } catch (err) {
          warnings.push(
            `EvidenceGuard check deferred for ${ev.filename}: ${err instanceof Error ? err.message : 'Error'}`
          );
        }
      }

      if (latestAnalysis) {
        screenedEvidenceIds.push(ev.id);
        if (latestAnalysis.assessmentState === 'SUSPICIOUS') {
          flaggedEvidenceIds.push(ev.id);
          warnings.push(`Evidence ${ev.filename} flagged SUSPICIOUS: ${latestAnalysis.findingsSummary}`);
        } else {
          eligibleDocumentIds.push(ev.id);
        }
      } else {
        // Screened not available yet, allow only if explicitly non-infected when runGuardIfMissing=false
        if (!runGuardIfMissing) {
          eligibleDocumentIds.push(ev.id);
        } else {
          flaggedEvidenceIds.push(ev.id);
        }
      }
    }

    if (eligibleDocumentIds.length === 0) {
      return {
        passed: false,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        screeningState: 'BLOCKED_REJECTED_OR_INFECTED',
        reason:
          'All submitted buyer evidence failed screening (infected, rejected, or flagged suspicious). Human investigator screening review is required before seller outreach.',
        screenedEvidenceIds,
        eligibleDocumentIds,
        flaggedEvidenceIds,
        warnings,
      };
    }

    return {
      passed: true,
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      screeningState: 'PASSED',
      reason: `Buyer evidence screening passed (${eligibleDocumentIds.length} eligible artifact(s)).`,
      screenedEvidenceIds,
      eligibleDocumentIds,
      flaggedEvidenceIds,
      warnings,
    };
  }
}
