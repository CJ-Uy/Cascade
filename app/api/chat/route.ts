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
    const transformedChats = await Promise.all(chats?.map(async (chat) => {
      // Get actual participant count for this chat
      const { count } = await supabase
        .from("chat_participants")
        .select("*", { count: "exact", head: true })
        .eq("chat_id", chat.id);

      // For private chats, get the other participant's name
      let chatName = chat.group_name;
      let chatImage = chat.group_image_url;
      
      if (chat.chat_type === 'PRIVATE') {
        // Get the other participant (not the current user)
        const { data: otherParticipant } = await supabase
          .from("chat_participants")
          .select(`
            user_id,
            profiles!chat_participants_user_id_fkey(
              first_name,
              last_name,
              image_url
            )
          `)
          .eq("chat_id", chat.id)
          .neq("user_id", user.id)
          .single();
        
        if (otherParticipant?.profiles) {
          chatName = `${otherParticipant.profiles.first_name || ''} ${otherParticipant.profiles.last_name || ''}`.trim();
          chatImage = otherParticipant.profiles.image_url;
        }
      }

      return {
        id: chat.id,
        type: chat.chat_type,
        name: chatName,
        image: chatImage,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        creatorId: chat.creator_id,
        participantCount: count || 0,
        lastMessage: chat.chat_messages?.[0] ? {
          id: chat.chat_messages[0].id,
          content: chat.chat_messages[0].content,
          createdAt: chat.chat_messages[0].created_at,
          sender: {
            id: chat.chat_messages[0].sender_id,
            name: `${chat.chat_messages[0].profiles?.[0]?.first_name || ''} ${chat.chat_messages[0].profiles?.[0]?.last_name || ''}`.trim()
          }
        } : null
      };
    }) || []);

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
    const { name, participantIds, isPrivate = false } = body;

    // For group chats, name is required. For private chats, it's optional
    if (!isPrivate && !name) {
      return NextResponse.json({ error: "Group chat name is required" }, { status: 400 });
    }
    
    if (!participantIds || !Array.isArray(participantIds)) {
      return NextResponse.json({ error: "Missing participant IDs" }, { status: 400 });
    }

    // For private chats, ensure only 1 other participant
    if (isPrivate && participantIds.length !== 1) {
      return NextResponse.json({ error: "Private chats must have exactly 1 participant" }, { status: 400 });
    }

    // Add creator to participants
    const allParticipants = [...new Set([user.id, ...participantIds])];

    // Create the chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert({
        chat_type: isPrivate ? "PRIVATE" : "GROUP",
        group_name: isPrivate ? null : name, // Private chats don't need a group name
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

    // Transform the created chat to include proper name for private chats
    let chatName = chat.group_name;
    let chatImage = chat.group_image_url;
    
    if (isPrivate) {
      // Get the other participant's name for private chats
      const { data: otherParticipant } = await supabase
        .from("profiles")
        .select("first_name, last_name, image_url")
        .eq("id", participantIds[0])
        .single();
      
      if (otherParticipant) {
        chatName = `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim();
        chatImage = otherParticipant.image_url;
      }
    }

    const transformedChat = {
      id: chat.id,
      type: chat.chat_type,
      name: chatName,
      image: chatImage,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
      creatorId: chat.creator_id,
      participantCount: allParticipants.length,
      lastMessage: null
    };

    return NextResponse.json({ chat: transformedChat });
  } catch (error) {
    console.error("Error in POST /api/chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}