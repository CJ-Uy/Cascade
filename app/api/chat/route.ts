import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/chat - Get user's chats
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's chats with participant count and last message
    const { data: chats, error } = await supabase
      .from("chats")
      .select(`
        id,
        chat_type,
        group_name,
        group_image_url,
        created_at,
        updated_at,
        creator_id,
        chat_participants!inner(user_id),
        chat_messages(
          id,
          content,
          created_at,
          sender_id,
          profiles!chat_messages_sender_id_fkey(first_name, last_name)
        )
      `)
      .eq("chat_participants.user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching chats:", error);
      return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }

    // Transform data to include participant count and last message
    const transformedChats = chats?.map(chat => ({
      id: chat.id,
      type: chat.chat_type,
      name: chat.group_name,
      image: chat.group_image_url,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      creatorId: chat.creator_id,
      participantCount: chat.chat_participants?.length || 0,
      lastMessage: chat.chat_messages?.[0] ? {
        id: chat.chat_messages[0].id,
        content: chat.chat_messages[0].content,
        createdAt: chat.chat_messages[0].created_at,
        sender: {
          id: chat.chat_messages[0].sender_id,
          name: `${chat.chat_messages[0].profiles?.first_name || ''} ${chat.chat_messages[0].profiles?.last_name || ''}`.trim()
        }
      } : null
    })) || [];

    return NextResponse.json({ chats: transformedChats });
  } catch (error) {
    console.error("Error in GET /api/chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/chat - Create a new group chat
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, participantIds } = body;

    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Add creator to participants
    const allParticipants = [...new Set([user.id, ...participantIds])];

    // Create the chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert({
        chat_type: "GROUP",
        group_name: name,
        creator_id: user.id
      })
      .select()
      .single();

    if (chatError) {
      console.error("Error creating chat:", chatError);
      return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
    }

    // Add participants
    const participants = allParticipants.map(userId => ({
      chat_id: chat.id,
      user_id: userId
    }));

    const { error: participantsError } = await supabase
      .from("chat_participants")
      .insert(participants);

    if (participantsError) {
      console.error("Error adding participants:", participantsError);
      return NextResponse.json({ error: "Failed to add participants" }, { status: 500 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Error in POST /api/chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}