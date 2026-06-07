const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, phone, email, service, date, time, notes } = body;

  // Basic validation
  if (!name || !phone || !service || !date || !time) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // Check the slot isn't already taken
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .in('status', ['pending', 'confirmed'])
    .limit(1);

  if (existing && existing.length > 0) {
    return { statusCode: 409, body: JSON.stringify({ error: 'Slot already booked' }) };
  }

  // Normalize time to HH:MM:SS for Postgres TIME type
  const normalizedTime = time.length === 5 ? time + ':00' : time;

  const { error } = await supabase.from('bookings').insert([{
    customer_name:  name,
    customer_phone: phone,
    customer_email: email || null,
    service,
    date,
    time: normalizedTime,
    notes: notes || null,
    status: 'pending',
  }]);

  if (error) {
    console.error('Supabase insert error:', JSON.stringify(error));
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save booking', detail: error.message, code: error.code }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};
