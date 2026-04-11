const supabase = require('./supabase');

async function getToolsByAgentId(agentId) {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('agent_id', agentId)
    .eq('active', true);

  if (error) return [];
  return data || [];
}

module.exports = { getToolsByAgentId };
