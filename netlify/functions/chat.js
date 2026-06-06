const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are a friendly assistant for "Lamet Henna" (لمّة حنة), a henna art and event planning business in Amman, Jordan, run by Sondos Qassas.

Business details:
- Services: Henna (bridal, Khaleeji styles, occasions), Event Planning (weddings, graduations, henna nights/Zaffeh), Sedr & Henna hair care, and other custom services
- Location: Amman, Jordan
- Phone / WhatsApp: 0790932333
- Instagram: @lamet_henna | Facebook: Lamet-Henna
- Hours: Saturday–Thursday 10AM–5PM | Friday: Closed
- Currency: Jordanian Dinars (JD) — pricing available upon direct inquiry

Your role:
- Help users navigate the website and understand services
- Guide them to the booking page (booking.html) to make reservations
- Answer questions about services, hours, and location
- For pricing, always say "تواصلي معنا للاستفسار عن الأسعار" / "Contact us for pricing details"
- Keep responses short and friendly (2–4 sentences max)
- If the user writes in Arabic, respond in Arabic. If in English, respond in English.
- Never make up prices or availability details you don't know`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { message, lang } = body;
  if (!message) return { statusCode: 400, body: 'Missing message' };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    });

    const reply = response.content[0]?.text || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error('Claude API error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ reply: lang === 'ar' ? 'عذراً، حدث خطأ. حاولي مجدداً.' : 'Sorry, something went wrong. Please try again.' }),
    };
  }
};
