import { requireAuth, requireRole } from '../modules/auth.js';
import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const form = document.getElementById('property-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const amenities = [];
    form.querySelectorAll('input[name="amenities"]:checked').forEach(cb => {
      amenities.push(cb.value);
    });
    
    const propertyData = {
      title: formData.get('title'),
      description: formData.get('description'),
      university: formData.get('university'),
      location: {
        city: formData.get('city')
      },
      rent: Number(formData.get('rent')),
      roomCount: Number(formData.get('roomCount')),
      amenities: amenities,
      status: 'pending'
    };

    try {
      showToast('Submitting property...', 'info');
      
      const response = await api.post('/properties', propertyData);
      
      showToast('Property submitted successfully!', 'success');
      
      setTimeout(() => {
        window.location.href = siteUrl('pages/dashboard/landlord.html');
      }, 1500);
    } catch (err) {
      showToast(err.message || 'Failed to submit property.', 'error');
    }
  });
});
