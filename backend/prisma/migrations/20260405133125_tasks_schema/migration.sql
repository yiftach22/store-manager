/*
  Warnings:

  - You are about to drop the column `completed` on the `TaskInstance` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `TaskInstance` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `TaskInstance` table. All the data in the column will be lost.
  - You are about to drop the column `weekStart` on the `TaskInstance` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `TaskTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `TaskTemplate` table. All the data in the column will be lost.
  - You are about to drop the `UserCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkerCategory` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `date` to the `TaskInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequency` to the `TaskInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `TaskInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `TaskInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `TaskTemplate` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `frequency` on the `TaskTemplate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "TaskInstance" DROP CONSTRAINT "TaskInstance_templateId_fkey";

-- DropForeignKey
ALTER TABLE "TaskInstance" DROP CONSTRAINT "TaskInstance_userId_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplate" DROP CONSTRAINT "TaskTemplate_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "UserCategory" DROP CONSTRAINT "UserCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "UserCategory" DROP CONSTRAINT "UserCategory_userId_fkey";

-- AlterTable
ALTER TABLE "TaskInstance" DROP COLUMN "completed",
DROP COLUMN "completedAt",
DROP COLUMN "userId",
DROP COLUMN "weekStart",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "frequency" TEXT NOT NULL,
ADD COLUMN     "roleId" INTEGER NOT NULL,
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskTemplate" DROP COLUMN "categoryId",
DROP COLUMN "description",
ADD COLUMN     "roleId" INTEGER NOT NULL,
DROP COLUMN "frequency",
ADD COLUMN     "frequency" TEXT NOT NULL;

-- DropTable
DROP TABLE "UserCategory";

-- DropTable
DROP TABLE "WorkerCategory";

-- DropEnum
DROP TYPE "DayOfWeek";

-- DropEnum
DROP TYPE "Frequency";

-- CreateTable
CREATE TABLE "JobRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJobRole" (
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserJobRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJobRole" ADD CONSTRAINT "UserJobRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "JobRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
