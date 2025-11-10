import { NextRequest, NextResponse } from "next/server";
import { adminDbHelpers } from "@/lib/supabase-admin";
import { type Database } from "@/lib/supabase-types";
import { type AIModel } from "@/lib/x402";

const DEFAULT_MODEL: AIModel = "deepseek";
const MAX_PAGE_SIZE = 100;

type ChatRow = Database["public"]["Tables"]["chats"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

type ChatSummary = {
  id: string;
  title: string;
  aiModel: string;
  totalMessages: number;
  totalCostUsdc: number;
  lastMessageAt: string | null;
};

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapChat(row: ChatRow): ChatSummary {
  return {
    id: row.id,
    title: row.title,
    aiModel: row.ai_model,
    totalMessages: row.total_messages ?? 0,
    totalCostUsdc: toNumber(row.total_cost_usdc),
    lastMessageAt: row.last_message_at,
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

export async function GET(request: NextRequest): Promise<NextResponse> {
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
      20
    );
    const offset = parsePositiveInt(
      request.nextUrl.searchParams.get("offset"),
      0
    );

    const user = await resolveUser(walletAddress);
    const rows = await adminDbHelpers.getUserChats(user.id, limit, offset);
    const chats = rows.map(mapChat);

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("[api] chats GET failed", error);
    return NextResponse.json(
      {
        error: "Unable to load chats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const walletAddress = (body as { walletAddress?: string }).walletAddress;
    const title = (body as { title?: string }).title;
    const systemPrompt = (body as { systemPrompt?: string }).systemPrompt;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const safeTitle =
      typeof title === "string" && title.trim().length
        ? title.trim().slice(0, 120)
        : "New Deepseek Chat";

    const user = await resolveUser(walletAddress);
    const chat = await adminDbHelpers.createChat(
      user.id,
      safeTitle,
      DEFAULT_MODEL,
      typeof systemPrompt === "string" ? systemPrompt : undefined
    );

    const payload = mapChat(chat as ChatRow);
    return NextResponse.json({ chat: payload }, { status: 201 });
  } catch (error) {
    console.error("[api] chats POST failed", error);
    return NextResponse.json(
      {
        error: "Unable to create chat",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
