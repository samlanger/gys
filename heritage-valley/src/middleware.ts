import { NextResponse, type NextRequest } from "next/server";
import { authDisabled, SESSION_COOKIE, verifySession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (authDisabled() || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
