import { siteUrl } from '../config.js';
import { showToast } from './ui.js';

let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      // Resolve from this module so GitHub Pages + nested pages all work
      const sw = new URL('../../sw.js', import.meta.url);
      const scope = new URL('../../', import.meta.url);
      const reg = await navigator.serviceWorker.register(sw.href, { scope: scope.href });
      console.info('[KampoStay PWA] Registered:', reg.scope);
    } catch (err) {
      console.warn('[KampoStay PWA] Registration failed:', err);
    }
  });
}

async function triggerInstall(btn) {
  if (isStandalone()) {
    showToast('KampoStay is already installed on this device.', 'success');
    return;
  }

  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') {
      showToast('KampoStay installed — open it from your home screen.', 'success');
      document.querySelectorAll('[data-pwa-install]').forEach((el) => {
        el.hidden = true;
      });
      document.getElementById('pwa-install-banner')?.remove();
    }
    return;
  }

  // No native prompt (iOS / desktop without criteria) → open install guide
  const guide = siteUrl('pages/download.html');
  if (!window.location.pathname.includes('download.html')) {
    window.location.href = guide;
  } else {
    showToast('Use Share → Add to Home Screen (iPhone) or your browser Install menu.', 'info');
  }
}

export function initInstallPrompt() {
  if (isStandalone()) {
    document.querySelectorAll('[data-pwa-install]').forEach((el) => {
      el.hidden = true;
    });
    return;
  }

  // Always show install CTAs (not only after beforeinstallprompt)
  document.querySelectorAll('[data-pwa-install]').forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerInstall(btn);
    });
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.querySelectorAll('[data-pwa-install]').forEach((btn) => {
      btn.hidden = false;
    });
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    showToast('KampoStay app installed successfully.', 'success');
    document.getElementById('pwa-install-banner')?.remove();
  });

  // Soft banner after a short delay if not dismissed
  setTimeout(() => {
    if (!deferredPrompt && !sessionStorage.getItem('kampostay-pwa-banner-dismissed')) {
      showInstallBanner(true);
    }
  }, 4000);
}

function showInstallBanner(soft = false) {
  if (isStandalone() || document.getElementById('pwa-install-banner')) return;
  if (sessionStorage.getItem('kampostay-pwa-banner-dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Install KampoStay app');
  banner.innerHTML = `
    <div class="pwa-banner__inner">
      <img src="${siteUrl('icons/splash-192.png')}" alt="" width="40" height="40" class="pwa-banner__icon">
      <div class="pwa-banner__text">
        <strong>Get the KampoStay app</strong>
        <span>${soft ? 'Install for faster access on your phone' : 'Ready to install — one tap'}</span>
      </div>
      <button type="button" class="btn btn--accent btn--sm" data-pwa-install>Install</button>
      <a class="btn btn--ghost btn--sm pwa-banner__link" href="${siteUrl('pages/download.html')}">Details</a>
      <button type="button" class="pwa-banner__close" data-pwa-dismiss aria-label="Dismiss">&times;</button>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector('[data-pwa-dismiss]')?.addEventListener('click', () => {
    sessionStorage.setItem('kampostay-pwa-banner-dismissed', '1');
    banner.remove();
  });

  banner.querySelectorAll('[data-pwa-install]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerInstall(btn);
    });
  });
}

/** Inject Download App into nav + footer when missing */
export function injectDownloadLinks() {
  const downloadHref = siteUrl('pages/download.html');

  document.querySelectorAll('.nav__links').forEach((nav) => {
    if (nav.querySelector('[data-nav-download]')) return;
    const a = document.createElement('a');
    a.href = downloadHref;
    a.className = 'nav__link nav__link--download';
    a.dataset.navDownload = 'true';
    a.textContent = 'Get App';
    nav.appendChild(a);
  });

  document.querySelectorAll('.footer__links').forEach((list) => {
    const heading = list.closest('div')?.querySelector('.footer__heading');
    if (heading && /explore|company|account/i.test(heading.textContent || '')) {
      if (list.querySelector('[data-footer-download]')) return;
      if (/explore/i.test(heading.textContent || '')) {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${downloadHref}" data-footer-download>Download App</a>`;
        list.appendChild(li);
      }
    }
  });
}

export { isStandalone, triggerInstall };
