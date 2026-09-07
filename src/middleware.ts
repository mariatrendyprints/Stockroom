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
    // Next.js middleware always runs on Vercel's Edge Runtime, a separate
    // runtime from the Node.js one the rest of the app uses. withAuth's
    // implicit fallback to process.env.NEXTAUTH_SECRET doesn't reliably
    // reach the Edge Runtime, so it's passed explicitly here.
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/reports/:path*", "/settings/:path*", "/activity/:path*"],
};
