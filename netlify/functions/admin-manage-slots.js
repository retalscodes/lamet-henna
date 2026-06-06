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
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!verifyToken(event.headers.authorization)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { date, times } = body;
  if (!date || !Array.isArray(times)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'date and times required' }) };
  }

  const ALL_TIMES = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

  // Delete existing slots for this date
  await supabase.from('time_slots').delete().eq('date', date);

  // Re-insert: checked times as available, unchecked as unavailable
  const rows = ALL_TIMES.map(t => ({
    date,
    time: t,
    is_available: times.includes(t),
  }));

  const { error } = await supabase.from('time_slots').insert(rows);
  if (error) return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save slots' }) };

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
