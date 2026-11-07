import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string; eventId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId, eventId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const event = await prisma.caseTimelineEvent.findFirst({
      where: {
        id: eventId,
        caseId: (caseRecord as { dbId?: string }).dbId || caseRecord.id,
      },
      include: {
        actor: true,
        evidence: true,
        claim: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: `Timeline event '${eventId}' not found` }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/timeline/[eventId] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
