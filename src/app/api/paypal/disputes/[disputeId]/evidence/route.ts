import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { DisputeService } from '@/server/paypal/services/dispute.service';
import { EvidenceCompilerService } from '@/server/paypal/services/evidence-compiler.service';
import { PayPalProviderFactory } from '@/server/paypal/paypal-provider.factory';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const evidenceSubmitSchema = z.object({
  evidenceType: z.string().default('PROOF_OF_FULFILLMENT'),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { disputeId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const validated = evidenceSubmitSchema.parse(body);

    const dispute = await DisputeService.getDisputeDetails(disputeId);
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Access check: must belong to organization or be admin
    if (!user.isPlatformAdmin) {
      const isMember = user.orgMemberships.some(
        (m) => m.organizationId === dispute.organizationId
      );
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied to submit evidence for this dispute' }, { status: 403 });
      }
    }

    if (!dispute.linkedCaseId) {
      return NextResponse.json(
        { error: 'Cannot compile evidence: this PayPal dispute is not linked to an internal case.' },
        { status: 400 }
      );
    }

    const compiledEvidence = await EvidenceCompilerService.compileCaseEvidence(
      dispute.linkedCaseId,
      validated.evidenceType,
      validated.note
    );

    const submissionPayload = EvidenceCompilerService.toPayPalSubmission(compiledEvidence);
    const provider = PayPalProviderFactory.getProvider();
    const result = await provider.submitDisputeEvidence(
      dispute.paypalDisputeId,
      submissionPayload
    );

    // Update dispute record in database
    await prisma.payPalDispute.update({
      where: { id: dispute.id },
      data: {
        paypalStatus: 'UNDER_REVIEW',
        latestSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      compiledEvidence,
      providerResult: result,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/paypal/disputes/[disputeId]/evidence POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit dispute evidence' },
      { status: 500 }
    );
  }
}
