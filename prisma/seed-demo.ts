/**
 * Demo seed — for a THROWAWAY demo deployment only, pointed at its own
 * separate database. Running this WIPES every table and replaces the
 * contents with sample data, so it doubles as a "reset the demo" command.
 *
 *   npm run db:seed:demo
 *
 * Never run this against the real production database.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

function daysAgoAt(days: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function wipe() {
  // Order matters for foreign keys.
  await prisma.recipeLine.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.dailyRecord.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.item.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();
}

async function main() {
  await wipe();

  await prisma.settings.create({ data: { id: 1, shopName: "Maria Trendy Prints — Demo" } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.createMany({
    data: [
      { name: "Demo Admin", email: "demo-admin@stockroom.local", role: "admin", passwordHash },
      { name: "Demo Staff", email: "demo-staff@stockroom.local", role: "staff", passwordHash },
    ],
  });

  // --- Items + units (largest unit first, per the factor convention) ---
  const paper = await prisma.item.create({
    data: {
      name: "A4 Bond Paper",
      reorder: 0.3,
      units: {
        create: [
          { name: "Ream", qty: 6, costPrice: 185, salesPrice: 230, factor: 1 },
          { name: "Piece", qty: 400, costPrice: 0.37, salesPrice: 1, factor: 1 / 500 },
        ],
      },
    },
    include: { units: true },
  });

  const mug = await prisma.item.create({
    data: {
      name: "Sublimation Mug (Blank)",
      reorder: 0.5,
      units: {
        create: [
          { name: "Box", qty: 3, costPrice: 1800, salesPrice: 2400, factor: 1 },
          { name: "Piece", qty: 12, costPrice: 50, salesPrice: 120, factor: 1 / 36 },
        ],
      },
    },
    include: { units: true },
  });

  // Ends up "Low": base equivalent = 8/25 = 0.32, under the 0.4 reorder point.
  const tumbler = await prisma.item.create({
    data: {
      name: "20oz Tumbler (Blank)",
      reorder: 0.4,
      units: {
        create: [
          { name: "Box", qty: 0, costPrice: 3000, salesPrice: 4200, factor: 1 },
          { name: "Piece", qty: 8, costPrice: 120, salesPrice: 250, factor: 1 / 25 },
        ],
      },
    },
    include: { units: true },
  });

  // Ends up "Out": everything at zero.
  const photo = await prisma.item.create({
    data: {
      name: "Photo Paper Glossy",
      reorder: 0.2,
      units: {
        create: [
          { name: "Pack", qty: 0, costPrice: 220, salesPrice: 0, factor: 1 },
          { name: "Sheet", qty: 0, costPrice: 2.2, salesPrice: 8, factor: 1 / 100 },
        ],
      },
    },
    include: { units: true },
  });

  const vinyl = await prisma.item.create({
    data: {
      name: "Sticker Vinyl",
      reorder: 0.15,
      units: {
        create: [
          { name: "Roll", qty: 2, costPrice: 950, salesPrice: 1300, factor: 1 },
          { name: "Sheet", qty: 30, costPrice: 19, salesPrice: 45, factor: 1 / 50 },
        ],
      },
    },
    include: { units: true },
  });

  const u = (item: { units: { id: string; name: string; costPrice: number }[] }, name: string) => {
    const found = item.units.find((x) => x.name === name);
    if (!found) throw new Error(`unit ${name} not found`);
    return found;
  };

  const paperPiece = u(paper, "Piece");
  const mugPiece = u(mug, "Piece");
  const tumblerPiece = u(tumbler, "Piece");
  const photoSheet = u(photo, "Sheet");
  const vinylSheet = u(vinyl, "Sheet");

  // --- Services + recipes ---
  const printing = await prisma.service.create({ data: { name: "Printing (per page)", price: 5 } });
  const persoMug = await prisma.service.create({ data: { name: "Personalized Mug", price: 180 } });
  const persoTumbler = await prisma.service.create({ data: { name: "Personalized Tumbler", price: 280 } });
  const photoPrint = await prisma.service.create({ data: { name: "Photo Print 4R", price: 15 } });

  await prisma.recipeLine.createMany({
    data: [
      { serviceId: printing.id, itemId: paper.id, unitId: paperPiece.id, qtyPerUnit: 1 },
      { serviceId: persoMug.id, itemId: mug.id, unitId: mugPiece.id, qtyPerUnit: 1 },
      { serviceId: persoMug.id, itemId: vinyl.id, unitId: vinylSheet.id, qtyPerUnit: 1 },
      { serviceId: persoTumbler.id, itemId: tumbler.id, unitId: tumblerPiece.id, qtyPerUnit: 1 },
      { serviceId: photoPrint.id, itemId: photo.id, unitId: photoSheet.id, qtyPerUnit: 1 },
    ],
  });

  // --- Backdated sales history (rows only — stock above is already the
  //     post-consumption level, so nothing is decremented here) ---
  type ProductEvent = {
    kind: "product";
    daysAgo: number;
    hour: number;
    unit: { id: string; costPrice: number };
    itemId: string;
    refName: string;
    salesPrice: number;
    qty: number;
  };
  type ServiceEvent = {
    kind: "service";
    daysAgo: number;
    hour: number;
    serviceId: string;
    serviceName: string;
    price: number;
    qty: number;
    consumes: { item: typeof paper; unit: { id: string; name: string; costPrice: number }; qtyPer: number }[];
  };

  const priceOf = (item: { units: { name: string; salesPrice: number }[] }, name: string) =>
    item.units.find((x) => x.name === name)!.salesPrice;

  const events: (ProductEvent | ServiceEvent)[] = [
    { kind: "service", daysAgo: 5, hour: 10, serviceId: printing.id, serviceName: "Printing (per page)", price: 5, qty: 120, consumes: [{ item: paper, unit: paperPiece, qtyPer: 1 }] },
    { kind: "product", daysAgo: 5, hour: 14, unit: paperPiece, itemId: paper.id, refName: "A4 Bond Paper (Piece)", salesPrice: priceOf(paper, "Piece"), qty: 50 },
    { kind: "service", daysAgo: 4, hour: 11, serviceId: persoMug.id, serviceName: "Personalized Mug", price: 180, qty: 6, consumes: [{ item: mug, unit: mugPiece, qtyPer: 1 }, { item: vinyl, unit: vinylSheet, qtyPer: 1 }] },
    { kind: "service", daysAgo: 4, hour: 15, serviceId: printing.id, serviceName: "Printing (per page)", price: 5, qty: 80, consumes: [{ item: paper, unit: paperPiece, qtyPer: 1 }] },
    { kind: "product", daysAgo: 3, hour: 9, unit: mugPiece, itemId: mug.id, refName: "Sublimation Mug (Blank) (Piece)", salesPrice: priceOf(mug, "Piece"), qty: 4 },
    { kind: "service", daysAgo: 3, hour: 13, serviceId: persoTumbler.id, serviceName: "Personalized Tumbler", price: 280, qty: 5, consumes: [{ item: tumbler, unit: tumblerPiece, qtyPer: 1 }] },
    { kind: "service", daysAgo: 2, hour: 10, serviceId: persoMug.id, serviceName: "Personalized Mug", price: 180, qty: 3, consumes: [{ item: mug, unit: mugPiece, qtyPer: 1 }, { item: vinyl, unit: vinylSheet, qtyPer: 1 }] },
    { kind: "service", daysAgo: 2, hour: 16, serviceId: printing.id, serviceName: "Printing (per page)", price: 5, qty: 60, consumes: [{ item: paper, unit: paperPiece, qtyPer: 1 }] },
    { kind: "product", daysAgo: 1, hour: 11, unit: vinylSheet, itemId: vinyl.id, refName: "Sticker Vinyl (Sheet)", salesPrice: priceOf(vinyl, "Sheet"), qty: 10 },
    { kind: "service", daysAgo: 1, hour: 14, serviceId: persoTumbler.id, serviceName: "Personalized Tumbler", price: 280, qty: 3, consumes: [{ item: tumbler, unit: tumblerPiece, qtyPer: 1 }] },
    { kind: "service", daysAgo: 0, hour: 9, serviceId: printing.id, serviceName: "Printing (per page)", price: 5, qty: 40, consumes: [{ item: paper, unit: paperPiece, qtyPer: 1 }] },
    { kind: "service", daysAgo: 0, hour: 12, serviceId: persoMug.id, serviceName: "Personalized Mug", price: 180, qty: 2, consumes: [{ item: mug, unit: mugPiece, qtyPer: 1 }, { item: vinyl, unit: vinylSheet, qtyPer: 1 }] },
  ];

  // consumedByUnit[daysAgo][unitId] = qty consumed that day (for daily-record openings)
  const consumedByDay = new Map<number, Map<string, number>>();
  const bump = (daysAgo: number, unitId: string, qty: number) => {
    if (!consumedByDay.has(daysAgo)) consumedByDay.set(daysAgo, new Map());
    const m = consumedByDay.get(daysAgo)!;
    m.set(unitId, (m.get(unitId) ?? 0) + qty);
  };

  for (const ev of events) {
    if (ev.kind === "product") {
      bump(ev.daysAgo, ev.unit.id, ev.qty);
      await prisma.sale.create({
        data: {
          type: "product",
          refId: ev.itemId,
          unitId: ev.unit.id,
          refName: ev.refName,
          qty: ev.qty,
          amount: ev.qty * ev.salesPrice,
          cost: ev.qty * ev.unit.costPrice,
          at: daysAgoAt(ev.daysAgo, ev.hour),
        },
      });
    } else {
      const consumed = ev.consumes.map((c) => {
        const usedQty = c.qtyPer * ev.qty;
        bump(ev.daysAgo, c.unit.id, usedQty);
        return {
          item_id: c.item.id,
          unit_id: c.unit.id,
          item_name: c.item.name,
          unit_name: c.unit.name,
          qty: usedQty,
          cost: usedQty * c.unit.costPrice,
        };
      });
      await prisma.sale.create({
        data: {
          type: "service",
          refId: ev.serviceId,
          unitId: null,
          refName: ev.serviceName,
          qty: ev.qty,
          amount: ev.qty * ev.price,
          cost: consumed.reduce((s, c) => s + c.cost, 0),
          consumed: JSON.stringify(consumed),
          at: daysAgoAt(ev.daysAgo, ev.hour),
        },
      });
    }
  }

  // --- Daily records so the report's opening/closing columns have data.
  //     opening(day D) = current stock + everything consumed on D and after. ---
  const allUnits = await prisma.unit.findMany({ select: { id: true, itemId: true, qty: true } });
  const pastDays = [...new Set(events.map((e) => e.daysAgo))].filter((d) => d > 0).sort((a, b) => b - a);

  for (const day of pastDays) {
    const opening = allUnits.map((unit) => {
      let consumedOnOrAfter = 0;
      for (const [d, m] of consumedByDay) {
        if (d <= day) consumedOnOrAfter += m.get(unit.id) ?? 0;
      }
      return { item_id: unit.itemId, unit_id: unit.id, qty: unit.qty + consumedOnOrAfter };
    });
    await prisma.dailyRecord.create({
      data: { date: dateStr(daysAgoAt(day, 0)), opening: JSON.stringify(opening) },
    });
  }

  console.log("Demo data seeded.");
  console.log(`  Admin: demo-admin@stockroom.local / ${DEMO_PASSWORD}`);
  console.log(`  Staff: demo-staff@stockroom.local / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
