import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";

const recipeLineSchema = z.object({
  itemId: z.string().min(1),
  unitId: z.string().min(1),
  qtyPerUnit: z.number().positive(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  price: z.number().min(0).optional(),
  recipe: z.array(recipeLineSchema).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    const body = patchSchema.parse(await req.json());

    const service = await prisma.$transaction(async (tx) => {
      if (body.name !== undefined || body.price !== undefined) {
        await tx.service.update({
          where: { id: params.id },
          data: { name: body.name, price: body.price },
        });
      }
      if (body.recipe !== undefined) {
        await tx.recipeLine.deleteMany({ where: { serviceId: params.id } });
        if (body.recipe.length > 0) {
          await tx.recipeLine.createMany({
            data: body.recipe.map((r) => ({
              serviceId: params.id,
              itemId: r.itemId,
              unitId: r.unitId,
              qtyPerUnit: r.qtyPerUnit,
            })),
          });
        }
      }
      return tx.service.findUnique({
        where: { id: params.id },
        include: { recipeLines: { include: { item: true, unit: true } } },
      });
    });

    return NextResponse.json({ service });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    await prisma.service.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
