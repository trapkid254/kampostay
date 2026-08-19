import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.email.value;
    const password = form.password.value;
    const remember = form.remember?.checked;

    try {
      showToast('Logging in...', 'info');
      
      const response = await api.post('/auth/login', { email, password, role: 'admin' });
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        showToast('Welcome, Admin!', 'success');
        
        // Redirect to admin dashboard
        setTimeout(() => {
          window.location.href = siteUrl('pages/dashboard/admin.html');
        }, 1000);
      }
    } catch (err) {
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
    }
  });
});
