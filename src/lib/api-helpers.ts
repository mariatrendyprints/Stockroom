import { NextResponse } from "next/server";
import { BusinessError } from "@/lib/inventory";

export function handleApiError(err: unknown) {
  if (err instanceof BusinessError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
