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
  if (!verifyToken(event.headers.authorization)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch bookings' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookings }),
  };
};
