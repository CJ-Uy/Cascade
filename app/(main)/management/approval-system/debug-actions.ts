"use server";

import { createClient } from "@/lib/supabase/server";

export async function debugReimbursementWorkflow() {
  const supabase = await createClient();

  const results: Record<string, any> = {};

  // 1. Get recent reimbursement form requests
  const { data: requests } = await supabase
    .from("requests")
    .select(
      `
      id,
      status,
      current_section_order,
      parent_request_id,
      root_request_id,
      created_at,
      workflow_chains(name),
      profiles(email)
    `,
    )
    .eq("form_id", "e2c097f9-f39c-4cf7-8a2f-66f028e070fb")
    .order("created_at", { ascending: false })
    .limit(5);

  results.requests = requests;

  // 2. Check for recent notifications about sections
  const { data: notifications } = await supabase
    .from("notifications")
    .select(
      `
      id,
      created_at,
      message,
      link_url,
      is_read,
      profiles(email)
    `,
    )
    .or("message.ilike.%Section%,message.ilike.%Funds Release%")
    .order("created_at", { ascending: false })
    .limit(10);

  results.notifications = notifications;

  // 3. Get workflow configuration
  const { data: workflowConfig } = await supabase
    .from("workflow_chains")
    .select(
      `
      id,
      name,
      workflow_sections(
        section_order,
        section_name,
        forms(name, id)
      )
    `,
    )
    .ilike("name", "%Purchase Order%");

  results.workflowConfig = workflowConfig;

  // 4. Check Checker C's roles
  const { data: checkerCProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "approvera3@email.com")
    .single();

  if (checkerCProfile) {
    const { data: checkerCRoles } = await supabase
      .from("user_role_assignments")
      .select(
        `
        roles(
          id,
          name,
          is_bu_admin,
          business_units(name)
        )
      `,
      )
      .eq("user_id", checkerCProfile.id);

    results.checkerCRoles = checkerCRoles;
  }

  // 5. Get Section 2 initiator roles for Purchase Order workflow
  if (workflowConfig && workflowConfig.length > 0) {
    const workflowId = workflowConfig[0].id;

    const { data: section2 } = await supabase
      .from("workflow_sections")
      .select("id")
      .eq("chain_id", workflowId)
      .gte("section_order", 1)
      .order("section_order")
      .limit(1);

    if (section2 && section2.length > 0) {
      const { data: initiators } = await supabase
        .from("workflow_section_initiators")
        .select(
          `
          roles(
            id,
            name
          )
        `,
        )
        .eq("section_id", section2[0].id);

      results.section2Initiators = initiators;
    }
  }

  return results;
}

export async function manuallyTriggerNextSection(requestId: string) {
  const supabase = await createClient();

  // Call the trigger_next_section RPC function
  const { data, error } = await supabase.rpc("trigger_next_section", {
    p_current_request_id: requestId,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    result: data,
  };
}

export async function checkRequestApprovalStatus(requestId: string) {
  const supabase = await createClient();

  // Get request details
  const { data: request } = await supabase
    .from("requests")
    .select(
      `
      id,
      status,
      current_section_order,
      workflow_chain_id,
      forms(name),
      workflow_chains(name)
    `,
    )
    .eq("id", requestId)
    .single();

  if (!request) {
    return { error: "Request not found" };
  }

  // Count approvals
  const { data: approvals } = await supabase
    .from("request_history")
    .select("id")
    .eq("request_id", requestId)
    .eq("action", "APPROVE");

  // Get total steps for current section
  const { data: section } = await supabase
    .from("workflow_sections")
    .select(
      `
      id,
      section_order,
      section_name,
      workflow_section_steps(id)
    `,
    )
    .eq("chain_id", request.workflow_chain_id)
    .eq("section_order", request.current_section_order)
    .single();

  const approvalCount = approvals?.length || 0;
  const totalSteps = section?.workflow_section_steps?.length || 0;

  return {
    request,
    section,
    approvalCount,
    totalSteps,
    isComplete: approvalCount >= totalSteps,
  };
}

export async function getNotificationsForUser(email: string) {
  const supabase = await createClient();

  // Get user ID from email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (!profile) {
    return { error: "User not found" };
  }

  // Get notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select(
      `
      id,
      message,
      link_url,
      is_read,
      created_at
    `,
    )
    .eq("recipient_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return { notifications };
}

export async function checkSectionInitiators(workflowChainId: string) {
  const supabase = await createClient();

  // Get all sections with their initiator roles
  const { data: sections } = await supabase
    .from("workflow_sections")
    .select(
      `
      id,
      section_order,
      section_name,
      workflow_section_initiators(
        role_id,
        roles(
          id,
          name,
          business_unit_id,
          business_units(name)
        )
      )
    `,
    )
    .eq("chain_id", workflowChainId)
    .order("section_order");

  return { sections };
}

export async function debugSectionInitiatorUsers(
  requestId: string,
  sectionOrder: number,
) {
  const supabase = await createClient();

  // Get request details
  const { data: request } = await supabase
    .from("requests")
    .select(
      `
      id,
      business_unit_id,
      workflow_chain_id,
      business_units(name)
    `,
    )
    .eq("id", requestId)
    .single();

  if (!request) {
    return { error: "Request not found" };
  }

  // Get the section
  const { data: section } = await supabase
    .from("workflow_sections")
    .select("id, section_name")
    .eq("chain_id", request.workflow_chain_id)
    .eq("section_order", sectionOrder)
    .single();

  if (!section) {
    return { error: "Section not found" };
  }

  // Get initiator roles for this section
  const { data: initiatorRoles } = await supabase
    .from("workflow_section_initiators")
    .select(
      `
      role_id,
      roles(
        id,
        name,
        business_unit_id,
        business_units(name)
      )
    `,
    )
    .eq("section_id", section.id);

  // Get users with these roles
  const roleIds = initiatorRoles?.map((ir: any) => ir.role_id) || [];

  const { data: usersWithRoles } = await supabase
    .from("user_role_assignments")
    .select(
      `
      user_id,
      role_id,
      roles(
        id,
        name,
        business_unit_id
      ),
      profiles(
        email,
        first_name,
        last_name
      )
    `,
    )
    .in("role_id", roleIds);

  // Filter users whose roles match the business unit
  const matchingUsers =
    usersWithRoles?.filter(
      (u: any) => u.roles.business_unit_id === request.business_unit_id,
    ) || [];

  return {
    request: {
      id: request.id,
      business_unit_id: request.business_unit_id,
      business_unit_name: (request.business_units as any)?.name,
    },
    section: {
      id: section.id,
      name: section.section_name,
      order: sectionOrder,
    },
    initiatorRoles,
    allUsersWithRoles: usersWithRoles,
    matchingUsers,
    summary: {
      total_initiator_roles: initiatorRoles?.length || 0,
      total_users_with_roles: usersWithRoles?.length || 0,
      matching_users_count: matchingUsers.length,
    },
  };
}
