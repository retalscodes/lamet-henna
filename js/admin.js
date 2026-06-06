/* ── Admin Panel Logic ── */
const SESSION_KEY = 'lh_admin_token';
let authToken = sessionStorage.getItem(SESSION_KEY);
let currentFilter = 'all';
let allBookings = [];
let pendingFiles = [];

// Time slots available (10AM–5PM, hourly)
const TIME_SLOTS = ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const TIME_LABELS = {
  '10:00': '10:00 ص', '11:00': '11:00 ص', '12:00': '12:00 م',
  '13:00': '1:00 م',  '14:00': '2:00 م',  '15:00': '3:00 م',
  '16:00': '4:00 م',  '17:00': '5:00 م',
};

/* ── Auth ── */
function showDashboard() {
  document.getElementById('login-wrap').style.display = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';
  buildTimeCheckboxes();
  loadBookings();
}

if (authToken) showDashboard();

document.getElementById('login-btn')?.addEventListener('click', login);
document.getElementById('admin-pass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

async function login() {
  const pass = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('login-error');
  errEl?.classList.add('hidden');

  try {
    const res = await fetch('/.netlify/functions/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass }),
    });
    const data = await res.json();
    if (data.token) {
      authToken = data.token;
      sessionStorage.setItem(SESSION_KEY, authToken);
      showDashboard();
    } else {
      errEl?.classList.remove('hidden');
    }
  } catch {
    errEl?.classList.remove('hidden');
  }
}

document.getElementById('logout-btn')?.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  authToken = null;
  document.getElementById('admin-dashboard').style.display = 'none';
  document.getElementById('login-wrap').style.display = 'flex';
});

/* ── Tabs ── */
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    ['bookings','slots','gallery','pricing'].forEach(t =>
      document.getElementById(`tab-${t}`)?.classList.add('hidden')
    );
    document.getElementById(`tab-${tab.dataset.tab}`)?.classList.remove('hidden');
    if (tab.dataset.tab === 'gallery') loadAdminGallery();
    if (tab.dataset.tab === 'pricing') loadAdminPricing();
  });
});

/* ── Lang toggle in dashboard ── */
document.getElementById('lang-btn-dash')?.addEventListener('click', () => {
  applyLang(currentLang === 'ar' ? 'en' : 'ar');
  document.getElementById('lang-btn-dash').textContent = currentLang === 'ar' ? 'English' : 'العربية';
  renderBookings();
});

/* ── Filters ── */
document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderBookings();
  });
});

document.getElementById('refresh-btn')?.addEventListener('click', loadBookings);

/* ── Load bookings ── */
async function loadBookings() {
  const list = document.getElementById('bookings-list');
  list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;">⏳</p>';

  try {
    const res = await fetch('/.netlify/functions/admin-get-bookings', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    allBookings = data.bookings || [];
    renderBookings();
  } catch {
    list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:40px;">خطأ في التحميل</p>';
  }
}

const SERVICE_LABELS = {
  henna: 'حنة', events: 'تنظيم فعاليات', sedr: 'سدر وحنة', other: 'أخرى',
};

function renderBookings() {
  const list = document.getElementById('bookings-list');
  const filtered = currentFilter === 'all'
    ? allBookings
    : allBookings.filter(b => b.status === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:40px;" data-i18n="admin_no_bookings">${i18n[currentLang].admin_no_bookings}</p>`;
    return;
  }

  list.innerHTML = filtered.map(b => {
    const statusLabel = i18n[currentLang][`admin_status_${b.status}`] || b.status;
    const svcLabel = SERVICE_LABELS[b.service] || b.service;
    const waMsg = encodeURIComponent(`مرحباً ${b.customer_name}، بخصوص حجزكِ في لمّة حنة يوم ${b.date} الساعة ${b.time}:`);
    return `
    <div class="booking-card" data-id="${b.id}">
      <div class="booking-card-info">
        <h4>${b.customer_name}</h4>
        <div class="meta">
          <span>📞 ${b.customer_phone}</span>
          <span>📅 ${b.date}</span>
          <span>🕐 ${b.time}</span>
          <span>🌿 ${svcLabel}</span>
        </div>
        ${b.notes ? `<p style="font-size:0.82rem;color:var(--muted);margin-top:8px;">📝 ${b.notes}</p>` : ''}
        <span class="status-badge ${b.status}">${statusLabel}</span>
      </div>
      <div class="booking-actions">
        ${b.status !== 'confirmed' ? `<button class="action-btn confirm" onclick="updateBooking('${b.id}','confirmed')" data-i18n="admin_confirm">${i18n[currentLang].admin_confirm}</button>` : ''}
        ${b.status !== 'cancelled' ? `<button class="action-btn cancel" onclick="updateBooking('${b.id}','cancelled')" data-i18n="admin_cancel">${i18n[currentLang].admin_cancel}</button>` : ''}
        <a class="action-btn whatsapp-action" href="https://wa.me/962${b.customer_phone.replace(/^0/,'')}?text=${waMsg}" target="_blank" rel="noopener">${i18n[currentLang].admin_whatsapp} 💬</a>
      </div>
    </div>`;
  }).join('');
}

async function updateBooking(id, status) {
  try {
    const res = await fetch('/.netlify/functions/admin-update-booking', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const b = allBookings.find(x => x.id === id);
      if (b) b.status = status;
      renderBookings();
    }
  } catch { /* silent */ }
}

/* ── Slots Manager ── */
function buildTimeCheckboxes() {
  const container = document.getElementById('time-checkboxes');
  if (!container) return;
  container.innerHTML = TIME_SLOTS.map(t => `
    <label class="time-check-label">
      <input type="checkbox" value="${t}" checked>
      ${TIME_LABELS[t]}
    </label>
  `).join('');
}

// Min date for slot manager
const slotsDateInput = document.getElementById('slots-date');
if (slotsDateInput) {
  slotsDateInput.min = new Date().toISOString().split('T')[0];
}

document.getElementById('save-slots-btn')?.addEventListener('click', async () => {
  const date = document.getElementById('slots-date').value;
  if (!date) { alert('اختاري التاريخ أولاً'); return; }

  const checked = Array.from(document.querySelectorAll('#time-checkboxes input:checked')).map(i => i.value);
  const feedback = document.getElementById('slots-feedback');

  try {
    const res = await fetch('/.netlify/functions/admin-manage-slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ date, times: checked }),
    });
    feedback.classList.remove('hidden');
    feedback.textContent = res.ok
      ? i18n[currentLang].admin_slots_saved + ' ✓'
      : i18n[currentLang].admin_slots_error;
    setTimeout(() => feedback.classList.add('hidden'), 3000);
  } catch {
    feedback.classList.remove('hidden');
    feedback.textContent = i18n[currentLang].admin_slots_error;
  }
});

