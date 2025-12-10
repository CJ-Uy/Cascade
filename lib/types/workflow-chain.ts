/**
 * Types for Workflow Chaining System
 *
 * This module defines types for the workflow chaining feature that allows
 * workflows to trigger subsequent workflows upon completion, enabling
 * complex multi-stage approval processes.
 */

import type { Database } from "@/lib/database.types";

// ============================================================================
// Database Types (from Supabase schema)
// ============================================================================

export type WorkflowTriggerCondition =
  Database["public"]["Enums"]["workflow_trigger_condition"];

export type WorkflowTransition =
  Database["public"]["Tables"]["workflow_transitions"]["Row"];
export type WorkflowTransitionInsert =
  Database["public"]["Tables"]["workflow_transitions"]["Insert"];
export type WorkflowTransitionUpdate =
  Database["public"]["Tables"]["workflow_transitions"]["Update"];

export type WorkflowChainInstance =
  Database["public"]["Tables"]["workflow_chain_instances"]["Row"];
export type WorkflowChainInstanceInsert =
  Database["public"]["Tables"]["workflow_chain_instances"]["Insert"];
export type WorkflowChainInstanceUpdate =
  Database["public"]["Tables"]["workflow_chain_instances"]["Update"];

// ============================================================================
// Extended Types with Joins
// ============================================================================

/**
 * Workflow transition with full details including names and descriptions
 */
export interface WorkflowTransitionDetail {
  transition_id: string;
  source_workflow_id: string;
  source_workflow_name: string;
  target_workflow_id: string;
  target_workflow_name: string;
  target_template_id: string | null;
  target_template_name: string | null;
  trigger_condition: WorkflowTriggerCondition;
  initiator_role_id: string | null;
  initiator_role_name: string | null;
  auto_trigger: boolean;
  description: string | null;
  transition_order: number;
  created_at: string;
  created_by: string | null;
  creator_name: string | null;
}

/**
 * Available workflow that can be used as a target in a transition
 */
export interface AvailableTargetWorkflow {
  workflow_id: string;
  workflow_name: string;
  workflow_description: string | null;
  workflow_status: string;
  form_id: string | null;
  form_name: string | null;
  initiator_roles: Array<{ id: string; name: string }> | null;
  approval_steps: Array<{
    step_number: number;
    role_id: string;
    role_name: string;
  }> | null;
  would_create_circular: boolean;
}

/**
 * Template that can be used in a workflow transition
 */
export interface TransitionTemplate {
  template_id: string;
  template_name: string;
  template_description: string | null;
  template_icon: string | null;
  has_workflow: boolean;
}

/**
 * Workflow chain node for visualization
 */
export interface WorkflowChainNode {
  workflow_id: string;
  workflow_name: string;
  workflow_description: string | null;
  trigger_condition: WorkflowTriggerCondition | null;
  target_template_id: string | null;
  target_template_name: string | null;
  auto_trigger: boolean;
  initiator_role_id: string | null;
  initiator_role_name: string | null;
  approval_steps: Array<{
    step_number: number;
    role_id: string;
    role_name: string;
  }> | null;
  chain_depth: number;
}

/**
 * Requisition chain history entry
 */
