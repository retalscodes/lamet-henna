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

  const { service, imageData, fileName, mimeType } = body;
  if (!service || !imageData || !fileName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Image too large (max 5MB)' }) };
  }

  const ext = fileName.split('.').pop().toLowerCase();
  const uniqueName = `${service}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery')
    .upload(uniqueName, buffer, { contentType: mimeType || 'image/jpeg', upsert: false });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Upload failed' }) };
  }

  const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(uniqueName);

  const { error: dbError } = await supabase.from('gallery').insert([{
    service,
    image_url: publicUrl,
    file_path: uniqueName,
  }]);

  if (dbError) {
    console.error('DB insert error:', dbError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save record' }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: publicUrl }),
  };
};
