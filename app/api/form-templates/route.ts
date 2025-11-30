// app/api/form-templates/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { data, error } = await supabase.rpc("get_form_templates_for_user");

  if (error) {
    console.error("Error fetching form templates:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch form templates" }),
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();

  // Basic validation
  if (!body.name || !body.organization_id) {
    return new NextResponse(
      JSON.stringify({ error: "Name and organization_id are required" }),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("form_templates")
    .insert({
      ...body,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating form template:", error);
    // The RLS policy will throw an error if the user doesn't have permission
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 403,
    });
  }

  return NextResponse.json(data);
}
