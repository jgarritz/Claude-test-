const supabase = require('./supabase');

async function logEvent({ type, severity = 'error', message, metadata = {}, agentId = null, batchId = null, callSid = null }) {
  try {
    await supabase
      .from('error_logs')
      .insert({
        type,
        severity,
        message,
        metadata,
        agent_id: agentId,
        batch_id: batchId,
        call_sid: callSid
      });
  } catch (err) {
    // Don't let logging failures break the app
  }
}

async function getRecentErrors({ limit = 100, type = null, severity = null, since = null }) {
  let query = supabase
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('type', type);
  if (severity) query = query.eq('severity', severity);
  if (since) query = query.gte('created_at', since);

  const { data, error } = await query;
  if (error) return [];
  return data;
}

async function getStats({ since = null }) {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('error_logs')
    .select('type, severity')
    .gte('created_at', sinceDate);

  const { data, error } = await query;
  if (error) return {};

  const stats = {
    total: data.length,
    by_type: {},
    by_severity: { info: 0, warn: 0, error: 0 }
  };

  for (const row of data) {
    stats.by_type[row.type] = (stats.by_type[row.type] || 0) + 1;
    stats.by_severity[row.severity] = (stats.by_severity[row.severity] || 0) + 1;
  }

  return stats;
}

module.exports = { logEvent, getRecentErrors, getStats };
