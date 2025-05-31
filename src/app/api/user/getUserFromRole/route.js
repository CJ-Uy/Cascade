import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
	const data = await request.json();

	const roleData = await prisma.role.findFirst({
		where: {
			id: data.id,
		},
		include: {
			users: true, // This includes all user fields, including password
		},
	});

	const userData = await prisma.user.findFirst({
		where: {
			id: roleData.users[0].id,
		},
        include: {
            password: false,
            businessUnit: true,
            role: true,
        },
	});

	return NextResponse.json(userData);
}
