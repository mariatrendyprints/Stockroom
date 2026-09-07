import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { sellProduct } from "@/lib/inventory";

const schema = z.object({
  unitId: z.string().min(1),
  qty: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isErrorResponse(user)) return user;

  try {
    const body = schema.parse(await req.json());
    const sale = await sellProduct(body.unitId, body.qty);
    return NextResponse.json({ sale: { id: sale.id, refName: sale.refName, qty: sale.qty } }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}
