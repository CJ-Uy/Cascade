// deleteAllData.js
import { PrismaClient } from "../../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
	console.warn("WARNING: This script will delete ALL data from the database.");

	for (let i = 0; i < 5; i++) {
		console.log(`Starting data deletion process in ${5 - i} seconds...`);
		await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
	}
	console.log("Proceeding with data deletion...");

	try {
		// The order of deletion is important to avoid foreign key constraint violations.
		// Delete models that are depended upon by others last.

		// 1. Verification (no direct FKs from other models in this list)
		const { count: verificationCount } = await prisma.verification.deleteMany({});
		console.log(`Deleted ${verificationCount} verification(s).`);

		// 2. Session (depends on User, but User has onDelete: Cascade for sessions)
		//    Explicitly deleting first is safer for a full wipe.
		const { count: sessionCount } = await prisma.session.deleteMany({});
		console.log(`Deleted ${sessionCount} session(s).`);

		// 3. Account (depends on User, but User has onDelete: Cascade for accounts)
		//    Explicitly deleting first is safer.
		const { count: accountCount } = await prisma.account.deleteMany({});
		console.log(`Deleted ${accountCount} account(s).`);

		// 4. Requisition (depends on User and BusinessUnit)
		const { count: requisitionCount } = await prisma.requisition.deleteMany({});
		console.log(`Deleted ${requisitionCount} requisition(s).`);

		// 5. User (M2M with Role, BusinessUnit; Session, Account, Requisition dependents deleted or cascaded)
		//    Deleting users will also clean up entries in implicit M2M join tables (_RoleToUser, _BusinessUnitToUser).
		const { count: userCount } = await prisma.user.deleteMany({});
		console.log(`Deleted ${userCount} user(s).`);

		// 6. Role (depends on BusinessUnit; M2M with User already cleared from User side)
		const { count: roleCount } = await prisma.role.deleteMany({});
		console.log(`Deleted ${roleCount} role(s).`);

		// 7. BusinessUnit (all known dependents like Requisition, Role, User M2M links should be gone)
		const { count: businessUnitCount } = await prisma.businessUnit.deleteMany({});
		console.log(`Deleted ${businessUnitCount} business unit(s).`);

		console.log("\nAll data has been successfully deleted.");
	} catch (e) {
		console.error("Error deleting data:", e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		console.log("Disconnected from database.");
	}
}

main();
