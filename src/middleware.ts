import { NextResponse, NextRequest } from "next/server";
import { decode } from "next-auth/jwt";

const ADMIN_ONLY_PREFIXES = ["/dashboard", "/reports", "/settings"];

// Read directly by the known cookie name instead of relying on next-auth's
// getToken()'s secureCookie auto-detection, which wasn't reliably finding
// the cookie in Vercel's Edge Middleware runtime (confirmed via diagnostics:
// the cookie was present in req.cookies, but getToken() reported no raw
// value at all). Production is always HTTPS on Vercel, so the cookie name
// is always the "__Secure-" prefixed one NextAuth sets on login.
const SESSION_COOKIE_NAME = "__Secure-next-auth.session-token";

export default async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let token: Awaited<ReturnType<typeof decode>> = null;
  let decodeError = "";
  if (rawToken) {
    try {
      token = await decode({ token: rawToken, secret });
    } catch (err) {
      decodeError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
  }

  const path = req.nextUrl.pathname;

  // TEMP DIAGNOSTIC — remove once the Edge/session mismatch is found.
  const debugHeaders: Record<string, string> = {
    "x-debug-has-raw": String(!!rawToken),
    "x-debug-raw-len": String(rawToken?.length ?? 0),
    "x-debug-has-token": String(!!token),
    "x-debug-decode-error": decodeError.slice(0, 300),
  };

  function withDebug(res: NextResponse) {
    for (const [k, v] of Object.entries(debugHeaders)) res.headers.set(k, v);
    return res;
  }

  if (!token) {
    const signInUrl = new URL("/login", req.url);
    signInUrl.searchParams.set("callbackUrl", path);
    return withDebug(NextResponse.redirect(signInUrl));
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p)) && token.role !== "admin") {
    return withDebug(NextResponse.redirect(new URL("/activity", req.url)));
  }

  return withDebug(NextResponse.next());
}

export const config = {
  matcher: ["/dashboard/:path*", "/reports/:path*", "/settings/:path*", "/activity/:path*"],
};
