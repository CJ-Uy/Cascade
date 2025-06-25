import { PrismaClient } from "../../src/generated/prisma/index.js";

const prisma = new PrismaClient();

export async function printUserDetails() {
	console.log("🚀 Fetching user login and role information...");

	try {
		const users = await prisma.user.findMany({
			orderBy: {
				createdAt: "asc",
			},
			select: {
				name: true,
				email: true,
				status: true,
				// Select all relevant role and BU information
				roleAssignments: {
					select: {
						role: {
							select: {
								name: true,
								scope: true,
							},
						},
					},
				},
				businessUnits: {
					select: {
						businessUnit: {
							select: {
								name: true,
							},
						},
						membershipType: true,
					},
				},
			},
		});

		if (users.length === 0) {
			console.log("No users found in the database.");
			return;
		}

		// Transform the data into a flat array of objects suitable for console.table
		const tableData = users.map((user) => {
			// Get a simple list of role names
			const roles = user.roleAssignments.map((assignment) => assignment.role.name).join(", ");

			// Get the primary Business Unit the user is a MEMBER of
			const primaryBu = user.businessUnits.find((bu) => bu.membershipType === "MEMBER")
				?.businessUnit.name;

			// Get a simple list of BUs they can audit
			const auditBus = user.businessUnits
				.filter((bu) => bu.membershipType === "AUDITOR")
				.map((bu) => bu.businessUnit.name)
				.join(", ");

			return {
				Name: user.name,
				Email: user.email,
				Password: "password", // Static since we know it from the population script
				Status: user.status,
				"Roles Assigned": roles || "None",
				"Primary BU": primaryBu || "N/A",
				"Audits BU(s)": auditBus || "N/A",
			};
		});

		// Display the data in a clean, organized table
		console.table(tableData);

		console.log(`✅ Displayed table for ${users.length} users.`);
	} catch (e) {
		console.error("❌ Error fetching user data:", e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		console.log("🔌 Disconnected from database.");
	}
}

// This code will ONLY run if you execute `node printUserDetails.js` from your terminal.
// It will NOT run if this file is imported by another file
if (import.meta.url === `file://${process.argv[1]}`) {
	console.log("--- Running printUserDetails as a standalone script ---");
	printUserDetails().catch((e) => {
		console.error("Unhandled error in main execution:", e);
		process.exit(1);
	});
}
