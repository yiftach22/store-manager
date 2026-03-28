-- AlterTable
ALTER TABLE "OrderInstance" ADD COLUMN     "listId" INTEGER;

-- AlterTable
ALTER TABLE "OrderTemplate" ADD COLUMN     "listId" INTEGER;

-- CreateTable
CREATE TABLE "OrderList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderList_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderTemplate" ADD CONSTRAINT "OrderTemplate_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OrderList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInstance" ADD CONSTRAINT "OrderInstance_listId_fkey" FOREIGN KEY ("listId") REFERENCES "OrderList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
