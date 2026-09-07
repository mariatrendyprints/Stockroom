import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isErrorResponse } from "@/lib/session";
import { baseEquivalent, itemStatus, itemValue } from "@/lib/inventory";

export async function GET() {
  const admin = await requireAdmin();
  if (isErrorResponse(admin)) return admin;

  const [sales, items] = await Promise.all([
    prisma.sale.findMany({ select: { amount: true, cost: true, qty: true } }),
    prisma.item.findMany({ include: { units: true } }),
  ]);

  const revenue = sales.reduce((s, x) => s + x.amount, 0);
  const cost = sales.reduce((s, x) => s + x.cost, 0);
  const unitsSold = sales.reduce((s, x) => s + x.qty, 0);
  const netSales = revenue - cost;

  const inventoryValue = items.reduce((s, item) => s + itemValue(item.units), 0);
  const lowStockCount = items.filter((item) => {
    const status = itemStatus(baseEquivalent(item.units), item.reorder);
    return status === "Low" || status === "Out";
  }).length;

  return NextResponse.json({
    revenue,
    netSales,
    unitsSold,
    inventoryValue,
    lowStockCount,
  });
}
