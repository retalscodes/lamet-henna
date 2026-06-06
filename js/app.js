/* ── Language ── */
const LANG_KEY = 'lh_lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'ar';

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[lang] && i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (i18n[lang] && i18n[lang][key]) {
      el.placeholder = i18n[lang][key];
    }
  });

  const langBtn = document.getElementById('lang-btn');
  if (langBtn) langBtn.textContent = lang === 'ar' ? 'English' : 'العربية';
}

document.getElementById('lang-btn')?.addEventListener('click', () => {
  applyLang(currentLang === 'ar' ? 'en' : 'ar');
});

/* ── Navbar scroll shadow ── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ── Mobile hamburger ── */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
hamburger?.addEventListener('click', () => {
  navLinks?.classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!hamburger?.contains(e.target) && !navLinks?.contains(e.target)) {
    navLinks?.classList.remove('open');
  }
});

/* ── Scroll animations ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-up, .detail-card').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  observer.observe(el);
});

/* ── Arrow direction fix for RTL ── */
function fixArrows() {
  document.querySelectorAll('.arrow-icon').forEach(svg => {
    svg.style.transform = currentLang === 'ar' ? 'scaleX(-1)' : 'scaleX(1)';
  });
}

/* ── Init ── */
applyLang(currentLang);
fixArrows();
