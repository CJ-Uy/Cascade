import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
	const { id: userId } = await request.json();

	// Loop over the roles to get all the related requisitions
	const requesitions = await prisma.requisition.findMany({
		where: {
			userId,
		},
		include: {
			initiator: true,
			fromBU: true,
		},
	});

	return NextResponse.json(requesitions);
}
