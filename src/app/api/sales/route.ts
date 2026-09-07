import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "25", 10) || 25, 1), 200);

  const sales = await prisma.sale.findMany({
    orderBy: { at: "desc" },
    take: limit,
  });

  return NextResponse.json({ sales });
}
