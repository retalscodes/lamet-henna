/* ── Bot Widget ── */
const botFab   = document.getElementById('bot-fab');
const botPanel = document.getElementById('bot-panel');
const botClose = document.getElementById('bot-close');
const botInput = document.getElementById('bot-input');
const botSend  = document.getElementById('bot-send');
const botMsgs  = document.getElementById('bot-messages');

let botOpen = false;

botFab?.addEventListener('click', () => {
  botOpen = !botOpen;
  botPanel?.classList.toggle('hidden', !botOpen);
  if (botOpen) botInput?.focus();
});
botClose?.addEventListener('click', () => {
  botOpen = false;
  botPanel?.classList.add('hidden');
});

function addMsg(text, role) {
  const div = document.createElement('div');
  div.className = `bot-msg ${role}`;
  div.textContent = text;
  botMsgs?.appendChild(div);
  botMsgs.scrollTop = botMsgs.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = botInput?.value.trim();
  if (!text) return;
  botInput.value = '';
  addMsg(text, 'user');

  const thinking = addMsg('...', 'bot thinking');

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, lang: currentLang })
    });
    const data = await res.json();
    thinking.remove();
    addMsg(data.reply || i18n[currentLang].bot_error, 'bot');
  } catch {
    thinking.remove();
    addMsg(i18n[currentLang].bot_error, 'bot');
  }
}

botSend?.addEventListener('click', sendMessage);
botInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
