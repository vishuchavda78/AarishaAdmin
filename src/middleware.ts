import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./lib/session";

// Define paths that are always public
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Skip static assets, images, files, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // e.g. favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }
  
  // 2. Check if the path is public
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  
  // 3. Retrieve the session cookie
  const sessionCookie = request.cookies.get("session")?.value;
  
  // 4. Verify session
  let isSessionValid = false;
  if (sessionCookie) {
    const payload = await verifyJWT(sessionCookie);
    isSessionValid = payload !== null;
  }
  
  // 5. Handle routing rules
  if (isPublicPath) {
    // If the user has a valid session and tries to go to login, redirect to dashboard
    if (isSessionValid && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }
  
  // If no valid session for protected routes
  if (!isSessionValid) {
    // For API requests, return a clean JSON error
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized access. Please log in." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // For page requests, redirect to login page
    const loginUrl = new URL("/login", request.url);
    // Keep track of the original page to redirect back after login
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }
  
  // Allow request to proceed
  return NextResponse.next();
}

// Optional matcher configuration to refine middleware targets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login (public auth endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
