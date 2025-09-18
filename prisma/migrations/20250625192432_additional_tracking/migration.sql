/*
  Warnings:

  - You are about to drop the column `approvalSystem` on the `BusinessUnit` table. All the data in the column will be lost.
  - You are about to drop the column `headsRoleId` on the `BusinessUnit` table. All the data in the column will be lost.
  - You are about to drop the column `requisitionTemplates` on the `BusinessUnit` table. All the data in the column will be lost.
  - You are about to drop the column `approvals` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `values` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `headsRoleId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `HeadsRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BusinessUnitToUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_RoleToUser` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[headId]` on the table `BusinessUnit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,businessUnitId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `headId` to the `BusinessUnit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initiatorId` to the `Requisition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `Requisition` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "BUMembershipType" AS ENUM ('MEMBER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('BU', 'SYSTEM', 'AUDITOR');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXT_AREA', 'NUMBER', 'BOOLEAN', 'DATE', 'CURRENCY', 'SELECT', 'MULTIPLE_CHOICE', 'CHECKBOX', 'LIST');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'PENDING', 'NEEDS_CLARIFICATION', 'IN_REVISION', 'APPROVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('WAITING', 'PENDING', 'APPROVED', 'REQUESTED_CLARIFICATION', 'REQUESTED_REVISION');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('SUBMIT', 'APPROVE', 'REQUEST_REVISION', 'REQUEST_CLARIFICATION', 'CLARIFY', 'RESUBMIT', 'COMMENT', 'CANCEL');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('PRIVATE', 'GROUP');

-- DropForeignKey
ALTER TABLE "BusinessUnit" DROP CONSTRAINT "BusinessUnit_headsRoleId_fkey";

-- DropForeignKey
ALTER TABLE "Requisition" DROP CONSTRAINT "Requisition_userId_fkey";

-- DropForeignKey
ALTER TABLE "_BusinessUnitToUser" DROP CONSTRAINT "_BusinessUnitToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_BusinessUnitToUser" DROP CONSTRAINT "_BusinessUnitToUser_B_fkey";

-- DropForeignKey
ALTER TABLE "_RoleToUser" DROP CONSTRAINT "_RoleToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_RoleToUser" DROP CONSTRAINT "_RoleToUser_B_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_headsRoleId_fkey";

-- AlterTable
ALTER TABLE "BusinessUnit" DROP COLUMN "approvalSystem",
DROP COLUMN "headsRoleId",
DROP COLUMN "requisitionTemplates",
ADD COLUMN     "headId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Requisition" DROP COLUMN "approvals",
DROP COLUMN "stage",
DROP COLUMN "userId",
DROP COLUMN "values",
ADD COLUMN     "initiatorId" TEXT NOT NULL,
ADD COLUMN     "overallStatus" "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "templateId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "isBUAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scope" "RoleScope" NOT NULL DEFAULT 'BU';

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "active",
DROP COLUMN "headsRoleId",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'UNASSIGNED',
ALTER COLUMN "emailVerified" DROP NOT NULL;

-- AlterTable
ALTER TABLE "verifications" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "HeadsRole";

-- DropTable
DROP TABLE "_BusinessUnitToUser";

-- DropTable
DROP TABLE "_RoleToUser";

-- CreateTable
CREATE TABLE "UserBusinessUnit" (
    "userId" TEXT NOT NULL,
    "businessUnitId" TEXT NOT NULL,
    "membershipType" "BUMembershipType" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "UserBusinessUnit_pkey" PRIMARY KEY ("userId","businessUnitId")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RequisitionTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "businessUnitId" TEXT NOT NULL,
    "approvalWorkflowId" TEXT,

    CONSTRAINT "RequisitionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "placeholder" TEXT,
    "order" INTEGER NOT NULL,
    "parentListFieldId" TEXT,

    CONSTRAINT "TemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldOption" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "FieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateInitiatorAccess" (
    "templateId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "TemplateInitiatorAccess_pkey" PRIMARY KEY ("templateId","roleId")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStepDefinition" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "approverRoleId" TEXT NOT NULL,

    CONSTRAINT "ApprovalStepDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionApproval" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "stepDefinitionId" TEXT NOT NULL,
    "approverId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'WAITING',
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "RequisitionApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionValue" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "templateFieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "rowIndex" INTEGER,

    CONSTRAINT "RequisitionValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filetype" TEXT NOT NULL,
    "size" INTEGER,
    "uploaderId" TEXT NOT NULL,
    "requisitionId" TEXT,
    "commentId" TEXT,
    "chatMessageId" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "action" "ActionType" NOT NULL,
    "authorId" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "recipientId" TEXT NOT NULL,
    "requisitionId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#cccccc',
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionTag" (
    "requisitionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequisitionTag_pkey" PRIMARY KEY ("requisitionId","tagId")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chatType" "ChatType" NOT NULL,
    "groupName" TEXT,
    "groupImageUrl" TEXT,
    "creatorId" TEXT,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "senderId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionTemplate_name_businessUnitId_key" ON "RequisitionTemplate"("name", "businessUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateField_templateId_label_parentListFieldId_key" ON "TemplateField"("templateId", "label", "parentListFieldId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldOption_fieldId_value_key" ON "FieldOption"("fieldId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStepDefinition_workflowId_stepNumber_key" ON "ApprovalStepDefinition"("workflowId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionValue_requisitionId_templateFieldId_rowIndex_key" ON "RequisitionValue"("requisitionId", "templateFieldId", "rowIndex");

-- CreateIndex
CREATE INDEX "Attachment_requisitionId_idx" ON "Attachment"("requisitionId");

-- CreateIndex
CREATE INDEX "Attachment_commentId_idx" ON "Attachment"("commentId");

-- CreateIndex
CREATE INDEX "Attachment_chatMessageId_idx" ON "Attachment"("chatMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_label_key" ON "Tag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessUnit_headId_key" ON "BusinessUnit"("headId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_businessUnitId_key" ON "Role"("name", "businessUnitId");

-- AddForeignKey
ALTER TABLE "BusinessUnit" ADD CONSTRAINT "BusinessUnit_headId_fkey" FOREIGN KEY ("headId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusinessUnit" ADD CONSTRAINT "UserBusinessUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBusinessUnit" ADD CONSTRAINT "UserBusinessUnit_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionTemplate" ADD CONSTRAINT "RequisitionTemplate_businessUnitId_fkey" FOREIGN KEY ("businessUnitId") REFERENCES "BusinessUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionTemplate" ADD CONSTRAINT "RequisitionTemplate_approvalWorkflowId_fkey" FOREIGN KEY ("approvalWorkflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RequisitionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateField" ADD CONSTRAINT "TemplateField_parentListFieldId_fkey" FOREIGN KEY ("parentListFieldId") REFERENCES "TemplateField"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "FieldOption" ADD CONSTRAINT "FieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "TemplateField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateInitiatorAccess" ADD CONSTRAINT "TemplateInitiatorAccess_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RequisitionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateInitiatorAccess" ADD CONSTRAINT "TemplateInitiatorAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStepDefinition" ADD CONSTRAINT "ApprovalStepDefinition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStepDefinition" ADD CONSTRAINT "ApprovalStepDefinition_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RequisitionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApproval" ADD CONSTRAINT "RequisitionApproval_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApproval" ADD CONSTRAINT "RequisitionApproval_stepDefinitionId_fkey" FOREIGN KEY ("stepDefinitionId") REFERENCES "ApprovalStepDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionApproval" ADD CONSTRAINT "RequisitionApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionValue" ADD CONSTRAINT "RequisitionValue_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionValue" ADD CONSTRAINT "RequisitionValue_templateFieldId_fkey" FOREIGN KEY ("templateFieldId") REFERENCES "TemplateField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionTag" ADD CONSTRAINT "RequisitionTag_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "Requisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionTag" ADD CONSTRAINT "RequisitionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionTag" ADD CONSTRAINT "RequisitionTag_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
