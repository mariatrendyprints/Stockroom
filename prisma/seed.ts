import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, shopName: "Stockroom" },
  });

  const adminEmail = process.env.ADMIN_SEED_EMAIL || "admin@stockroom.local";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const password = process.env.ADMIN_SEED_PASSWORD || "change-me-now";
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_SEED_NAME || "Admin",
        email: adminEmail,
        role: "admin",
        passwordHash,
      },
    });
    console.log(`Seeded admin account: ${adminEmail} / ${password} — change this password.`);
  } else {
    console.log(`Admin account ${adminEmail} already exists, skipping.`);
  }

  const itemCount = await prisma.item.count();
  if (itemCount === 0) {
    const paper = await prisma.item.create({
      data: {
        name: "A4 Bond Paper",
        reorder: 0.2,
        units: {
          create: [
            { name: "Ream", qty: 5, costPrice: 180, salesPrice: 220, factor: 1 },
            { name: "Piece", qty: 250, costPrice: 0.36, salesPrice: 1, factor: 1 / 500 },
          ],
        },
      },
      include: { units: true },
    });

    const pieceUnit = paper.units.find((u) => u.name === "Piece")!;

    const printing = await prisma.service.create({
      data: { name: "Printing (per page)", price: 5 },
    });

    await prisma.recipeLine.create({
      data: {
        serviceId: printing.id,
        itemId: paper.id,
        unitId: pieceUnit.id,
        qtyPerUnit: 1,
      },
    });

    console.log("Seeded demo item (A4 Bond Paper) and service (Printing).");
  } else {
    console.log("Items already exist, skipping demo data.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
