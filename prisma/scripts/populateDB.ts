import { PrismaClient } from "../../src/generated/prisma/index.js";
import { faker } from "@faker-js/faker";
import { signUp } from "../../src/lib/auth-client.js";

const prisma = new PrismaClient();

async function main() {
	console.log("Starting population script...");
	try {
		// --- 1. Create Business Units ---
		const BU_NAMES = ["Grocery Store Inc", "Business 2", "Business 3"];
		const BUs = [];
		for (const BU_NAME of BU_NAMES) {
			BUs.push(
				await prisma.businessUnit.create({
					data: {
						name: BU_NAME,
						approvalSystem: {}, // Will be updated later
						requisitionTemplates: {}, // Will be updated later
					},
				}),
			);
		}
		console.log(`Business Units created: ${BUs.length}`);
		const groceryStoreIncBU_id = BUs[0].id; // Assuming the first one is "Grocery Store Inc"

		// --- 2. Create Head Roles and their Users + Accounts ---
		console.log("Creating Head Roles and Users...");

		// Finance Head for Grocery Store Inc
		const financeHeadRole = await prisma.headsRole.create({
			data: {
				name: "Finance Head",
				isAkivaApprover: false,
				businessUnit: {
					connect: [{ id: groceryStoreIncBU_id }],
				},
			},
		});
		console.log("Finance Head Role Created");
		const buHeadEmail = faker.internet.email().toLowerCase();
		const buHeadName = faker.person.fullName();

		// Create the account and user using better-auth
		const bu_head_account = await signUp.email({
			email: buHeadEmail,
			name: buHeadName,
			password: "password",
		});
		// Update the user to have the role and business unit
		await prisma.user.update({
			where: { id: bu_head_account.data?.user.id },
			data: {
				businessUnit: {
					connect: { id: groceryStoreIncBU_id },
				},
				headsRoleId: financeHeadRole.id, // Assigning the Finance Head role
			},
		});
		console.log("Finance Head Account and User Created");

		// CEO (Akiva Approver) - Not tied to a specific BU initially
		const ceoRole = await prisma.headsRole.create({
			data: {
				name: "CEO",
				isAkivaApprover: true,
			},
		});
		console.log("CEO Role Created");
		// Create the account and user using better-auth
		const ceoEmail = faker.internet.email().toLowerCase();
		const ceoUserName = faker.person.fullName();
		const ceo_account = await signUp.email({
			email: ceoEmail,
			name: ceoUserName,
			password: "password",
		});
		// Update the user to have the role and business unit
		await prisma.user.update({
			where: { id: ceo_account.data?.user.id },
			data: {
				headsRoleId: ceoRole.id, // Assigning the CEO role
			},
		});
		console.log("CEO Account and User Created");

		// --- 3. Create Regular Roles in Grocery Store Inc ---
		const ROLE_NAMES = [
			"Cashiers", // 0
			"Restocking Team", // 1
			"Deli & Meat", // 2
			"Janitor", // 3
			"Driver", // 4
			"Store Manager", // 5
			"Supplies Manager", // 6
			"Sanitation Manager", // 7
			"Operations Manager", // 8
			"Human Resources Head", // 9
			"General Manager", // 10
		];
		const role_ids = [];
		for (const ROLE_NAME of ROLE_NAMES) {
			const role = await prisma.role.create({
				data: {
					name: ROLE_NAME,
					businessUnitId: groceryStoreIncBU_id,
				},
			});
			role_ids.push(role.id);
		}
		console.log(`Regular Roles created: ${role_ids.length}`);

		// --- 4. Update Grocery Store Inc Business Unit Systems ---
		await prisma.businessUnit.update({
			where: {
				id: groceryStoreIncBU_id,
			},
			data: {
				// headsRoleId should be `headRoleId` if that's the field name in your schema
				// Your schema shows `headRoleId` (optional String) for BusinessUnit.
				// And `headsRole` (optional HeadsRole) for the relation.
				// It seems you want to link to the `HeadsRole` model.
				headsRoleId: financeHeadRole.id, // Assigning Finance Head to this BU
				approvalSystem: {
					[role_ids[0]]: [role_ids[5], role_ids[8], role_ids[10]], // Cashiers
					[role_ids[1]]: [role_ids[6], role_ids[5], role_ids[10]], // Restocking
					[role_ids[2]]: [role_ids[6], role_ids[5], role_ids[10]], // Deli & Meat
					[role_ids[3]]: [role_ids[7], role_ids[9]], // Janitor
					[role_ids[4]]: [role_ids[9]], // Driver
				},
				requisitionTemplates: {
					"General Repairs": {
						initiatorAccess: [role_ids[0], role_ids[1], role_ids[2], role_ids[3], role_ids[4]],
						values: [
							{ title: "Description", optional: false, default: "" },
							{
								title: "Items",
								optional: false,
								default: [
									{ name: "", quantity: 0, cost: 0, totalCost: 0, remark: "" },
									["name", "quantity", "cost", "totalCost", "remark"],
								],
							},
							{
								title: "People repair will benefit",
								optional: false,
								default: [{ name: "" }],
							},
							{ title: "Notes", optional: true, default: "" },
						],
					},
					"Restock Supplies": {
						initiatorAccess: [role_ids[2], role_ids[3], role_ids[4]],
						values: [
							{ title: "Description", optional: false, default: "" },
							{
								title: "Items",
								optional: false,
								default: [
									{ name: "", quantity: 0, cost: 0, totalCost: 0, remark: "" },
									["name", "quantity", "cost", "totalCost", "remark"],
								],
							},
							{ title: "Notes", optional: true, default: "" },
						],
					},
					"Restock Merchandise": {
						initiatorAccess: [role_ids[1], role_ids[2]],
						values: [
							{ title: "Details", optional: false, default: "" },
							{
								title: "Items",
								optional: false,
								default: [
									{
										name: "",
										brand: "",
										supplier: "",
										quantity: 0,
										cost: 0,
										totalCost: 0,
										remark: "",
									},
									["name", "brand", "supplier", "quantity", "cost", "totalCost", "remark"],
								],
							},
							{ title: "Notes", optional: true, default: "" },
						],
					},
				},
			},
		});
		console.log("Grocery Store Inc Business Unit updated with systems and roles.");

		// --- 5. Create Users with Roles and Accounts in Grocery Store Inc ---
		const created_regular_users = [];
		console.log("Creating regular users with roles and accounts...");

		//  Create a complete user for each role
		for (const roleId of role_ids) {
			const userEmail = faker.internet.email().toLowerCase();
			const name = faker.person.fullName();

			// Create the account and user using better-auth
			const account = await signUp.email({
				email: userEmail,
				name: name,
				password: "password",
			});

			// Update the user to have the role and business unit
			const user = await prisma.user.update({
				where: { id: account.data?.user.id },
				data: {
					businessUnit: {
						connect: { id: groceryStoreIncBU_id },
					},
					role: {
						connect: { id: roleId },
					},
				},
			});
			created_regular_users.push(user);
		}
		console.log(`Regular Users w/ roles & accounts created: ${created_regular_users.length}`);
		console.log("All data seeding operations completed.");
	} catch (e) {
		console.error("Error during population script:", e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		console.log("Disconnected from database.");
	}
}

main()
	.then(() => {
		console.log("Population script finished successfully.");
	})
	.catch((e) => {
		console.error("Unhandled error:", e); // Simplified catch
		process.exit(1);
	});
