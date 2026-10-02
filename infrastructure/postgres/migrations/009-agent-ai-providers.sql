ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS ai_model TEXT;

ALTER TABLE agents
  DROP CONSTRAINT IF EXISTS agents_ai_provider_check;

ALTER TABLE agents
  ADD CONSTRAINT agents_ai_provider_check
  CHECK (ai_provider IN ('openai','anthropic','gemini'));

CREATE INDEX IF NOT EXISTS agents_ai_provider_idx
  ON agents(ai_provider);
