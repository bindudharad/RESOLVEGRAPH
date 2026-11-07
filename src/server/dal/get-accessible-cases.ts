import { prisma } from '@/lib/prisma';
import { Prisma, CaseStatus, CasePriority, CaseCategory } from '@/generated/prisma/client';
import { AuthenticatedUser } from '../auth/session';
import { formatCaseResponse } from '../services/case.service';

export interface AccessibleCasesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  organizationId?: string;
  sortBy?: 'createdAt' | 'amountMinor' | 'priority' | 'caseNumber';
  sortOrder?: 'asc' | 'desc';
}

export async function getAccessibleCases(user: AuthenticatedUser, params: AccessibleCasesParams) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const userOrgIds = user.orgMemberships.map((m) => m.organizationId);

  // Base tenant & role isolation criteria
  const accessFilter: Prisma.CaseRecordWhereInput[] = [];

  if (user.isPlatformAdmin) {
    // Platform admin can access all cases, with optional org filtering
    if (params.organizationId) {
      accessFilter.push({ organizationId: params.organizationId });
    }
  } else {
    // Normal users: strictly isolate to own buyer cases or authorized merchant organizations
    const accessConditions: Prisma.CaseRecordWhereInput[] = [{ buyerId: user.id }];

    if (userOrgIds.length > 0) {
      accessConditions.push({
        organizationId: { in: userOrgIds },
      });
    }

    accessFilter.push({ OR: accessConditions });

    if (params.organizationId) {
      if (!userOrgIds.includes(params.organizationId)) {
        // Requested an organization they do not belong to: return empty result
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 1 },
        };
      }
      accessFilter.push({ organizationId: params.organizationId });
    }
  }

  const where: Prisma.CaseRecordWhereInput = {
    AND: accessFilter,
  };

  if (params.search) {
    const q = params.search.trim();
    where.AND = [
      ...accessFilter,
      {
        OR: [
          { caseNumber: { contains: q } },
          { title: { contains: q } },
          { description: { contains: q } },
          { buyer: { fullName: { contains: q } } },
          { merchant: { fullName: { contains: q } } },
        ],
      },
    ];
  }

  if (params.status && params.status !== 'all') {
    const statusKey = params.status.toUpperCase().replace(/\s+/g, '_');
    if (statusKey in CaseStatus) {
      where.status = statusKey as CaseStatus;
    }
  }

  if (params.priority && params.priority !== 'all') {
    const prioKey = params.priority.toUpperCase();
    if (prioKey in CasePriority) {
      where.priority = prioKey as CasePriority;
    }
  }

  if (params.category && params.category !== 'all') {
    const catKey = params.category.toUpperCase().replace(/\s+/g, '_');
    if (catKey in CaseCategory) {
      where.category = catKey as CaseCategory;
    }
  }

  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';

  const [total, cases] = await Promise.all([
    prisma.caseRecord.count({ where }),
    prisma.caseRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        buyer: true,
        merchant: true,
        assignedManager: true,
        organization: true,
        claims: { include: { author: true } },
        evidence: { include: { uploadedBy: true } },
        events: { include: { actor: true }, orderBy: { createdAt: 'desc' } },
      },
    }),
  ]);

  return {
    items: cases.map(formatCaseResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
