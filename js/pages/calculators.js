import { formatCurrency } from '../modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const affordabilityForm = document.getElementById('affordability-form');
  affordabilityForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(affordabilityForm);
    const income = Number(fd.get('income'));
    const ratio = Number(fd.get('ratio') || 30) / 100;
    const maxRent = Math.floor(income * ratio);
    document.getElementById('affordability-result').innerHTML = `
      <p>Based on ${ratio * 100}% of your monthly income:</p>
      <div class="calculator__result-value">${formatCurrency(maxRent)}</div>
      <p class="text-muted text-sm mt-4">Recommended maximum monthly rent.</p>`;
  });

  const moveInForm = document.getElementById('movein-form');
  moveInForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(moveInForm);
    const rent = Number(fd.get('rent'));
    const deposit = Number(fd.get('deposit') || rent);
    const agent = Number(fd.get('agent') || 0);
    const transport = Number(fd.get('transport') || 0);
    const supplies = Number(fd.get('supplies') || 0);
    const total = rent + deposit + agent + transport + supplies;
    document.getElementById('movein-result').innerHTML = `
      <table class="compare-table"><tbody>
        <tr><td>First Month Rent</td><td>${formatCurrency(rent)}</td></tr>
        <tr><td>Deposit</td><td>${formatCurrency(deposit)}</td></tr>
        <tr><td>Agent Fee</td><td>${formatCurrency(agent)}</td></tr>
        <tr><td>Transport</td><td>${formatCurrency(transport)}</td></tr>
        <tr><td>Supplies</td><td>${formatCurrency(supplies)}</td></tr>
        <tr><td><strong>Total Move-In Cost</strong></td><td><strong>${formatCurrency(total)}</strong></td></tr>
      </tbody></table>`;
  });
});
