let toastContainer = null;

export function showToast(message, type = 'info', duration = 4000) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('role', 'status');
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const closeBtn = overlay.querySelector('[data-modal-close]');
  closeBtn?.focus();
}

export function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

export function initModals() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
    overlay.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(overlay.id));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.is-open').forEach((o) => closeModal(o.id));
    }
  });
}

export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('KES', 'KSh');
}

export function createSkeletonCard() {
  return `
    <article class="card">
      <div class="skeleton skeleton--image"></div>
      <div class="card__body">
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton skeleton--text"></div>
        <div class="skeleton skeleton--text" style="width:60%"></div>
      </div>
    </article>`;
}

export function showSkeletonGrid(container, count = 6) {
  if (!container) return;
  container.innerHTML = Array(count).fill(createSkeletonCard()).join('');
}

export function initAccordions() {
  document.querySelectorAll('.accordion__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion__item');
      const isOpen = item.classList.contains('is-open');
      item.closest('.accordion')?.querySelectorAll('.accordion__item').forEach((i) => {
        i.classList.remove('is-open');
        i.querySelector('.accordion__trigger')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

export function initTabs(container = document) {
  container.querySelectorAll('.tabs').forEach((tabBar) => {
    const tabs = tabBar.querySelectorAll('.tab');
    const panels = tabBar.parentElement?.querySelectorAll('.tab-panel') || [];

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('is-active'));
        panels.forEach((p) => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        panels[i]?.classList.add('is-active');
      });
    });
  });
}

export function initRevealOnScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

export function initMobileNav() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('[data-nav-toggle]');
  let links = document.querySelector('.nav__links');
  const actions = document.querySelector('.nav__actions');
  if (!toggle || !nav || !links) return;

  let drawer = nav.querySelector('[data-nav-drawer]');
  if (!drawer) {
    drawer = document.createElement('div');
    drawer.className = 'nav__drawer';
    drawer.dataset.navDrawer = 'true';
    links.parentNode.insertBefore(drawer, links);
    drawer.appendChild(links);
    if (actions) drawer.appendChild(actions);
  }

  // Professional drawer chrome: title + close
  if (!drawer.querySelector('[data-nav-drawer-head]')) {
    const head = document.createElement('div');
    head.className = 'nav__drawer-head';
    head.dataset.navDrawerHead = 'true';
    head.innerHTML = `
      <div class="nav__drawer-brand">
        <span class="nav__drawer-eyebrow">KampoStay</span>
        <strong class="nav__drawer-title">Menu</strong>
      </div>
      <button type="button" class="nav__drawer-close" data-nav-close aria-label="Close menu">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    `;
    drawer.insertBefore(head, drawer.firstChild);

    if (!links.querySelector('.nav__section-label')) {
      const label = document.createElement('p');
      label.className = 'nav__section-label';
      label.textContent = 'Explore';
      links.insertBefore(label, links.firstChild);
    }

    if (actions && !actions.querySelector('.nav__section-label')) {
      const label = document.createElement('p');
      label.className = 'nav__section-label';
      label.textContent = 'Account';
      actions.insertBefore(label, actions.firstChild);
    }
  }

  let overlay = document.querySelector('[data-nav-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'nav__overlay';
    overlay.dataset.navOverlay = 'true';
    overlay.hidden = true;
    document.body.appendChild(overlay);
  }

  const close = () => {
    drawer.classList.remove('is-open');
    links.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    overlay.hidden = true;
    overlay.classList.remove('is-open');
  };

  const open = () => {
    drawer.classList.add('is-open');
    links.classList.add('is-open');
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
  };

  toggle.addEventListener('click', () => {
    if (drawer.classList.contains('is-open')) close();
    else open();
  });

  drawer.querySelector('[data-nav-close]')?.addEventListener('click', close);
  overlay.addEventListener('click', close);
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) close();
  });
}

export function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 20);
  }, { passive: true });
}
