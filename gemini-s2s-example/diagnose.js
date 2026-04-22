#!/usr/bin/env node
// Run: SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=eyJ... node diagnose.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('\n=== BATCHES RECIENTES ===');
  const { data: batches } = await supabase
    .from('batch_calls')
    .select('id, status, total, completed, failed, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  console.table(batches);

  const lastBatch = batches?.[0];
  if (lastBatch) {
    console.log(`\n=== ITEMS DEL ULTIMO BATCH (${lastBatch.id}) ===`);
    const { data: items } = await supabase
      .from('batch_call_items')
      .select('phone_number, status, tipificacion, sip_status, error, call_sid, greeting_url')
      .eq('batch_id', lastBatch.id)
      .order('created_at');
    console.table(items);
  }

  console.log('\n=== ERRORES RECIENTES (últimas 2h) ===');
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: errors } = await supabase
    .from('error_logs')
    .select('created_at, type, severity, message, metadata')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  console.table(errors);

  console.log('\n=== RATE LIMITS (últimas 24h) ===');
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rateLimits } = await supabase
    .from('error_logs')
    .select('created_at, type, message')
    .in('type', ['gemini_rate_limit', 'jambonz_rate_limit', 'tts'])
    .gte('created_at', since24)
    .order('created_at', { ascending: false });
  console.log(`Total rate limits/TTS errors: ${rateLimits?.length || 0}`);
  if (rateLimits?.length) console.table(rateLimits);
}

main().catch(console.error);
