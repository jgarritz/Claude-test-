const express = require('express');
const axios = require('axios');
const router = express.Router();
const { getAgentByPhoneNumber } = require('../db/agents');
const supabase = require('../db/supabase');
const {
  createBatch,
  getBatch,
  getBatchItems,
  createBatchItems,
  updateBatchItem,
  incrementBatchCounter,
  finishBatch,
  updateBatchStatus
} = require('../db/batch-calls');

const JAMBONZ_API = process.env.JAMBONZ_API_BASE_URL || 'https://api.jambonz.cloud/v1';
const ACCOUNT_SID = process.env.JAMBONZ_ACCOUNT_SID;
const API_KEY = process.env.JAMBONZ_API_KEY;

// POST /api/batch-call — start a batch
router.post('/', async (req, res) => {
  const { logger } = req.app.locals;
  const { agent_id, phone_numbers, from_number, concurrency = 3 } = req.body;

  if (!agent_id || !phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res.status(400).json({ error: 'agent_id and phone_numbers[] are required' });
  }

  if (!from_number) {
    return res.status(400).json({ error: 'from_number is required' });
  }

  if (!ACCOUNT_SID || !API_KEY) {
    return res.status(500).json({ error: 'JAMBONZ_ACCOUNT_SID or JAMBONZ_API_KEY not configured' });
  }

  // Validate agent exists and get application_sid
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, application_sid')
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
      total: phone_numbers.length
    });

    const items = await createBatchItems(batch.id, phone_numbers);

    logger.info({ batchId: batch.id, total: phone_numbers.length, concurrency: maxConcurrency }, 'batch call started');

    // Run batch in background — don't await
    runBatch({ batch, items, agent, from_number, logger }).catch(err => {
      logger.error({ err, batchId: batch.id }, 'batch run error');
    });

    res.status(202).json({ batch_id: batch.id, total: phone_numbers.length, concurrency: maxConcurrency });
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

// DELETE /api/batch-call/:id — pause/stop
router.delete('/:id', async (req, res) => {
  const { logger } = req.app.locals;
  const { id } = req.params;

  await updateBatchStatus(id, 'paused');
  logger.info({ batchId: id }, 'batch paused');

  res.json({ status: 'paused' });
});

// --- Background batch runner ---

async function runBatch({ batch, items, agent, from_number, logger }) {
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

    await Promise.all(chunk.map(item => dialOne({ item, agent, from_number, batchId, logger })));
  }

  await finishBatch(batchId);
  logger.info({ batchId }, 'batch completed');
}

async function dialOne({ item, agent, from_number, batchId, logger }) {
  await updateBatchItem(item.id, { status: 'calling' });

  try {
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
    await updateBatchItem(item.id, { status: 'completed', call_sid: callSid });
    await incrementBatchCounter(batchId, 'completed');
    logger.info({ phone: item.phone_number, callSid }, 'outbound call initiated');
  } catch (err) {
    const errorMsg = err.response?.data?.msg || err.message;
    await updateBatchItem(item.id, { status: 'failed', error: errorMsg });
    await incrementBatchCounter(batchId, 'failed');
    logger.error({ phone: item.phone_number, error: errorMsg }, 'outbound call failed');
  }
}

module.exports = router;
