import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { userId, comment, requisitionId } = await request.json();

  // Get requisition
  let requisition = await prisma.requisition.findFirst({
    where: {
      id: requisitionId,
    },
  });

  // Get user's role id
  const roles = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      role: true,
    },
  });
  const userRoleId = roles.role[0].id;

  // Get role id of allowed approver
  let isAllowedToApprove = false;
  let indexOfApproval = 0;
  for (let i = 0; i < requisition.approvals.length; i++) {
    if (
      requisition.approvals[i].status == "PENDING" &&
      requisition.approvals[i].approverRole == userRoleId
    ) {
      isAllowedToApprove = true;
      indexOfApproval = i;
    }
  }

  if (isAllowedToApprove) {
    // Update Approvals
    requisition.approvals[indexOfApproval].status = "APPROVED";
    requisition.approvals[indexOfApproval].comments.push(comment);
    requisition.approvals[indexOfApproval].approverId = userId;

    // If there is still an approver after this one set them to PENDING
    if (indexOfApproval < requisition.approvals.length - 1) {
      requisition.approvals[indexOfApproval + 1].status = "PENDING";
    }

    // Update the requisition proper
    await prisma.requisition.update({
      where: {
        id: requisitionId,
      },
      data: {
        approvals: requisition.approvals,
        stage: indexOfApproval + 1,
      },
    });
  }

  return NextResponse.json(requisition);
}