/* ════════════════════════════════════
   GALLERY MANAGEMENT
════════════════════════════════════ */
const uploadArea = document.getElementById('upload-area');
const galleryFile = document.getElementById('gallery-file');

uploadArea?.addEventListener('click', () => galleryFile?.click());

uploadArea?.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea?.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea?.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
});

galleryFile?.addEventListener('change', () => {
  handleFiles(Array.from(galleryFile.files));
  galleryFile.value = '';
});

function handleFiles(files) {
  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) { alert(`${file.name}: الحجم أكبر من 5MB`); return; }
    pendingFiles.push(file);
    const reader = new FileReader();
    reader.onload = e => addPreview(file, e.target.result);
    reader.readAsDataURL(file);
  });
}

function addPreview(file, dataUrl) {
  const container = document.getElementById('upload-previews');
  const div = document.createElement('div');
  div.className = 'upload-preview-item';
  div.dataset.name = file.name;
  div.innerHTML = `
    <img src="${dataUrl}" alt="${file.name}">
    <button class="preview-remove" onclick="removePreview('${file.name}', this.parentElement)">✕</button>
  `;
  container?.appendChild(div);
  document.getElementById('upload-prompt').style.display = 'none';
}

function removePreview(name, el) {
  pendingFiles = pendingFiles.filter(f => f.name !== name);
  el.remove();
  if (pendingFiles.length === 0) {
    document.getElementById('upload-prompt').style.display = '';
  }
}

document.getElementById('upload-btn')?.addEventListener('click', async () => {
  if (pendingFiles.length === 0) { alert('اختاري صوراً أولاً'); return; }
  const service = document.getElementById('gallery-service').value;
  const feedback = document.getElementById('gallery-feedback');
  const btn = document.getElementById('upload-btn');
  btn.disabled = true;
  btn.textContent = '⏳ جاري الرفع...';

  let successCount = 0;
  for (const file of pendingFiles) {
    const dataUrl = await fileToDataUrl(file);
    try {
      const res = await fetch('/.netlify/functions/admin-upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ service, imageData: dataUrl, fileName: file.name, mimeType: file.type }),
      });
      if (res.ok) successCount++;
    } catch { /* continue */ }
  }

  pendingFiles = [];
  document.getElementById('upload-previews').innerHTML = '';
  document.getElementById('upload-prompt').style.display = '';
  btn.disabled = false;
  btn.textContent = i18n[currentLang].admin_gallery_save;
  feedback.classList.remove('hidden');
  feedback.textContent = successCount > 0
    ? `${i18n[currentLang].admin_gallery_uploaded} (${successCount})`
    : i18n[currentLang].admin_gallery_error;
  setTimeout(() => feedback.classList.add('hidden'), 3000);
  loadAdminGallery();
});

