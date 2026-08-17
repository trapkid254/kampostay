import { openModal, closeModal, showToast } from '../modules/ui.js';
import { isAuthenticated, requireAuth } from '../modules/auth.js';
import api from '../modules/api.js';
import { SUPPORT_WHATSAPP_INT } from '../config.js';

const PLACEHOLDER_IMG = '../icons/logo.png';

const CATEGORY_IMAGES = {
  books: PLACEHOLDER_IMG,
  Books: PLACEHOLDER_IMG,
  Textbooks: PLACEHOLDER_IMG,
  furniture: PLACEHOLDER_IMG,
  Furniture: PLACEHOLDER_IMG,
  electronics: PLACEHOLDER_IMG,
  Electronics: PLACEHOLDER_IMG,
  clothing: PLACEHOLDER_IMG,
  Clothing: PLACEHOLDER_IMG,
  appliances: PLACEHOLDER_IMG,
  other: PLACEHOLDER_IMG,
  Other: PLACEHOLDER_IMG,
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const CATEGORY_MAP = {
  Textbooks: 'books',
  Books: 'books',
  Furniture: 'furniture',
  Electronics: 'electronics',
  Clothing: 'clothing',
  Appliances: 'appliances',
  Other: 'other',
};

function formatPrice(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createListingCard(item) {
  const title = item.title || 'Item';
  const category = item.category || 'other';
  const location = item.location?.city || item.location || 'Kenya';
  const condition = item.condition || 'good';
  const image = item.images?.[0]?.url || item.image || CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Other;
  const contact = item.contactPhone || item.seller?.profile?.phone || item.seller?.email || '';
  const card = document.createElement('div');
  card.className = 'card card--interactive marketplace-item';
  card.dataset.category = category;
  card.innerHTML = `
    <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="marketplace-item__image" width="120" height="120" loading="lazy">
    <div>
      <h3>${escapeHtml(title)}</h3>
      <p class="text-muted text-sm">${escapeHtml(location)} · ${escapeHtml(condition)}</p>
      <p class="card__price mt-4">${formatPrice(item.price)}</p>
    </div>
    <button type="button" class="btn btn--outline btn--sm" data-contact="${escapeHtml(contact)}">Contact</button>
  `;
  return card;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file (JPG, PNG, or WebP).'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image must be 5 MB or smaller.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function initImageUpload(root) {
  const wrap = root?.querySelector?.('[data-image-upload]');
  if (!wrap) return { getDataUrl: async () => '', reset: () => {} };
  const input = wrap.querySelector('.image-upload__input');
  const preview = wrap.querySelector('.image-upload__preview');
  const prompt = wrap.querySelector('.image-upload__prompt');
  const clearBtn = wrap.querySelector('[data-clear-image]');
  let dataUrl = '';

  function clearPreview() {
    dataUrl = '';
    if (input) input.value = '';
    if (preview) {
      preview.hidden = true;
      preview.removeAttribute('src');
    }
    if (prompt) prompt.hidden = false;
    if (clearBtn) clearBtn.hidden = true;
    wrap.classList.remove('has-image');
  }

  async function showPreview(file) {
    try {
      dataUrl = await readImageFile(file);
      if (preview) {
        preview.src = dataUrl;
        preview.hidden = false;
      }
      if (prompt) prompt.hidden = true;
      if (clearBtn) clearBtn.hidden = false;
      wrap.classList.add('has-image');
    } catch (err) {
      clearPreview();
      showToast(err.message || 'Could not use that image.', 'error');
    }
  }

  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) showPreview(file);
    else clearPreview();
  });
  clearBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    clearPreview();
  });

  return {
    getDataUrl: async () => dataUrl || (input?.files?.[0] ? readImageFile(input.files[0]) : ''),
    reset: clearPreview,
  };
}

async function loadListings(listingsEl) {
  if (!listingsEl) return;
  listingsEl.innerHTML = '<p class="text-muted">Loading marketplace…</p>';
  try {
    const data = await api.get('/marketplace');
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    listingsEl.innerHTML = '';
    if (!items.length) {
      listingsEl.innerHTML = '<p class="text-muted">No items yet. Be the first to sell something.</p>';
      return;
    }
    items.forEach((item) => listingsEl.appendChild(createListingCard(item)));
  } catch {
    listingsEl.innerHTML = '<p class="text-muted">Could not load marketplace. Start the API, or list an item while online later.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sellBtn = document.querySelector('[data-sell-item]');
  const sellForm = document.getElementById('sell-item-form');
  const listings = document.getElementById('marketplace-listings');
  const chips = document.querySelectorAll('[data-market-filter]');
  const imageUpload = initImageUpload(document.getElementById('sell-item-modal') || document);

  loadListings(listings);

  sellBtn?.addEventListener('click', () => {
    if (!isAuthenticated()) {
      requireAuth(window.location.href);
      return;
    }
    openModal('sell-item-modal');
  });

  sellForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAuthenticated()) {
      requireAuth(window.location.href);
      return;
    }
    const fd = new FormData(sellForm);
    const title = String(fd.get('title') || '').trim();
    const categoryLabel = String(fd.get('category') || 'Other');
    const category = CATEGORY_MAP[categoryLabel] || String(categoryLabel).toLowerCase() || 'other';
    const price = Number(fd.get('price'));
    const location = String(fd.get('location') || '').trim();
    const conditionRaw = String(fd.get('condition') || 'good').toLowerCase().replace(/\s+/g, '_');
    const condition = ['new', 'like_new', 'good', 'fair', 'poor'].includes(conditionRaw)
      ? conditionRaw
      : 'good';
    const contact = String(fd.get('contact') || '').trim();
    const description = String(fd.get('description') || title);

    if (!title || !price || !location || !contact) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    const submitBtn = document.querySelector('button[form="sell-item-form"][type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Listing…';
    }

    try {
      const uploaded = await imageUpload.getDataUrl();
      const image = uploaded || CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Other;
      const created = await api.post('/marketplace', {
        title,
        description,
        category,
        price,
        condition,
        contactPhone: contact,
        location: { city: location, county: location },
        images: [{ url: image, isPrimary: true }],
      });
      listings?.prepend(createListingCard(created || {
        title, category, price, condition, contactPhone: contact, location: { city: location }, images: [{ url: image }],
      }));
      sellForm.reset();
      imageUpload.reset();
      closeModal('sell-item-modal');
      showToast('Your item is listed on KampoStay Marketplace!', 'success');
    } catch (err) {
      showToast(err.message || 'Could not list item. Make sure you are logged in.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'List Item';
      }
    }
  });

  listings?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-contact]');
    if (!btn) return;
    const contact = btn.dataset.contact;
    if (contact) {
      // Always open WhatsApp chat with the platform support number
      window.open(`https://wa.me/${SUPPORT_WHATSAPP_INT}`, '_blank', 'noopener');
    } else {
      // Fallback to support WhatsApp when seller contact not available
      window.open(`https://wa.me/${SUPPORT_WHATSAPP_INT}`, '_blank', 'noopener');
    }
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      chips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      const filter = String(chip.dataset.marketFilter || 'All').toLowerCase();
      listings?.querySelectorAll('.marketplace-item').forEach((item) => {
        const cat = String(item.dataset.category || 'all').toLowerCase();
        item.hidden = filter !== 'all' && cat !== filter && cat !== CATEGORY_MAP[chip.dataset.marketFilter];
      });
    });
  });
});
