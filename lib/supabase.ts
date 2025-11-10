import {
  createClient,
  type RealtimePostgresChangesPayload,
  type SupabaseClient,
} from '@supabase/supabase-js'
import { Database } from './supabase-types'

type UsersRow = Database['public']['Tables']['users']['Row']
type UsersInsert = Database['public']['Tables']['users']['Insert']
type ChatsRow = Database['public']['Tables']['chats']['Row']
type ChatsInsert = Database['public']['Tables']['chats']['Insert']
type MessagesRow = Database['public']['Tables']['messages']['Row']
type MessagesInsert = Database['public']['Tables']['messages']['Insert']
type MessagesUpdate = Database['public']['Tables']['messages']['Update']
type TransactionsRow = Database['public']['Tables']['transactions']['Row']
type TransactionsInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionsUpdate = Database['public']['Tables']['transactions']['Update']
type MessageFilesRow = Database['public']['Tables']['message_files']['Row']
type MessageFilesInsert = Database['public']['Tables']['message_files']['Insert']
type ApiUsageStatsRow = Database['public']['Tables']['api_usage_stats']['Row']
type ApiUsageStatsInsert = Database['public']['Tables']['api_usage_stats']['Insert']

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database, 'public'>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
)

type SupabasePublicClient = SupabaseClient<Database, 'public'>

