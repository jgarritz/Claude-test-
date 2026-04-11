const supabase = require('./supabase');

async function getAgentByPhoneNumber(phoneNumber) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('active', true)
    .single();

  if (error) return null;
  return data;
}

async function getDefaultAgent() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

module.exports = { getAgentByPhoneNumber, getDefaultAgent };
