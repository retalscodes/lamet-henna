/* ── Booking Page Logic ── */

// Pre-select service from URL param
const params = new URLSearchParams(location.search);
const preService = params.get('service');
if (preService) {
  const sel = document.getElementById('f-service');
  if (sel) sel.value = preService;
}

// Date constraints: today onwards, no Fridays
const dateInput = document.getElementById('f-date');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;

  // Block Fridays via input event
  dateInput.addEventListener('change', () => {
    const d = new Date(dateInput.value);
    // getDay() with UTC: Friday = 5 in JS (0=Sun)
    const day = d.getUTCDay();
    if (day === 5) {
      dateInput.value = '';
      showSlotsMsg(i18n[currentLang].book_friday_note);
      clearSlots();
      return;
    }
    loadSlots(dateInput.value);
  });
}

function showSlotsMsg(msg) {
  const el = document.getElementById('slots-msg');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearSlots() {
  const grid = document.getElementById('slots-grid');
  if (grid) grid.innerHTML = '';
  const hidden = document.getElementById('f-time');
  if (hidden) hidden.value = '';
}

async function loadSlots(date) {
  showSlotsMsg(i18n[currentLang].book_loading_slots);
  clearSlots();

  try {
    const res = await fetch(`/.netlify/functions/get-slots?date=${date}`);
    const { slots } = await res.json();

    const grid = document.getElementById('slots-grid');
    const msg  = document.getElementById('slots-msg');

    if (!slots || slots.length === 0) {
      showSlotsMsg(i18n[currentLang].book_no_slots);
      return;
    }

    msg.style.display = 'none';
    slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = slot.time;
      btn.dataset.time = slot.time;
      if (!slot.available) {
        btn.disabled = true;
        btn.style.opacity = '0.35';
      }
      btn.addEventListener('click', () => selectSlot(btn, slot.time));
      grid.appendChild(btn);
    });
  } catch {
    showSlotsMsg(i18n[currentLang].book_no_slots);
  }
}

function selectSlot(btn, time) {
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const hidden = document.getElementById('f-time');
  if (hidden) hidden.value = time;
  document.getElementById('err-time')?.classList.remove('show');
}

// Form validation & submission
document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = i18n[currentLang].book_submitting;

  const payload = {
    name:    document.getElementById('f-name').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    email:   document.getElementById('f-email').value.trim(),
    service: document.getElementById('f-service').value,
    date:    document.getElementById('f-date').value,
    time:    document.getElementById('f-time').value,
    notes:   document.getElementById('f-notes').value.trim(),
  };

  try {
    const res = await fetch('/.netlify/functions/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error();

    // Show success
    document.getElementById('booking-form').classList.add('hidden');
    const success = document.getElementById('booking-success');
    success.classList.remove('hidden');

    // Build WhatsApp message
    const svcMap = { henna: 'حنة', events: 'تنظيم فعاليات', sedr: 'سدر وحنة', other: 'خدمات أخرى' };
    const msg = encodeURIComponent(
      `مرحباً، اسمي ${payload.name}، أودّ تأكيد حجزي:\n` +
      `الخدمة: ${svcMap[payload.service] || payload.service}\n` +
      `التاريخ: ${payload.date}\n` +
      `الوقت: ${payload.time}`
    );
    const waLink = document.getElementById('success-whatsapp');
    if (waLink) waLink.href = `https://wa.me/962790932333?text=${msg}`;

  } catch {
    btn.disabled = false;
    btn.textContent = i18n[currentLang].book_submit;
    alert('حدث خطأ. الرجاء المحاولة مجدداً أو التواصل عبر واتساب.');
  }
});

function validate() {
  let ok = true;
  const fields = [
    { id: 'f-name',    err: 'err-name',    check: v => v.trim().length > 1 },
    { id: 'f-phone',   err: 'err-phone',   check: v => v.trim().length > 5 },
    { id: 'f-service', err: 'err-service', check: v => v !== '' },
    { id: 'f-date',    err: 'err-date',    check: v => v !== '' },
    { id: 'f-time',    err: 'err-time',    check: v => v !== '' },
  ];
  fields.forEach(({ id, err, check }) => {
    const el  = document.getElementById(id);
    const errEl = document.getElementById(err);
    if (!check(el?.value || '')) {
      errEl?.classList.add('show');
      ok = false;
    } else {
      errEl?.classList.remove('show');
    }
  });
  return ok;
}

// Re-translate slot message on lang change
const origApplyLang = window.applyLang;
