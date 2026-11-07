import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { getCaseByIdAuthorized } from '@/server/dal/get-case-by-id';
import { prisma } from '@/lib/prisma';
import { ReviewFindingSchema } from '@/server/ai/schemas/consent.schema';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { runId } = await context.params;

    const run = await prisma.aIAnalysisRun.findUnique({
      where: { id: runId }
    });

    if (!run) {
      return NextResponse.json({ error: `Analysis run '${runId}' not found` }, { status: 404 });
    }

    const caseRecord = await getCaseByIdAuthorized(user, run.caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: 'Access denied to this case' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const validated = ReviewFindingSchema.parse(body);

    const finding = await prisma.berrFinding.findUnique({
      where: { id: validated.findingId }
    });

    if (!finding || finding.analysisRunId !== run.id) {
      return NextResponse.json({ error: 'Finding not found in this analysis run' }, { status: 404 });
    }

    const updatedFinding = await prisma.berrFinding.update({
      where: { id: finding.id },
      data: {
        reviewStatus: validated.action,
        reviewedById: user.id,
        reviewedAt: new Date(),
        ...(validated.correctedSeverity ? { severity: validated.correctedSeverity } : {})
      }
    });

    // Record review feedback
    const feedback = await prisma.aIReviewFeedback.create({
      data: {
        analysisRunId: run.id,
        actorId: user.id,
        targetType: 'FINDING',
        targetId: finding.id,
        action: validated.action,
        previousValue: finding.reviewStatus,
        correctedValue: validated.action,
        comment: validated.userNotes || null
      }
    });

    // Case Event
    await prisma.caseEvent.create({
      data: {
        caseId: run.caseId,
        actorId: user.id,
        eventType: 'AI_FINDING_REVIEWED',
        description: `Human reviewer marked finding "${finding.title}" as ${validated.action}`,
        metadataJson: JSON.stringify({
          findingId: finding.id,
          runId: run.id,
          action: validated.action,
          notes: validated.userNotes
        })
      }
    });

    return NextResponse.json({
      success: true,
      finding: updatedFinding,
      feedbackId: feedback.id
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/analysis/[runId]/review POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
