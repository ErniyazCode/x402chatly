import { NextRequest } from 'next/server';
import { adminDbHelpers } from '@/lib/supabase-admin';
import { parsePaymentHeader, microUsdcToUsd } from '@/lib/x402';
import { type Database } from '@/lib/supabase-types';

export const HISTORY_LIMIT = 12;

export const SYSTEM_PROMPT = `You are the Deepseek AI assistant for X402Chatly. Provide concise, accurate answers using clear sentences.
- Do NOT use Markdown symbols such as **, ##, ---, or /// in your replies.
- If you need emphasis, use natural language (for example: "Important:" or "Key point:").
- Keep line breaks meaningful and avoid excessive spacing.
- Mention costs or blockchain details only if the user asks.
- If the user asks about payments, remind them that Solana USDC micropayments are handled automatically via X402.
- Never fabricate wallet details or transaction IDs.`;

export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type ChatRow = Database['public']['Tables']['chats']['Row'];
export type UserRow = Database['public']['Tables']['users']['Row'];

export interface ProviderUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface PaymentDetails {
  signature: string | null;
  from: string | null;
  to: string | null;
  amountUsdc: number | null;
  amountMicro: string | null;
  nonce: string | null;
}

export function sanitizeUserMessage(input: string): string {
  return input.replace(/\r/g, '').replace(/\s+$/gm, '').trim();
}

export function sanitizeAssistantResponse(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1')
    .replace(/#+\s?/g, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\/{2,}/g, '/')
    .replace(/_{2,}/g, ' ')
    .replace(/-{3,}/g, '-')
    .replace(/\s+$/gm, '')
    .trim();
}

export function formatChatTitle(message: string): string {
  const condensed = message.replace(/\s+/g, ' ').trim();
  if (!condensed) {
    return 'New Chat';
  }
  return condensed.length > 48 ? `${condensed.slice(0, 48)}…` : condensed;
}

export function toTokenUsage(usage?: ProviderUsage) {
  return {
    prompt_tokens: usage?.prompt_tokens ?? 0,
    completion_tokens: usage?.completion_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
  };
}

export function parsePayment(request: NextRequest): PaymentDetails {
  const header = request.headers.get('x-payment') || request.headers.get('X-PAYMENT');
  if (!header) {
    return {
      signature: null,
      from: null,
      to: null,
      amountUsdc: null,
      amountMicro: null,
      nonce: null,
    };
  }

  try {
    const payload = parsePaymentHeader(header);
    const amountMicro = payload.payload.authorization.value;
    return {
      signature: payload.payload.signature,
      from: payload.payload.authorization.from,
      to: payload.payload.authorization.to,
      amountUsdc: microUsdcToUsd(amountMicro),
      amountMicro,
      nonce: payload.payload.authorization.nonce,
    };
  } catch (error) {
    console.warn('Failed to parse X-PAYMENT header', error);
    return {
      signature: null,
      from: null,
      to: null,
      amountUsdc: null,
      amountMicro: null,
      nonce: null,
    };
  }
}

export async function ensureChatOwnership(chatId: string, userId: string): Promise<ChatRow | null> {
  const chat = await adminDbHelpers.getChatById(chatId);
  if (!chat || chat.user_id !== userId) {
    return null;
  }
  return chat as ChatRow;
}

export async function loadChatContext(chatId: string, userId: string): Promise<{ chat: ChatRow; messages: MessageRow[] }> {
  const chat = await ensureChatOwnership(chatId, userId);
  if (!chat) {
    throw new Error('Chat not found');
  }
  const messages = await adminDbHelpers.getChatMessages(chatId, HISTORY_LIMIT);
  return { chat, messages };
}