export const createDbHelpers = (client: SupabasePublicClient) => ({
  // Get or create user by wallet address
  async getOrCreateUser(walletAddress: string): Promise<UsersRow> {
    const { data: user, error } = await client
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle()

    if (error) throw error
    if (user) return user

    const displayName = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

    const newUserPayload = {
      wallet_address: walletAddress,
      display_name: displayName,
    } satisfies UsersInsert

    const { data: newUser, error: createError } = await client
      .from('users')
      .insert(newUserPayload)
      .select()
      .single()

    if (createError) throw createError
    return newUser
  },

  // Get user's chats with pagination
  async getUserChats(userId: string, limit = 20, offset = 0): Promise<ChatsRow[]> {
    const { data, error } = await client
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data
  },

  // Get chat messages (with files)
  async getChatMessages(chatId: string, limit = 80, offset = 0): Promise<MessagesRow[]> {
    const { data, error } = await client
      .from('messages')
      .select(`
        *,
        files:message_files(
          id,
          file_name,
          file_type,
          file_size,
          file_url,
          mime_type
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error
    
    // Transform to include files as array
    return (data || []).map(msg => ({
      ...msg,
      files: msg.files || []
    }))
  },

  // Get total message count for a chat
  async getChatMessageCount(chatId: string): Promise<number> {
    const { count, error } = await client
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId)

    if (error) throw error
    return count || 0
  },

  // Create new chat
  async createChat(userId: string, title: string, aiModel: string, systemPrompt?: string): Promise<ChatsRow> {
    const chatPayload = {
      user_id: userId,
      title,
      ai_model: aiModel,
      system_prompt: systemPrompt ?? null,
    } satisfies ChatsInsert

    const { data, error } = await client
      .from('chats')
      .insert(chatPayload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getChatById(chatId: string): Promise<ChatsRow | null> {
    const { data, error } = await client
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  // Delete chat (and cascade messages via FK)
  async deleteChat(chatId: string, userId: string): Promise<ChatsRow | null> {
    const { data, error } = await client
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId)
      .select()
      .maybeSingle()

    if (error) throw error
    return data
  },

  // Add message to chat
  async addMessage({
    chatId,
    userId,
    role,
    content,
    contentType = 'text',
    aiModel,
    costUsdc,
    transactionSignature,
    metadata = {},
  }: {
    chatId: string
    userId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    contentType?: 'text' | 'image' | 'file'
    aiModel?: string
    costUsdc?: number
    transactionSignature?: string
    metadata?: Database['public']['Tables']['messages']['Insert']['metadata']
  }): Promise<MessagesRow> {
    const messagePayload = {
      chat_id: chatId,
      user_id: userId,
      role,
      content,
      content_type: contentType,
      ai_model: aiModel ?? null,
      cost_usdc: costUsdc ?? null,
      transaction_signature: transactionSignature ?? null,
      metadata: metadata ?? {},
    } satisfies MessagesInsert

    const { data, error } = await client
      .from('messages')
      .insert(messagePayload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Record transaction
  async recordTransaction({
    userId,
    messageId,
    chatId,
    signature,
    amountUsdc,
    fromWallet,
    toWallet,
    aiModel,
    x402RequestId,
  }: {
    userId: string
    messageId?: string
    chatId?: string
    signature: string
    amountUsdc: number
    fromWallet: string
    toWallet: string
    aiModel: string
    x402RequestId?: string
  }): Promise<TransactionsRow> {
    const transactionPayload = {
      user_id: userId,
      message_id: messageId ?? null,
      chat_id: chatId ?? null,
      signature,
      amount_usdc: amountUsdc,
      from_wallet: fromWallet,
      to_wallet: toWallet,
      ai_model: aiModel,
      x402_request_id: x402RequestId ?? null,
    } satisfies TransactionsInsert

    const { data, error } = await client
      .from('transactions')
      .insert(transactionPayload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update message payment status
  async updateMessagePaymentStatus(
    messageId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded',
    transactionSignature?: string
  ): Promise<MessagesRow> {
    const updateData: MessagesUpdate = { payment_status: status }
    if (transactionSignature) {
      updateData.transaction_signature = transactionSignature
    }

    const { data, error } = await client
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update transaction status
  async updateTransactionStatus(
    signature: string,
    status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  ): Promise<TransactionsRow> {
    const updateData: TransactionsUpdate = { status }
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString()
    }

    const { data, error } = await client
      .from('transactions')
      .update(updateData)
      .eq('signature', signature)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user statistics
  async getUserStats(userId: string) {
    const { data, error } = await client
      .from('users')
      .select('total_spent_usdc, total_messages')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  async updateChatTitle(chatId: string, userId: string, title: string): Promise<ChatsRow> {
    const { data, error } = await client
      .from('chats')
      .update({ title })
      .eq('id', chatId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async addMessageFiles(
    messageId: string,
    files: Array<{
      fileName: string
      fileType: string
      fileSize: number
      fileUrl: string
      mimeType?: string | null
      metadata?: Record<string, unknown>
    }>
  ): Promise<MessageFilesRow[]> {
    if (!files.length) {
      return []
    }

    const payloads: MessageFilesInsert[] = files.map((file) => ({
      message_id: messageId,
      file_name: file.fileName,
      file_type: file.fileType,
      file_size: file.fileSize,
      file_url: file.fileUrl,
      mime_type: file.mimeType ?? null,
      metadata: (file.metadata ?? {}) as Database['public']['Tables']['message_files']['Insert']['metadata'],
    }))

    const { data, error } = await client
      .from('message_files')
      .insert(payloads)
      .select()

    if (error) throw error
    return data ?? []
  },

  async getMessageFiles(messageIds: string[]): Promise<MessageFilesRow[]> {
    if (!messageIds.length) {
      return []
    }

    const { data, error } = await client
      .from('message_files')
      .select('*')
      .in('message_id', messageIds)

    if (error) throw error
    return data ?? []
  },

  async recordApiUsage({
    userId,
    aiModel,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsdc,
    usageDate,
  }: {
    userId: string
    aiModel: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    costUsdc: number
    usageDate?: string
  }): Promise<ApiUsageStatsRow> {
    const date = usageDate ?? new Date().toISOString().slice(0, 10)

    const { data: existing, error: fetchError } = await client
      .from('api_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('ai_model', aiModel)
      .eq('date', date)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing) {
      const updated = {
        total_requests: (existing.total_requests ?? 0) + 1,
        prompt_tokens: (existing.prompt_tokens ?? 0) + promptTokens,
        completion_tokens: (existing.completion_tokens ?? 0) + completionTokens,
        total_tokens: (existing.total_tokens ?? 0) + totalTokens,
        total_cost_usdc: Number(existing.total_cost_usdc ?? 0) + costUsdc,
      }

      const { data, error } = await client
        .from('api_usage_stats')
        .update(updated)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    }

    const insertPayload: ApiUsageStatsInsert = {
      user_id: userId,
      ai_model: aiModel,
      date,
      total_requests: 1,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      total_cost_usdc: costUsdc,
    }

    const { data, error } = await client
      .from('api_usage_stats')
      .insert(insertPayload)
      .select()
      .single()

    if (error) throw error
    return data
  },
})

// Helper functions for common database operations using public client
export const dbHelpers = createDbHelpers(supabase)

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to new messages in a chat
  subscribeToChat(
    chatId: string,
    callback: (
      payload: RealtimePostgresChangesPayload<Database['public']['Tables']['messages']['Row']>
    ) => void
  ) {
    return supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to user's chats
  subscribeToUserChats(
    userId: string,
    callback: (
      payload: RealtimePostgresChangesPayload<Database['public']['Tables']['chats']['Row']>
    ) => void
  ) {
    return supabase
      .channel(`user-chats:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to transaction updates
  subscribeToTransactions(
    userId: string,
    callback: (
      payload: RealtimePostgresChangesPayload<Database['public']['Tables']['transactions']['Row']>
    ) => void
  ) {
    return supabase
      .channel(`user-transactions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe()
  },
}

export default supabase
