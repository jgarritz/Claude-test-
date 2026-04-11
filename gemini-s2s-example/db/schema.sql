-- ============================================
-- Voice Agent Platform - Database Schema
-- ============================================

-- 1. Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  system_prompt TEXT NOT NULL DEFAULT '',
  voice_name VARCHAR(50) NOT NULL DEFAULT 'Kore',
  language_code VARCHAR(10) NOT NULL DEFAULT 'es',
  model VARCHAR(100) NOT NULL DEFAULT 'models/gemini-3.1-flash-live-preview',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tools table
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  parameters JSONB NOT NULL DEFAULT '{}',
  handler_type VARCHAR(20) NOT NULL DEFAULT 'builtin',
  handler_config JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Call logs table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  call_sid VARCHAR(100),
  caller VARCHAR(50),
  callee VARCHAR(50),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_secs INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

-- 4. Transcriptions table
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  sequence_num INTEGER NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_agents_phone ON agents(phone_number);
CREATE INDEX idx_agents_active ON agents(active);
CREATE INDEX idx_tools_agent ON tools(agent_id);
CREATE INDEX idx_call_logs_agent ON call_logs(agent_id);
CREATE INDEX idx_call_logs_started ON call_logs(started_at DESC);
CREATE INDEX idx_transcriptions_call ON transcriptions(call_log_id);

-- Auto-update updated_at on agents
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Seed: Insert Luna agent with current config
-- ============================================
INSERT INTO agents (name, phone_number, system_prompt, voice_name, language_code, model) VALUES (
  'Luna',
  '528114066777',
  'Eres un agente conversacional amigable llamado Luna que habla exclusivamente en español.
Puedes ayudar con información del clima cuando el usuario lo solicite.
Reglas:
- Siempre responde en español, sin importar en qué idioma te hablen.
- Sé conciso y natural, como en una conversación telefónica real.
- Usa un tono cálido y profesional.
- Si no entiendes algo, pide que lo repitan amablemente.
- Cuando consultes el clima, da la temperatura en grados Celsius.
- Si el usuario quiere terminar la conversación, despídete amablemente.',
  'Kore',
  'es',
  'models/gemini-3.1-flash-live-preview'
);

-- Insert Luna's weather tool
INSERT INTO tools (agent_id, name, description, parameters, handler_type, handler_config) VALUES (
  (SELECT id FROM agents WHERE name = 'Luna'),
  'get_weather',
  'Obtener el clima actual de una ubicación. Usa esta función cuando el usuario pregunte por el clima o temperatura de algún lugar.',
  '{
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "La ciudad o ubicación para consultar el clima"
      },
      "scale": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "La escala de temperatura (por defecto celsius)"
      }
    },
    "required": ["location"]
  }',
  'builtin',
  '{"builtin": "get_weather"}'
);

-- Enable Row Level Security
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Policies: allow anon to read agents and tools (for dashboard)
CREATE POLICY "Allow read agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Allow all agents" ON agents FOR ALL USING (true);
CREATE POLICY "Allow read tools" ON tools FOR SELECT USING (true);
CREATE POLICY "Allow all tools" ON tools FOR ALL USING (true);
CREATE POLICY "Allow read call_logs" ON call_logs FOR SELECT USING (true);
CREATE POLICY "Allow all call_logs" ON call_logs FOR ALL USING (true);
CREATE POLICY "Allow read transcriptions" ON transcriptions FOR SELECT USING (true);
CREATE POLICY "Allow all transcriptions" ON transcriptions FOR ALL USING (true);
