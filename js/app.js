import { initTheme } from './modules/theme.js';
import { updateAuthUI } from './modules/auth.js';
import { initMobileNav, initHeaderScroll, initModals, initRevealOnScroll, initAccordions } from './modules/ui.js';
import { initHeroSearch } from './modules/search.js';
import { initAIWidget, renderAIWidgetHTML } from './modules/ai.js';
import { updateWishlistCount } from './modules/wishlist.js';
import { updateCompareCount } from './modules/compare.js';
import { updateNotificationBadge } from './modules/notifications.js';
import { registerServiceWorker, initInstallPrompt, injectDownloadLinks } from './modules/pwa.js';
import { initInstitutionPickers } from './modules/institutions.js';
import { initDashboardNavIcons, bindDashboardPanels } from './modules/dashboard-nav.js';
import { siteUrl } from './config.js';

function normalizeLogoText() {
  document.querySelectorAll('a.logo').forEach((logo) => {
    if (logo.querySelector('.logo__text')) return;
    const nodes = [...logo.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!nodes.length) return;
    const span = document.createElement('span');
    span.className = 'logo__text';
    span.textContent = nodes.map((n) => n.textContent.trim()).join(' ') || 'KampoStay';
    nodes.forEach((n) => n.remove());
    logo.appendChild(span);
  });
}

function showLaunchSplash() {
  const isApp = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (!isApp) return;

  // Show on cold open (not when navigating between KampoStay pages)
  const fromSameApp = document.referrer && document.referrer.startsWith(window.location.origin);
  if (fromSameApp) return;

  const splash = document.createElement('div');
  splash.className = 'app-splash';
  splash.setAttribute('aria-hidden', 'true');
  splash.innerHTML = `
    <img class="app-splash__icon" src="${siteUrl('icons/splash-512.png')}" alt="" width="128" height="128">
    <p class="app-splash__name">KampoStay</p>
    <p class="app-splash__tag">Student housing · Kenya</p>
  `;
  document.body.appendChild(splash);
  requestAnimationFrame(() => splash.classList.add('is-visible'));
  window.setTimeout(() => {
    splash.classList.add('is-done');
    window.setTimeout(() => splash.remove(), 350);
  }, 1100);
}

function injectAIWidget() {
  if (!document.getElementById('ai-widget')) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderAIWidgetHTML();
    document.body.appendChild(wrapper.firstElementChild);
  }
  initAIWidget();
}

function setActiveNavLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav__link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && path.endsWith(href.replace(/^\//, ''))) {
      link.classList.add('is-active');
    }
  });
}

function initPasswordToggles() {
  document.querySelectorAll('[data-toggle="password"]').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const wrapper = toggle.closest('.form-input-wrapper');
      const input = wrapper?.querySelector('input[type="password"], input[type="text"]');
      const eyeIcon = toggle.querySelector('.eye-icon');
      const eyeOffIcon = toggle.querySelector('.eye-off-icon');
      
      if (!input) return;
      
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      
      if (eyeIcon && eyeOffIcon) {
        eyeIcon.style.display = isPassword ? 'none' : 'block';
        eyeOffIcon.style.display = isPassword ? 'block' : 'none';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  showLaunchSplash();
  normalizeLogoText();
  initTheme();
  updateAuthUI();
  initMobileNav();
  initHeaderScroll();
  initModals();
  initRevealOnScroll();
  initAccordions();
  initInstitutionPickers();
  initHeroSearch();
  setActiveNavLink();
  initPasswordToggles();
  if (document.querySelector('.dashboard__nav')) {
    initDashboardNavIcons();
    bindDashboardPanels();
  }
  updateWishlistCount();
  updateCompareCount();
  updateNotificationBadge();
  injectAIWidget();
  injectDownloadLinks();
  registerServiceWorker();
  initInstallPrompt();
});

export { initTheme, updateAuthUI };
