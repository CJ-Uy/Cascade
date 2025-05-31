/*
  Warnings:

  - Added the required column `approvalSystem` to the `BusinessUnit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `approvals` to the `Requisition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businessUnitId` to the `Requisition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BusinessUnit" ADD COLUMN     "approvalSystem" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Requisition" ADD COLUMN     "approvals" JSONB NOT NULL,
ADD COLUMN     "businessUnitId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "imageLink" TEXT;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
