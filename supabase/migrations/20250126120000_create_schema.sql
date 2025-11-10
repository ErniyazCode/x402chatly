-- ============================================================================
-- X402CHATLY DATABASE SCHEMA
-- Real-time AI chat with X402 micropayments on Solana
-- ============================================================================

-- NOTE: Configure the JWT secret from the Supabase Dashboard (Settings → API → JWT secret)
-- or via the CLI before applying this migration. Hosted projects do not allow ALTER DATABASE.

-- ============================================================================
-- 1. USERS TABLE
-- Stores wallet addresses and user preferences
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_model TEXT DEFAULT 'gpt-4',
  total_spent_usdc DECIMAL(10,6) DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for wallet lookups
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- 2. CHATS TABLE 
-- Individual chat sessions with AI models
-- ============================================================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4',
  system_prompt TEXT,
  total_messages INTEGER DEFAULT 0,
  total_cost_usdc DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user chat queries
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at);
CREATE INDEX idx_chats_last_message_at ON chats(last_message_at);

-- ============================================================================
-- 3. MESSAGES TABLE
-- Individual messages in chat conversations
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file')),
  metadata JSONB DEFAULT '{}',
  
  -- AI Response Details
  ai_model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  
  -- X402 Payment Details
  cost_usdc DECIMAL(10,6),
  transaction_signature TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for message queries
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_payment_status ON messages(payment_status);
CREATE INDEX idx_messages_transaction_signature ON messages(transaction_signature);

-- ============================================================================
-- 4. TRANSACTIONS TABLE
-- X402 payment records and blockchain transactions
-- ============================================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  
  -- Solana Transaction Details
  signature TEXT UNIQUE NOT NULL,
  block_hash TEXT,
  block_number BIGINT,
  transaction_index INTEGER,
  
  -- Payment Details
  amount_usdc DECIMAL(10,6) NOT NULL,
  from_wallet TEXT NOT NULL,
  to_wallet TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  
  -- X402 Protocol Details
  x402_request_id TEXT,
  x402_merchant_id TEXT,
  x402_response_headers JSONB,
  
  -- Status and Timestamps
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transaction queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_signature ON transactions(signature);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_from_wallet ON transactions(from_wallet);
CREATE INDEX idx_transactions_message_id ON transactions(message_id);

-- ============================================================================
-- 5. MESSAGE FILES TABLE
-- Uploaded images, documents attached to messages
-- ============================================================================
CREATE TABLE message_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_files_message_id ON message_files(message_id);

-- ============================================================================
-- 6. API USAGE STATS TABLE
-- Track AI API usage and costs per user/model
-- ============================================================================
CREATE TABLE api_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Usage Metrics
  total_requests INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  
  -- Cost Metrics
  total_cost_usdc DECIMAL(10,6) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, ai_model, date)
);

CREATE INDEX idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX idx_api_usage_stats_date ON api_usage_stats(date);
CREATE INDEX idx_api_usage_stats_ai_model ON api_usage_stats(ai_model);

-- ============================================================================
-- 7. UPDATE TRIGGERS
-- Automatically update timestamps and aggregate data
-- ============================================================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Update chat statistics when messages are added
CREATE OR REPLACE FUNCTION update_chat_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chats SET 
            total_messages = (SELECT COUNT(*) FROM messages WHERE chat_id = NEW.chat_id),
            last_message_at = NEW.created_at,
            total_cost_usdc = (SELECT COALESCE(SUM(cost_usdc), 0) FROM messages WHERE chat_id = NEW.chat_id AND cost_usdc IS NOT NULL)
        WHERE id = NEW.chat_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_stats_trigger AFTER INSERT ON messages FOR EACH ROW EXECUTE PROCEDURE update_chat_stats();

-- Update user statistics when messages are added
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET 
            total_messages = (SELECT COUNT(*) FROM messages WHERE user_id = NEW.user_id),
            total_spent_usdc = (SELECT COALESCE(SUM(cost_usdc), 0) FROM messages WHERE user_id = NEW.user_id AND cost_usdc IS NOT NULL),
            last_seen_at = NEW.created_at
        WHERE id = NEW.user_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_stats_trigger AFTER INSERT ON messages FOR EACH ROW EXECUTE PROCEDURE update_user_stats();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only access their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (wallet_address = auth.jwt() ->> 'wallet_address');
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (wallet_address = auth.jwt() ->> 'wallet_address');
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (wallet_address = auth.jwt() ->> 'wallet_address');

-- Chat policies
CREATE POLICY "Users can view own chats" ON chats FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));
CREATE POLICY "Users can create own chats" ON chats FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));
CREATE POLICY "Users can update own chats" ON chats FOR UPDATE USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));

-- Message policies
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));
CREATE POLICY "Users can create own messages" ON messages FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));
CREATE POLICY "Users can create own transactions" ON transactions FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'));

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- Utility functions for common operations
-- ============================================================================

-- Get or create user by wallet address
CREATE OR REPLACE FUNCTION get_or_create_user(wallet_addr TEXT)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid FROM users WHERE wallet_address = wallet_addr;
    
    IF user_uuid IS NULL THEN
        INSERT INTO users (wallet_address, display_name)
        VALUES (wallet_addr, SUBSTRING(wallet_addr, 1, 6) || '...' || SUBSTRING(wallet_addr, -4))
        RETURNING id INTO user_uuid;
    END IF;
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Get chat history with pagination
CREATE OR REPLACE FUNCTION get_chat_history(chat_uuid UUID, page_limit INTEGER DEFAULT 50, page_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    message_id UUID,
    role TEXT,
    content TEXT,
    content_type TEXT,
    ai_model TEXT,
    cost_usdc DECIMAL,
    payment_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.role,
        m.content,
        m.content_type,
        m.ai_model,
        m.cost_usdc,
        m.payment_status,
        m.created_at
    FROM messages m
    WHERE m.chat_id = chat_uuid
    ORDER BY m.created_at ASC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample user for testing
INSERT INTO users (wallet_address, display_name, preferred_model)
VALUES ('7YpVXgzNWwN2JfQHhFBvAkLrPLzUnVHqKNhd5YzZy1x2', 'Developer Wallet', 'gpt-4')
ON CONFLICT (wallet_address) DO NOTHING;

-- Success message
SELECT 'X402CHATLY Database Schema Created Successfully! 🚀' as result;