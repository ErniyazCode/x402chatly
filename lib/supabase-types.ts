/**
 * SUPABASE DATABASE TYPES
 * Auto-generated TypeScript types for the X402CHATLY database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          display_name: string | null
          avatar_url: string | null
          preferred_model: string
          total_spent_usdc: number
          total_messages: number
          created_at: string
          updated_at: string
          last_seen_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          display_name?: string | null
          avatar_url?: string | null
          preferred_model?: string
          total_spent_usdc?: number
          total_messages?: number
          created_at?: string
          updated_at?: string
          last_seen_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          display_name?: string | null
          avatar_url?: string | null
          preferred_model?: string
          total_spent_usdc?: number
          total_messages?: number
          created_at?: string
          updated_at?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          id: string
          user_id: string
          title: string
          ai_model: string
          system_prompt: string | null
          total_messages: number
          total_cost_usdc: number
          created_at: string
          updated_at: string
          last_message_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          ai_model?: string
          system_prompt?: string | null
          total_messages?: number
          total_cost_usdc?: number
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          ai_model?: string
          system_prompt?: string | null
          total_messages?: number
          total_cost_usdc?: number
          created_at?: string
          updated_at?: string
          last_message_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          content_type: 'text' | 'image' | 'file'
          metadata: Json
          ai_model: string | null
          prompt_tokens: number | null
          completion_tokens: number | null
          total_tokens: number | null
          cost_usdc: number | null
          transaction_signature: string | null
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          content_type?: 'text' | 'image' | 'file'
          metadata?: Json
          ai_model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_tokens?: number | null
          cost_usdc?: number | null
          transaction_signature?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          content_type?: 'text' | 'image' | 'file'
          metadata?: Json
          ai_model?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          total_tokens?: number | null
          cost_usdc?: number | null
          transaction_signature?: string | null
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          message_id: string | null
          chat_id: string | null
          signature: string
          block_hash: string | null
          block_number: number | null
          transaction_index: number | null
          amount_usdc: number
          from_wallet: string
          to_wallet: string
          ai_model: string
          x402_request_id: string | null
          x402_merchant_id: string | null
          x402_response_headers: Json | null
          status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message_id?: string | null
          chat_id?: string | null
          signature: string
          block_hash?: string | null
          block_number?: number | null
          transaction_index?: number | null
          amount_usdc: number
          from_wallet: string
          to_wallet: string
          ai_model: string
          x402_request_id?: string | null
          x402_merchant_id?: string | null
          x402_response_headers?: Json | null
          status?: 'pending' | 'confirmed' | 'failed' | 'cancelled'
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message_id?: string | null
          chat_id?: string | null
          signature?: string
          block_hash?: string | null
          block_number?: number | null
          transaction_index?: number | null
          amount_usdc?: number
          from_wallet?: string
          to_wallet?: string
          ai_model?: string
          x402_request_id?: string | null
          x402_merchant_id?: string | null
          x402_response_headers?: Json | null
          status?: 'pending' | 'confirmed' | 'failed' | 'cancelled'
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_files: {
        Row: {
          id: string
          message_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          mime_type: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_name: string
          file_type: string
          file_size: number
          file_url: string
          mime_type?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_url?: string
          mime_type?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      api_usage_stats: {
        Row: {
          id: string
          user_id: string
          ai_model: string
          date: string
          total_requests: number
          total_tokens: number
          prompt_tokens: number
          completion_tokens: number
          total_cost_usdc: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_model: string
          date?: string
          total_requests?: number
          total_tokens?: number
          prompt_tokens?: number
          completion_tokens?: number
          total_cost_usdc?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_model?: string
          date?: string
          total_requests?: number
          total_tokens?: number
          prompt_tokens?: number
          completion_tokens?: number
          total_cost_usdc?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_user: {
        Args: {
          wallet_addr: string
        }
        Returns: string
      }
      get_chat_history: {
        Args: {
          chat_uuid: string
          page_limit?: number
          page_offset?: number
        }
        Returns: {
          message_id: string
          role: string
          content: string
          content_type: string
          ai_model: string | null
          cost_usdc: number | null
          payment_status: string
          created_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
