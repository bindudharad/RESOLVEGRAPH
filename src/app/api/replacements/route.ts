import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { canAccessCase } from "@/server/auth/permissions";
import {
  ReplacementExecutionError,
  ReplacementExecutionService,
} from "@/server/orchestration/replacement-execution.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (caseId) {
      const authorizedCase = await getCaseByIdAuthorized(user, caseId);
      if (!authorizedCase) {
        return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
      }
      const realDbCaseId = (authorizedCase as { dbId?: string }).dbId || authorizedCase.id;
      const fulfillments = await prisma.replacementFulfillment.findMany({
        where: { caseId: realDbCaseId },
        include: {
          proposal: {
            select: {
              id: true,
              proposalType: true,
              status: true,
              authorizationStatus: true,
              authorizedAt: true,
            },
          },
          packagePassport: {
            include: {
              seals: true,
              events: { orderBy: { createdAt: "desc" } },
              deliveryEvents: { orderBy: { eventTimestamp: "desc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ fulfillments });
    }

    const allFulfillments = await prisma.replacementFulfillment.findMany({
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            buyerId: true,
            merchantId: true,
            assignedManagerId: true,
            organizationId: true,
            status: true,
          },
        },
        proposal: {
          select: {
            id: true,
            proposalType: true,
            status: true,
            authorizationStatus: true,
          },
        },
        packagePassport: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const visible = allFulfillments.filter((f) => canAccessCase(user, f.case));
    return NextResponse.json({ fulfillments: visible });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ReplacementExecutionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const { proposalId, requestedSku, notes } = body;

    if (!proposalId || typeof proposalId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: 'proposalId'" },
        { status: 400 }
      );
    }

    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: proposalId },
      select: { id: true, caseId: true },
    });
    if (!proposal) {
      return NextResponse.json({ error: `Proposal '${proposalId}' not found` }, { status: 404 });
    }

    const authorizedCase = await getCaseByIdAuthorized(user, proposal.caseId);
    if (!authorizedCase) {
      return NextResponse.json({ error: `Case for proposal '${proposalId}' not found` }, { status: 404 });
    }

    const result = await ReplacementExecutionService.authorizeAndInitiateReplacement({
      proposalId,
      actor: user,
      requestedSku: typeof requestedSku === "string" ? requestedSku : undefined,
      notes: typeof notes === "string" ? notes : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        fulfillment: result.fulfillment,
        alreadyInitiated: result.alreadyInitiated,
      },
      { status: result.alreadyInitiated ? 200 : 201 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ReplacementExecutionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
