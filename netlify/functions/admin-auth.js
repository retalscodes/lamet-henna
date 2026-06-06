const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { password } = body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD env var not set');
    return { statusCode: 500, body: 'Server misconfiguration' };
  }

  const isValid = password === adminPassword;

  if (!isValid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid password' }),
    };
  }

  // Issue a simple HMAC token (valid for session only — verified server-side)
  const secret = process.env.ADMIN_SECRET || adminPassword;
  const token = crypto
    .createHmac('sha256', secret)
    .update('lamet-henna-admin')
    .digest('hex');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  };
};
