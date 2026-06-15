/**
 * @file Proxy (Next.js 16's renamed `middleware`).
 *
 * Optimistic, cookie-only route protection — fast pre-filter that runs before
 * routes render. It only reads the signed session cookie (no DB / no backend
 * calls). The real security checks live in the DAL (requireUser/requireAdmin),
 * close to the data.
 */

import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "boxii_session";

type SessionRole = "customer" | "admin";

async function readRole(req: NextRequest): Promise<SessionRole | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    const role = (payload as { user?: { role?: string } }).user?.role;
    return role === "admin" || role === "customer" ? role : null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await readRole(req);

  // Admin area requires an admin session. Unauthenticated → login;
  // authenticated non-admins → their dashboard.
  if (pathname.startsWith("/admin")) {
    if (role === null) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin") return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Customer dashboard requires any authenticated session.
  if (pathname.startsWith("/dashboard") && role === null) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
