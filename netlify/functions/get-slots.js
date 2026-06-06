const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Default working hours when no slots have been manually set for a date
const DEFAULT_TIMES = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

exports.handler = async (event) => {
  const date = event.queryStringParameters?.date;
  if (!date) {
    return { statusCode: 400, body: JSON.stringify({ error: 'date required' }) };
  }

  // Reject Fridays (day 5 in JS UTC)
  const d = new Date(date);
  if (d.getUTCDay() === 5) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: [] }),
    };
  }

  try {
    // Get slots explicitly set for this date
    const { data: slotRows } = await supabase
      .from('time_slots')
      .select('time, is_available')
      .eq('date', date)
      .order('time');

    // Get existing confirmed/pending bookings on this date to mark as taken
    const { data: bookingRows } = await supabase
      .from('bookings')
      .select('time')
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    const bookedTimes = new Set((bookingRows || []).map(b => b.time.slice(0, 5)));

    let slots;
    if (slotRows && slotRows.length > 0) {
      // Use admin-defined slots
      slots = slotRows.map(s => ({
        time: s.time.slice(0, 5),
        available: s.is_available && !bookedTimes.has(s.time.slice(0, 5)),
      }));
    } else {
      // Fall back to default working hours
      slots = DEFAULT_TIMES.map(t => ({
        time: t,
        available: !bookedTimes.has(t),
      }));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
