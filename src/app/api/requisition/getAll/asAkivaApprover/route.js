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

	return NextResponse.json(requisitions);
}
