import { STORAGE_KEYS } from '../config.js';

function getNotifications() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.notifications) || '[]');
  } catch {
    return [];
  }
}

function saveNotifications(list) {
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(list));
}

export function addNotification(title, message, type = 'info') {
  const list = getNotifications();
  list.unshift({
    id: Date.now().toString(),
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  });
  if (list.length > 50) list.length = 50;
  saveNotifications(list);
  updateNotificationBadge();
}

export function markAllRead() {
  const list = getNotifications().map((n) => ({ ...n, read: true }));
  saveNotifications(list);
  updateNotificationBadge();
}

export function getUnreadCount() {
  return getNotifications().filter((n) => !n.read).length;
}

export function updateNotificationBadge() {
  const count = getUnreadCount();
  document.querySelectorAll('[data-notifications-count]').forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
  });
}

export function renderNotificationsList(container) {
  if (!container) return;
  const list = getNotifications();

  if (!list.length) {
    container.innerHTML = '<p class="text-muted">No notifications yet.</p>';
    return;
  }

  container.innerHTML = list.map((n) => `
    <div class="glass-panel" style="padding:var(--space-4);margin-bottom:var(--space-3);${n.read ? '' : 'border-left:3px solid var(--color-accent);'}">
      <strong>${n.title}</strong>
      <p class="text-muted text-sm mt-4">${n.message}</p>
      <time class="text-sm text-muted">${new Date(n.createdAt).toLocaleDateString('en-KE')}</time>
    </div>
  `).join('');
}

export function seedDemoNotifications() {
  // No static demo notifications — portals use the live /notifications API.
}
