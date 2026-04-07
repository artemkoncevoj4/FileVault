import {showToast} from './ui.js';
import { t } from '../core/i18n.js'; // Используем только помощник t
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
            window.location.href = '/';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorText = (await response.text()).catch(() => 'Request failed');
            throw new Error(`${response.status}: ${errorText}`);
        }

        return response;
    } catch (e) {
        if(e.message !== 'Unauthorized') {
            showToast(t('toastNetError') || 'Networkerror', 'error');
        }
        throw e;
    }
}