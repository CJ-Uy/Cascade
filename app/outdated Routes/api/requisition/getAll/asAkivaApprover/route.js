import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { id: userId } = await request.json();
  // TODO: add a verifier for is-akiva-approver true boolean

  // Loop over the roles to get all the related requisitions
  const requisitions = await prisma.requisition.findMany({
    include: {
      initiator: true,
      fromBU: true,
    },
  });

  //  Get the role names from each approver role id
  for (let i = 0; i < requisitions.length; i++) {
    const approversRoleNames = [];

    for (let j = 0; j < requisitions[i].approvals.length; j++) {
      const approverRole = await prisma.role.findFirst({
        where: {
          id: requisitions[i].approvals[j].approverRole,
        },
        select: {
          name: true,
        },
      });
      approversRoleNames.push(approverRole.name);
    }

    requisitions[i].approversRoleNames = approversRoleNames;
  }

  return NextResponse.json(requisitions);
}
