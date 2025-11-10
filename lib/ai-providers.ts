/**
 * AI PROVIDER ABSTRACTION LAYER
 * Unified interface for Deepseek, GPT-5, and Claude Sonnet 4.0
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AIModel = 'deepseek' | 'gpt-5' | 'claude-sonnet-4-5';

// Support for multimodal content (text + images)
export type MessageContent = 
  | string 
  | Array<TextContent | ImageContent>;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // Can be https:// URL or data:image/jpeg;base64,...
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
}

export interface AIResponse {
  content: string;
  model: AIModel;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost: number;
}

export interface AIProviderConfig {
  model: AIModel;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// ============================================================================
// PRICING CONFIGURATION (per message)
// ============================================================================

export const AI_MODEL_PRICING: Record<AIModel, number> = {
  'deepseek': 0.03,
  'gpt-5': 0.10,
  'claude-sonnet-4-5': 0.20,
};

export const AI_MODEL_NAMES: Record<AIModel, string> = {
  'deepseek': 'Deepseek',
  'gpt-5': 'GPT-5',
  'claude-sonnet-4-5': 'Claude 4.5 Sonnet',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert message to OpenAI format (for GPT models)
 * OpenAI uses: { type: "text" | "image_url", text?: string, image_url?: { url: string } }
 */
function toOpenAIMessage(msg: ChatMessage) {
  return {
    role: msg.role,
    content: msg.content, // OpenAI format matches our internal format
  };
}

/**
 * Convert message to Anthropic format (for Claude models)
 * Anthropic uses: { type: "text" | "image", text?: string, source?: { type: "base64" | "url", ... } }
 */
function toAnthropicMessage(msg: ChatMessage) {
  if (typeof msg.content === 'string') {
    return {
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    };
  }

  // Convert array content
  const content = msg.content.map(item => {
    if (item.type === 'text') {
      return { type: 'text' as const, text: item.text };
    } else {
      // Convert image_url format to Anthropic's image format
      const url = item.image_url.url;
      
      // Check if it's a base64 data URL
      if (url.startsWith('data:')) {
        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          return {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: match[2],
            },
          };
        }
      }
      
      // Otherwise treat as URL
      return {
        type: 'image' as const,
        source: {
          type: 'url' as const,
          url: url,
        },
      };
    }
  });

  return {
    role: msg.role as 'user' | 'assistant',
    content,
  };
}

/**
 * Convert message to simple text format (for Deepseek - no vision support)
 * Deepseek doesn't support images, so extract only text content
 */
function toTextOnlyMessage(msg: ChatMessage) {
  if (typeof msg.content === 'string') {
    return { role: msg.role, content: msg.content };
  }

  // Extract only text from multimodal content
  const textParts = msg.content
    .filter(item => item.type === 'text')
    .map(item => (item as TextContent).text);
  
  return {
    role: msg.role,
    content: textParts.join('\n') || '[Изображения не поддерживаются Deepseek]',
  };
}

// ============================================================================
// DEEPSEEK PROVIDER
// ============================================================================

class DeepseekProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = 'https://api.deepseek.com/v1';
    
    if (!this.apiKey) {
      console.warn('DEEPSEEK_API_KEY is not set');
    }
  }

  async *streamChat(config: AIProviderConfig): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      throw new Error('Deepseek API key is not configured. Please set DEEPSEEK_API_KEY environment variable.');
    }
    
    // Convert messages to text-only format (Deepseek doesn't support vision)
    const messages = config.messages.map(toTextOnlyMessage);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // DeepSeek API model name
        messages,
        stream: true,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { text: '', isComplete: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { text: delta, isComplete: false };
            }
          } catch (e) {
            console.error('Failed to parse Deepseek chunk:', e);
          }
        }
      }
    }

    yield { text: '', isComplete: true };
  }

  async chat(config: AIProviderConfig): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Deepseek API key is not configured. Please set DEEPSEEK_API_KEY environment variable.');
    }
    
    // Convert messages to text-only format (Deepseek doesn't support vision)
    const messages = config.messages.map(toTextOnlyMessage);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // DeepSeek API model name
        messages,
        stream: false,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    return {
      content,
      model: 'deepseek',
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      cost: AI_MODEL_PRICING['deepseek'],
    };
  }
}

// ============================================================================
// GPT-5 PROVIDER (OpenAI)
// ============================================================================

