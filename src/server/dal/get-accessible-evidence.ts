import { prisma } from '@/lib/prisma';
import { Prisma, EvidenceType, VerificationStatus } from '@/generated/prisma/client';
import { AuthenticatedUser } from '../auth/session';
import { canViewEvidence } from '../auth/permissions';

export interface AccessibleEvidenceParams {
  page?: number;
  limit?: number;
  caseId?: string;
  type?: string;
  verification?: string;
  search?: string;
}

export async function getAccessibleEvidence(user: AuthenticatedUser, params: AccessibleEvidenceParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const userOrgIds = user.orgMemberships?.map((m) => m.organizationId) || [];

  // Case-level boundary
  const caseAccessFilter: Prisma.CaseRecordWhereInput[] = [];
  if (user.isPlatformAdmin) {
    // Admin sees all
  } else {
    const orCond: Prisma.CaseRecordWhereInput[] = [{ buyerId: user.id }];
    if (userOrgIds.length > 0) {
      orCond.push({ organizationId: { in: userOrgIds } });
    }
    caseAccessFilter.push({ OR: orCond });
  }

  const caseWhere: Prisma.CaseRecordWhereInput = {};

  if (caseAccessFilter.length > 0) {
    caseWhere.AND = caseAccessFilter;
  }

  if (params.caseId) {
    caseWhere.OR = [{ caseNumber: params.caseId }, { id: params.caseId }];
  }

  const where: Prisma.EvidenceWhereInput = {};

  if (Object.keys(caseWhere).length > 0) {
    where.case = caseWhere;
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

  const [total, rawItems] = await Promise.all([
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
            id: true,
            caseNumber: true,
            title: true,
            buyerId: true,
            merchantId: true,
            organizationId: true,
          },
        },
      },
    }),
  ]);

  // Apply fine-grained visibility filter (e.g. BUYER_ONLY, MERCHANT_ONLY, INTERNAL)
  const accessibleItems = rawItems.filter((item) =>
    canViewEvidence(user, item, item.case)
  );

  return {
    items: accessibleItems.map((item) => ({
      id: item.id,
      name: item.filename,
      caseId: item.case.caseNumber,
      type: item.evidenceType,
      uploadedBy: item.uploadedBy.fullName,
      uploadedAt: item.createdAt.toISOString(),
      verification: item.verificationStatus,
      visibility: item.visibility,
      scanStatus: item.scanStatus,
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
