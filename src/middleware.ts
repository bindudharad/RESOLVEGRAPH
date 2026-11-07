import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/access-denied",
  "/api/auth",
  "/api/health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static files, Next.js internals, and images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/avatars") ||
    pathname.includes(".") // favicon.ico, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Check for public routes
  const isPublicPath =
    pathname === "/" ||
    PUBLIC_PATHS.slice(1).some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  // 3. In development mode, allow header-based demo impersonation
  const isDemoHeaderPresent =
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-demo-user-email");

  const isAuthenticated = Boolean(sessionToken || isDemoHeaderPresent);

  // 4. Redirect unauthenticated users trying to access protected workspace routes
  if (!isAuthenticated && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname !== "/" && pathname !== "/dashboard") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  // 5. Redirect authenticated users away from sign-in/sign-up to dashboard
  if (isAuthenticated && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
