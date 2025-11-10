import { NextRequest, NextResponse } from "next/server";
import { adminDbHelpers } from "@/lib/supabase-admin";
import { type Database } from "@/lib/supabase-types";

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

type ChatRow = Database["public"]["Tables"]["chats"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

async function resolveUser(walletAddress: string): Promise<UserRow> {
  const user = await adminDbHelpers.getOrCreateUser(walletAddress);
  return user as UserRow;
}

async function ensureChatOwnership(chatId: string, userId: string): Promise<ChatRow | null> {
  const chat = await adminDbHelpers.getChatById(chatId);
  if (!chat || chat.user_id !== userId) {
    return null;
  }
  return chat as ChatRow;
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { chatId } = await context.params;
  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
  }

  const walletAddress = request.nextUrl.searchParams.get("walletAddress");
  if (!walletAddress) {
    return NextResponse.json(
      { error: "walletAddress query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const user = await resolveUser(walletAddress);
    const chat = await ensureChatOwnership(chatId, user.id);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await adminDbHelpers.deleteChat(chatId, user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[api] chat delete failed", error);
    return NextResponse.json(
      {
        error: "Unable to delete chat",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { chatId } = await context.params;
  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = (payload ?? {}) as {
    walletAddress?: string;
    title?: string;
  };

  const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress : null;
  const rawTitle = typeof body.title === "string" ? body.title : "";
  const normalizedTitle = rawTitle.replace(/\s+/g, " ").trim();

  if (!walletAddress) {
    return NextResponse.json(
      { error: "walletAddress is required" },
      { status: 400 }
    );
  }

  if (!normalizedTitle) {
    return NextResponse.json(
      { error: "Title cannot be empty" },
      { status: 422 }
    );
  }

  if (normalizedTitle.length > 120) {
    return NextResponse.json(
      { error: "Title is too long. Please keep it under 120 characters." },
      { status: 422 }
    );
  }

  try {
    const user = await resolveUser(walletAddress);
    const chat = await ensureChatOwnership(chatId, user.id);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const updatedChat = await adminDbHelpers.updateChatTitle(
      chatId,
      user.id,
      normalizedTitle
    );

    return NextResponse.json({ chat: updatedChat });
  } catch (error) {
    console.error("[api] chat update failed", error);
    return NextResponse.json(
      {
        error: "Unable to update chat",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
