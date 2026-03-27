import {showToast} from './ui.js';
export async function apiRequest(url, method = 'GET', body = null) {
    const options = { 
        method, 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin' 
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        if (response.status === 401) {
            // Instead of direct logout, clear storage and reload
            localStorage.removeItem('vault_user');
            window.location.reload(); 
            return { ok: false };
        }
        return response;
    } catch (e) {
        showToast("Network error", "error");
        return { ok: false };
    }
}