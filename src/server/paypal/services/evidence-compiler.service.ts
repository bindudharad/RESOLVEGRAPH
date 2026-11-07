import { prisma } from '@/lib/prisma';
import { DisputeEvidenceSubmission } from '../providers/paypal-provider.interface';
import { EvidenceType, EvidenceVisibility } from '@/generated/prisma/client';

export interface CompiledDisputeEvidence {
  evidenceType: string;
  notes: string;
  trackingInfo?: Array<{ carrier_name: string; tracking_number: string }>;
  documents: Array<{
    name: string;
    description: string;
    evidenceId: string;
    mimeType: string;
    fileSizeBytes: number;
  }>;
}

export class EvidenceCompilerService {
  /**
   * Compiles authorized case evidence for a PayPal dispute.
   */
  public static async compileCaseEvidence(
    caseId: string,
    evidenceType: string = 'PROOF_OF_FULFILLMENT',
    note?: string
  ): Promise<CompiledDisputeEvidence> {
    const caseRecord = await prisma.caseRecord.findUnique({
      where: { id: caseId },
      include: {
        evidence: true,
        claims: true,
      },
    });

    if (!caseRecord) {
      throw new Error(`Case record not found: ${caseId}`);
    }

    // Filter evidence visible to merchant or shared with participants
    const permittedVisibilities = new Set<EvidenceVisibility>([
      EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      EvidenceVisibility.MERCHANT_ONLY,
    ]);

    const accessibleEvidence = caseRecord.evidence.filter((e) =>
      permittedVisibilities.has(e.visibility)
    );

    const documents = accessibleEvidence.map((e) => ({
      name: e.filename,
      description: e.description || `Evidence submitted for case ${caseRecord.caseNumber}`,
      evidenceId: e.id,
      mimeType: e.mimeType,
      fileSizeBytes: e.sizeBytes,
    }));

    // Find any tracking info from evidence or claims
    const trackingInfo: Array<{ carrier_name: string; tracking_number: string }> = [];
    for (const ev of accessibleEvidence) {
      if (ev.evidenceType === EvidenceType.TRACKING_INFO && ev.description) {
        trackingInfo.push({
          carrier_name: 'CARRIER',
          tracking_number: ev.description.slice(0, 50),
        });
      }
    }

    const defaultNotes = `ResolveGraph Compiled Case Evidence for Dispute regarding Order ${caseRecord.caseNumber}. Contains ${documents.length} verified item(s).`;

    return {
      evidenceType,
      notes: note || defaultNotes,
      trackingInfo: trackingInfo.length > 0 ? trackingInfo : undefined,
      documents,
    };
  }

  /**
   * Maps internal compiled evidence to PayPal DisputeEvidenceSubmission format.
   */
  public static toPayPalSubmission(
    compiled: CompiledDisputeEvidence
  ): DisputeEvidenceSubmission {
    return {
      evidence_type: compiled.evidenceType,
      notes: compiled.notes,
      evidence_info: compiled.trackingInfo
        ? { tracking_info: compiled.trackingInfo }
        : undefined,
      documents: compiled.documents.map((d) => ({
        name: d.name,
      })),
    };
  }
}
