// app/api/workflow-templates/[id]/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const templateId = params.id;

  if (!user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { data, error } = await supabase.rpc("get_workflow_template_by_id", {
    p_template_id: templateId,
  });

  if (error) {
    console.error("Error fetching workflow template:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch workflow template" }),
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return new NextResponse(JSON.stringify({ error: "Not Found" }), {
      status: 404,
    });
  }

  return NextResponse.json(data[0]);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const templateId = params.id;

  if (!user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();

  // Ensure created_by and other sensitive fields are not updated from the body
  delete body.created_by;
  delete body.id;
  delete body.organization_id;

  const { data, error } = await supabase
    .from("workflow_templates")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .select()
    .single();

  if (error) {
    console.error("Error updating workflow template:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 403,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const templateId = params.id;

  if (!user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { error } = await supabase
    .from("workflow_templates")
    .delete()
    .eq("id", templateId);

  if (error) {
    console.error("Error deleting workflow template:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 403,
    });
  }

  return new NextResponse(null, { status: 204 });
}
