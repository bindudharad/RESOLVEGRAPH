import { NextRequest, NextResponse } from "next/server";

/**
 * Public routes accessible without authentication.
 * All other routes strictly require an authenticated session.
 */
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/access-denied",
  "/docs",
  "/methodology",
  "/api/auth",
  "/api/health",
  "/api/webhooks/paypal",
];

interface DecodedUser {
  role?: string;
  isPlatformAdmin?: boolean;
}

function extractUserFromSessionData(cookieValue: string | undefined): DecodedUser | null {
  if (!cookieValue) return null;
  try {
    const raw = decodeURIComponent(cookieValue);
    const jsonStr = Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(jsonStr);
    const user = parsed?.session?.user || parsed?.user;
    if (user && typeof user === "object") {
      return {
        role: typeof user.role === "string" ? user.role.toUpperCase() : undefined,
        isPlatformAdmin: Boolean(user.isPlatformAdmin),
      };
    }
  } catch {
    // If cookie format is opaque or invalid, fail closed gracefully
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static files, Next.js internals, and image assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/avatars") ||
    pathname.includes(".") // favicon.ico, images, fonts, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Redirect /paypal root to /paypal/disputes
  if (pathname === "/paypal" || pathname === "/paypal/") {
    return NextResponse.redirect(new URL("/paypal/disputes", request.url));
  }

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("session_token")?.value;

  // 3. Allow automated backend tests with explicit test header in non-production
  const isDemoHeaderPresent =
    process.env.NODE_ENV !== "production" &&
    Boolean(request.headers.get("x-demo-user-email"));

  const isAuthenticated = Boolean(sessionToken || isDemoHeaderPresent);

  // 4. Root route '/' serves the public marketing homepage
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 5. Check for public routes
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // 6. Intercept unauthenticated requests to protected workspace routes & APIs
  if (!isAuthenticated && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required to access this resource" },
        { status: 401 }
      );
    }

    const signInUrl = new URL("/sign-in", request.url);
    const returnUrl = pathname + request.nextUrl.search;
    signInUrl.searchParams.set("callbackUrl", returnUrl);
    return NextResponse.redirect(signInUrl);
  }

  // 7. Role-to-Route Boundary Enforcement (QA-004)
  if (isAuthenticated && !isPublicPath && !pathname.startsWith("/api/")) {
    const sessionDataCookie =
      request.cookies.get("better-auth.session_data")?.value ||
      request.cookies.get("__Secure-better-auth.session_data")?.value;
    const user = extractUserFromSessionData(sessionDataCookie);

    if (user?.role) {
      // BUYER cannot access merchant-only operational spaces
      if (user.role === "BUYER" && (pathname === "/seller" || pathname.startsWith("/seller/"))) {
        return NextResponse.redirect(new URL("/access-denied", request.url));
      }

      // MERCHANT cannot access consumer purchase tracking or initial evidence intake
      if (
        user.role === "MERCHANT" &&
        (pathname === "/purchases" ||
          pathname.startsWith("/purchases/") ||
          pathname === "/intake" ||
          pathname.startsWith("/intake/"))
      ) {
        return NextResponse.redirect(new URL("/access-denied", request.url));
      }

      // Non-admin cannot access administrative config or user governance
      const isPrivileged = user.isPlatformAdmin || user.role === "ADMIN" || user.role === "RESOLUTION_MANAGER";
      if (!isPrivileged && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
        return NextResponse.redirect(new URL("/access-denied", request.url));
      }
    }
  }

  // 8. Redirect authenticated users away from sign-in/sign-up to workspace
  if (isAuthenticated && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const rawCallback =
      request.nextUrl.searchParams.get("callbackUrl") ||
      request.nextUrl.searchParams.get("redirect") ||
      "/overview";
    const target =
      rawCallback.startsWith("/") && !rawCallback.startsWith("//")
        ? rawCallback
        : "/overview";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
