import { prisma } from "@/app/utils/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
	const data = await request.json();

	// Get user data
	const userData = await prisma.user.findFirst({
		where: {
			id: data.id,
		},
		include: {
			businessUnit: {
				select: {
					id: true,
					name: true,
					approvalSystem: true,
				},
			},
			role: {
				select: {
					id: true,
					name: true,
				},
			},
			headsRole: {
				select: {
					id: true,
					name: true,
					isAkivaApprover: true,
				},
			},
		},
	});

	// Determine the site role
	let site_role = "";
	if (userData.headsRole != null) {
		if (userData.headsRole.isAkivaApprover) {
			site_role = "akiva-approver";
		} else {
			site_role = "bu-head";
		}
	} else {
		site_role = calculateApproverAndOrInitator(userData);
	}

	// Assemble final userData
	for (let i = 0; i < userData.businessUnit.length; i++) {
		delete userData.businessUnit[i].approvalSystem;
	}
	userData["siteRole"] = site_role;

	return NextResponse.json(userData);
}

function calculateApproverAndOrInitator(user) {
	if (!user || !user.role || user.role.length === 0) {
		return "unknown (no role info)";
	}
	if (!user.businessUnit || user.businessUnit.length === 0) {
		return "unknown (no business unit info)";
	}

	const userRoleId = user.role[0].id;
	const businessUnit = user.businessUnit[0];
	const approvalSystem = businessUnit.approvalSystem || {};

	let isInitiator = false;
	let isApprover = false;

	if (Object.keys(approvalSystem).includes(userRoleId)) {
		isInitiator = true;
	}

	for (const approverList of Object.values(approvalSystem)) {
		if (Array.isArray(approverList) && approverList.includes(userRoleId)) {
			isApprover = true;
			break;
		}
	}

	if (isInitiator && isApprover) {
		return "approver-initiator";
	} else if (isInitiator) {
		return "initiator";
	} else if (isApprover) {
		return "approver";
	}

	return "something went wrong";
}
