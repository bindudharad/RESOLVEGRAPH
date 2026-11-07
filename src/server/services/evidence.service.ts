import { prisma } from '@/lib/prisma';
import { VerificationStatus, EvidenceType, Prisma } from '@/generated/prisma/client';

export interface EvidenceListQuery {
  page?: number;
  limit?: number;
  caseId?: string;
  type?: string;
  verification?: string;
  search?: string;
}

export class EvidenceService {
  /**
   * List workspace evidence with metadata
   */
  static async listEvidence(params: EvidenceListQuery) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.EvidenceWhereInput = {};

    if (params.caseId) {
      where.case = {
        OR: [{ caseNumber: params.caseId }, { id: params.caseId }],
      };
    }

    if (params.type && params.type !== 'all') {
      const typeKey = params.type.toUpperCase().replace(/\s+/g, '_');
      if (typeKey in EvidenceType) {
        where.evidenceType = typeKey as EvidenceType;
      }
    }

    if (params.verification && params.verification !== 'all') {
      const vKey = params.verification.toUpperCase();
      if (vKey in VerificationStatus) {
        where.verificationStatus = vKey as VerificationStatus;
      }
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { filename: { contains: q } },
        { description: { contains: q } },
        { case: { caseNumber: { contains: q } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.evidence.count({ where }),
      prisma.evidence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: true,
          case: {
            select: {
              caseNumber: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        name: item.filename,
        caseId: item.case.caseNumber,
        type: item.evidenceType,
        uploadedBy: item.uploadedBy.fullName,
        uploadedAt: item.createdAt.toISOString(),
        verification: item.verificationStatus,
        sizeKb: Math.round(item.sizeBytes / 1024),
        extension: item.filename.split('.').pop()?.toLowerCase() || 'bin',
        sha256: item.sha256,
        storageKey: item.storageKey,
        description: item.description,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
