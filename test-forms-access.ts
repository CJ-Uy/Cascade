// Test script to debug form access for initiatora1@email.com
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kkkzxvokknkcxrbmzecn.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseServiceKey) {
  console.error("SUPABASE_SERVICE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugFormsAccess() {
  console.log("\n=== DEBUGGING FORM ACCESS FOR initiatora1@email.com ===\n");

  // 1. Check if user exists
  console.log("1. User Check:");
  const { data: user } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", "initiatora1@email.com")
    .single();

  if (!user) {
    console.log("❌ User not found!");
    return;
  }
  console.log("✅ User found:", user);

  // 2. Get user's roles
  console.log("\n2. User Roles:");
  const { data: userRoles } = await supabase
    .from("user_role_assignments")
    .select(
      `
      role_id,
      roles!inner(
        id,
        name,
        scope,
        business_unit_id
      )
    `,
    )
    .eq("user_id", user.id);

  console.log("User has roles:", userRoles);

  // 3. Check all active forms
  console.log("\n3. All Active Forms:");
  const { data: activeForms } = await supabase
    .from("forms")
    .select(
      "id, name, description, status, scope, business_unit_id, organization_id",
    )
    .eq("status", "active")
    .order("name");

  console.log(`Found ${activeForms?.length || 0} active forms:`, activeForms);

  // 4. Check form_initiator_access
  console.log("\n4. Form Initiator Access:");
  const { data: formAccess } = await supabase.from("form_initiator_access")
    .select(`
      form_id,
      role_id,
      forms!inner(name, status),
      roles!inner(name)
    `);

  console.log("Form initiator access entries:", formAccess);

  // 5. Call the RPC function
  console.log("\n5. RPC Function Result (get_initiatable_forms):");
  const { data: initiatableForms, error: rpcError } = await supabase.rpc(
    "get_initiatable_forms",
    { p_user_id: user.id },
  );

  if (rpcError) {
    console.log("❌ RPC Error:", rpcError);
  } else {
    console.log(
      `✅ User can initiate ${initiatableForms?.length || 0} forms:`,
      initiatableForms,
    );
  }

  // 6. Check workflow mappings
  console.log("\n6. Workflow Form Mappings:");
  const { data: workflowMappings } = await supabase.from(
    "workflow_form_mappings",
  ).select(`
      form_id,
      workflow_chain_id,
      is_primary,
      forms!inner(name, status),
      workflow_chains(name)
    `);

  console.log("Workflow mappings:", workflowMappings);

  console.log("\n=== DEBUG COMPLETE ===\n");
}

debugFormsAccess().catch(console.error);
