export interface Approval {
	status: "PENDING" | "WAITING" | "APPROVED" | "REJECTED" | string; // string for future statuses
	comments: string[];
	approverId: string;
	approverRole: string;
}

export interface Item {
	cost: number;
	name: string;
	remark: string;
	quantity: number;
	totalCost: number;
	brand?: string;
	supplier?: string;
}

export interface PersonBenefit {
	name: string;
}

export interface RequisitionValues {
	items: Item[];
	notes?: string;
	description?: string;
	details?: string;
	people_repair_will_benefit?: PersonBenefit[];
}

export interface Initiator {
	id: string;
	createdAt: string;
	updatedAt: string;
	firstName: string | null;
	lastName: string | null;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	headsRoleId: string | null;
	active: boolean;
}

export interface BusinessUnitRequisitionTemplateValue {
	title: string;
	default: any;
	optional: boolean;
}

export interface BusinessUnitRequisitionTemplate {
	values: BusinessUnitRequisitionTemplateValue[];
	initiatorAccess: string[];
}

export interface BusinessUnit {
	id: string;
	createdAt: string;
	updatedAt: string;
	name: string;
	headsRoleId: string;
	requisitionTemplates: {
		[templateName: string]: BusinessUnitRequisitionTemplate;
	};
	approvalSystem: {
		[roleId: string]: string[];
	};
}

export interface Requisition {
	id: string;
	createdAt: string;
	updatedAt: string;
	userId: string;
	businessUnitId: string;
	templateName: "General Repair" | "Restock Merchandise" | "Restock Supplies" | string;
	stage: number;
	approvals: Approval[];
	values: RequisitionValues;
	initiator: Initiator;
	fromBU: BusinessUnit;
}
