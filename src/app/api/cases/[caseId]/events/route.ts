import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EventOrchestrationService } from "@/server/orchestration/event-orchestration.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await context.params;
    const { searchParams } = new URL(request.url);
    const unified = searchParams.get("unified") === "true";

    const caseRecord = await prisma.caseRecord.findFirst({
      where: { OR: [{ caseNumber: caseId }, { id: caseId }] },
    });

    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (unified) {
      const unifiedHistory = await EventOrchestrationService.getUnifiedCaseAuditHistory(
        caseRecord.id
      );
      return NextResponse.json(unifiedHistory);
    }

    const events = await prisma.caseEvent.findMany({
      where: { caseId: caseRecord.id },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(events);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
