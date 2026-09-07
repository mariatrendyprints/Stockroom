import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type SessionUser = { id: string; name: string; email: string; role: "staff" | "admin" };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/** Returns the user, or a 401 response to short-circuit the route with. */
export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return user;
}

/** Returns the user, or a 403 response if they aren't an admin. */
export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  if (result.role !== "admin") {
    return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  }
  return result;
}

export function isErrorResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
