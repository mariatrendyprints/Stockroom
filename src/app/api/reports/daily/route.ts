import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { getOpeningStock, getClosingStock, todayDateString } from "@/lib/inventory";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const date = req.nextUrl.searchParams.get("date") || todayDateString();

  const [allSales, units, opening, closing] = await Promise.all([
    prisma.sale.findMany({ orderBy: { at: "desc" } }),
    prisma.unit.findMany({ include: { item: true } }),
    getOpeningStock(date),
    getClosingStock(date),
  ]);

  const sales = allSales.filter((s) => todayDateString(s.at) === date);

  const totals = sales.reduce(
    (acc, s) => {
      acc.revenue += s.amount;
      acc.netSales += s.amount - s.cost;
      acc.unitsSold += s.qty;
      return acc;
    },
    { revenue: 0, netSales: 0, unitsSold: 0 }
  );

  const unitLabel = new Map(units.map((u) => [u.id, `${u.item.name} (${u.name})`]));
  const openingMap = new Map((opening ?? []).map((o) => [o.unit_id, o.qty]));
  const closingMap = new Map(closing.map((o) => [o.unit_id, o.qty]));

  const stockRows = units.map((u) => ({
    itemId: u.itemId,
    unitId: u.id,
    label: unitLabel.get(u.id) ?? `${u.item.name} (${u.name})`,
    opening: opening === null ? null : (openingMap.get(u.id) ?? 0),
    closing: closingMap.get(u.id) ?? u.qty,
  }));

  return NextResponse.json({ date, sales, totals, stockRows });
}
