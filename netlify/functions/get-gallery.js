const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const service = event.queryStringParameters?.service;
  if (!service) return { statusCode: 400, body: JSON.stringify({ error: 'service required' }) };

  const { data, error } = await supabase
    .from('gallery')
    .select('id, image_url, file_path, created_at')
    .eq('service', service)
    .order('created_at', { ascending: false });

  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch gallery' }) };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    body: JSON.stringify({ images: data || [] }),
  };
};
