import { NextResponse } from "next/server";
import { requireUser, isErrorResponse } from "@/lib/session";
import { getSellableSnapshot } from "@/lib/inventory";

// Staff-safe: names + availability only, no prices. See spec §7.2.
export async function GET() {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  const snapshot = await getSellableSnapshot();
  return NextResponse.json(snapshot);
}
