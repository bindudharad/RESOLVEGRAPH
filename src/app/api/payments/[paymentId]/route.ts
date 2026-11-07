import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { prisma } from '@/lib/prisma';
import { calculateRemainingRefundable } from '@/server/paypal/utils/money';
import { RefundService } from '@/server/paypal/services/refund.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { paymentId } = await context.params;

    const payment = await prisma.payPalPayment.findFirst({
      where: {
        OR: [{ id: paymentId }, { captureId: paymentId }, { providerOrderId: paymentId }],
      },
      include: {
        commerceOrder: {
          include: {
            items: true,
            merchantOrganization: true,
            buyer: { select: { id: true, fullName: true, email: true } },
            case: {
              select: {
                id: true,
                caseNumber: true,
                title: true,
                status: true,
                resolutionProposals: {
                  where: { status: 'AGREED' },
                  select: { id: true, title: true, proposalType: true, amountMinor: true, status: true },
                },
              },
            },
          },
        },
        refunds: {
          include: {
            requestedBy: { select: { id: true, fullName: true, email: true } },
            approvedBy: { select: { id: true, fullName: true, email: true } },
            resolutionProposal: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        disputes: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Access check
    if (!user.isPlatformAdmin && payment.commerceOrder.buyerId !== user.id) {
      const isMember = user.orgMemberships.some(
        (m) => m.organizationId === payment.commerceOrder.merchantOrganizationId
      );
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied to this payment record' }, { status: 403 });
      }
    }

    const remainingRefundableMinor = calculateRemainingRefundable(
      payment.amountMinor,
      payment.refunds
    );

    const canRefund = RefundService.isAuthorizedRefundApprover(
      user,
      payment.commerceOrder.merchantOrganizationId
    );

    return NextResponse.json({
      payment,
      remainingRefundableMinor,
      canRefund,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/payments/[paymentId] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve payment details' },
      { status: 500 }
    );
  }
}
