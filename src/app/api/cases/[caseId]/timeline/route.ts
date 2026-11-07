import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { TemporalEngine } from "@/server/temporal/temporal-engine";
import { prisma } from "@/lib/prisma";
import { CaseService } from "@/server/services/case.service";

export async function GET(
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

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;
    const { timeline, anomalies } = await TemporalEngine.analyzeCaseTimeline(realDbCaseId);

    return NextResponse.json({
      caseId: realDbCaseId,
      timeline,
      anomalies,
      totalEvents: timeline.length,
      contradictionsCount: anomalies.length,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/timeline GET error:", error);
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

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      eventType,
      title,
      description,
      occurredAt,
      sourceTimestamp,
      timePrecision,
      timeBasis,
      evidenceId,
      claimId,
    } = body;

    if (!eventType || !title) {
      return NextResponse.json(
        { error: "Missing required fields: 'eventType' and 'title'" },
        { status: 400 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const event = await prisma.caseTimelineEvent.create({
      data: {
        caseId: realDbCaseId,
        actorId: user.id,
        eventType,
        title,
        description: description || "",
        occurredAt: occurredAt ? new Date(occurredAt) : null,
        sourceTimestamp: sourceTimestamp || null,
        timePrecision: timePrecision || "EXACT_TIMESTAMP",
        timeBasis: timeBasis || "USER_REPORTED",
        evidenceId: evidenceId || null,
        claimId: claimId || null,
      },
    });

    await CaseService.logEvent(
      realDbCaseId,
      "TIMELINE_EVENT_RECORDED",
      user.id,
      `Timeline event recorded: ${title} (${eventType})`,
      {
        timelineEventId: event.id,
        eventType,
        occurredAt: event.occurredAt?.toISOString() || null,
      }
    );

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/timeline POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
