/**
 * RESOLVEGRAPH — Customer-Assisted Marketplace Support Submission Endpoint
 *
 * POST /api/complaints/[caseId]/seller-outreach
 * Records when the customer submitted their prepared message to an unregistered
 * seller's marketplace Help Centre (transitions to MARKETPLACE_SUPPORT_PENDING,
 * never claiming DELIVERED_TO_SELLER).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { SellerCommunicationGatewayService } from '@/server/seller';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ id: caseId }, { caseNumber: caseId }] },
      select: { id: true, buyerId: true },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Complaint ${caseId} not found.` }, { status: 404 });
    }

    if (caseRecord.buyerId !== user.id && !user.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Only the complaint owner can record Help Centre outreach submission.' },
        { status: 403 }
      );
    }

    let requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!requestId) {
      const latestReq = await prisma.sellerEvidenceRequest.findFirst({
        where: {
          caseId: caseRecord.id,
          deliveryChannel: 'CUSTOMER_ASSISTED_HELP_CENTRE',
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      requestId = latestReq?.id || '';
    }

    if (!requestId) {
      return NextResponse.json(
        { error: 'No customer-assisted marketplace outreach request found for this complaint.' },
        { status: 404 }
      );
    }

    const updated = await SellerCommunicationGatewayService.recordCustomerReportedSubmission({
      requestId,
      buyerId: caseRecord.buyerId,
      note: typeof body.note === 'string' ? body.note : undefined,
      ticketReference:
        typeof body.ticketReference === 'string' ? body.ticketReference : undefined,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record submission' },
      { status: 400 }
    );
  }
}
