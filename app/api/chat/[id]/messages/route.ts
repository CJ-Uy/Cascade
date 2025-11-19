import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/chat/[id]/messages - Get messages for a specific chat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

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

    // Get messages with sender info
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        profiles!chat_messages_sender_id_fkey(
          first_name,
          last_name,
          image_url
        )
      `,
      )
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    // Transform messages
    const transformedMessages =
      messages?.map((message) => {
        const profile = Array.isArray(message.profiles)
          ? message.profiles[0]
          : message.profiles;

        // Debug logging
        console.log("Message profile data:", {
          messageId: message.id,
          senderId: message.sender_id,
          profile: profile,
          profileType: typeof profile,
          isArray: Array.isArray(message.profiles),
        });

        return {
          id: message.id,
          content: message.content,
          createdAt: message.created_at,
          sender: {
            id: message.sender_id,
            name: profile
              ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                "Unknown User"
              : "Unknown User",
            avatar: profile?.image_url,
          },
        };
      }) || [];

    return NextResponse.json({ messages: transformedMessages });
  } catch (error) {
    console.error("Error in GET /api/chat/[id]/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/chat/[id]/messages - Send a message to a chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 },
      );
    }

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

    // Send message
    const { data: message, error } = await supabase
      .from("chat_messages")
      .insert({
        content: content.trim(),
        sender_id: user.id,
        chat_id: chatId,
      })
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        profiles!chat_messages_sender_id_fkey(
          first_name,
          last_name,
          image_url
        )
      `,
      )
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    // Update chat's updated_at timestamp
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", chatId);

    // Transform message
    const profile = Array.isArray(message.profiles)
      ? message.profiles[0]
      : message.profiles;
    const transformedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.created_at,
      sender: {
        id: message.sender_id,
        name: profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
            "Unknown User"
          : "Unknown User",
        avatar: profile?.image_url,
      },
    };

    return NextResponse.json({ message: transformedMessage });
  } catch (error) {
    console.error("Error in POST /api/chat/[id]/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
