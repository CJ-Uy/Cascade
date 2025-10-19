import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/chat/users - Get users available for chat creation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const businessUnitId = searchParams.get("businessUnitId");

    // Build query for users
    let query = supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        image_url,
        status
      `)
      .eq("status", "ACTIVE")
      .neq("id", user.id); // Exclude current user

    // Add search filter if provided
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    // Filter by business unit if provided
    if (businessUnitId) {
      query = query.in("id", 
        supabase
          .from("user_business_units")
          .select("user_id")
          .eq("business_unit_id", businessUnitId)
      );
    }

    const { data: users, error } = await query
      .order("first_name")
      .limit(50);

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Transform users
    const transformedUsers = users?.map(user => ({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      avatar: user.image_url
    })) || [];

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error("Error in GET /api/chat/users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
