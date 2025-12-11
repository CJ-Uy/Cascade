// TypeScript types for workflow chains architecture (new)

import { Database } from "../database.types";

// Database table types
export type WorkflowChain =
  Database["public"]["Tables"]["workflow_chains"]["Row"];
export type WorkflowChainInsert =
  Database["public"]["Tables"]["workflow_chains"]["Insert"];
export type WorkflowChainUpdate =
  Database["public"]["Tables"]["workflow_chains"]["Update"];

export type WorkflowSection =
  Database["public"]["Tables"]["workflow_sections"]["Row"];
export type WorkflowSectionInsert =
  Database["public"]["Tables"]["workflow_sections"]["Insert"];
export type WorkflowSectionUpdate =
  Database["public"]["Tables"]["workflow_sections"]["Update"];

export type WorkflowSectionInitiator =
  Database["public"]["Tables"]["workflow_section_initiators"]["Row"];
export type WorkflowSectionStep =
  Database["public"]["Tables"]["workflow_section_steps"]["Row"];

// Enums
export type WorkflowChainStatus =
  Database["public"]["Enums"]["approval_workflow_status"];
export type TriggerCondition =
  | "WHEN_APPROVED"
  | "WHEN_REJECTED"
  | "WHEN_COMPLETED"
  | "WHEN_FLAGGED"
  | "WHEN_CLARIFICATION_REQUESTED";
export type InitiatorType = "last_approver" | "specific_role";

// Extended types with relationships

export type WorkflowSectionWithDetails = WorkflowSection & {
  initiators: string[]; // role IDs
  steps: string[]; // role IDs in order
};

export type WorkflowChainWithSections = WorkflowChain & {
  sections: WorkflowSectionWithDetails[];
};

export type WorkflowChainListItem = {
  id: string;
  name: string;
  description: string | null;
  business_unit_id: string;
  status: WorkflowChainStatus;
  version: number;
  parent_chain_id: string | null;
  is_latest: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  section_count: number;
  total_steps: number;
};

// Form types for creating/editing workflow chains

export type WorkflowSectionFormData = {
  id?: string;
  order: number;
  name: string;
  description?: string;
  formTemplateId?: string | null;
  initiators: string[]; // role IDs
  steps: string[]; // role IDs
  triggerCondition?: TriggerCondition;
  initiatorType?: InitiatorType;
  initiatorRoleId?: string | null;
  targetTemplateId?: string | null;
  autoTrigger?: boolean;
};

export type WorkflowChainFormData = {
  id?: string;
  name: string;
  description?: string;
  businessUnitId: string;
  sections: WorkflowSectionFormData[];
};

// RPC function return types

export type GetWorkflowChainsForBuResult = WorkflowChainListItem;

export type GetWorkflowChainDetailsResult = {
  id: string;
  name: string;
  description: string | null;
  businessUnitId: string;
  status: WorkflowChainStatus;
  version: number;
  parentChainId: string | null;
  isLatest: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    id: string;
    order: number;
    name: string;
    description: string | null;
    formTemplateId: string | null;
    triggerCondition: TriggerCondition | null;
    initiatorType: InitiatorType | null;
    initiatorRoleId: string | null;
    targetTemplateId: string | null;
    autoTrigger: boolean;
    initiators: string[];
    steps: string[];
  }>;
};
