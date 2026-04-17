-- AlterTable
ALTER TABLE "OrderInstance" ADD COLUMN     "completedById" INTEGER;

-- AddForeignKey
ALTER TABLE "OrderInstance" ADD CONSTRAINT "OrderInstance_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
