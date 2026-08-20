import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl, ROUTES } from '../config.js';

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
      
      console.log('Admin login response:', response);
      
      if (response.token || response.accessToken) {
        const token = response.token || response.accessToken;
        const user = response.user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('Admin user role:', user?.role);
        
        if (user?.role !== 'admin') {
          showToast('Access denied. Admin account required.', 'error');
          localStorage.clear();
          return;
        }
        
        showToast('Welcome, Admin!', 'success');
        
        // Redirect to admin dashboard
        window.location.href = ROUTES.adminDashboard;
      } else {
        showToast('Login failed. No token received.', 'error');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
    }
  });
});
