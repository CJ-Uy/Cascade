import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
	const data = await request.json();
	const userData = await prisma.user.findFirst({
		where: {
			id: data.id,
		},
		include: {
			password: false,
			businessUnit: {
				select: {
					id: true,
					name: true,
				},
			},
			role: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	return NextResponse.json(userData);
}
