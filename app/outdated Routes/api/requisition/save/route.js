import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { userId, businessUnitId, templateName, values } = await request.json();

  // Get user's role id to reference the approval system's flow
  const { role: userRoles } = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      role: {
        select: {
          id: true,
        },
      },
    },
  });
  const userRole = userRoles[0].id; // TODO: add support for multiple roles in the future by going to the role's attached business unit to double check

  // Get the approvers based on the approval system of the business unit
  const approvalSystem = await prisma.businessUnit.findFirst({
    where: {
      id: businessUnitId,
    },
    select: {
      approvalSystem: true,
    },
  });
  const approvers = approvalSystem.approvalSystem[userRole];

  // Create the template of the approvers statuses
  const approversStatus = [];
  let initialApprover = true;
  for (const approver of approvers) {
    // If first approver/initial approver set to PENDING
    if (initialApprover) {
      approversStatus.push({
        approverRole: approver,
        approverId: "",
        status: "PENDING",
        comments: [],
      });
      initialApprover = false;
    } else {
      approversStatus.push({
        approverRole: approver,
        approverId: "",
        status: "WAITING",
        comments: [],
      });
    }
  }

  // Create the requisition
  const requisitionCreated = await prisma.requisition.create({
    data: {
      userId,
      businessUnitId,
      templateName,
      approvals: approversStatus,
      values: values,
    },
  });

  return NextResponse.json(requisitionCreated);
}
