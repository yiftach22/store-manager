-- AlterTable
ALTER TABLE "TaskInstance" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" INTEGER;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
