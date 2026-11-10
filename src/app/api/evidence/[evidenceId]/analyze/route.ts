
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { EvidenceGuardService } from "@/server/services/evidenceguard.service";

type RouteContext = {
  params: Promise<{ evidenceId: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth(request);

    const { evidenceId } = await context.params;
    const body = await request.json().catch(() => ({}));

    // Optional raw payload override for testing fixtures
    const rawBuffer = body.rawBase64
      ? Buffer.from(body.rawBase64, "base64")
      : undefined;

    const analysis = await EvidenceGuardService.analyzeEvidence(
      evidenceId,
      rawBuffer
    );

    return NextResponse.json({
      success: true,
      analysis,
      message: `EvidenceGuard analysis complete. Assessment state: ${analysis.assessmentState}.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(
      "API /api/evidence/[evidenceId]/analyze POST error:",
      error
    );

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireAuth(request);

    const { evidenceId } = await context.params;

    const results = await EvidenceGuardService.getEvidenceAnalysis(
      evidenceId
    );

    return NextResponse.json({
      success: true,
      evidenceId,
      analysisResults: results,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(
      "API /api/evidence/[evidenceId]/analyze GET error:",
      error
    );

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
