import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/organizations",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname.startsWith("/api/")) {
    if (!session && !isPublic) {
      return NextResponse.json({ message: "Sign in required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (session && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/forecasts", request.url));
  }
  if (!session && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!session && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
