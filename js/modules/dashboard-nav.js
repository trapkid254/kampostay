import { icon } from './icons.js';

const panelListeners = new Set();

/** Inject Lucide-style SVGs into `[data-nav-icon]` items. */
export function initDashboardNavIcons(root = document) {
  root.querySelectorAll('[data-nav-icon]').forEach((el) => {
    const name = el.dataset.navIcon;
    if (!name || el.querySelector('.icon')) return;
    const svg = icon(name, 'icon icon--nav');
    if (!svg) return;
    el.insertAdjacentHTML('afterbegin', svg);
  });
}

export function showDashboardPanel(panelId) {
  if (!panelId) return;
  document.querySelectorAll('.dashboard__nav-link').forEach((l) => {
    const active = l.dataset.panel === panelId;
    l.classList.toggle('is-active', active);
    if (active) l.setAttribute('aria-current', 'page');
    else l.removeAttribute('aria-current');
  });
  document.querySelectorAll('.dashboard__panel').forEach((p) => {
    const active = p.dataset.panel === panelId;
    p.classList.toggle('is-active', active);
    if (active) p.removeAttribute('hidden');
    else p.setAttribute('hidden', '');
  });
}

/** Panel switcher for student / landlord / admin sidebars. */
export function bindDashboardPanels(onPanel) {
  if (typeof onPanel === 'function') panelListeners.add(onPanel);

  const nav = document.querySelector('.dashboard__nav');
  if (!nav) return;

  if (nav.dataset.bound !== 'true') {
    nav.dataset.bound = 'true';
    nav.addEventListener('click', (e) => {
      const link = e.target.closest('[data-panel]');
      if (!link || !nav.contains(link)) return;
      e.preventDefault();
      e.stopPropagation();
      const panel = link.dataset.panel;
      showDashboardPanel(panel);
      panelListeners.forEach((fn) => {
        try { fn(panel); } catch { /* ignore listener errors */ }
      });
    });
  }

  const initial = document.querySelector('.dashboard__nav-link.is-active')?.dataset.panel
    || document.querySelector('.dashboard__nav-link')?.dataset.panel;
  if (initial) showDashboardPanel(initial);
}
