import { PrismaClient } from "../../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
	const users = await prisma.user.findMany({
		select: {
			email: true,
			role: {
				select: {
					name: true,
				},
			},
			headsRole: {
				select: {
					name: true,
				},
			},
		},
    });

	const emails = [];
	const roleNames = [];
	for (const user of users) {
		emails.push(user.email);
		if (user.role.length > 0) {
			roleNames.push(user.role[0].name);
        } else if (user.headsRole != null) {
			roleNames.push(user.headsRole.name);
		} else {
			roleNames.push("No Role Assigned");
		}
	}

	for (const email of emails) {
		console.log(email);
	}
	console.log("");
	console.log("---------------------------");
	console.log("");

	for (const roleName of roleNames) {
		console.log(roleName);
	}

	console.log("");
	console.log("---------------------------");
	console.log("");

	await prisma.$disconnect();
	console.log("Disconnected from database.");
}

main();
