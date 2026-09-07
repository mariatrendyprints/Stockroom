-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reorder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salesPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "factor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeLine" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "qtyPerUnit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "unitId" TEXT,
    "refName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed" TEXT,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "date" TEXT NOT NULL,
    "opening" TEXT NOT NULL,

    CONSTRAINT "DailyRecord_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "shopName" TEXT NOT NULL DEFAULT 'Stockroom',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeLine_serviceId_itemId_unitId_key" ON "RecipeLine"("serviceId", "itemId", "unitId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
