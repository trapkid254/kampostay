import api from './api.js';
import { siteUrl } from '../config.js';

let panelOpen = false;
let messagesEl = null;
let busy = false;
const SESSION_KEY = 'kampostay-ai-session';
const TYPING_MS = 5000;

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const FALLBACK_RESPONSES = [
  'Karibu — I am KampoStay AI. How can I help with student housing today?',
  'I can help you search rooms, explain M-Pesa booking, or answer questions about KampoStay. What do you need?',
  'Tell me your university and budget when you are ready to search, or just say hello and we can start from there.',
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initAIWidget() {
  const widget = document.getElementById('ai-widget');
  if (!widget) return;

  const toggle = widget.querySelector('[data-ai-toggle]');
  const panel = widget.querySelector('.ai-widget__panel');
  const form = widget.querySelector('[data-ai-form]');
  messagesEl = widget.querySelector('.ai-widget__messages');

  toggle?.addEventListener('click', () => {
    panelOpen = !panelOpen;
    panel?.classList.toggle('is-open', panelOpen);
    toggle.setAttribute('aria-expanded', panelOpen);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;

    const input = form.querySelector('input[name="message"]');
    const message = input?.value.trim();
    if (!message) return;

    busy = true;
    appendMessage(message, 'user');
    input.value = '';
    input.disabled = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    showTypingIndicator();

    try {
      const [response] = await Promise.all([
        api.post('/ai/assist', {
          message,
          context: { sessionId: getSessionId() },
        }),
        wait(TYPING_MS),
      ]);

      removeTyping();
      let reply = response.reply || response.message || response.explanation;
      if (response.suggestions?.length) {
        const tips = response.suggestions.map((s) => {
          const verified = s.verified ? ' · verified' : '';
          const link = `${siteUrl('pages/property.html')}?id=${s.id}`;
          return `• ${s.title} — KSh ${Number(s.rent || 0).toLocaleString()}/mo (score ${s.score || '—'}${verified})\n  ${link}`;
        }).join('\n');
        reply = `${reply}\n\nOpen a listing:\n${tips}`;
      }
      appendMessage(reply || FALLBACK_RESPONSES[0], 'bot');
    } catch {
      removeTyping();
      await wait(Math.max(0, TYPING_MS - 500));
      removeTyping();
      appendMessage(FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)], 'bot');
    } finally {
      busy = false;
      input.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
      input.focus();
    }
  });

  appendMessage(
    'Karibu! I am KampoStay AI — your student housing advisor. Say hi, ask how KampoStay works, or tell me your campus and budget when you want to search.',
    'bot'
  );
}

function removeTyping() {
  messagesEl?.querySelector('[data-typing]')?.remove();
}

function showTypingIndicator() {
  if (!messagesEl) return;
  removeTyping();
  const div = document.createElement('div');
  div.className = 'ai-message ai-message--bot ai-message--typing';
  div.dataset.typing = 'true';
  div.innerHTML = `
    <span class="ai-typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>
    <span class="ai-message__typing-label">KampoStay AI is typing…</span>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(text, role) {
  if (!messagesEl) return;
  removeTyping();
  const div = document.createElement('div');
  div.className = `ai-message ai-message--${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

export function renderAIWidgetHTML() {
  return `
    <div id="ai-widget" class="ai-widget" aria-label="KampoStay AI housing advisor">
      <div class="ai-widget__panel" role="dialog" aria-label="KampoStay AI chat">
        <div class="ai-widget__header">KampoStay AI</div>
        <div class="ai-widget__messages" role="log" aria-live="polite"></div>
        <form class="ai-widget__input" data-ai-form>
          <input type="text" name="message" class="form-input" placeholder="Say hi, or ask about housing…" aria-label="Message" autocomplete="off">
          <button type="submit" class="btn btn--primary btn--sm">Send</button>
        </form>
      </div>
      <button type="button" class="ai-widget__toggle" data-ai-toggle aria-expanded="false" aria-label="Open KampoStay AI">
        <svg class="icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>
      </button>
    </div>`;
}
