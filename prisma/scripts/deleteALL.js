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
		console.log("🧹 Clearing existing data...");
		// Delete in reverse order of dependency
		await prisma.requisitionValue.deleteMany();
		await prisma.requisitionTag.deleteMany();
		await prisma.tag.deleteMany();
		await prisma.notification.deleteMany();
		await prisma.attachment.deleteMany();
		await prisma.comment.deleteMany();
		await prisma.requisitionApproval.deleteMany();
		await prisma.requisition.deleteMany();
		await prisma.fieldOption.deleteMany();
		await prisma.templateField.deleteMany();
		await prisma.templateInitiatorAccess.deleteMany();
		await prisma.requisitionTemplate.deleteMany();
		await prisma.approvalStepDefinition.deleteMany();
		await prisma.approvalWorkflow.deleteMany();
		await prisma.userRoleAssignment.deleteMany();
		await prisma.userBusinessUnit.deleteMany();
		await prisma.role.deleteMany();
		await prisma.businessUnit.deleteMany();
		await prisma.user.deleteMany();
		console.log("✅ Database cleared.");
	} catch (e) {
		console.error("Error deleting data:", e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		console.log("Disconnected from database.");
	}
}

main();
