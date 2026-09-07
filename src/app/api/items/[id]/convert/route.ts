import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { convertStock } from "@/lib/inventory";

const schema = z.object({
  fromUnitId: z.string().min(1),
  toUnitId: z.string().min(1),
  qty: z.number().positive(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    const body = schema.parse(await req.json());
    await convertStock(params.id, body.fromUnitId, body.toUnitId, body.qty);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}
