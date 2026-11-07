import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '../auth/session';
import { canAccessCase, canViewEvidence } from '../auth/permissions';
import { formatCaseResponse } from '../services/case.service';
import { AuthError } from '../auth/require-auth';

export async function getCaseByIdAuthorized(user: AuthenticatedUser, caseIdOrNumber: string) {
  const caseRecord = await prisma.caseRecord.findFirst({
    where: {
      OR: [{ caseNumber: caseIdOrNumber }, { id: caseIdOrNumber }],
    },
    include: {
      buyer: true,
      merchant: true,
      assignedManager: true,
      organization: true,
      claims: {
        include: { author: true },
        orderBy: { createdAt: 'asc' },
      },
      evidence: {
        include: { uploadedBy: true },
        orderBy: { createdAt: 'desc' },
      },
      events: {
        include: { actor: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!caseRecord) {
    return null;
  }

  // Enforce access control
  const isAuthorized = canAccessCase(user, caseRecord);
  if (!isAuthorized) {
    throw new AuthError('Access denied: You are not authorized to view this dispute case.', 403);
  }

  // Filter evidence list according to visibility rules
  const accessibleEvidence = caseRecord.evidence.filter((ev) =>
    canViewEvidence(user, ev, caseRecord)
  );

  return {
    ...formatCaseResponse({
      ...caseRecord,
      evidence: accessibleEvidence,
    }),
  };
}
