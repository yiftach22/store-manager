/*
  Warnings:

  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_completedById_fkey";

-- DropTable
DROP TABLE "Order";

-- DropEnum
DROP TYPE "OrderCategory";

-- CreateTable
CREATE TABLE "OrderTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OrderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderInstance" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "currentDate" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "templateId" INTEGER,

    CONSTRAINT "OrderInstance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderInstance" ADD CONSTRAINT "OrderInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OrderTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