export interface RequisitionChainHistory {
  chain_id: string;
  requisition_id: string;
  requisition_title: string;
  workflow_name: string | null;
  template_name: string | null;
  status: string;
  chain_depth: number;
  parent_requisition_id: string | null;
  transition_condition: WorkflowTriggerCondition | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// Form Types for UI
// ============================================================================

/**
 * Form data for creating a new workflow transition
 */
export interface WorkflowTransitionFormData {
  target_workflow_id: string;
  target_template_id: string | null;
  trigger_condition: WorkflowTriggerCondition;
  initiator_role_id: string | null;
  auto_trigger: boolean;
  description: string;
}

/**
 * Validation result from the server
 */
export interface TransitionValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// RPC Response Types
// ============================================================================

/**
 * Standard response format for workflow transition operations
 */
export interface WorkflowTransitionResponse {
  success: boolean;
  error?: string;
  message?: string;
  transition_id?: string;
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Props for workflow transition configuration component
 */
export interface WorkflowTransitionConfigProps {
  workflowId: string;
  businessUnitId: string;
  onTransitionCreated?: (transition: WorkflowTransitionDetail) => void;
  onTransitionDeleted?: (transitionId: string) => void;
}

/**
 * Props for workflow chain visualization component
 */
export interface WorkflowChainVisualizationProps {
  workflowId: string;
  onNodeClick?: (workflowId: string) => void;
}

/**
 * Props for add transition dialog
 */
export interface AddTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWorkflowId: string;
  businessUnitId: string;
  onSuccess: (transition: WorkflowTransitionDetail) => void;
}

// ============================================================================
// Trigger Condition Display Names
// ============================================================================

/**
 * Human-readable names for trigger conditions
 */
export const TRIGGER_CONDITION_LABELS: Record<
  WorkflowTriggerCondition,
  string
> = {
  APPROVED: "When Approved",
  REJECTED: "When Rejected",
  COMPLETED: "When Completed (Any Outcome)",
  FLAGGED: "When Flagged",
  NEEDS_CLARIFICATION: "When Clarification Requested",
};

/**
 * Descriptions for trigger conditions
 */
export const TRIGGER_CONDITION_DESCRIPTIONS: Record<
  WorkflowTriggerCondition,
  string
> = {
  APPROVED: "Trigger the next workflow when this workflow is fully approved",
  REJECTED: "Trigger the next workflow when this workflow is rejected",
  COMPLETED:
    "Trigger the next workflow when this workflow completes, regardless of outcome",
  FLAGGED: "Trigger the next workflow when this workflow is flagged for review",
  NEEDS_CLARIFICATION:
    "Trigger the next workflow when clarification is requested",
};

/**
 * Badge colors for trigger conditions (Tailwind classes)
 */
export const TRIGGER_CONDITION_COLORS: Record<
  WorkflowTriggerCondition,
  string
> = {
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  FLAGGED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  NEEDS_CLARIFICATION:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display label for a trigger condition
 */
export function getTriggerConditionLabel(
  condition: WorkflowTriggerCondition,
): string {
  return TRIGGER_CONDITION_LABELS[condition];
}

/**
 * Get description for a trigger condition
 */
export function getTriggerConditionDescription(
  condition: WorkflowTriggerCondition,
): string {
  return TRIGGER_CONDITION_DESCRIPTIONS[condition];
}

/**
 * Get color classes for a trigger condition badge
 */
export function getTriggerConditionColor(
  condition: WorkflowTriggerCondition,
): string {
  return TRIGGER_CONDITION_COLORS[condition];
}

/**
 * Format a workflow chain for display
 */
export function formatWorkflowChain(nodes: WorkflowChainNode[]): string {
  return nodes
    .map((node, index) => {
      if (index === 0) {
        return node.workflow_name;
      }
      const condition = node.trigger_condition
        ? getTriggerConditionLabel(node.trigger_condition)
        : "";
      return `${condition} → ${node.workflow_name}`;
    })
    .join(" ");
}

/**
 * Check if a transition is valid for creation
 */
export function isValidTransition(
  sourceWorkflowId: string,
  targetWorkflowId: string,
  availableTargets: AvailableTargetWorkflow[],
): { valid: boolean; error?: string } {
  if (sourceWorkflowId === targetWorkflowId) {
    return {
      valid: false,
      error: "Cannot create a transition to the same workflow",
    };
  }

  const target = availableTargets.find(
    (t) => t.workflow_id === targetWorkflowId,
  );
  if (!target) {
    return {
      valid: false,
      error: "Target workflow not found or not available",
    };
  }

  if (target.would_create_circular) {
    return {
      valid: false,
      error: "This transition would create a circular workflow chain",
    };
  }

  return { valid: true };
}
