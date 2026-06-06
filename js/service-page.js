/* ── Runs on henna.html / events.html / sedr.html ──
   Requires SERVICE_PAGE to be set before this script loads. */

async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  const placeholder = document.getElementById('gallery-placeholder-item');
  if (!grid) return;

  try {
    const res = await fetch(`/.netlify/functions/get-gallery?service=${SERVICE_PAGE}`);
    const { images } = await res.json();

    if (!images || images.length === 0) {
      // Keep the single placeholder but update text
      if (placeholder) {
        placeholder.querySelector('span').textContent = '';
        placeholder.querySelector('svg').style.opacity = '0.3';
      }
      return;
    }

    grid.innerHTML = images.map(img => `
      <div class="gallery-item">
        <img src="${img.image_url}" alt="" loading="lazy">
      </div>
    `).join('');
  } catch {
    // Silently keep placeholder on error
  }
}

async function loadPricing() {
  const grid = document.getElementById('pricing-grid');
  const placeholder = document.getElementById('pricing-placeholder');
  if (!grid) return;

  try {
    const res = await fetch(`/.netlify/functions/get-pricing?service=${SERVICE_PAGE}`);
    const { pricing } = await res.json();

    if (!pricing || pricing.length === 0) {
      // Hide the whole pricing section if nothing set yet
      const section = grid.closest('.pricing-section');
      if (section) section.style.display = 'none';
      return;
    }

    grid.innerHTML = pricing.map(p => `
      <div class="pricing-card fade-up">
        <div class="price-amount">${p.amount} <span class="price-currency">JD</span></div>
        <h4>${p.label}</h4>
        ${p.description ? `<p>${p.description}</p>` : ''}
      </div>
    `).join('');

    // Re-observe newly added cards for scroll animation
    grid.querySelectorAll('.fade-up').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.08}s`;
      observer.observe(el);
    });

  } catch {
    const section = grid.closest('.pricing-section');
    if (section) section.style.display = 'none';
  }
}

loadGallery();
loadPricing();
