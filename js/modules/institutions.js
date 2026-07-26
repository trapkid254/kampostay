import { INSTITUTIONS, INSTITUTION_STATS } from '../data/institutions.js';

const MAX_RESULTS = 12;

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchInstitutions(query, { limit = MAX_RESULTS, category = 'all' } = {}) {
  const q = normalize(query);
  let list = INSTITUTIONS;

  if (category === 'university') {
    list = list.filter((i) => i.category === 'University');
  } else if (category === 'college') {
    list = list.filter((i) => i.category === 'College');
  }

  if (!q) {
    return list.slice(0, limit);
  }

  const scored = [];
  for (const inst of list) {
    const name = normalize(inst.name);
    const key = normalize(inst.key);
    const county = normalize(inst.county);
    let score = 0;

    if (key === q || name === q) score = 100;
    else if (key.startsWith(q) || name.startsWith(q)) score = 80;
    else if (key.includes(q) || name.includes(q)) score = 60;
    else if (county.startsWith(q) || county.includes(q)) score = 40;
    else if (q.split(' ').every((part) => name.includes(part))) score = 50;

    if (score > 0) scored.push({ inst, score });
  }

  scored.sort((a, b) => b.score - a.score || a.inst.name.localeCompare(b.inst.name));
  return scored.slice(0, limit).map((s) => s.inst);
}

export function findInstitution(value) {
  if (!value) return null;
  const q = normalize(value);
  return (
    INSTITUTIONS.find((i) => normalize(i.key) === q || normalize(i.name) === q) ||
    INSTITUTIONS.find((i) => normalize(i.name).includes(q) || normalize(i.key).includes(q)) ||
    null
  );
}

function formatLabel(inst) {
  const kind = inst.category === 'University' ? inst.type || 'University' : 'College / TVET';
  const county = inst.county ? ` · ${titleCase(inst.county)}` : '';
  return `${titleCase(inst.name)} (${kind}${county})`;
}

function titleCase(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bOf\b/g, 'of')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bTvet\b/g, 'TVET')
    .replace(/\bTti\b/g, 'TTI')
    .replace(/\bTvc\b/g, 'TVC')
    .replace(/\bTtc\b/g, 'TTC')
    .replace(/\bKmtc\b/g, 'KMTC')
    .replace(/\bJkuat\b/g, 'JKUAT')
    .replace(/\bUon\b/g, 'UoN');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Enhance a native <select name="university"> (or any select) into a searchable combobox.
 * Keeps a hidden input with the same name for form submission.
 */
