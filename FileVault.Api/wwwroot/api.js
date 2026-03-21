import {showToast} from './ui.js';
export async function apiRequest(url, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        
        const options = { 
            method, 
            headers,
            // Добавляем это, чтобы fetch корректно работал с куками
            credentials: 'same-origin' 
        };
        
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                showToast("Сессия истекла", "error");
                logout();
                return { ok: false };
            }
            return response;
        } catch (e) {
            return { ok: false };
        }
    }