import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class BusinessError extends Error {}

type Tx = Prisma.TransactionClient;

export function todayDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function baseEquivalent(units: { qty: number; factor: number }[]): number {
  return units.reduce((sum, u) => sum + u.qty * u.factor, 0);
}

export type StockStatus = "Out" | "Low" | "OK";

export function itemStatus(total: number, reorder: number): StockStatus {
  if (total <= 0) return "Out";
  if (total <= reorder) return "Low";
  return "OK";
}

export function itemValue(units: { qty: number; costPrice: number }[]): number {
  return units.reduce((sum, u) => sum + u.qty * u.costPrice, 0);
}

/**
 * §6.7: snapshot stock into a Daily Record the first time a given calendar
 * day is mutated, before the mutation applies. Must be called inside the
 * same transaction as the mutation, before any qty changes.
 */
export async function snapshotOpeningIfNeeded(tx: Tx): Promise<void> {
  const today = todayDateString();
  const existing = await tx.dailyRecord.findUnique({ where: { date: today } });
  if (existing) return;
  const units = await tx.unit.findMany({ select: { id: true, itemId: true, qty: true } });
  const opening = units.map((u) => ({ item_id: u.itemId, unit_id: u.id, qty: u.qty }));
  await tx.dailyRecord.create({ data: { date: today, opening: JSON.stringify(opening) } });
}

export async function getOpeningStock(
  date: string
): Promise<{ item_id: string; unit_id: string; qty: number }[] | null> {
  const record = await prisma.dailyRecord.findUnique({ where: { date } });
  if (record) return JSON.parse(record.opening);
  if (date === todayDateString()) {
    const units = await prisma.unit.findMany({ select: { id: true, itemId: true, qty: true } });
    return units.map((u) => ({ item_id: u.itemId, unit_id: u.id, qty: u.qty }));
  }
  return null;
}

export async function getClosingStock(
  date: string
): Promise<{ item_id: string; unit_id: string; qty: number }[]> {
  const next = await prisma.dailyRecord.findFirst({
    where: { date: { gt: date } },
    orderBy: { date: "asc" },
  });
  if (next) return JSON.parse(next.opening);
  const units = await prisma.unit.findMany({ select: { id: true, itemId: true, qty: true } });
  return units.map((u) => ({ item_id: u.itemId, unit_id: u.id, qty: u.qty }));
}

export async function sellProduct(unitId: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 1) throw new BusinessError("Quantity must be a whole number of at least 1.");

  return prisma.$transaction(async (tx) => {
    await snapshotOpeningIfNeeded(tx);

    const unit = await tx.unit.findUnique({ where: { id: unitId }, include: { item: true } });
    if (!unit) throw new BusinessError("Item/unit not found.");
    if (qty > unit.qty) {
      throw new BusinessError(`Only ${unit.qty} ${unit.name} of ${unit.item.name} in stock.`);
    }

    await tx.unit.update({ where: { id: unitId }, data: { qty: { decrement: qty } } });

    return tx.sale.create({
      data: {
        type: "product",
        refId: unit.itemId,
        unitId: unit.id,
        refName: `${unit.item.name} (${unit.name})`,
        qty,
        amount: qty * unit.salesPrice,
        cost: qty * unit.costPrice,
      },
    });
  });
}

export async function sellService(serviceId: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 1) throw new BusinessError("Quantity must be a whole number of at least 1.");

  return prisma.$transaction(async (tx) => {
    await snapshotOpeningIfNeeded(tx);

    const service = await tx.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new BusinessError("Service not found.");

    const lines = await tx.recipeLine.findMany({
      where: { serviceId },
      include: { item: true, unit: true },
    });
    if (lines.length === 0) {
      throw new BusinessError(`${service.name} has no materials available to use.`);
    }

    for (const line of lines) {
      const need = line.qtyPerUnit * qty;
      if (line.unit.qty < need) {
        throw new BusinessError(
          `Not enough ${line.item.name} (${line.unit.name}): need ${need}, have ${line.unit.qty}.`
        );
      }
    }

    const consumed: {
      item_id: string;
      unit_id: string;
      item_name: string;
      unit_name: string;
      qty: number;
      cost: number;
    }[] = [];

    for (const line of lines) {
      const usedQty = line.qtyPerUnit * qty;
      await tx.unit.update({ where: { id: line.unitId }, data: { qty: { decrement: usedQty } } });
      consumed.push({
        item_id: line.itemId,
        unit_id: line.unitId,
        item_name: line.item.name,
        unit_name: line.unit.name,
        qty: usedQty,
        cost: usedQty * line.unit.costPrice,
      });
    }

    const totalCost = consumed.reduce((s, c) => s + c.cost, 0);

    return tx.sale.create({
      data: {
        type: "service",
        refId: service.id,
        unitId: null,
        refName: service.name,
        qty,
        amount: qty * service.price,
        cost: totalCost,
        consumed: JSON.stringify(consumed),
      },
    });
  });
}

