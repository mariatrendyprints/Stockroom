import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";

export async function GET() {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json({ settings });
}

const schema = z.object({ shopName: z.string().min(1).max(80) });

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const body = schema.parse(await req.json());
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { shopName: body.shopName },
    create: { id: 1, shopName: body.shopName },
  });
  return NextResponse.json({ settings });
}
