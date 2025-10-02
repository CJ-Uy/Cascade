import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

// Get the Business Unit Requisition Templates given the user Id
export async function POST(request) {
  const data = await request.json();

  // Get the business unit the user belongs to
  const { businessUnit: bu, role: userRole } = await prisma.user.findFirst({
    where: {
      id: data.id,
    },
    select: {
      role: {
        select: {
          id: true,
        },
      },
      businessUnit: {
        select: {
          id: true,
        },
      },
    },
  });

  // Get the templates from said business unit
  // TODO: add support for multiple business units next time
  const { requisitionTemplates: templates } =
    await prisma.businessUnit.findFirst({
      where: {
        id: bu[0].id,
      },
      select: {
        id: true,
        requisitionTemplates: true,
      },
    });

  // Filter the templates based on the user's role
  const templatesToShow = { id: bu[0].id, requisitionTemplates: {} };
  for (const key in templates) {
    for (const role of userRole) {
      if (templates[key].initiatorAccess.includes(role.id)) {
        delete templates[key].initiatorAccess;
        templatesToShow.requisitionTemplates[key] = templates[key];
      }
    }
  }

  return NextResponse.json(templatesToShow);
}
