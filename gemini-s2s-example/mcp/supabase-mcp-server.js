#!/usr/bin/env node
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const server = new McpServer({ name: 'supabase-diagnostics', version: '1.0.0' });

server.tool('get_recent_batches',
  'Get recent batch call campaigns with status',
  { limit: z.number().default(10) },
  async ({ limit }) => {
    const { data, error } = await supabase
      .from('batch_calls')
      .select('id, status, total, completed, failed, concurrency, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool('get_batch_items',
  'Get call items for a specific batch',
  { batch_id: z.string() },
  async ({ batch_id }) => {
    const { data, error } = await supabase
      .from('batch_call_items')
      .select('phone_number, status, tipificacion, sip_status, error, call_sid, greeting_url, started_at, ended_at')
      .eq('batch_id', batch_id)
      .order('created_at');
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool('get_recent_errors',
  'Get recent errors and rate limits',
  {
    hours: z.number().default(2),
    type: z.string().optional()
  },
  async ({ hours, type }) => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from('error_logs')
      .select('created_at, type, severity, message, metadata, call_sid, batch_id')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50);
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool('get_call_transcription',
  'Get transcription for a specific call',
  { call_sid: z.string() },
  async ({ call_sid }) => {
    const { data: log } = await supabase
      .from('call_logs')
      .select('id, status, duration_secs, created_at')
      .eq('call_sid', call_sid)
      .single();
    if (!log) return { content: [{ type: 'text', text: 'Call log not found' }] };
    const { data: transcriptions } = await supabase
      .from('transcriptions')
      .select('role, content, sequence_num')
      .eq('call_log_id', log.id)
      .order('sequence_num');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ call: log, transcriptions }, null, 2)
      }]
    };
  }
);

server.tool('get_agents',
  'Get all active agents',
  {},
  async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, model, voice_name, language_code, active, initial_greeting_url')
      .order('name');
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
