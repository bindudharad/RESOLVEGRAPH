import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canMutateBegGraph, canViewInternalBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { prisma } from "@/lib/prisma";
import { CaseService } from "@/server/services/case.service";
import { BegSyncService } from "@/server/graph/beg-sync.service";

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

    if (!canMutateBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: Only investigators or resolution managers can establish internal graph relationships." },
        { status: 403 }
      );
    }

    if (!canViewInternalBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: Internal graph relationships require investigation privileges." },
        { status: 403 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const [factRelations, claimAssessments] = await Promise.all([
      prisma.factRelation.findMany({
        where: { caseId: realDbCaseId },
        include: {
          sourceFact: { include: { evidence: true } },
          targetFact: { include: { evidence: true } },
          reviewedBy: true,
        },
      }),
      prisma.factClaimAssessment.findMany({
        where: { caseId: realDbCaseId },
        include: {
          claim: true,
          extractedFact: { include: { evidence: true } },
        },
      }),
    ]);

    return NextResponse.json({
      caseId: realDbCaseId,
      factRelations,
      claimAssessments,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/relationships GET error:", error);
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

    if (!canMutateBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: Only investigators or resolution managers can establish internal graph relationships." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { sourceFactId, targetFactId, relationType, explanation, confidenceBand } = body;

    if (!sourceFactId || !targetFactId || !relationType) {
      return NextResponse.json(
        { error: "Missing required fields: 'sourceFactId', 'targetFactId', 'relationType'" },
        { status: 400 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const relation = await prisma.factRelation.upsert({
      where: {
        sourceFactId_targetFactId_relationType: {
          sourceFactId,
          targetFactId,
          relationType,
        },
      },
      update: {
        explanation: explanation || "",
        confidenceBand: confidenceBand || "HIGH",
        reviewStatus: "CONFIRMED",
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      create: {
        caseId: realDbCaseId,
        sourceFactId,
        targetFactId,
        relationType,
        explanation: explanation || "",
        confidenceBand: confidenceBand || "HIGH",
        reviewStatus: "CONFIRMED",
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    await CaseService.logEvent(
      realDbCaseId,
      "FACT_RELATION_ESTABLISHED",
      user.id,
      `Fact relation recorded: ${relationType}`,
      {
        relationId: relation.id,
        sourceFactId,
        targetFactId,
        relationType,
      }
    );

    await BegSyncService.handleDomainEvent({
      caseId: realDbCaseId,
      triggerEvent: "INVESTIGATION_UPDATED",
      actorId: user.id,
      rerunBerr: false,
    }).catch(() => {});

    return NextResponse.json({ relation }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/relationships POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