class GPT5Provider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY is not set');
    }
  }

  async *streamChat(config: AIProviderConfig): AsyncGenerator<StreamChunk> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
    }
    
    // Convert messages to OpenAI format (supports vision)
    const messages = config.messages.map(toOpenAIMessage);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o instead of gpt-5 (not yet available)
        messages,
        stream: true,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI API error response:', errorBody);
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { text: '', isComplete: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield { text: delta, isComplete: false };
            }
          } catch (e) {
            console.error('Failed to parse GPT-5 chunk:', e);
          }
        }
      }
    }

    yield { text: '', isComplete: true };
  }

  async chat(config: AIProviderConfig): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
    }
    
    // Convert messages to OpenAI format (supports vision)
    const messages = config.messages.map(toOpenAIMessage);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o instead of gpt-5 (not yet available)
        messages,
        stream: false,
        temperature: config.temperature || 0.7,
        max_tokens: config.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI API error response:', errorBody);
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    return {
      content,
      model: 'gpt-5',
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      cost: AI_MODEL_PRICING['gpt-5'],
    };
  }
}

// ============================================================================
// CLAUDE SONNET 4.0 PROVIDER (Anthropic)
// ============================================================================

class ClaudeProvider {
  private client: Anthropic | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('ANTHROPIC_API_KEY is not set');
    }
  }

  private getClient(): Anthropic {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured. Please set ANTHROPIC_API_KEY environment variable.');
    }
    
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.apiKey,
      });
    }
    return this.client;
  }

  async *streamChat(config: AIProviderConfig): AsyncGenerator<StreamChunk> {
    // Convert messages format (Claude requires system prompt separate)
    const systemMessage = config.messages.find(m => m.role === 'system');
    const systemPrompt = config.systemPrompt || (
      typeof systemMessage?.content === 'string' ? systemMessage.content : undefined
    );
    
    // Convert messages to Anthropic format (supports vision)
    const messages = config.messages
      .filter(m => m.role !== 'system')
      .map(toAnthropicMessage);

    const client = this.getClient();
    const stream = await client.messages.stream({
      model: 'claude-3-5-sonnet-20241022', // Using Claude 3.5 Sonnet (latest available)
      max_tokens: config.maxTokens || 2000,
      temperature: config.temperature || 0.7,
      system: systemPrompt,
      messages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield { text: chunk.delta.text, isComplete: false };
      }
    }

    yield { text: '', isComplete: true };
  }

  async chat(config: AIProviderConfig): Promise<AIResponse> {
    // Convert messages format (Claude requires system prompt separate)
    const systemMessage = config.messages.find(m => m.role === 'system');
    const systemPrompt = config.systemPrompt || (
      typeof systemMessage?.content === 'string' ? systemMessage.content : undefined
    );
    
    // Convert messages to Anthropic format (supports vision)
    const messages = config.messages
      .filter(m => m.role !== 'system')
      .map(toAnthropicMessage);

    const client = this.getClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5', // Using Claude Sonnet 4.5 (latest version)
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.7,
      system: systemPrompt,
      messages,
    });

    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    return {
      content,
      model: 'claude-sonnet-4-5',
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      cost: AI_MODEL_PRICING['claude-sonnet-4-5'],
    };
  }
}

// ============================================================================
// UNIFIED AI PROVIDER INTERFACE
// ============================================================================

export class AIProvider {
  private deepseek: DeepseekProvider | null = null;
  private gpt5: GPT5Provider | null = null;
  private claude: ClaudeProvider | null = null;

  private getDeepseek(): DeepseekProvider {
    if (!this.deepseek) {
      this.deepseek = new DeepseekProvider();
    }
    return this.deepseek;
  }

  private getGPT5(): GPT5Provider {
    if (!this.gpt5) {
      this.gpt5 = new GPT5Provider();
    }
    return this.gpt5;
  }

  private getClaude(): ClaudeProvider {
    if (!this.claude) {
      this.claude = new ClaudeProvider();
    }
    return this.claude;
  }

  async *streamChat(config: AIProviderConfig): AsyncGenerator<StreamChunk> {
    switch (config.model) {
      case 'deepseek':
        yield* this.getDeepseek().streamChat(config);
        break;
      case 'gpt-5':
        yield* this.getGPT5().streamChat(config);
        break;
      case 'claude-sonnet-4-5':
        yield* this.getClaude().streamChat(config);
        break;
      default:
        throw new Error(`Unsupported model: ${config.model}`);
    }
  }

  async chat(config: AIProviderConfig): Promise<AIResponse> {
    switch (config.model) {
      case 'deepseek':
        return this.getDeepseek().chat(config);
      case 'gpt-5':
        return this.getGPT5().chat(config);
      case 'claude-sonnet-4-5':
        return this.getClaude().chat(config);
      default:
        throw new Error(`Unsupported model: ${config.model}`);
    }
  }

  getModelPrice(model: AIModel): number {
    return AI_MODEL_PRICING[model];
  }

  getModelName(model: AIModel): string {
    return AI_MODEL_NAMES[model];
  }
}

// Export singleton instance (lazy initialization prevents client-side errors)
let aiProviderInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProvider();
  }
  return aiProviderInstance;
}

// For backwards compatibility
export const aiProvider = getAIProvider();
