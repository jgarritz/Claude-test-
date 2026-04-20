const supabase = require('./supabase');

async function createBatch({ agentId, fromNumber, concurrency, total }) {
  const { data, error } = await supabase
    .from('batch_calls')
    .insert({
      agent_id: agentId,
      from_number: fromNumber,
      concurrency,
      total,
      completed: 0,
      failed: 0,
      status: 'running'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getBatch(batchId) {
  const { data, error } = await supabase
    .from('batch_calls')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) return null;
  return data;
}

async function getBatchItems(batchId) {
  const { data, error } = await supabase
    .from('batch_call_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data;
}

async function createBatchItems(batchId, contacts) {
  const rows = contacts.map(c => {
    // Support both string format and object format
    if (typeof c === 'string') {
      return { batch_id: batchId, phone_number: c, status: 'pending' };
    }
    const { phone, ...vars } = c;
    return {
      batch_id: batchId,
      phone_number: phone,
      status: 'pending',
      vars: Object.keys(vars).length > 0 ? vars : null
    };
  });

  const { data, error } = await supabase
    .from('batch_call_items')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

async function getItemByCallSid(callSid) {
  const { data, error } = await supabase
    .from('batch_call_items')
    .select('*')
    .eq('call_sid', callSid)
    .single();

  if (error) return null;
  return data;
}

async function updateBatchItem(itemId, fields) {
  await supabase
    .from('batch_call_items')
    .update(fields)
    .eq('id', itemId);
}

async function incrementBatchCounter(batchId, field) {
  // Read current value then increment (Supabase JS v2 doesn't support rpc increment inline)
  const { data } = await supabase
    .from('batch_calls')
    .select(field)
    .eq('id', batchId)
    .single();

  if (data) {
    await supabase
      .from('batch_calls')
      .update({ [field]: (data[field] || 0) + 1 })
      .eq('id', batchId);
  }
}

async function finishBatch(batchId) {
  await supabase
    .from('batch_calls')
    .update({ status: 'completed' })
    .eq('id', batchId);
}

async function updateBatchStatus(batchId, status) {
  await supabase
    .from('batch_calls')
    .update({ status })
    .eq('id', batchId);
}

async function updateBatchItemResult(callSid, fields) {
  await supabase
    .from('batch_call_items')
    .update(fields)
    .eq('call_sid', callSid);
}

module.exports = {
  createBatch,
  getBatch,
  getBatchItems,
  createBatchItems,
  updateBatchItem,
  incrementBatchCounter,
  finishBatch,
  updateBatchStatus,
  getItemByCallSid,
  updateBatchItemResult
};
