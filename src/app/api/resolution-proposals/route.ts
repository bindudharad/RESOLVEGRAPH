import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    let caseScope: Prisma.CaseRecordWhereInput = {};
    if (user && !user.isPlatformAdmin) {
      const userOrgIds = user.orgMemberships?.map((m) => m.organizationId) || [];
      const orConditions: Prisma.CaseRecordWhereInput[] = [{ buyerId: user.id }];
      if (userOrgIds.length > 0) {
        orConditions.push({ organizationId: { in: userOrgIds } });
      }
      caseScope = { OR: orConditions };
    }

    const proposals = await prisma.resolutionProposal.findMany({
      where: {
        case: caseScope,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
            amountMinor: true,
            currency: true,
            buyer: {
              select: { id: true, name: true, email: true },
            },
            merchant: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        proposedBy: {
          select: { id: true, fullName: true, role: true },
        },
        responses: {
          include: {
            responder: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ proposals });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/resolution-proposals GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
