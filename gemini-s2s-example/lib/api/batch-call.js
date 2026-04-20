const express = require('express');
const axios = require('axios');
const router = express.Router();
const supabase = require('../db/supabase');
const { generateTtsUrl } = require('../utils/tts');
const { logEvent } = require('../db/error-logs');
const {
  createBatch,
  getBatch,
  getBatchItems,
  createBatchItems,
  updateBatchItem,
  incrementBatchCounter,
  finishBatch,
  updateBatchStatus,
  getItemByCallSid
} = require('../db/batch-calls');

const JAMBONZ_API = process.env.JAMBONZ_API_BASE_URL || 'https://api.jambonz.cloud/v1';
const ACCOUNT_SID = process.env.JAMBONZ_ACCOUNT_SID;
const API_KEY = process.env.JAMBONZ_API_KEY;

// GET /api/batch-call/options — agents + from numbers for the UI
router.get('/options', async (req, res) => {
  try {
    // Get active agents
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name, phone_number, application_sid')
      .eq('active', true)
      .order('name');

    // Get phone numbers from jambonz, then env fallback
    let fromNumbers = [];
    if (ACCOUNT_SID && API_KEY) {
      try {
        const resp = await axios.get(
          `${JAMBONZ_API}/Accounts/${ACCOUNT_SID}/PhoneNumbers`,
          { headers: { Authorization: `Bearer ${API_KEY}` }, timeout: 5000 }
        );
        fromNumbers = (resp.data || []).map(p => ({
          number: p.number,
          carrier: p.voip_carrier_sid
        }));
      } catch (e) {
        // jambonz API failed, ignore
      }
    }

    // Fallback: env variable JAMBONZ_FROM_NUMBERS (comma-separated)
    if (fromNumbers.length === 0 && process.env.JAMBONZ_FROM_NUMBERS) {
      fromNumbers = process.env.JAMBONZ_FROM_NUMBERS.split(',')
        .map(n => n.trim())
        .filter(Boolean)
        .map(n => ({ number: n }));
    }

    // Fallback: agents with phone numbers
    if (fromNumbers.length === 0) {
      fromNumbers = (agents || [])
        .filter(a => a.phone_number && a.phone_number.trim())
        .map(a => ({ number: a.phone_number }));
    }

    res.json({ agents: agents || [], from_numbers: fromNumbers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batch-call/list — all batches for the dashboard
router.get('/list', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('batch_calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/batch-call — start a batch
// Accepts either:
//   phone_numbers: ["+52..."]                         (simple list)
//   contacts: [{ phone: "+52...", nombre: "X", ... }] (with variables)
router.post('/', async (req, res) => {
  const { logger } = req.app.locals;
  const { agent_id, phone_numbers, contacts, from_number, concurrency = 3, greeting_template } = req.body;

  // Normalize: support both formats
  const contactList = contacts || (phone_numbers || []).map(p => typeof p === 'string' ? { phone: p } : p);

  if (!agent_id || !Array.isArray(contactList) || contactList.length === 0) {
    return res.status(400).json({ error: 'agent_id and contacts[] (or phone_numbers[]) are required' });
  }

  if (!from_number) {
    return res.status(400).json({ error: 'from_number is required' });
  }

  if (!ACCOUNT_SID || !API_KEY) {
    return res.status(500).json({ error: 'JAMBONZ_ACCOUNT_SID or JAMBONZ_API_KEY not configured' });
  }

  // Validate agent exists and get application_sid + voice
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, application_sid, voice_name')
    .eq('id', agent_id)
    .eq('active', true)
    .single();

  if (agentError || !agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  if (!agent.application_sid) {
    return res.status(400).json({ error: 'Agent has no application_sid configured' });
  }

  // Clamp concurrency
  const maxConcurrency = Math.min(Math.max(1, concurrency), 20);

  try {
    const batch = await createBatch({
      agentId: agent_id,
      fromNumber: from_number,
      concurrency: maxConcurrency,
      total: contactList.length
    });

    const items = await createBatchItems(batch.id, contactList);

    logger.info({ batchId: batch.id, total: contactList.length, concurrency: maxConcurrency }, 'batch call started');

    // Run batch in background — don't await
    runBatch({ batch, items, agent, from_number, greeting_template, logger }).catch(err => {
      logger.error({ err, batchId: batch.id }, 'batch run error');
    });

    res.status(202).json({ batch_id: batch.id, total: contactList.length, concurrency: maxConcurrency });
  } catch (err) {
    logger.error({ err }, 'failed to create batch');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batch-call/:id — status
router.get('/:id', async (req, res) => {
  const { logger } = req.app.locals;
  const { id } = req.params;

  const batch = await getBatch(id);
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  const items = await getBatchItems(id);

  res.json({ ...batch, items });
});

// POST /api/batch-call/status-hook — jambonz calls this when outbound call status changes
router.post('/status-hook', async (req, res) => {
  const { logger } = req.app.locals;
  const { call_sid, call_status, sip_status, call_termination_by } = req.body;

  logger.info({ call_sid, call_status, sip_status, call_termination_by }, 'call status hook received');
  res.status(200).json({});

  if (!call_sid) return;

  // Only handle terminal statuses for calls that weren't answered
  const terminalStatuses = ['no-answer', 'failed', 'busy', 'canceled'];
  if (!terminalStatuses.includes(call_status)) return;

  try {
    const item = await getItemByCallSid(call_sid);
    if (!item || item.status === 'completed' || item.status === 'answered') return;

    const statusMap = {
      'no-answer': 'no_answer',
      'failed': 'failed',
      'busy': 'busy',
      'canceled': 'canceled'
    };

    await updateBatchItem(item.id, {
      status: statusMap[call_status] || 'failed',
      sip_status,
      sip_reason: call_status,
      ended_at: new Date().toISOString()
    });

    await incrementBatchCounter(item.batch_id, 'failed');
    logger.info({ call_sid, call_status }, 'batch item marked as not answered');
  } catch (err) {
    logger.error({ err: err.message, call_sid }, 'error handling status hook');
  }
});

// DELETE /api/batch-call/:id — pause/stop
router.delete('/:id', async (req, res) => {
  const { logger } = req.app.locals;
  const { id } = req.params;

  await updateBatchStatus(id, 'paused');
  logger.info({ batchId: id }, 'batch paused');

  res.json({ status: 'paused' });
});

// --- Helpers ---

// After 75s, poll jambonz to resolve calls still stuck in 'calling' (unanswered/busy/failed)
async function scheduleCallStatusCheck({ itemId, callSid, batchId, logger }) {
  setTimeout(async () => {
    try {
      const { data: item } = await supabase
        .from('batch_call_items')
        .select('status, sip_status')
        .eq('id', itemId)
        .single();

      if (!item || item.status !== 'calling') return; // already resolved by WebSocket handler

      const resp = await axios.get(
        `${JAMBONZ_API}/Accounts/${ACCOUNT_SID}/Calls/${callSid}`,
        { headers: { Authorization: `Bearer ${API_KEY}` }, timeout: 10000 }
      );

      const callStatus = resp.data?.call_status;
      const sipStatus = resp.data?.sip_status ?? null;
      const sipReason = resp.data?.sip_reason || resp.data?.termination_reason || null;
      const statusMap = { 'no-answer': 'no_answer', 'failed': 'failed', 'busy': 'busy', 'canceled': 'canceled' };
      const resolved = statusMap[callStatus];

      if (item.status === 'calling' && resolved) {
        await updateBatchItem(itemId, { status: resolved, sip_status: sipStatus, sip_reason: sipReason, ended_at: new Date().toISOString() });
        await incrementBatchCounter(batchId, 'failed');
        logger.info({ callSid, callStatus, resolved, sipStatus }, 'unanswered call resolved via polling');
      } else if (item.status !== 'calling' && !item.sip_status && sipStatus) {
        await updateBatchItem(itemId, { sip_status: sipStatus, sip_reason: sipReason });
        logger.info({ callSid, sipStatus }, 'sip_status backfilled via polling');
      }
    } catch (e) {
      logger.warn({ err: e.message, callSid }, 'call status poll failed');
    }
  }, 75000);
}

// --- Background batch runner ---

async function runBatch({ batch, items, agent, from_number, greeting_template, logger }) {
  const { id: batchId } = batch;
  const concurrency = batch.concurrency;

  // Process items in chunks of `concurrency`
  for (let i = 0; i < items.length; i += concurrency) {
    // Check if batch was paused
    const current = await getBatch(batchId);
    if (!current || current.status === 'paused') {
      logger.info({ batchId }, 'batch paused, stopping runner');
      return;
    }

    const chunk = items.slice(i, i + concurrency);

    await Promise.all(chunk.map(item => dialOne({ item, agent, from_number, greeting_template, batchId, logger })));
  }

  await finishBatch(batchId);
  logger.info({ batchId }, 'batch completed');
}

async function dialOne({ item, agent, from_number, greeting_template, batchId, logger }) {
  await updateBatchItem(item.id, { status: 'calling' });

  try {
    // Generate dynamic TTS greeting if there are variables and a template
    let greetingUrl = null;
    if (item.vars && greeting_template && agent.voice_name) {
      const greetingText = greeting_template.replace(/\{(\w+)\}/g, (_, key) => item.vars[key] || key);
      try {
        greetingUrl = await generateTtsUrl({
          text: greetingText,
          voiceName: agent.voice_name,
          filePrefix: `batch-${item.id}`,
          logger
        });
        await updateBatchItem(item.id, { greeting_url: greetingUrl });
        logger.info({ phone: item.phone_number, greetingText }, 'dynamic greeting generated');
      } catch (ttsErr) {
        logger.error({ err: ttsErr.message }, 'TTS generation failed, calling without greeting');
        logEvent({
          type: 'tts',
          severity: 'error',
          message: `TTS failed: ${ttsErr.message}`,
          batchId,
          agentId: agent.id,
          metadata: { phone: item.phone_number, voiceName: agent.voice_name }
        });
      }
    }

    const response = await axios.post(
      `${JAMBONZ_API}/Accounts/${ACCOUNT_SID}/Calls`,
      {
        from: from_number,
        to: {
          type: 'phone',
          number: item.phone_number.startsWith('+') ? item.phone_number : `+${item.phone_number}`
        },
        application_sid: agent.application_sid
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const callSid = response.data?.call_sid || response.data?.sid;
    await updateBatchItem(item.id, { status: 'calling', call_sid: callSid });
    logger.info({ phone: item.phone_number, callSid }, 'outbound call initiated');

    // Poll jambonz after 75s to resolve unanswered/busy/failed calls
    scheduleCallStatusCheck({ itemId: item.id, callSid, batchId, logger });
    logEvent({
      type: 'batch',
      severity: 'info',
      message: `Call initiated to ${item.phone_number}`,
      batchId,
      agentId: agent.id,
      callSid,
      metadata: { phone: item.phone_number, hasGreeting: !!greetingUrl }
    });
  } catch (err) {
    const errorMsg = err.response?.data?.msg || err.message;
    const statusCode = err.response?.status;
    const isRateLimit = statusCode === 429 || errorMsg.includes('rate') || errorMsg.includes('limit');

    await updateBatchItem(item.id, { status: 'failed', error: errorMsg });
    await incrementBatchCounter(batchId, 'failed');
    logger.error({ phone: item.phone_number, error: errorMsg }, 'outbound call failed');

    logEvent({
      type: isRateLimit ? 'jambonz_rate_limit' : 'jambonz',
      severity: isRateLimit ? 'warn' : 'error',
      message: `Call failed: ${errorMsg}`,
      batchId,
      agentId: agent.id,
      metadata: { phone: item.phone_number, statusCode }
    });
  }
}

module.exports = router;
