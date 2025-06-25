import { PrismaClient } from "../../src/generated/prisma/index.js";
import { faker } from "@faker-js/faker";
import { signUp } from "../../src/lib/auth-client.js"; // Assuming this path is correct

const prisma = new PrismaClient();

async function main() {
	console.log("🚀 Starting population script...");

	try {
		// --- 1. Create Global Roles (SYSTEM & AUDITOR) ---
		console.log("Creating Global Roles...");
		const ceoRole = await prisma.role.create({
			data: { name: "CEO", scope: "SYSTEM" },
		});
		const systemAdminRole = await prisma.role.create({
			data: { name: "System Administrator", scope: "SYSTEM" },
		});
		const auditorRole = await prisma.role.create({
			data: { name: "Auditor", scope: "AUDITOR" },
		});
		console.log("✅ Global Roles created.");

		// --- 2. Create Key Users (CEO, BU Head) ---
		console.log("Creating Key Users...");
		const { data: ceoAccount } = await signUp.email({
			email: "ceo@example.com",
			name: "Mr. CEO",
			password: "password",
		});
		await prisma.userRoleAssignment.create({
			data: { userId: ceoAccount!.user.id, roleId: ceoRole.id },
		});

		// Create the main user for the Grocery Store BU Head
		const { data: buHeadAccount } = await signUp.email({
			email: "bu.head@example.com",
			name: "Ms. Finance Head",
			password: "password",
		});
		await prisma.user.update({
			where: { id: buHeadAccount!.user.id },
			data: { status: "ACTIVE" },
		});
		console.log("✅ Key Users created.");

		// --- 3. Create Business Units and Assign Heads ---
		console.log("Creating Business Units...");
		await prisma.user.update({
			where: { id: buHeadAccount!.user.id },
			data: { status: "ACTIVE" },
		});

		// Create the first Business Unit and assign its head
		const groceryStoreBU = await prisma.businessUnit.create({
			data: {
				name: "Grocery Store Inc",
				headId: buHeadAccount!.user.id,
			},
		});

		// Create the second Business Unit, with the CEO as its head
		const corporateHqBU = await prisma.businessUnit.create({
			data: {
				name: "Corporate HQ",
				headId: ceoAccount!.user.id, // Assuming ceoAccount is available from Step 2
			},
		});
		console.log("✅ Business Units created.");

		// Create and assign the BU Admin role for the Grocery Store Head
		const financeHeadRole = await prisma.role.create({
			data: {
				name: "Finance Head",
				scope: "BU",
				isBUAdmin: true,
				businessUnitId: groceryStoreBU.id,
			},
		});

		// Assign the Grocery Store Head their role and membership
		await prisma.userBusinessUnit.create({
			data: {
				userId: buHeadAccount!.user.id,
				businessUnitId: groceryStoreBU.id,
				membershipType: "MEMBER", // They are a regular member of their own BU
			},
		});
		await prisma.userRoleAssignment.create({
			data: { userId: buHeadAccount!.user.id, roleId: financeHeadRole.id },
		});
		console.log("✅ Business Unit Heads assigned.");

		// --- 3.5. Create and Assign Auditor with Selective Access ---
		console.log("Creating Auditor and granting selective access...");

		// Create the auditor user
		const { data: auditorAccount } = await signUp.email({
			email: "auditor@example.com",
			name: "Mr. Audit",
			password: "password",
		});
		await prisma.user.update({
			where: { id: auditorAccount!.user.id },
			data: { status: "ACTIVE" },
		});

		// Assign the global AUDITOR role to the user
		await prisma.userRoleAssignment.create({
			data: {
				userId: auditorAccount!.user.id,
				roleId: auditorRole.id, // Assuming auditorRole is available from Step 1
			},
		});

		// Grant the auditor access ONLY to the Grocery Store BU, not Corporate HQ
		await prisma.userBusinessUnit.create({
			data: {
				userId: auditorAccount!.user.id,
				businessUnitId: groceryStoreBU.id,
				membershipType: "AUDITOR", // This is the key part that defines their access type!
			},
		});

		console.log("✅ Auditor created and assigned to 'Grocery Store Inc' for auditing.");

		// --- 4. Create Regular Roles within the Business Unit ---
		console.log("Creating regular BU roles...");
		const ROLE_NAMES = [
			"Cashier",
			"Restocking Team",
			"Deli & Meat",
			"Janitor",
			"Driver",
			"Store Manager",
			"Supplies Manager",
			"Sanitation Manager",
			"Operations Manager",
			"Human Resources",
			"General Manager",
		];
		const buRoles = [];
		for (const roleName of ROLE_NAMES) {
			const role = await prisma.role.create({
				data: { name: roleName, scope: "BU", businessUnitId: groceryStoreBU.id },
			});
			buRoles.push(role);
		}
		console.log(`✅ ${buRoles.length} regular BU roles created.`);

		// --- 5. Define and Create Approval Workflows ---
		console.log("Creating Approval Workflows...");
		const approvalFlows = [
			{
				name: "Standard Operations Flow",
				initiatorRole: buRoles[0],
				approvers: [buRoles[5], buRoles[8], buRoles[10]],
			}, // Cashier -> Store Mgr -> Ops Mgr -> Gen Mgr
			{
				name: "Supplies & Restocking Flow",
				initiatorRole: buRoles[1],
				approvers: [buRoles[6], buRoles[5], buRoles[10]],
			}, // Restocking -> Supplies Mgr -> Store Mgr -> Gen Mgr
			{ name: "Sanitation Flow", initiatorRole: buRoles[3], approvers: [buRoles[7], buRoles[9]] }, // Janitor -> Sanitation Mgr -> HR
			{ name: "Driver Flow", initiatorRole: buRoles[4], approvers: [buRoles[9]] }, // Driver -> HR
		];
		const workflowMap = new Map<string, string>(); // Map initiator role ID to workflow ID
		for (const flow of approvalFlows) {
			const workflow = await prisma.approvalWorkflow.create({ data: { name: flow.name } });
			workflowMap.set(flow.initiatorRole.id, workflow.id);
			for (let i = 0; i < flow.approvers.length; i++) {
				await prisma.approvalStepDefinition.create({
					data: {
						workflowId: workflow.id,
						stepNumber: i + 1,
						approverRoleId: flow.approvers[i].id,
					},
				});
			}
		}
		console.log(`✅ ${workflowMap.size} Approval Workflows created.`);

		// --- 6. Define and Create Requisition Templates ---
		console.log("Creating Requisition Templates...");

		// --- Template 1: General Repairs ---
		const generalRepairsTemplate = await prisma.requisitionTemplate.create({
			data: {
				name: "General Repairs",
				description: "For reporting and requesting general store maintenance and repairs.",
				businessUnitId: groceryStoreBU.id,
				approvalWorkflowId: workflowMap.get(buRoles[0].id), // Cashier's flow
			},
		});

		// Fields for "General Repairs"
		await prisma.templateField.create({
			data: {
				templateId: generalRepairsTemplate.id,
				label: "Description",
				fieldType: "TEXT_AREA",
				order: 1,
				isRequired: true,
			},
		});

		const repairsItemsList = await prisma.templateField.create({
			data: {
				templateId: generalRepairsTemplate.id,
				label: "Items",
				fieldType: "LIST",
				order: 2,
				isRequired: true,
			},
		});
		// Columns for the list
		await prisma.templateField.createMany({
			data: [
				{
					templateId: generalRepairsTemplate.id,
					label: "Name",
					fieldType: "TEXT",
					order: 1,
					parentListFieldId: repairsItemsList.id,
				},
				{
					templateId: generalRepairsTemplate.id,
					label: "Quantity",
					fieldType: "NUMBER",
					order: 2,
					parentListFieldId: repairsItemsList.id,
				},
				{
					templateId: generalRepairsTemplate.id,
					label: "Cost",
					fieldType: "CURRENCY",
					order: 3,
					parentListFieldId: repairsItemsList.id,
				},
				{
					templateId: generalRepairsTemplate.id,
					label: "Total Cost",
					fieldType: "CURRENCY",
					order: 4,
					parentListFieldId: repairsItemsList.id,
				},
				{
					templateId: generalRepairsTemplate.id,
					label: "Remark",
					fieldType: "TEXT",
					order: 5,
					parentListFieldId: repairsItemsList.id,
				},
			],
		});

		const peopleBenefitList = await prisma.templateField.create({
			data: {
				templateId: generalRepairsTemplate.id,
				label: "People repair will benefit",
				fieldType: "LIST",
				order: 3,
				isRequired: true,
			},
		});
		// Column for this simple list
		await prisma.templateField.create({
			data: {
				templateId: generalRepairsTemplate.id,
				label: "Name",
				fieldType: "TEXT",
				order: 1,
				parentListFieldId: peopleBenefitList.id,
			},
		});

		await prisma.templateField.create({
			data: {
				templateId: generalRepairsTemplate.id,
				label: "Notes",
				fieldType: "TEXT_AREA",
				order: 4,
				isRequired: false,
			},
		});

		// Set initiator access for "General Repairs"
		await prisma.templateInitiatorAccess.createMany({
			data: [buRoles[0], buRoles[1], buRoles[2], buRoles[3], buRoles[4]].map((role) => ({
				templateId: generalRepairsTemplate.id,
				roleId: role.id,
			})),
		});
		console.log('✅ Template "General Repairs" created.');

		// --- Template 2: Restock Supplies ---
		const restockSuppliesTemplate = await prisma.requisitionTemplate.create({
			data: {
				name: "Restock Supplies",
				description: "Request to restock non-merchandise supplies (e.g., cleaning, office).",
				businessUnitId: groceryStoreBU.id,
				approvalWorkflowId: workflowMap.get(buRoles[3].id), // Janitor's sanitation flow
			},
		});

		// Fields for "Restock Supplies"
		await prisma.templateField.create({
			data: {
				templateId: restockSuppliesTemplate.id,
				label: "Description",
				fieldType: "TEXT_AREA",
				order: 1,
				isRequired: true,
			},
		});

		const suppliesItemsList = await prisma.templateField.create({
			data: {
				templateId: restockSuppliesTemplate.id,
				label: "Items",
				fieldType: "LIST",
				order: 2,
				isRequired: true,
			},
		});
		// Columns for the list
		await prisma.templateField.createMany({
			data: [
				{
					templateId: restockSuppliesTemplate.id,
					label: "Name",
					fieldType: "TEXT",
					order: 1,
					parentListFieldId: suppliesItemsList.id,
				},
				{
					templateId: restockSuppliesTemplate.id,
					label: "Quantity",
					fieldType: "NUMBER",
					order: 2,
					parentListFieldId: suppliesItemsList.id,
				},
				{
					templateId: restockSuppliesTemplate.id,
					label: "Cost",
					fieldType: "CURRENCY",
					order: 3,
					parentListFieldId: suppliesItemsList.id,
				},
				{
					templateId: restockSuppliesTemplate.id,
					label: "Total Cost",
					fieldType: "CURRENCY",
					order: 4,
					parentListFieldId: suppliesItemsList.id,
				},
				{
					templateId: restockSuppliesTemplate.id,
					label: "Remark",
					fieldType: "TEXT",
					order: 5,
					parentListFieldId: suppliesItemsList.id,
				},
			],
		});

		await prisma.templateField.create({
			data: {
				templateId: restockSuppliesTemplate.id,
				label: "Notes",
				fieldType: "TEXT_AREA",
				order: 3,
				isRequired: false,
			},
		});

		// Set initiator access for "Restock Supplies"
		await prisma.templateInitiatorAccess.createMany({
			data: [buRoles[2], buRoles[3], buRoles[4]].map((role) => ({
				templateId: restockSuppliesTemplate.id,
				roleId: role.id,
			})),
		});
		console.log('✅ Template "Restock Supplies" created.');

		// --- Template 3: Restock Merchandise ---
		const restockMerchTemplate = await prisma.requisitionTemplate.create({
			data: {
				name: "Restock Merchandise",
				description: "Request to restock sellable merchandise for the store floor.",
				businessUnitId: groceryStoreBU.id,
				approvalWorkflowId: workflowMap.get(buRoles[1].id), // Restocking Team's flow
			},
		});

		// Fields for "Restock Merchandise"
		await prisma.templateField.create({
			data: {
				templateId: restockMerchTemplate.id,
				label: "Details",
				fieldType: "TEXT_AREA",
				order: 1,
				isRequired: true,
			},
		});

		const merchItemsList = await prisma.templateField.create({
			data: {
				templateId: restockMerchTemplate.id,
				label: "Items",
				fieldType: "LIST",
				order: 2,
				isRequired: true,
			},
		});
		// Columns for this more detailed list
		await prisma.templateField.createMany({
			data: [
				{
					templateId: restockMerchTemplate.id,
					label: "Name",
					fieldType: "TEXT",
					order: 1,
					parentListFieldId: merchItemsList.id,
				},
				{
					templateId: restockMerchTemplate.id,
					label: "Brand",
					fieldType: "TEXT",
					order: 2,
					parentListFieldId: merchItemsList.id,
				},
				{
					templateId: restockMerchTemplate.id,
					label: "Supplier",
					fieldType: "TEXT",
					order: 3,
					parentListFieldId: merchItemsList.id,
				},
				{
					templateId: restockMerchTemplate.id,
					label: "Quantity",
					fieldType: "NUMBER",
					order: 4,
					parentListFieldId: merchItemsList.id,
				},
				{
					templateId: restockMerchTemplate.id,
					label: "Cost",
					fieldType: "CURRENCY",
					order: 5,
					parentListFieldId: merchItemsList.id,
				},
				{
					templateId: restockMerchTemplate.id,
					label: "Total Cost",
					fieldType: "CURRENCY",
					order: 6,
					parentListFieldId: merchItemsList.id,
				},
				{
					templateId: restockMerchTemplate.id,
					label: "Remark",
					fieldType: "TEXT",
					order: 7,
					parentListFieldId: merchItemsList.id,
				},
			],
		});

		await prisma.templateField.create({
			data: {
				templateId: restockMerchTemplate.id,
				label: "Notes",
				fieldType: "TEXT_AREA",
				order: 3,
				isRequired: false,
			},
		});

		// Set initiator access for "Restock Merchandise"
		await prisma.templateInitiatorAccess.createMany({
			data: [buRoles[1], buRoles[2]].map((role) => ({
				templateId: restockMerchTemplate.id,
				roleId: role.id,
			})),
		});
		console.log('✅ Template "Restock Merchandise" created.');

		// --- 7. Create Regular Users and Assign Roles ---
		console.log("Creating regular users and assigning roles...");
		for (const role of buRoles) {
			const userEmail = faker.internet.email().toLowerCase();
			const name = faker.person.fullName();

			const { data: account } = await signUp.email({
				email: userEmail,
				name,
				password: "password",
			});
			await prisma.user.update({
				where: { id: account!.user.id },
				data: { status: "ACTIVE" },
			});

			// Link user to BU
			await prisma.userBusinessUnit.create({
				data: { userId: account!.user.id, businessUnitId: groceryStoreBU.id },
			});
			// Assign user their role
			await prisma.userRoleAssignment.create({
				data: { userId: account!.user.id, roleId: role.id },
			});
		}
		console.log(`✅ ${buRoles.length} regular users created and assigned.`);

		console.log("🎉 Population script finished successfully! 🎉");
	} catch (e) {
		console.error("❌ Error during population script:", e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		console.log("🔌 Disconnected from database.");
	}
}

main().catch((e) => {
	console.error("Unhandled error in main execution:", e);
	process.exit(1);
});
