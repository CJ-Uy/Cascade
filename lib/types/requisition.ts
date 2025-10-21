export interface ApprovalStep {
  step_number: number;
  role_name: string;
  approver_name: string | null;
  status:
    | "WAITING"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "NEEDS_CLARIFICATION"
    | "IN_REVISION"
    | "CANCELED";
}

export interface RequisitionValue {
  label: string;
  value: string;
  row_index?: number;
}

export interface RequisitionComment {
  id: string;
  created_at: string;
  content: string;
  action: string;
  author_name: string;
  attachments: RequisitionAttachment[];
}

export interface RequisitionAttachment {
  id: string;
  filename: string;
  filetype: string;
  storage_path: string;
  size_bytes: number;
}

export interface Requisition {
  id: string;
  title: string;
  formName: string;
  initiator: string;
  currentApprover: string;
  overallStatus:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "FLAGGED"
    | "DRAFT"
    | "CANCELED";
  currentStep: number;
  totalSteps: number;
  submittedDate: string;
  lastUpdated: string;
  approvalSteps: ApprovalStep[]; // New field for detailed approval steps
  values?: RequisitionValue[];
  comments?: RequisitionComment[];
}
