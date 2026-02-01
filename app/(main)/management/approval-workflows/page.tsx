// app/(main)/management/approval-workflows/page.tsx
import { createClient } from "@/lib/supabase/server";
import { WorkflowTemplatesClient } from "./client";

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_locked: boolean;
  business_unit_id: string | null;
  organization_id: string;
};

async function getTemplates(): Promise<WorkflowTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_workflow_templates_for_user");
  if (error) {
    console.error("Error fetching workflow templates:", error);
    return [];
  }
  return data as WorkflowTemplate[];
}

async function getUserContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isOrgAdmin: false, organizationId: null };

  const { data: isOrgAdmin } = await supabase.rpc("is_organization_admin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return {
    isOrgAdmin: !!isOrgAdmin,
    organizationId: profile?.organization_id || null,
  };
}

export default async function WorkflowTemplatesPage() {
  const templates = await getTemplates();
  const { isOrgAdmin, organizationId } = await getUserContext();

  return (
    <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Approval Workflows
          </h2>
          <p className="text-muted-foreground">
            Create and manage approval workflows for your organization.
          </p>
        </div>
      </div>
      <WorkflowTemplatesClient
        data={templates}
        isOrgAdmin={isOrgAdmin}
        organizationId={organizationId}
      />
    </div>
  );
}
