import { NextResponse, NextRequest } from "next/server";
import { getToken, decode } from "next-auth/jwt";

const ADMIN_ONLY_PREFIXES = ["/dashboard", "/reports", "/settings"];

export default async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const rawToken = await getToken({ req, secret, raw: true });

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
    "x-debug-secret-len": String(secret.length),
    "x-debug-cookie-names": req.cookies
      .getAll()
      .map((c) => c.name)
      .join(","),
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
