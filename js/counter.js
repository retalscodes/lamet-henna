/* ── Counter Page Logic ── */

const SERVICE_LABELS = {
  henna:  'حنة',
  events: 'تنظيم فعاليات',
  sedr:   'سدر وحنة',
  other:  'أخرى',
};

function getToken(password) {
  // Simple HMAC using Web Crypto API
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    .then(key => crypto.subtle.sign('HMAC', key, enc.encode('counter-access')))
    .then(sig => Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

document.getElementById('counter-login-btn').addEventListener('click', async () => {
  const pass = document.getElementById('counter-pass').value;
  if (!pass) return;

  const btn = document.getElementById('counter-login-btn');
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const token = await getToken(pass);
    const res = await fetch('/.netlify/functions/get-counter', {
      headers: { 'x-counter-token': token }
    });

    if (!res.ok) {
      document.getElementById('counter-error').classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'دخول';
      return;
    }

    sessionStorage.setItem('counter_token', token);
    const data = await res.json();
    renderDashboard(data);

  } catch {
    document.getElementById('counter-error').classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'دخول';
  }
});

// Allow Enter key
document.getElementById('counter-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('counter-login-btn').click();
});

document.getElementById('counter-logout').addEventListener('click', () => {
  sessionStorage.removeItem('counter_token');
  document.getElementById('counter-dashboard').classList.add('hidden');
  document.getElementById('login-wrap').classList.remove('hidden');
});

function renderDashboard(data) {
  document.getElementById('login-wrap').classList.add('hidden');
  document.getElementById('counter-dashboard').classList.remove('hidden');

  document.getElementById('stat-total').textContent = data.total_confirmed;
  document.getElementById('stat-month').textContent = data.this_month;
  document.getElementById('stat-money').textContent = data.amount_owed + ' JD';

  const now = new Date();
  document.getElementById('last-updated').textContent =
    'آخر تحديث: ' + now.toLocaleString('ar-EG');

  const wrap = document.getElementById('bookings-body');

  if (!data.bookings || data.bookings.length === 0) {
    wrap.innerHTML = '<p class="empty-msg">لا توجد حجوزات بعد</p>';
    return;
  }

  const rows = data.bookings.map(b => {
    const badge = b.status === 'confirmed'
      ? '<span class="badge badge-confirmed">مؤكد</span>'
      : '<span class="badge badge-pending">قيد الانتظار</span>';
    const service = SERVICE_LABELS[b.service] || b.service;
    const time = b.time ? b.time.slice(0, 5) : '—';
    return `<tr>
      <td>${b.date}</td>
      <td>${time}</td>
      <td>${service}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>التاريخ</th>
          <th>الوقت</th>
          <th>الخدمة</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// Auto-login if token saved in session
window.addEventListener('load', async () => {
  const saved = sessionStorage.getItem('counter_token');
  if (!saved) return;
  try {
    const res = await fetch('/.netlify/functions/get-counter', {
      headers: { 'x-counter-token': saved }
    });
    if (res.ok) renderDashboard(await res.json());
  } catch {}
});
