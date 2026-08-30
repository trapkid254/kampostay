import { showToast } from '../modules/ui.js';
import api from '../modules/api.js';
import { siteUrl, ROUTES, STORAGE_KEYS } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const loginBtn = form?.querySelector('button[type="submit"]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.email.value;
    const password = form.password.value;
    const remember = form.remember?.checked;

    // Add loading state
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';
      loginBtn.style.opacity = '0.7';
    }

    try {
      showToast('Logging in...', 'info');
      
      const response = await api.post('/auth/login', { email, password, role: 'admin' });
      
      if (response.token || response.accessToken) {
        const token = response.token || response.accessToken;
        const user = response.user;
        
        localStorage.setItem(STORAGE_KEYS.token, token);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        
        if (user?.role !== 'admin') {
          showToast('Access denied. Please use the correct login page for your account type.', 'error');
          localStorage.clear();
          
          // Redirect to appropriate login page
          if (user?.role === 'landlord') {
            window.location.href = siteUrl('pages/landlord/login.html');
          } else if (user?.role === 'student') {
            window.location.href = siteUrl('pages/auth/login.html');
          }
          return;
        }
        
        showToast('Welcome back!', 'success');
        
        // Small delay to ensure localStorage is set before redirect
        setTimeout(() => {
          // Redirect to admin dashboard
          window.location.href = ROUTES.adminDashboard;
        }, 100);
      } else {
        showToast('Login failed. No token received.', 'error');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      // Remove loading state
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Log In as Admin';
        loginBtn.style.opacity = '1';
      }
    }
  });
});
