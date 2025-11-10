-- ============================================================================
-- UPDATE AI MODELS FOR X402CHATLY
-- Add support for Deepseek, GPT-5, and Claude Sonnet 4.0
-- ============================================================================

-- Update default values in users table
ALTER TABLE users ALTER COLUMN preferred_model SET DEFAULT 'deepseek';

-- Update default values in chats table
ALTER TABLE chats ALTER COLUMN ai_model SET DEFAULT 'deepseek';

-- Add check constraints for valid AI models
ALTER TABLE users 
ADD CONSTRAINT valid_preferred_model 
CHECK (preferred_model IN ('deepseek', 'gpt-5', 'claude-sonnet-4-5'));

ALTER TABLE chats 
ADD CONSTRAINT valid_ai_model 
CHECK (ai_model IN ('deepseek', 'gpt-5', 'claude-sonnet-4-5'));

ALTER TABLE messages 
ADD CONSTRAINT valid_message_ai_model 
CHECK (ai_model IS NULL OR ai_model IN ('deepseek', 'gpt-5', 'claude-sonnet-4-5'));

ALTER TABLE transactions 
ADD CONSTRAINT valid_transaction_ai_model 
CHECK (ai_model IN ('deepseek', 'gpt-5', 'claude-sonnet-4-5'));

ALTER TABLE api_usage_stats 
ADD CONSTRAINT valid_usage_ai_model 
CHECK (ai_model IN ('deepseek', 'gpt-5', 'claude-sonnet-4-5'));

-- Update existing records from 'gpt-4' to 'deepseek'
UPDATE users SET preferred_model = 'deepseek' WHERE preferred_model = 'gpt-4';
UPDATE chats SET ai_model = 'deepseek' WHERE ai_model = 'gpt-4';
UPDATE messages SET ai_model = 'deepseek' WHERE ai_model = 'gpt-4';
UPDATE transactions SET ai_model = 'deepseek' WHERE ai_model = 'gpt-4';
UPDATE api_usage_stats SET ai_model = 'deepseek' WHERE ai_model = 'gpt-4';

-- Success message
SELECT 'AI Models Updated Successfully! Supported: deepseek, gpt-5, claude-sonnet-4-5 🚀' as result;
