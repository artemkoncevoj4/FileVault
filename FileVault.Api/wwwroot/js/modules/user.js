import { showToast } from '../core/ui.js';
import { loadFiles } from './files.js';
import { loadAdminData } from './admin.js';
import { t } from '../core/i18n.js';

export async function login() {
    const login = document.getElementById('loginInput').value;
    const password = document.getElementById('passwordInput').value;

    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('vault_user', JSON.stringify(data.user));
        
        showToast(t('toastLoginSuccess')); // Используем t()
        
        // Call global checkAuth function defined in main.js
        if (window.checkAuth) window.checkAuth();
        
        // Load files
        await loadFiles();
        
        // If admin, load user list
        if (data.user.accessLevel >= 5) {
            setTimeout(() => loadAdminData(), 100);
        }
    } else {
        const error = await res.text();
        showToast(t('toastLoginFail'), 'error');
    }
}

export async function logout() {
    try {
        await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'same-origin' 
        });
    } catch (e) {
        console.error("Logout request failed:", e);
    }

    localStorage.removeItem('vault_user');
    window.location.reload();
}

export async function register() {
    const login = document.getElementById('loginInput').value;
    const password = document.getElementById('passwordInput').value;

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
    });

    if (response.ok) {
        showToast(t('toastRegSuccess'));
    } else {
        const error = await response.text();
        showToast(t('toastRegError'), 'error');
    }
}