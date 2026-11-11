import { prisma } from '@/lib/prisma';
import { AuthenticatedUser } from '../auth/session';
import { canAccessCase, canViewEvidence } from '../auth/permissions';
import { formatCaseResponse } from '../services/case.service';
import { AuthError } from '../auth/require-auth';

export async function getCaseByIdAuthorized(user: AuthenticatedUser, caseIdOrNumber: string) {
  if (!caseIdOrNumber || typeof caseIdOrNumber !== 'string') {
    return null;
  }

  const trimmedId = caseIdOrNumber.trim();
  if (trimmedId.length === 0) {
    return null;
  }

  // 1. Primary lookup: CaseRecord by id or caseNumber
  let caseRecord = await prisma.caseRecord.findFirst({
    where: {
      OR: [{ caseNumber: trimmedId }, { id: trimmedId }],
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

  // 2. Secondary lookup: Map from PayPal Dispute identifier if applicable
  if (!caseRecord) {
    const dispute = await prisma.payPalDispute.findFirst({
      where: {
        OR: [{ id: trimmedId }, { paypalDisputeId: trimmedId }],
      },
      select: { linkedCaseId: true },
    });

    if (dispute?.linkedCaseId) {
      caseRecord = await prisma.caseRecord.findFirst({
        where: {
          OR: [{ id: dispute.linkedCaseId }, { caseNumber: dispute.linkedCaseId }],
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
    }
  }

  // 3. Tertiary lookup: Map from Commerce Order identifier
  if (!caseRecord) {
    const order = await prisma.commerceOrder.findFirst({
      where: {
        OR: [{ id: trimmedId }, { orderNumber: trimmedId }],
      },
      select: { caseId: true },
    });

    if (order?.caseId) {
      caseRecord = await prisma.caseRecord.findFirst({
        where: {
          OR: [{ id: order.caseId }, { caseNumber: order.caseId }],
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
    }
  }

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
