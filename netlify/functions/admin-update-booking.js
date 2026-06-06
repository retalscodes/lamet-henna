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
  if (event.httpMethod !== 'PATCH') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!verifyToken(event.headers.authorization)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { id, status } = body;
  if (!id || !['confirmed', 'cancelled', 'pending'].includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid params' }) };
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Update failed' }) };

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
