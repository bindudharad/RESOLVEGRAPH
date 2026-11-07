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

    // Check authorized access to case
    await getCaseByIdAuthorized(user, caseId);

    const messages = await SharedResolutionService.listMessages(caseId, user);

    return NextResponse.json({
      success: true,
      caseId,
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
    const body = await request.json().catch(() => ({}));

    const { content, attachmentEvidenceId, isInternalOnly } = body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    await getCaseByIdAuthorized(user, caseId);

    const message = await SharedResolutionService.postMessage({
      caseId,
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
