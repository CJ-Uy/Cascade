import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/chat/[id]/participants - Get chat participants
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params.id;

    // Verify user is participant in this chat
    const { data: participant, error: participantError } = await supabase
      .from("chat_participants")
      .select("user_id")
      .eq("chat_id", chatId)
      .eq("user_id", user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get participants with profile info
    const { data: participants, error } = await supabase
      .from("chat_participants")
      .select(`
        user_id,
        last_read_at,
        profiles!chat_participants_user_id_fkey(
          first_name,
          last_name,
          image_url
        )
      `)
      .eq("chat_id", chatId);

    if (error) {
      console.error("Error fetching participants:", error);
      return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
    }

    // Transform participants
    const transformedParticipants = participants?.map(participant => ({
      userId: participant.user_id,
      lastReadAt: participant.last_read_at,
      name: `${participant.profiles?.first_name || ''} ${participant.profiles?.last_name || ''}`.trim(),
      avatar: participant.profiles?.image_url
    })) || [];

    return NextResponse.json({ participants: transformedParticipants });
  } catch (error) {
    console.error("Error in GET /api/chat/[id]/participants:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/chat/[id]/participants - Add participants to chat
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params.id;
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "Missing or invalid userIds" }, { status: 400 });
    }

    // Verify user is the chat creator
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("creator_id")
      .eq("id", chatId)
      .eq("creator_id", user.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Access denied - only chat creator can add participants" }, { status: 403 });
    }

    // Add participants
    const participants = userIds.map(userId => ({
      chat_id: chatId,
      user_id: userId
    }));

    const { error: participantsError } = await supabase
      .from("chat_participants")
      .insert(participants);

    if (participantsError) {
      console.error("Error adding participants:", participantsError);
      return NextResponse.json({ error: "Failed to add participants" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/chat/[id]/participants:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/chat/[id]/participants - Remove participant from chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatId = params.id;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    // Check if user is chat creator or removing themselves
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("creator_id")
      .eq("id", chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const isCreator = chat.creator_id === user.id;
    const isRemovingSelf = targetUserId === user.id;

    if (!isCreator && !isRemovingSelf) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Remove participant
    const { error: removeError } = await supabase
      .from("chat_participants")
      .delete()
      .eq("chat_id", chatId)
      .eq("user_id", targetUserId);

    if (removeError) {
      console.error("Error removing participant:", removeError);
      return NextResponse.json({ error: "Failed to remove participant" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/chat/[id]/participants:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
