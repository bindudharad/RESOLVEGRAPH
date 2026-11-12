import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canMutateBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BerrV2Service } from "@/server/ai/reasoning/berr-v2.service";
import {
  BerrClassificationSchema,
  BerrHumanReviewActionTypeSchema,
  BerrNextActionTypeSchema,
} from "@/server/ai/reasoning/berr-v2.types";

const reviewPayloadSchema = z.object({
  assessmentId: z.string().min(1),
  findingId: z.string().optional(),
  action: BerrHumanReviewActionTypeSchema,
  correctedClassification: BerrClassificationSchema.optional(),
  newNextAction: BerrNextActionTypeSchema.optional(),
  reason: z.string().trim().min(3, "Reason of at least 3 characters is required."),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (!canMutateBegGraph(user, caseRecord)) {
      return NextResponse.json(
        {
          error:
            "Access denied: Only investigators, resolution managers, or admins may review or override BERR assessments.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = reviewPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid BERR review payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const canonicalId = caseRecord.dbId || caseRecord.id;
    const reviewRes = await BerrV2Service.reviewAssessment({
      caseId: canonicalId,
      assessmentId: parsed.data.assessmentId,
      findingId: parsed.data.findingId,
      actorId: user.id,
      action: parsed.data.action,
      correctedClassification: parsed.data.correctedClassification,
      newNextAction: parsed.data.newNextAction,
      reason: parsed.data.reason,
    });

    const bundle = await BerrV2Service.getAssessmentHistory(canonicalId);

    return NextResponse.json({
      success: true,
      reviewAction: reviewRes.auditLog,
      berrV2: bundle.latest,
      history: bundle.history,
      reviewActions: bundle.reviewActions,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to submit BERR review";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
