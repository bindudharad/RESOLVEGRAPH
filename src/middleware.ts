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
  "/help",
  "/api/auth",
  "/api/health",
  "/api/webhooks/paypal",
];

export function middleware(request: NextRequest) {
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

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("session_token")?.value;

  // 2. Allow automated backend tests with explicit test header in non-production
  const isDemoHeaderPresent =
    process.env.NODE_ENV !== "production" &&
    Boolean(request.headers.get("x-demo-user-email"));

  const isAuthenticated = Boolean(sessionToken || isDemoHeaderPresent);

  // 3. Root route '/' serves the public marketing homepage
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 4. Check for public routes
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // 5. Intercept unauthenticated requests to protected workspace routes & APIs
  if (!isAuthenticated && !isPublicPath) {
    // API routes return JSON 401 Unauthorized
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required to access this resource" },
        { status: 401 }
      );
    }

    // Workspace pages redirect to /sign-in?callbackUrl=<requested-path>
    const signInUrl = new URL("/sign-in", request.url);
    const returnUrl = pathname + request.nextUrl.search;
    signInUrl.searchParams.set("callbackUrl", returnUrl);
    return NextResponse.redirect(signInUrl);
  }

  // 6. Redirect authenticated users away from sign-in/sign-up to workspace
  if (isAuthenticated && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const rawCallback =
      request.nextUrl.searchParams.get("callbackUrl") ||
      request.nextUrl.searchParams.get("redirect") ||
      "/overview";
    // Security check: validate same-origin relative path
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
