import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
    const data = await request.json();
    const businessUnitDetails = await prisma.businessUnit.findFirst({
        where: {
            id: data.id,
        },
    });

    return NextResponse.json(businessUnitDetails);
}
