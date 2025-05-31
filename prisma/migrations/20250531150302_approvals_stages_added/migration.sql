/*
  Warnings:

  - The `approvals` column on the `Requisition` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Requisition" ADD COLUMN     "stage" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "approvals",
ADD COLUMN     "approvals" JSONB[];
