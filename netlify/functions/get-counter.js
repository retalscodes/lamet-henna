const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify counter token
  const token = event.headers['x-counter-token'] || '';
  const expected = crypto
    .createHmac('sha256', process.env.COUNTER_PASSWORD || '')
    .update('counter-access')
    .digest('hex');

  if (token !== expected) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  // Fetch all confirmed bookings (no price data — just count + metadata)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, date, time, service, status, created_at')
    .in('status', ['confirmed', 'pending'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch' }) };
  }

  // Count confirmed only for earnings
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const now = new Date();
  const thisMonth = confirmed.filter(b => {
    const d = new Date(b.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total_confirmed: confirmed.length,
      this_month: thisMonth.length,
      amount_owed: confirmed.length, // 1 JD per confirmed booking
      bookings: bookings.map(b => ({
        date: b.date,
        time: b.time,
        service: b.service,
        status: b.status,
      }))
    })
  };
};