function fileToDataUrl(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.readAsDataURL(file);
  });
}

async function loadAdminGallery() {
  const service = document.getElementById('gallery-view-service')?.value || 'henna';
  const grid = document.getElementById('gallery-grid-admin');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--muted);padding:16px;">⏳</p>';

  try {
    const res = await fetch(`/.netlify/functions/get-gallery?service=${service}`);
    const { images } = await res.json();
    if (!images?.length) { grid.innerHTML = '<p style="color:var(--muted);padding:16px;">لا توجد صور بعد</p>'; return; }
    grid.innerHTML = images.map(img => `
      <div class="admin-gallery-item">
        <img src="${img.image_url}" alt="" loading="lazy">
        <button class="gallery-delete-btn" onclick="deleteGalleryItem('${img.id}','${img.file_path}',this.parentElement)">✕</button>
      </div>
    `).join('');
  } catch {
    grid.innerHTML = '<p style="color:var(--muted);padding:16px;">خطأ في التحميل</p>';
  }
}

async function deleteGalleryItem(id, filePath, el) {
  if (!confirm(i18n[currentLang].admin_gallery_delete_confirm)) return;
  try {
    const res = await fetch('/.netlify/functions/admin-delete-gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ id, filePath }),
    });
    if (res.ok) el.remove();
  } catch { /* silent */ }
}

document.getElementById('gallery-view-service')?.addEventListener('change', loadAdminGallery);

/* ════════════════════════════════════
   PRICING MANAGEMENT
════════════════════════════════════ */
document.getElementById('save-price-btn')?.addEventListener('click', async () => {
  const service  = document.getElementById('price-service').value;
  const label    = document.getElementById('price-label').value.trim();
  const amount   = parseFloat(document.getElementById('price-amount').value);
  const desc     = document.getElementById('price-desc').value.trim();
  const editId   = document.getElementById('price-edit-id').value;
  const feedback = document.getElementById('pricing-feedback');

  if (!label || isNaN(amount)) { alert('الرجاء إدخال اسم الباقة والسعر'); return; }

  try {
    const res = await fetch('/.netlify/functions/admin-save-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ id: editId || undefined, service, label, amount, description: desc }),
    });
    feedback.classList.remove('hidden');
    feedback.textContent = res.ok ? i18n[currentLang].admin_price_saved : i18n[currentLang].admin_price_error;
    if (res.ok) {
      document.getElementById('price-label').value = '';
      document.getElementById('price-amount').value = '';
      document.getElementById('price-desc').value = '';
      document.getElementById('price-edit-id').value = '';
      loadAdminPricing();
    }
    setTimeout(() => feedback.classList.add('hidden'), 3000);
  } catch {
    feedback.classList.remove('hidden');
    feedback.textContent = i18n[currentLang].admin_price_error;
  }
});

async function loadAdminPricing() {
  const service = document.getElementById('pricing-view-service')?.value || 'henna';
  const list = document.getElementById('pricing-list-admin');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--muted);padding:16px;">⏳</p>';

  try {
    const res = await fetch(`/.netlify/functions/get-pricing?service=${service}`);
    const { pricing } = await res.json();
    if (!pricing?.length) { list.innerHTML = `<p style="color:var(--muted);padding:16px;">${i18n[currentLang].admin_no_pricing}</p>`; return; }
    list.innerHTML = pricing.map(p => `
      <div class="price-admin-row">
        <div class="price-admin-info">
          <strong>${p.label}</strong>
          <span class="price-tag">${p.amount} JD</span>
          ${p.description ? `<p>${p.description}</p>` : ''}
        </div>
        <div class="price-admin-actions">
          <button class="action-btn confirm" onclick="editPrice(${JSON.stringify(p).replace(/"/g,'&quot;')})">${i18n[currentLang].admin_price_edit}</button>
          <button class="action-btn cancel" onclick="deletePrice('${p.id}')">${i18n[currentLang].admin_price_delete}</button>
        </div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<p style="color:var(--muted);padding:16px;">خطأ في التحميل</p>';
  }
}

function editPrice(p) {
  document.getElementById('price-service').value  = p.service;
  document.getElementById('price-label').value    = p.label;
  document.getElementById('price-amount').value   = p.amount;
  document.getElementById('price-desc').value     = p.description || '';
  document.getElementById('price-edit-id').value  = p.id;
  document.getElementById('tab-pricing').scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deletePrice(id) {
  if (!confirm(i18n[currentLang].admin_price_delete_confirm)) return;
  try {
    const res = await fetch('/.netlify/functions/admin-save-pricing', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadAdminPricing();
  } catch { /* silent */ }
}

document.getElementById('pricing-view-service')?.addEventListener('change', loadAdminPricing);
