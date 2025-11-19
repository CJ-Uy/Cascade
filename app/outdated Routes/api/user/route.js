import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    await prisma.user.findMany({
      include: {
        role: {
          select: {
            name: true,
          },
        },
        businessUnit: {
          select: {
            name: true,
          },
        },
      },
    }),
  );
}
