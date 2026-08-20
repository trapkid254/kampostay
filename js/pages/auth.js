import { login, register, forgotPassword, verifyEmail, getReturnUrl, ROUTES } from '../modules/auth.js';
import { showToast } from '../modules/ui.js';
import { siteUrl } from '../config.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    try {
      const user = await login(fd.get('email'), fd.get('password'));
      
      // Ensure only students can log in through this page
      if (user?.role !== 'student') {
        showToast('Access denied. Please use the correct login page for your account type.', 'error');
        localStorage.clear();
        
        // Redirect to appropriate login page
        if (user?.role === 'admin') {
          window.location.href = siteUrl('pages/admin/login.html');
        } else if (user?.role === 'landlord') {
          window.location.href = siteUrl('pages/landlord/login.html');
        }
        return;
      }
      
      window.location.href = getReturnUrl(user);
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    }
  });

  const registerForm = document.getElementById('register-form');
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    if (fd.get('password') !== fd.get('confirmPassword')) {
      showToast('Passwords do not match', 'error');
      return;
    }
    try {
      await register({
        firstName: fd.get('firstName'),
        lastName: fd.get('lastName'),
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role') || 'student',
        university: fd.get('university'),
      });
      showToast('Account created! Check your email to verify.', 'success');
      window.location.href = siteUrl('pages/auth/verify.html');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    }
  });

  const forgotForm = document.getElementById('forgot-form');
  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(forgotForm);
    try {
      await forgotPassword(fd.get('email'));
      showToast('Reset link sent to your email.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not send reset link', 'error');
    }
  });

  const verifyForm = document.getElementById('verify-form');
  verifyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(verifyForm);
    try {
      await verifyEmail(fd.get('token'));
      showToast('Email verified!', 'success');
      window.location.href = siteUrl('pages/auth/login.html');
    } catch (err) {
      showToast(err.message || 'Verification failed', 'error');
    }
  });
});
