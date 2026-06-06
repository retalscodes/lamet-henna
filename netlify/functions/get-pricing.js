const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const service = event.queryStringParameters?.service;

  let query = supabase.from('pricing').select('id, service, label, amount, description').order('service').order('amount');
  if (service) query = query.eq('service', service);

  const { data, error } = await query;
  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch pricing' }) };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    body: JSON.stringify({ pricing: data || [] }),
  };
};
