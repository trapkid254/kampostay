import { initAdvancedFilters } from '../modules/search.js';

document.addEventListener('DOMContentLoaded', () => {
  initAdvancedFilters();

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      chip.classList.toggle('is-active');
      const input = chip.querySelector('input');
      if (input) input.checked = chip.classList.contains('is-active');
    });
  });
});
