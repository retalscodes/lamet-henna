const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyToken(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  const expected = crypto.createHmac('sha256', secret).update('lamet-henna-admin').digest('hex');
  return token === expected;
}

exports.handler = async (event) => {
  if (!['POST', 'DELETE'].includes(event.httpMethod)) return { statusCode: 405, body: 'Method Not Allowed' };
  if (!verifyToken(event.headers.authorization)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (event.httpMethod === 'DELETE') {
    const { id } = body;
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) };
    const { error } = await supabase.from('pricing').delete().eq('id', id);
    if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Delete failed' }) };
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  // POST — upsert
  const { id, service, label, amount, description } = body;
  if (!service || !label || amount === undefined) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  let error;
  if (id) {
    ({ error } = await supabase.from('pricing').update({ service, label, amount, description: description || null }).eq('id', id));
  } else {
    ({ error } = await supabase.from('pricing').insert([{ service, label, amount, description: description || null }]));
  }

  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Save failed' }) };
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
