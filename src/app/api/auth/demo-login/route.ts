import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

// Rate limiting state: IP -> timestamps array
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per minute

type DemoWorkspace = "PLATFORM" | "BUYER" | "MERCHANT";

interface DemoAccountConfig {
  email: string;
  password: string; // Predefined server-side only seed password
  expectedRole: UserRole;
  expectedPlatformAdmin?: boolean;
}

const DEMO_ACCOUNTS: Record<DemoWorkspace, DemoAccountConfig> = {
  PLATFORM: {
    email: "admin@resolvegraph.demo",
    password: "Admin@ResolveGraph2026!",
    expectedRole: UserRole.ADMIN,
    expectedPlatformAdmin: true,
  },
  BUYER: {
    email: "alex.morgan@consumer.demo",
    password: "Buyer@ResolveGraph2026!",
    expectedRole: UserRole.BUYER,
    expectedPlatformAdmin: false,
  },
  MERCHANT: {
    email: "disputes@techstore.demo",
    password: "Merchant@TechStore2026!",
    expectedRole: UserRole.MERCHANT,
    expectedPlatformAdmin: false,
  },
};

function isDemoAccessEnabled(): boolean {
  if (process.env.RESOLVEGRAPH_DEMO_ACCESS === "false") {
    return false;
  }
  return (
    process.env.RESOLVEGRAPH_DEMO_ACCESS === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify demo environment access permission
    if (!isDemoAccessEnabled()) {
      return NextResponse.json(
        {
          error:
            "One-click demo workspace entry is disabled in this environment. Please sign in using standard credentials.",
        },
        { status: 403 }
      );
    }

    // 2. IP-based rate limiting guard
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            "Too many demo access attempts. Please wait a moment before trying again.",
        },
        { status: 429 }
      );
    }

    // 3. Strictly validate payload workspace without accepting user IDs or emails
    const body = await request.json().catch(() => ({}));
    const rawWorkspace = typeof body.workspace === "string" ? body.workspace.toUpperCase() : "";

    if (!["PLATFORM", "BUYER", "MERCHANT"].includes(rawWorkspace)) {
      return NextResponse.json(
        {
          error: "Invalid workspace. Permitted values: PLATFORM, BUYER, MERCHANT.",
        },
        { status: 400 }
      );
    }

    const workspace = rawWorkspace as DemoWorkspace;
    const accountConfig = DEMO_ACCOUNTS[workspace];

    // 4. Server-side account verification against database
    const userRecord = await prisma.user.findUnique({
      where: { email: accountConfig.email },
      include: {
        orgMemberships: {
          where: { isActive: true },
          include: { organization: true },
        },
      },
    });

    if (!userRecord || !userRecord.isActive) {
      console.error(
        `[DEMO AUTH ERROR] Demo account "${accountConfig.email}" not found or inactive in database.`
      );
      return NextResponse.json(
        {
          error: "Demo account is not available. Please verify database seeding.",
        },
        { status: 500 }
      );
    }

    // Verify role integrity
    if (userRecord.role !== accountConfig.expectedRole) {
      console.error(
        `[DEMO AUTH ERROR] Account role mismatch: expected ${accountConfig.expectedRole}, found ${userRecord.role}.`
      );
      return NextResponse.json(
        { error: "Account authorization corrupted." },
        { status: 500 }
      );
    }

    if (
      accountConfig.expectedPlatformAdmin &&
      !userRecord.isPlatformAdmin
    ) {
      console.error(
        `[DEMO AUTH ERROR] Platform Admin flag missing on ${accountConfig.email}.`
      );
      return NextResponse.json(
        { error: "Platform administrator authorization missing." },
        { status: 500 }
      );
    }

    // 5. Establish authentic server-side Better-Auth session
    const betterAuthResponse = await auth.api.signInEmail({
      body: {
        email: accountConfig.email,
        password: accountConfig.password,
      },
      asResponse: true,
      headers: request.headers,
    });

    if (!betterAuthResponse.ok) {
      console.error(
        `[DEMO AUTH ERROR] Better-Auth signInEmail failed with status ${betterAuthResponse.status}`
      );
      return NextResponse.json(
        { error: "Failed to establish authenticated session with Better-Auth." },
        { status: 500 }
      );
    }

    // 6. Audit logging
    console.log(
      `[DEMO AUTH] Successfully authenticated ${workspace} workspace demo for ${userRecord.email} (ID: ${userRecord.id}, Role: ${userRecord.role}) from ${clientIp}`
    );

    // 7. Construct response and forward all Set-Cookie headers
    const clientResponse = NextResponse.json({
      success: true,
      workspace,
      user: {
        id: userRecord.id,
        name: userRecord.name || userRecord.fullName,
        email: userRecord.email,
        role: userRecord.role,
        isPlatformAdmin: userRecord.isPlatformAdmin,
        organization: userRecord.organization,
      },
      redirectTo: workspace === "MERCHANT" ? "/seller" : "/overview",
    });

    // Extract all Set-Cookie headers from Better-Auth response
    const setCookieHeaders = betterAuthResponse.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      for (const cookieStr of setCookieHeaders) {
        clientResponse.headers.append("Set-Cookie", cookieStr);
      }
    } else {
      const singleCookie = betterAuthResponse.headers.get("set-cookie");
      if (singleCookie) {
        clientResponse.headers.set("Set-Cookie", singleCookie);
      }
    }

    return clientResponse;
  } catch (error) {
    console.error("[DEMO AUTH UNHANDLED ERROR]:", error);
    return NextResponse.json(
      { error: "Internal error during demo workspace entry." },
      { status: 500 }
    );
  }
}
