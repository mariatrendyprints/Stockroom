import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ONLY_PREFIXES = ["/dashboard", "/reports", "/settings"];

export default async function middleware(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret });
  const path = req.nextUrl.pathname;

  // TEMP DIAGNOSTIC — remove once the Edge/session mismatch is found.
  const debugHeaders: Record<string, string> = {
    "x-debug-has-token": String(!!token),
    "x-debug-token-role": token?.role ?? "none",
    "x-debug-secret-len": String(secret?.length ?? 0),
    "x-debug-secret-first": secret?.slice(0, 3) ?? "",
    "x-debug-secret-last": secret?.slice(-3) ?? "",
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
