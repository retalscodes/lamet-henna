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
  dateInput.addEventListener('change', onDateChange);
}

// Call ID: only the latest call is allowed to render
let currentSlotCall = 0;

function onDateChange() {
  const d = new Date(dateInput.value);
  if (d.getUTCDay() === 5) { // Friday
    dateInput.value = '';
    showSlotsMsg(i18n[currentLang].book_friday_note);
    clearSlots();
    return;
  }
  loadSlots(dateInput.value);
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
  const myCall = ++currentSlotCall; // stamp this call
  showSlotsMsg(i18n[currentLang].book_loading_slots);
  clearSlots();

  try {
    const res = await fetch(`/.netlify/functions/get-slots?date=${date}`);
    const { slots } = await res.json();

    // If a newer call happened while we were fetching, throw away this result
    if (myCall !== currentSlotCall) return;

    const grid = document.getElementById('slots-grid');
    const msg  = document.getElementById('slots-msg');

    if (!slots || slots.length === 0) {
      showSlotsMsg(i18n[currentLang].book_no_slots);
      return;
    }

    msg.style.display = 'none';
    grid.innerHTML = ''; // clear before rendering
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
    if (myCall !== currentSlotCall) return;
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

  const rawTime = document.getElementById('f-time').value;
  // Normalize to HH:MM:SS for Postgres TIME type
  const time = rawTime.length === 5 ? rawTime + ':00' : rawTime;

  const payload = {
    name:    document.getElementById('f-name').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    email:   document.getElementById('f-email').value.trim(),
    service: document.getElementById('f-service').value,
    date:    document.getElementById('f-date').value,
    time,
    notes:   document.getElementById('f-notes').value.trim(),
  };

  try {
    const res = await fetch('/.netlify/functions/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error();

    document.getElementById('booking-form').classList.add('hidden');
    document.getElementById('booking-success').classList.remove('hidden');

    const svcMap = { henna: 'حنة', events: 'تنظيم فعاليات', sedr: 'سدر وحنة', other: 'خدمات أخرى' };
    const waMsg = encodeURIComponent(
      `مرحباً، اسمي ${payload.name}، أودّ تأكيد حجزي:\n` +
      `الخدمة: ${svcMap[payload.service] || payload.service}\n` +
      `التاريخ: ${payload.date}\n` +
      `الوقت: ${rawTime}`
    );
    const waLink = document.getElementById('success-whatsapp');
    if (waLink) waLink.href = `https://wa.me/962790932333?text=${waMsg}`;

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
    const el    = document.getElementById(id);
    const errEl = document.getElementById(err);
    if (!check(el?.value || '')) { errEl?.classList.add('show'); ok = false; }
    else errEl?.classList.remove('show');
  });
  return ok;
}
