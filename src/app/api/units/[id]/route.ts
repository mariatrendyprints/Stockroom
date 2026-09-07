import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { deleteUnit } from "@/lib/inventory";

const patchSchema = z.object({
  name: z.string().min(1).max(24).optional(),
  qty: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  salesPrice: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    const body = patchSchema.parse(await req.json());
    const unit = await prisma.unit.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ unit });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    await deleteUnit(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
