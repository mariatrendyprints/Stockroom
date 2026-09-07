import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";

export async function GET() {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const services = await prisma.service.findMany({
    include: { recipeLines: { include: { item: true, unit: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ services });
}

const recipeLineSchema = z.object({
  itemId: z.string().min(1),
  unitId: z.string().min(1),
  qtyPerUnit: z.number().positive(),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().min(0),
  recipe: z.array(recipeLineSchema).default([]),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    const body = createSchema.parse(await req.json());
    const service = await prisma.service.create({
      data: {
        name: body.name,
        price: body.price,
        recipeLines: {
          create: body.recipe.map((r) => ({ itemId: r.itemId, unitId: r.unitId, qtyPerUnit: r.qtyPerUnit })),
        },
      },
      include: { recipeLines: { include: { item: true, unit: true } } },
    });
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}
