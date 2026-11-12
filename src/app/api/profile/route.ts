import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { SecurityAuditService } from "@/server/services/security-audit.service";
import { z } from "zod";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .optional()
    .nullable(),
});

/**
 * GET /api/profile
 * Returns the authenticated user's real DB profile record without hardcoded mocks.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        role: true,
        isPlatformAdmin: true,
        phone: true,
        organization: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        orgMemberships: {
          where: { isActive: true, organization: { isActive: true } },
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: dbUser });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/profile GET error:", error);
    return NextResponse.json({ error: "Failed to load user profile" }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 * Updates safe self-service profile fields (fullName, phone) in the database.
 */
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const json = await request.json().catch(() => ({}));
    const parsed = updateProfileSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid profile details" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        fullName: parsed.data.fullName,
        name: parsed.data.fullName,
        ...(parsed.data.phone !== undefined
          ? { phone: parsed.data.phone || null }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true,
        role: true,
        isPlatformAdmin: true,
        phone: true,
        organization: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    await SecurityAuditService.record({
      actorId: authUser.id,
      action: "USER_PROFILE_UPDATED",
      targetType: "User",
      targetId: authUser.id,
      status: "SUCCESS",
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || "Unknown",
      metadata: {
        updatedFields: ["fullName", ...(parsed.data.phone !== undefined ? ["phone"] : [])],
      },
    });

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/profile PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user profile" }, { status: 500 });
  }
}