export function enhanceInstitutionSelect(select, options = {}) {
  if (!select || select.dataset.institutionEnhanced === 'true') return null;

  const {
    placeholder = 'Search university or college…',
    emptyLabel = 'All institutions',
    category = 'all',
    allowEmpty = true,
  } = options;

  const name = select.getAttribute('name') || 'university';
  const originalId = select.id || `institution-${Math.random().toString(36).slice(2, 8)}`;
  const id = originalId;
  const fromUrl = new URLSearchParams(window.location.search).get(name) || '';
  const initial = select.value || fromUrl || '';

  select.dataset.institutionEnhanced = 'true';
  select.hidden = true;
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;

  const wrap = document.createElement('div');
  wrap.className = 'institution-picker';
  wrap.dataset.category = category;

  wrap.innerHTML = `
    <div class="institution-picker__control">
      <input type="search" class="form-input institution-picker__input" id="${id}-search"
        placeholder="${escapeHtml(placeholder)}" autocomplete="off" spellcheck="false"
        aria-autocomplete="list" aria-controls="${id}-list" aria-expanded="false" role="combobox">
      <button type="button" class="institution-picker__clear" hidden aria-label="Clear selection">×</button>
    </div>
    <input type="hidden" name="${name}" id="${id}" value="${escapeHtml(initial)}">
    <ul class="institution-picker__list" id="${id}-list" role="listbox" hidden></ul>
    <p class="institution-picker__hint text-sm text-muted">${INSTITUTION_STATS.universities} universities · ${INSTITUTION_STATS.colleges} colleges/TVET · ${INSTITUTION_STATS.counties} counties (KUCCPS)</p>
  `;

  const label = document.querySelector(`label[for="${originalId}"]`);
  select.insertAdjacentElement('afterend', wrap);
  select.removeAttribute('name');
  select.removeAttribute('id');
  if (label) label.setAttribute('for', `${id}-search`);

  const input = wrap.querySelector('.institution-picker__input');
  const hidden = wrap.querySelector('input[type="hidden"]');
  const list = wrap.querySelector('.institution-picker__list');
  const clearBtn = wrap.querySelector('.institution-picker__clear');

  function setValue(inst) {
    if (!inst) {
      hidden.value = '';
      input.value = '';
      clearBtn.hidden = true;
      select.value = '';
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    hidden.value = inst.name;
    input.value = titleCase(inst.name);
    clearBtn.hidden = false;
    select.value = inst.name;
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (initial) {
    const found = findInstitution(initial);
    if (found) setValue(found);
    else {
      hidden.value = initial;
      input.value = initial;
      clearBtn.hidden = false;
    }
  }

  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function openList(items) {
    const rows = [];
    if (allowEmpty && !normalize(input.value)) {
      rows.push(`<li class="institution-picker__option institution-picker__option--empty" role="option" data-value="">${escapeHtml(emptyLabel)}</li>`);
    }
    for (const inst of items) {
      const badge = inst.category === 'University' ? 'Uni' : 'College';
      rows.push(`
        <li class="institution-picker__option" role="option" data-value="${escapeHtml(inst.name)}" data-key="${escapeHtml(inst.key)}">
          <span class="institution-picker__name">${escapeHtml(titleCase(inst.name))}</span>
          <span class="institution-picker__meta"><span class="institution-picker__badge">${badge}</span>${inst.county ? escapeHtml(titleCase(inst.county)) : ''}</span>
        </li>
      `);
    }
    if (!items.length) {
      rows.push(`<li class="institution-picker__option institution-picker__option--muted" role="presentation">No matches — try another name or county</li>`);
    }
    list.innerHTML = rows.join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function refresh() {
    const q = input.value.trim();
    const items = searchInstitutions(q, { category, limit: MAX_RESULTS });
    openList(items);
  }

  input.addEventListener('focus', refresh);
  input.addEventListener('input', () => {
    if (!input.value.trim()) {
      setValue(null);
    }
    refresh();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeList();
      input.blur();
    }
    if (e.key === 'Enter') {
      const first = list.querySelector('.institution-picker__option[data-value]');
      if (!list.hidden && first) {
        e.preventDefault();
        first.click();
      }
    }
  });

  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const option = e.target.closest('.institution-picker__option[data-value]');
    if (!option) return;
    const value = option.dataset.value;
    if (!value) {
      setValue(null);
      closeList();
      return;
    }
    setValue(findInstitution(value) || { name: value, key: option.dataset.key || value, category: 'University', county: '' });
    closeList();
  });

  clearBtn.addEventListener('click', () => {
    setValue(null);
    input.focus();
    refresh();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeList();
  });

  return { wrap, input, hidden, setValue, getValue: () => hidden.value };
}

export function initInstitutionPickers(root = document) {
  root.querySelectorAll('[data-institution-picker]').forEach((el) => {
    const category = el.dataset.institutionPicker || 'all';
    const allowEmpty = el.dataset.allowEmpty !== 'false';
    const emptyLabel = el.dataset.emptyLabel || (allowEmpty ? 'All institutions' : 'Select institution…');
    enhanceInstitutionSelect(el, {
      category: category === 'true' ? 'all' : category,
      allowEmpty,
      emptyLabel,
      placeholder: el.dataset.placeholder || 'Search university or college…',
    });
  });
}

export { INSTITUTIONS, INSTITUTION_STATS, formatLabel, titleCase };
