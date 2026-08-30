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
      
      const response = await api.post('/auth/login', { email, password, role: 'landlord' });
      
      if (response.token || response.accessToken) {
        const token = response.token || response.accessToken;
        const user = response.user;
        
        localStorage.setItem(STORAGE_KEYS.token, token);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        
        if (user?.role !== 'landlord') {
          showToast('Access denied. Please use the correct login page for your account type.', 'error');
          localStorage.clear();
          
          // Redirect to appropriate login page
          if (user?.role === 'admin') {
            window.location.href = siteUrl('pages/admin/login.html');
          } else if (user?.role === 'student') {
            window.location.href = siteUrl('pages/auth/login.html');
          }
          return;
        }
        
        showToast('Welcome back!', 'success');
        
        // Redirect to landlord dashboard
        window.location.href = ROUTES.landlordDashboard;
      } else {
        showToast('Login failed. No token received.', 'error');
      }
    } catch (err) {
      console.error('Landlord login error:', err);
      showToast(err.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
      // Remove loading state
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Log In as Landlord';
        loginBtn.style.opacity = '1';
      }
    }
  });
});
