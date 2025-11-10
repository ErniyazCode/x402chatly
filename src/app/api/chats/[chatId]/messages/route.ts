import { NextRequest, NextResponse } from "next/server";
import { adminDbHelpers } from "@/lib/supabase-admin";
import { type Database } from "@/lib/supabase-types";

interface RouteContext {
  params: Promise<{ chatId: string }>;
}

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type MessageFileRow = Database["public"]["Tables"]["message_files"]["Row"];
type ChatRow = Database["public"]["Tables"]["chats"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

const MAX_PAGE_SIZE = 200;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  costUsdc: number | null;
  aiModel: string | null;
  files: ChatMessageFile[];
};

type ChatMessageFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  mimeType: string | null;
};

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapMessage(row: MessageRow, attachments: MessageFileRow[]): ChatMessage | null {
  if (row.role !== "assistant" && row.role !== "user") {
    return null;
  }

  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    costUsdc: row.cost_usdc != null ? toNumber(row.cost_usdc) : null,
    aiModel: row.ai_model ?? null,
    files: attachments
      .filter((file) => file.message_id === row.id)
      .map((file) => ({
        id: file.id,
        name: file.file_name,
        type: file.file_type,
        size: file.file_size,
        url: file.file_url,
        mimeType: file.mime_type,
      })),
  };
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

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

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
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
    const limit = parsePositiveInt(
      request.nextUrl.searchParams.get("limit"),
      80
    );
    const offset = parsePositiveInt(
      request.nextUrl.searchParams.get("offset"),
      0
    );

    const user = await resolveUser(walletAddress);
    const chat = await ensureChatOwnership(chatId, user.id);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const rows = await adminDbHelpers.getChatMessages(chatId, limit, offset);
    const messageIds = rows.map((row) => row.id);
    const attachments = await adminDbHelpers.getMessageFiles(messageIds);
    const messages = rows
      .map((row) => mapMessage(row, attachments))
      .filter((message): message is ChatMessage => Boolean(message));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[api] chat messages GET failed", error);
    return NextResponse.json(
      {
        error: "Unable to load messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
