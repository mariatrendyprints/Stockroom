import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { handleApiError } from "@/lib/api-helpers";
import { addUnit } from "@/lib/inventory";

const schema = z.object({
  name: z.string().min(1).max(24),
  referenceUnitId: z.string().min(1),
  equalsN: z.number().positive(),
  costPrice: z.number().min(0),
  salesPrice: z.number().min(0),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  try {
    const body = schema.parse(await req.json());
    const unit = await addUnit(
      params.id,
      body.name,
      body.referenceUnitId,
      body.equalsN,
      body.costPrice,
      body.salesPrice
    );
    return NextResponse.json({ unit }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return handleApiError(err);
  }
}
