import { showToast } from '../modules/ui.js';
import { isAuthenticated, requireAuth, getUser } from '../modules/auth.js';
import api from '../modules/api.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMatchCard(match) {
  const p = match.profile || match;
  const user = p.user || {};
  const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ')
    || p.displayName
    || 'Student';
  const uni = typeof p.university === 'object' ? p.university?.name : (p.university || 'Campus');
  const budget = p.budget?.max || p.budget?.min || '—';
  const score = match.compatibilityScore ?? match.score ?? 70;
  return `
    <article class="card card--interactive roommate-card">
      <div class="card__body">
        <span class="roommate-card__match">${Math.round(score)}% Match</span>
        <h2 class="card__title mt-4">${escapeHtml(name)}</h2>
        <p class="text-muted text-sm">${escapeHtml(uni)} · Budget KSh ${Number(budget).toLocaleString?.() || budget}</p>
        <p class="mt-4 text-sm">${escapeHtml(p.bio || 'Looking for a compatible roommate on KampoStay.')}</p>
        <button type="button" class="btn btn--primary btn--sm mt-4" data-connect="${escapeHtml(user.email || '')}">Connect</button>
      </div>
    </article>`;
}

async function ensureProfile() {
  try {
    return await api.get('/roommates/profile');
  } catch {
    const user = getUser();
    const body = {
      bio: 'Student looking for a clean, quiet roommate via KampoStay.',
      budget: { min: 3000, max: 8000, currency: 'KES' },
      lifestyle: {
        sleepSchedule: 'flexible',
        cleanliness: 4,
        noiseTolerance: 3,
        smoking: 'no',
        drinking: 'no',
        guests: 'sometimes',
        cooking: 'sometimes',
        studyHabits: 'moderate',
        pets: false,
      },
      preferences: { gender: 'any', sameUniversity: true },
      interests: ['study', 'campus'],
      isActive: true,
    };
    if (user?.profile?.university) body.university = user.profile.university;
    try {
      return await api.put('/roommates/profile', body);
    } catch {
      return null;
    }
  }
}

async function loadMatches(container, params = {}) {
  container.innerHTML = '<p class="text-muted">Finding compatible roommates…</p>';
  try {
    await ensureProfile();
    const data = await api.get('/roommates/matches', {
      minScore: 40,
      limit: 12,
      gender: params.gender || undefined,
      sameUniversity: params.sameUniversity ? 'true' : undefined,
    });
    const list = Array.isArray(data) ? data : data?.matches || data?.data || [];
    if (!list.length) {
      container.innerHTML = '<p class="text-muted">No matches yet. Create your roommate profile (automatic on first visit) and ask classmates to join KampoStay.</p>';
      return;
    }
    container.innerHTML = list.map(renderMatchCard).join('');
  } catch (err) {
    container.innerHTML = `<p class="text-muted">${escapeHtml(err.message || 'Log in as a student to see roommate matches.')}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const results = document.getElementById('roommate-results');
  const form = document.getElementById('roommate-filters');

  if (!isAuthenticated()) {
    if (results) {
      results.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <p>Log in as a student to create a roommate profile and see compatibility matches.</p>
          <button type="button" class="btn btn--primary mt-4" id="rm-login">Log In to Match</button>
        </div>`;
      document.getElementById('rm-login')?.addEventListener('click', () => requireAuth(window.location.href));
    }
    return;
  }

  loadMatches(results);

  form?.addEventListener('change', () => {
    const fd = new FormData(form);
    loadMatches(results, {
      gender: String(fd.get('gender') || '').toLowerCase() || undefined,
      sameUniversity: Boolean(fd.get('university')),
    });
  });

  results?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-connect]');
    if (!btn) return;
    const email = btn.dataset.connect;
    if (email) window.location.href = `mailto:${email}?subject=KampoStay roommate match`;
    else showToast('Ask them to share contact after you match on KampoStay.', 'info');
  });
});
