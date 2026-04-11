import { apiRequest } from "../core/api.js";
import { t } from "../core/i18n.js";
import { showToast, showConfirm } from '../core/ui.js';

export async function deleteUser(userId) {
    const confirmed = await showConfirm(t('confirmDelete'));
    if (!confirmed) return;
    try {
        const res = await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
        if (res.ok) {
            showToast(t('toastUserDeleted'));
            loadAdminData();
        }
    } catch (err) {
        if (err.status === 400) {
            showToast(t('toastSelfDelete'), 'error');
        } else {
            showToast(err.message || t('toastRegError'), 'error');
        }
    }
}

export async function changeLevel(userId) {
    const input = document.getElementById(`lvl-${userId}`);
    if (!input) return;
    const newLvl = parseInt(input.value, 10);
    try {
        const res = await apiRequest(`/api/admin/users/${userId}/access`, 'PUT', newLvl);
        if (res.ok) {
            showToast(t('toastLvlUpdated'));
        }
    } catch (err) {
        showToast(err.message || t('toastRegError'), 'error');
    }
}
export async function loadAdminData() {
    const res = await apiRequest('/api/admin/users');
    if (!res.ok) return;
    const users = await res.json();
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => `
        <tr data-user-id="${u.id}">
            <td data-label="${t('thId')}">${u.id}</td>
            <td data-label="${t('thUser')}">${escapeHtml(u.login)}</td>
            <td data-label="${t('thLevel')}">
                <input type="number" value="${u.accessLevel}" id="lvl-${u.id}" class="level-input">
            </td>
            <td data-label="${t('thAction')}" class="actions-cell">
                <button class="btn-sm btn-success" data-action="change-level" data-id="${u.id}">${t('adminOkBtn')}</button>
                <button class="btn-sm btn-danger" data-action="delete-user" data-id="${u.id}">${t('deleteBtn')}</button>
            </td>
        </tr>
    `).join('');
}

// Вспомогательная функция (можно вынести в utils)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}