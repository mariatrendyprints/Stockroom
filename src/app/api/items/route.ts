import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { baseEquivalent, itemStatus, itemValue } from "@/lib/inventory";

export async function GET() {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const items = await prisma.item.findMany({
    include: { units: { orderBy: { createdAt: "asc" } } },
    orderBy: { name: "asc" },
  });

  const out = items.map((item) => {
    const total = baseEquivalent(item.units);
    return {
      id: item.id,
      name: item.name,
      reorder: item.reorder,
      units: item.units,
      baseEquivalent: total,
      status: itemStatus(total, item.reorder),
      value: itemValue(item.units),
    };
  });

  return NextResponse.json({ items: out });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  reorder: z.number().min(0),
  unitName: z.string().min(1).max(24),
  qty: z.number().min(0),
  costPrice: z.number().min(0),
  salesPrice: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    const body = createSchema.parse(await req.json());
    const item = await prisma.item.create({
      data: {
        name: body.name,
        reorder: body.reorder,
        units: {
          create: [
            {
              name: body.unitName,
              qty: body.qty,
              costPrice: body.costPrice,
              salesPrice: body.salesPrice,
              factor: 1,
            },
          ],
        },
      },
      include: { units: true },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}
