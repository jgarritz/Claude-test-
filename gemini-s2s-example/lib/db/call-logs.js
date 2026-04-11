const supabase = require('./supabase');

async function createCallLog({ agentId, callSid, caller, callee }) {
  const { data, error } = await supabase
    .from('call_logs')
    .insert({
      agent_id: agentId,
      call_sid: callSid,
      caller,
      callee,
      status: 'active'
    })
    .select()
    .single();

  if (error) return null;
  return data;
}

async function endCallLog(callLogId) {
  const { data } = await supabase
    .from('call_logs')
    .update({
      ended_at: new Date().toISOString(),
      status: 'completed'
    })
    .eq('id', callLogId)
    .select()
    .single();

  if (data && data.started_at) {
    const duration = Math.round((new Date(data.ended_at) - new Date(data.started_at)) / 1000);
    await supabase
      .from('call_logs')
      .update({ duration_secs: duration })
      .eq('id', callLogId);
  }

  return data;
}

async function appendTranscription({ callLogId, role, content, sequenceNum }) {
  const { error } = await supabase
    .from('transcriptions')
    .insert({
      call_log_id: callLogId,
      role,
      content,
      sequence_num: sequenceNum
    });

  return !error;
}

module.exports = { createCallLog, endCallLog, appendTranscription };
