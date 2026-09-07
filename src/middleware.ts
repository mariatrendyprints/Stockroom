import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/dashboard", "/reports", "/settings"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (ADMIN_ONLY_PREFIXES.some((p) => path.startsWith(p)) && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/activity", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/reports/:path*", "/settings/:path*", "/activity/:path*"],
};
