import { NextRequest } from 'next/server';
import {
  withX402Payment,
  type AIModel as X402Model,
  getModelPrice,
  microUsdcToUsd,
  parsePaymentHeader,
  type X402PaymentContext,
} from '@/lib/x402';
import { adminDbHelpers } from '@/lib/supabase-admin';
import { type Database, type Json } from '@/lib/supabase-types';
import { 
  aiProvider, 
  type AIModel, 
  type ChatMessage,
  type MessageContent,
  type TextContent,
  type ImageContent,
  AI_MODEL_PRICING 
} from '@/lib/ai-providers';
import { extractPdfText } from '@/lib/pdf-utils';

const SYSTEM_PROMPT = `You are an AI assistant for X402Chatly. Provide concise, accurate answers using clear sentences.
- Do NOT use Markdown symbols such as **, ##, ---, or /// in your replies.
- If you need emphasis, use natural language (for example: "Important:" or "Key point:").
- Keep line breaks meaningful and avoid excessive spacing.
- Mention costs or blockchain details only if the user asks.
- If the user asks about payments, remind them that Solana USDC micropayments are handled automatically via X402.
- Never fabricate wallet details or transaction IDs.`;

const DEFAULT_MODEL: AIModel = 'deepseek';
const HISTORY_LIMIT = 12;

type MessageRow = Database['public']['Tables']['messages']['Row'] & {
  files?: Array<{
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    file_url: string;
    mime_type: string | null;
  }>;
};
type ChatRow = Database['public']['Tables']['chats']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

interface ChatRequest {
  message?: string;
  walletAddress: string;
  chatId?: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  files?: AttachmentPayload[];
}

interface ChatResponsePayload {
  message: string;
  model: AIModel;
  chatId: string;
  tokenUsage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  timestamp: string;
}

interface ProviderUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface PaymentDetails {
  signature: string | null;
  from: string | null;
  to: string | null;
  amountUsdc: number | null;
  amountMicro: string | null;
  nonce: string | null;
}

