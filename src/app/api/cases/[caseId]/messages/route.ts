import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { SharedResolutionService } from "@/server/services/shared-resolution.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    if (!caseId || typeof caseId !== "string" || caseId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid case identifier" }, { status: 400 });
    }

    // Check authorized access to case
    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Dispute case "${caseId}" not found.` }, { status: 404 });
    }

    const canonicalId = caseRecord.dbId || caseRecord.id;
    const messages = await SharedResolutionService.listMessages(canonicalId, user);

    return NextResponse.json({
      success: true,
      caseId: caseRecord.caseNumber || caseRecord.id,
      canonicalCaseId: canonicalId,
      messages,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/messages GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    if (!caseId || typeof caseId !== "string" || caseId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid case identifier" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { content, attachmentEvidenceId, isInternalOnly } = body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Dispute case "${caseId}" not found.` }, { status: 404 });
    }

    const canonicalId = caseRecord.dbId || caseRecord.id;
    const message = await SharedResolutionService.postMessage({
      caseId: canonicalId,
      senderId: user.id,
      content,
      attachmentEvidenceId,
      isInternalOnly,
    });

    return NextResponse.json({
      success: true,
      message,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/messages POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
