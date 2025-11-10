/**
 * GPT-4 Chat API Route with X402 Micropayments ($0.05 per message)
 */

import { withX402Payment } from '@/lib/x402';
import { dbHelpers } from '@/lib/supabase';
import type { Database, Json } from '@/lib/supabase-types';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatCompletionContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart;

interface ChatRequest {
  message: string;
  chatId?: string;
  walletAddress: string;
  hasImage?: boolean;
  imageData?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

type MessageRow = Database['public']['Tables']['messages']['Row'];

async function handleGPTChat(request: Request): Promise<Response> {
  try {
    const body: ChatRequest = await request.json();
    const { 
      message, 
      chatId, 
      walletAddress, 
      hasImage = false, 
      imageData,
      temperature = 0.7,
      maxTokens = 1000 
    } = body;

    if (!message || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message, walletAddress' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create user
    const user = await dbHelpers.getOrCreateUser(walletAddress) as Database['public']['Tables']['users']['Row'];

    // Get chat history if chatId provided
    let chatHistory: ChatMessage[] = [];
    let currentChatId = chatId;
    
    if (chatId) {
      try {
        const messages = (await dbHelpers.getChatMessages(chatId, 20)) as MessageRow[] | null;
        chatHistory = (messages ?? []).map(msg => ({
          role: msg.role as ChatMessage['role'],
          content: msg.content,
        }));
      } catch (error) {
        console.error('Error fetching chat history:', error);
        chatHistory = [];
      }
    }

    // Prepare messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant powered by X402 micropayments. Provide accurate, helpful, and concise responses.'
      },
      ...chatHistory,
    ];

    if (hasImage && imageData) {
      const contentParts: ChatCompletionContentPart[] = [
        { type: 'text', text: message },
        {
          type: 'image_url',
          image_url: {
            url: imageData,
            detail: 'high'
          }
        }
      ];
      messages.push({
        role: 'user',
        content: contentParts
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: hasImage ? 'gpt-4-vision-preview' : 'gpt-4',
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'No response generated';
    const tokenUsage: TokenUsage = completion.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    // Create new chat if needed
    if (!currentChatId) {
      const chatTitle = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const newChat = await dbHelpers.createChat(user.id, chatTitle, hasImage ? 'gpt-4-vision' : 'gpt-4') as Database['public']['Tables']['chats']['Row'];
      currentChatId = newChat.id;
    }

    if (!currentChatId) {
      return new Response(
        JSON.stringify({ error: 'Failed to create or get chat ID' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate cost - $0.05 for regular, $0.10 for vision
    const costUsdc = hasImage ? 0.10 : 0.05;

    // Save user message
    await dbHelpers.addMessage({
      chatId: currentChatId,
      userId: user.id,
      role: 'user',
      content: message,
      contentType: hasImage ? 'image' : 'text',
      aiModel: hasImage ? 'gpt-4-vision' : 'gpt-4',
    });

    // Save AI response
    await dbHelpers.addMessage({
      chatId: currentChatId,
      userId: user.id,
      role: 'assistant',
      content: aiResponse,
      aiModel: hasImage ? 'gpt-4-vision' : 'gpt-4',
      costUsdc,
      metadata: {
        tokenUsage,
        temperature,
        maxTokens,
      } as unknown as Json,
    });

    const response = {
      message: aiResponse,
      model: hasImage ? 'gpt-4-vision' : 'gpt-4',
      chatId: currentChatId,
      tokenUsage: {
        promptTokens: tokenUsage.prompt_tokens,
        completionTokens: tokenUsage.completion_tokens,
        totalTokens: tokenUsage.total_tokens,
      },
      cost: costUsdc,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('GPT Chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'GPT API error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Export with X402 payment middleware for GPT-5
export const POST = withX402Payment(handleGPTChat, 'gpt-5', false, '/api/chat/gpt');