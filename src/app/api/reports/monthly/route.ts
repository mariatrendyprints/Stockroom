import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { todayDateString } from "@/lib/inventory";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const month = req.nextUrl.searchParams.get("month") || todayDateString().slice(0, 7);

  const allSales = await prisma.sale.findMany({ orderBy: { at: "desc" } });
  const sales = allSales.filter((s) => todayDateString(s.at).startsWith(month));

  const totals = sales.reduce(
    (acc, s) => {
      acc.revenue += s.amount;
      acc.netSales += s.amount - s.cost;
      acc.unitsSold += s.qty;
      return acc;
    },
    { revenue: 0, netSales: 0, unitsSold: 0 }
  );

  const byDay = new Map<string, { date: string; revenue: number; netSales: number; unitsSold: number }>();
  for (const s of sales) {
    const d = todayDateString(s.at);
    const row = byDay.get(d) ?? { date: d, revenue: 0, netSales: 0, unitsSold: 0 };
    row.revenue += s.amount;
    row.netSales += s.amount - s.cost;
    row.unitsSold += s.qty;
    byDay.set(d, row);
  }
  const days = Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({ month, totals, days });
}
