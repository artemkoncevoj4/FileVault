import { showToast } from './ui.js';
import { t } from '../core/i18n.js';

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
            localStorage.removeItem('vault_user');
            window.location.href = '/';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            let errorText;
            try {
                errorText = await response.text();
            } catch {
                errorText = 'Request failed';
            }
            const error = new Error(errorText);
            error.status = response.status;   // добавляем статус
            throw error;
        }

        return response;
    } catch (e) {
        throw e;
    }
}