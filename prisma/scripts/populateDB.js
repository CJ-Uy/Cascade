import { PrismaClient } from "../../src/generated/prisma/index.js";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
	try {
		// Create the Business Units
		const BU_NAMES = ["Grocery Store Inc", "Business 2", "Business 3"];
		const BUs = [];
		for (const BU_NAME of BU_NAMES) {
			BUs.push(
				await prisma.businessUnit.create({
					data: {
						name: BU_NAME,
						approvalSystem: {},
						requisitionTemplates: {},
					},
				}),
			);
		}
		console.log("Business Units created: ", BUs.length);
		const BU_id = BUs[0].id;

		// Create Head Roles in Grocery Store Inc
		const bu_head_role_id = (
			await prisma.headsRole.create({
				data: {
					name: "Finance Head",
					isAkivaApprover: false,
					businessUnit: {
						connect: [{ id: BU_id }],
					},
				},
			})
		).id;
		console.log("Business Units Finance Head Role Created");
		await prisma.user.create({
			data: {
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				email: faker.internet.email(),
				emailVerified: false,
				name: faker.internet.username(),
				headsRoleId: bu_head_role_id,
			},
		});
		console.log("Business Units Finance Head User Created");

		// Create Akiva Approver Role
		const akiva_approver_role_id = (
			await prisma.headsRole.create({
				data: {
					name: "CEO",
					isAkivaApprover: true,
				},
			})
		).id;
		console.log("CEO Role Created");
		await prisma.user.create({
			data: {
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				email: faker.internet.email(),
				emailVerified: false,
				name: faker.internet.username(),
				headsRoleId: akiva_approver_role_id,
			},
		});
		console.log("CEO User Created");

		// Create Roles in Grocery Store Inc
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
		const roles = [];
		for (const ROLE_NAME of ROLE_NAMES) {
			roles.push(
				(
					await prisma.role.create({
						data: {
							name: ROLE_NAME,
							businessUnitId: BU_id,
						},
					})
				).id,
			);
		}
		console.log("Roles created: ", roles.length);

		// Update Business Unit Systems
		await prisma.businessUnit.update({
			where: {
				id: BU_id,
			},
			data: {
				headRoleId: roles[11],
				approvalSystem: {
					[roles[0]]: [roles[5], roles[8], roles[10]],
					[roles[1]]: [roles[6], roles[5], roles[10]],
					[roles[2]]: [roles[6], roles[5], roles[10]],
					[roles[3]]: [roles[7], roles[9]],
					[roles[4]]: [roles[9]],
				},
				requisitionTemplates: {
					"General Repairs": {
						initiatorAccess: [roles[0], roles[1], roles[2], roles[3], roles[4]],
						values: [
							{
								title: "Description",
								optional: false,
								default: "",
							},
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
							{
								title: "Notes",
								optional: true,
								default: "",
							},
						],
					},
					"Restock Supplies": {
						initiatorAccess: [roles[2], roles[3], roles[4]],
						values: [
							{
								title: "Description",
								optional: false,
								default: "",
							},
							{
								title: "Items",
								optional: false,
								default: [
									{ name: "", quantity: 0, cost: 0, totalCost: 0, remark: "" },
									["name", "quantity", "cost", "totalCost", "remark"],
								],
							},
							{
								title: "Notes",
								optional: true,
								default: "",
							},
						],
					},
					"Restock Merchandise": {
						initiatorAccess: [roles[1], roles[2]],
						values: [
							{
								title: "Details",
								optional: false,
								default: "",
							},
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
							{
								title: "Notes",
								optional: true,
								default: "",
							},
						],
					},
				},
			},
		});
		console.log("Business Unit updated w/ roles");

		// Create Users connected to business units and roles
		const users = [];
		for (const role of roles) {
			users.push(
				await prisma.user.create({
					data: {
						firstName: faker.person.firstName(),
						lastName: faker.person.lastName(),
						email: faker.internet.email(),
						emailVerified: false,
						name: faker.internet.username(),
						businessUnit: {
							connect: [{ id: BU_id }],
						},
						role: {
							connect: [{ id: role }],
						},
					},
				}),
			);
		}
		console.log("Users w/ roles created: ", users.length);
	} catch (e) {
		console.error(e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
		console.log("Disconnected from database.");
	}
}

main();
