import { NextResponse, NextRequest } from "next/server";
import { decode } from "next-auth/jwt";

const ADMIN_ONLY_PREFIXES = ["/dashboard", "/reports", "/settings"];

// Read directly by the known cookie name instead of relying on next-auth's
// getToken(), whose secureCookie auto-detection wasn't reliably finding the
// session cookie in Vercel's Edge Middleware runtime (confirmed via manual
// tracing: the correctly-named cookie was present in req.cookies, but
// getToken() reported no raw value at all — likely because its detection
// of NEXTAUTH_URL/VERCEL env vars doesn't behave the same way there).
// Production is always HTTPS on Vercel, so the cookie name is always the
// "__Secure-" prefixed one NextAuth sets on login.
const SESSION_COOKIE_NAME = "__Secure-next-auth.session-token";

export default async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  const token = rawToken ? await decode({ token: rawToken, secret }).catch(() => null) : null;
  const path = req.nextUrl.pathname;

  if (!token) {
    const signInUrl = new URL("/login", req.url);
    signInUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(signInUrl);
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p)) && token.role !== "admin") {
    return NextResponse.redirect(new URL("/activity", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/reports/:path*", "/settings/:path*", "/activity/:path*"],
};
