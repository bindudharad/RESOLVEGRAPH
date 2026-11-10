import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/overview",
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

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  // 2. In development mode, allow header-based demo impersonation
  const isDemoHeaderPresent =
    process.env.NODE_ENV !== "production" &&
    Boolean(request.headers.get("x-demo-user-email"));

  const isAuthenticated = Boolean(sessionToken || isDemoHeaderPresent);

  // 3. Root route '/' routing:
  //    - Authenticated users go to canonical Home: /dashboard
  //    - Unauthenticated visitors go to canonical public landing: /overview
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
  }

  // 4. Check for public routes
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // 5. Redirect unauthenticated users trying to access protected workspace routes
  if (!isAuthenticated && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname !== "/dashboard") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  // 6. Redirect authenticated users away from sign-in/sign-up to dashboard
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