export async function deleteSaleAndRestock(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new BusinessError("Sale not found.");

    await snapshotOpeningIfNeeded(tx);

    if (sale.type === "product" && sale.unitId) {
      const unit = await tx.unit.findUnique({ where: { id: sale.unitId } });
      if (unit) await tx.unit.update({ where: { id: sale.unitId }, data: { qty: { increment: sale.qty } } });
    } else if (sale.type === "service" && sale.consumed) {
      const consumed = JSON.parse(sale.consumed) as { unit_id: string; qty: number }[];
      for (const c of consumed) {
        const unit = await tx.unit.findUnique({ where: { id: c.unit_id } });
        if (unit) await tx.unit.update({ where: { id: c.unit_id }, data: { qty: { increment: c.qty } } });
      }
    }

    await tx.sale.delete({ where: { id: saleId } });
  });
}

export async function convertStock(itemId: string, fromUnitId: string, toUnitId: string, qty: number) {
  if (fromUnitId === toUnitId) throw new BusinessError("Choose two different units.");
  if (!(qty > 0)) throw new BusinessError("Quantity must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    await snapshotOpeningIfNeeded(tx);

    const [from, to] = await Promise.all([
      tx.unit.findUnique({ where: { id: fromUnitId } }),
      tx.unit.findUnique({ where: { id: toUnitId } }),
    ]);
    if (!from || !to || from.itemId !== itemId || to.itemId !== itemId) {
      throw new BusinessError("Units must belong to the same item.");
    }
    if (qty > from.qty) throw new BusinessError(`Only ${from.qty} ${from.name} available to convert.`);

    const resultQty = (qty * from.factor) / to.factor;

    await tx.unit.update({ where: { id: fromUnitId }, data: { qty: { decrement: qty } } });
    await tx.unit.update({ where: { id: toUnitId }, data: { qty: { increment: resultQty } } });
  });
}

export async function addUnit(
  itemId: string,
  name: string,
  referenceUnitId: string,
  equalsN: number,
  costPrice: number,
  salesPrice: number
) {
  if (!(equalsN > 0)) throw new BusinessError("The conversion amount must be greater than zero.");
  const reference = await prisma.unit.findUnique({ where: { id: referenceUnitId } });
  if (!reference || reference.itemId !== itemId) throw new BusinessError("Reference unit not found.");

  const factor = reference.factor / equalsN;

  return prisma.unit.create({
    data: { itemId, name, factor, costPrice, salesPrice, qty: 0 },
  });
}

export async function deleteUnit(unitId: string) {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { item: { include: { units: true } } },
  });
  if (!unit) throw new BusinessError("Unit not found.");
  if (unit.item.units.length <= 1) {
    throw new BusinessError("Can't delete an item's last remaining unit — delete the item instead.");
  }
  if (unit.qty !== 0) {
    throw new BusinessError("Convert or sell off the remaining stock before deleting it.");
  }
  await prisma.unit.delete({ where: { id: unitId } });
}

export async function getSellableSnapshot() {
  const [items, services] = await Promise.all([
    prisma.item.findMany({ include: { units: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({
      include: { recipeLines: { include: { unit: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      units: item.units.map((u) => ({ id: u.id, name: u.name, qty: u.qty, inStock: u.qty > 0 })),
    })),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      makeable: s.recipeLines.length > 0 && s.recipeLines.every((l) => l.unit.qty >= l.qtyPerUnit),
    })),
  };
}