interface AttachmentPayload {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface NormalizedAttachment {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 4;

const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const claudeApiKey = process.env.ANTHROPIC_API_KEY;

if (!deepseekApiKey) {
  console.warn('Missing DEEPSEEK_API_KEY');
}
if (!openaiApiKey) {
  console.warn('Missing OPENAI_API_KEY');
}
if (!claudeApiKey) {
  console.warn('Missing ANTHROPIC_API_KEY');
}

function sanitizeUserMessage(input: string): string {
  return input.replace(/\r/g, '').replace(/\s+$/gm, '').trim();
}

function sanitizeAssistantResponse(content: string): string {
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

function formatChatTitle(message: string): string {
  const condensed = message.replace(/\s+/g, ' ').trim();
  if (!condensed) {
    return 'New Chat';
  }
  return condensed.length > 48 ? `${condensed.slice(0, 48)}…` : condensed;
}

function toTokenUsage(usage?: ProviderUsage) {
  return {
    prompt_tokens: usage?.prompt_tokens ?? 0,
    completion_tokens: usage?.completion_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
  };
}

function isValidDataUrl(value: string): boolean {
  return /^data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=\s]+$/i.test(value);
}

function normalizeAttachments(input: unknown): NormalizedAttachment[] {
  if (!Array.isArray(input) || !input.length) {
    return [];
  }

  const normalized: NormalizedAttachment[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const name = typeof (entry as AttachmentPayload).name === 'string' ? (entry as AttachmentPayload).name.trim() : '';
    const type = typeof (entry as AttachmentPayload).type === 'string' ? (entry as AttachmentPayload).type : 'application/octet-stream';
    const size = Number((entry as AttachmentPayload).size);
    const dataUrl = typeof (entry as AttachmentPayload).dataUrl === 'string' ? (entry as AttachmentPayload).dataUrl : '';

    if (!name || !Number.isFinite(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
      continue;
    }

    if (!dataUrl || !isValidDataUrl(dataUrl)) {
      continue;
    }

    normalized.push({
      fileName: name,
      mimeType: type || 'application/octet-stream',
      size,
      dataUrl,
    });

    if (normalized.length >= MAX_ATTACHMENTS) {
      break;
    }
  }

  return normalized;
}

function parsePayment(request: NextRequest, paymentContext?: X402PaymentContext): PaymentDetails {
  const header = request.headers.get('x-payment');
  const initialDetails: PaymentDetails = {
    signature: null,
    from: null,
    to: null,
    amountUsdc: null,
    amountMicro: null,
    nonce: null,
  };

  let details = { ...initialDetails };

  if (header) {
    try {
      const payload = parsePaymentHeader(header);
      const amountMicro =
        typeof payload.payload?.authorization?.value === 'string'
          ? payload.payload.authorization.value
          : null;

      details = {
        signature: payload.payload.signature ?? null,
        from: payload.payload.authorization?.from ?? null,
        to: payload.payload.authorization?.to ?? null,
        amountMicro,
        amountUsdc: amountMicro ? microUsdcToUsd(amountMicro) : null,
        nonce: payload.payload.authorization?.nonce ?? null,
      };
    } catch (error) {
      console.warn('Failed to parse X-PAYMENT header', error);
    }
  }

  const settlement = paymentContext?.settlementResult;

  if (!details.signature && settlement?.transaction) {
    details.signature = settlement.transaction;
  }

  const settledAmount =
    settlement?.amount ?? paymentContext?.paymentAmount ?? details.amountMicro;

  if (!details.amountMicro && typeof settledAmount === 'string') {
    details.amountMicro = settledAmount;
  }

  if (!details.amountUsdc && details.amountMicro) {
    details.amountUsdc = microUsdcToUsd(details.amountMicro);
  }

  return details;
}

async function ensureChatOwnership(chatId: string, userId: string): Promise<ChatRow | null> {
  const chat = await adminDbHelpers.getChatById(chatId);
  if (!chat || chat.user_id !== userId) {
    return null;
  }
  return chat;
}

async function loadChatContext(chatId: string, userId: string): Promise<{ chat: ChatRow; messages: MessageRow[] }> {
  const chat = await ensureChatOwnership(chatId, userId);
  if (!chat) {
    throw new Error('Chat not found');
  }
  const messages = await adminDbHelpers.getChatMessages(chatId, HISTORY_LIMIT);
  return { chat, messages };
}

async function callAIProvider(
  model: AIModel,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number
) {
  try {
    const response = await aiProvider.chat({
      model,
      messages,
      temperature,
      maxTokens,
      systemPrompt: SYSTEM_PROMPT,
    });

    return {
      content: response.content,
      usage: {
        prompt_tokens: response.promptTokens || 0,
        completion_tokens: response.completionTokens || 0,
        total_tokens: response.totalTokens || 0,
      },
      cost: response.cost,
    };
  } catch (error) {
    console.error(`${model} API error:`, error);
    throw new Error(`Failed to call ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleChatRequest(
  request: NextRequest,
  context?: Record<string, unknown>,
): Promise<Response> {
  try {
    const body: ChatRequest = await request.json();
    const {
      message,
      walletAddress,
      chatId,
      model = DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = 1024,
      files,
    } = body;

    console.log('[Chat API] Request received:', { 
      walletAddress: walletAddress?.slice(0, 8) + '...', 
      model, 
      chatId: chatId?.slice(0, 8) + '...',
      hasMessage: !!message 
    });

    const attachments = normalizeAttachments(files);
    const rawMessage = typeof message === 'string' ? message : '';

    if (!walletAddress || (!rawMessage && attachments.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Missing content. Provide a message or at least one attachment.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate model selection
    const validModels: AIModel[] = ['deepseek', 'gpt-5', 'claude-sonnet-4-5'];
    if (!validModels.includes(model)) {
      return new Response(
        JSON.stringify({ error: `Invalid model. Available: ${validModels.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const sanitizedUserMessage = sanitizeUserMessage(rawMessage);
    if (!sanitizedUserMessage && attachments.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty after sanitization.' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const user = (await adminDbHelpers.getOrCreateUser(walletAddress)) as UserRow;

    let chatRecord: ChatRow | null = null;
    let historyRows: MessageRow[] = [];

    if (chatId) {
      try {
        const context = await loadChatContext(chatId, user.id);
        historyRows = context.messages;
        chatRecord = context.chat;
        
        // Check if chat has reached message limit
        const messageCount = await adminDbHelpers.getChatMessageCount(chatId);
        if (messageCount >= 80) {
          return new Response(
            JSON.stringify({ 
              error: 'Этот чат достиг лимита в 80 сообщений. Пожалуйста, создайте новый чат для продолжения общения.' 
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } },
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: 'Chat not found for this wallet.' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    const resolvedMaxTokens = Math.min(Math.max(maxTokens, 256), 2048);
    const resolvedTemperature = Math.min(Math.max(temperature, 0), 2);
    
    // Build message history - reconstruct multimodal content from database
    const priorMessages: ChatMessage[] = [];
    
    for (const row of historyRows) {
      const role = row.role === 'assistant' ? 'assistant' : (row.role === 'system' ? 'system' : 'user');
      
      // Check if message has files (images) attached
      const hasFiles = row.files && Array.isArray(row.files) && row.files.length > 0;
      const hasImages = hasFiles && row.files!.some(f => 
        (f.mime_type || '').startsWith('image/')
      );
      
      // Reconstruct multimodal content if message had images
      if (hasImages && role === 'user' && (model === 'gpt-5' || model === 'claude-sonnet-4-5')) {
        const contentParts: (TextContent | ImageContent)[] = [];
        
        // Add text if present
        if (row.content) {
          contentParts.push({ type: 'text', text: row.content });
        }
        
        // Add images from files
        for (const file of row.files!) {
          if ((file.mime_type || '').startsWith('image/') && file.file_url) {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: file.file_url, // Use stored dataUrl
                detail: 'auto',
              },
            });
          }
        }
        
        priorMessages.push({ role, content: contentParts });
      } else {
        // Text-only message
        priorMessages.push({ role, content: row.content });
      }
    }
    
    // Build user message with multimodal content (text + images)
    let userMessageContent: MessageContent;
    
    // Extract text from PDF files and add to message
    let pdfTexts: string[] = [];
    for (const attachment of attachments) {
      if (attachment.mimeType === 'application/pdf') {
        try {
          console.log(`[PDF] Extracting text from ${attachment.fileName}...`);
          const text = await extractPdfText(attachment.dataUrl);
          pdfTexts.push(`\n\n--- Content from ${attachment.fileName} ---\n${text}`);
          console.log(`[PDF] Extracted ${text.length} characters from ${attachment.fileName}`);
        } catch (error) {
          console.error(`[PDF] Failed to extract text from ${attachment.fileName}:`, error);
          pdfTexts.push(`\n\n[Error: Could not read PDF file ${attachment.fileName}]`);
        }
      }
    }
    
    // Append PDF text to user message
    let sanitizedWithPdf = sanitizedUserMessage;
    if (pdfTexts.length > 0) {
      sanitizedWithPdf += pdfTexts.join('');
    }
    
    // Check if we have images for vision models
    const hasImages = attachments.length > 0 && attachments.some(a => a.mimeType.startsWith('image/'));
    
    if (hasImages && (model === 'gpt-5' || model === 'claude-sonnet-4-5')) {
      // Build multimodal content array for vision-capable models
      const contentParts: (TextContent | ImageContent)[] = [];
      
      // Add text with PDF content if present
      if (sanitizedWithPdf) {
        contentParts.push({ type: 'text', text: sanitizedWithPdf });
      }
      
      // Add images
      for (const attachment of attachments) {
        if (attachment.mimeType.startsWith('image/')) {
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: attachment.dataUrl,
              detail: 'auto',
            },
          });
        }
      }
      
      userMessageContent = contentParts;
    } else {
      // Text-only for Deepseek or when no images
      let textContent = sanitizedWithPdf;
      
      // If images were sent but model doesn't support vision, add note
      if (hasImages && model === 'deepseek') {
        const imageNames = attachments
          .filter(a => a.mimeType.startsWith('image/'))
          .map(a => a.fileName)
          .join(', ');
        textContent += `\n\n[Note: User attached images (${imageNames}), but Deepseek doesn't support vision. Images are stored but cannot be analyzed.]`;
      }
      
      userMessageContent = textContent;
    }
    
    const chatMessages: ChatMessage[] = [
      ...priorMessages,
      { role: 'user', content: userMessageContent },
    ];

    const { content: aiRawContent, usage, cost } = await callAIProvider(
      model,
      chatMessages,
      resolvedTemperature,
      resolvedMaxTokens,
    );

    const sanitizedAssistant = sanitizeAssistantResponse(aiRawContent);

    if (!chatRecord) {
      const chatTitle = formatChatTitle(sanitizedUserMessage);
      chatRecord = (await adminDbHelpers.createChat(user.id, chatTitle, model)) as ChatRow;
    }

    const paymentContext =
      context && typeof context === 'object' && 'x402Payment' in context
        ? (context['x402Payment'] as X402PaymentContext | undefined)
        : undefined;
    const paymentDetails = parsePayment(request, paymentContext);
    
    // Use AI provider pricing instead of X402 pricing
    const costUsdc = paymentDetails.amountUsdc ?? cost;

    const userMessageMetadata: Record<string, unknown> = {};
    if (attachments.length) {
      userMessageMetadata.attachments = attachments.map((attachment) => ({
        name: attachment.fileName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      }));
    }

    const userMessageRow = await adminDbHelpers.addMessage({
      chatId: chatRecord.id,
      userId: user.id,
      role: 'user',
      content: sanitizedUserMessage || '[Images only]', // Use text content or placeholder
      contentType: 'text',
      aiModel: model,
      metadata: userMessageMetadata as Json,
    });

    if (attachments.length) {
      try {
        await adminDbHelpers.addMessageFiles(
          userMessageRow.id,
          attachments.map((attachment) => ({
            fileName: attachment.fileName,
            fileType: attachment.mimeType,
            fileSize: attachment.size,
            fileUrl: attachment.dataUrl,
            mimeType: attachment.mimeType,
            metadata: { source: 'user-upload' },
          })),
        );
      } catch (attachmentError) {
        console.warn('Failed to persist message attachments', attachmentError);
      }
    }

    const usageTotals = toTokenUsage(usage);

    const metadataPayload: Record<string, unknown> = {
      tokenUsage: usageTotals,
      temperature: resolvedTemperature,
      maxTokens: resolvedMaxTokens,
    };

    if (paymentDetails.signature) {
      metadataPayload.payment = {
        signature: paymentDetails.signature,
        from: paymentDetails.from,
        to: paymentDetails.to,
        amountMicro: paymentDetails.amountMicro,
        amountUsdc: costUsdc,
        nonce: paymentDetails.nonce,
      };
    }

    const assistantMessageRow = await adminDbHelpers.addMessage({
      chatId: chatRecord.id,
      userId: user.id,
      role: 'assistant',
      content: sanitizedAssistant,
      aiModel: model,
      costUsdc,
      transactionSignature: paymentDetails.signature ?? undefined,
      metadata: metadataPayload as Json,
    });

    if (paymentDetails.signature) {
      try {
        await adminDbHelpers.recordTransaction({
          userId: user.id,
          messageId: assistantMessageRow.id,
          chatId: chatRecord.id,
          signature: paymentDetails.signature,
          amountUsdc: costUsdc,
          fromWallet: paymentDetails.from ?? walletAddress,
          toWallet:
            paymentDetails.to ?? process.env.TREASURY_WALLET_ADDRESS ?? 'unknown',
          aiModel: model,
          x402RequestId: paymentDetails.nonce ?? undefined,
        });
      } catch (transactionError) {
        console.warn('Failed to record transaction', transactionError);
      }
    }

    try {
      await adminDbHelpers.recordApiUsage({
        userId: user.id,
        aiModel: model,
        promptTokens: usageTotals.prompt_tokens,
        completionTokens: usageTotals.completion_tokens,
        totalTokens: usageTotals.total_tokens,
        costUsdc,
      });
    } catch (usageError) {
      console.warn('Failed to record API usage', usageError);
    }

    const responsePayload: ChatResponsePayload = {
      message: sanitizedAssistant,
      model,
      chatId: chatRecord.id,
      tokenUsage: usageTotals,
      cost: costUsdc,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    console.error('[Chat API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

const postHandler = (req: Request, context?: Record<string, unknown>) =>
  handleChatRequest(req as NextRequest, context);

// X402 payment wrapper - will read model from request body
export const POST = withX402Payment(postHandler, 'deepseek' as X402Model, false, '/api/chat');