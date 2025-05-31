/*
  Warnings:

  - Added the required column `requisitionTemplate` to the `BusinessUnit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `values` to the `Requisition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BusinessUnit" ADD COLUMN     "requisitionTemplate" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Requisition" ADD COLUMN     "values" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
