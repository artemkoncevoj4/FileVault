import { apiRequest } from "../core/api.js";
import { showToast } from "../core/ui.js";
import { t } from "../core/i18n.js"; // Наш главный помощник

export async function deleteUser(userId) {
    // Используем общее подтверждение удаления из словаря
    if (!confirm(t('confirmDelete'))) return;

    const res = await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
    if (res.ok) {
        showToast(t('toastUserDeleted'));
        loadAdminData();
    } else {
        // Если что-то пошло не так, выводим общую ошибку
        showToast(t('toastRegError'), 'error');
    }
}
    
export async function changeLevel(userId) {
    const newLvl = document.getElementById(`lvl-${userId}`).value;
    const res = await apiRequest(`/api/admin/users/${userId}/access`, 'PUT', parseInt(newLvl));
    
    if (res.ok) {
        showToast(t('toastLvlUpdated'));
    } else {
        showToast(t('toastNetError'), 'error');
    }
}

export async function loadAdminData() {
    const res = await apiRequest('/api/admin/users');
    if (res.ok) {
        const users = await res.json();
        const tbody = document.getElementById('usersTable');
        
        // Генерируем строки таблицы с переведенными кнопками
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.login}</td>
                <td>
                    <input type="number" value="${u.accessLevel}" id="lvl-${u.id}" style="width:50px">
                </td>
                <td>
                    <button onclick="changeLevel(${u.id})" class="btn-success">
                        ${t('adminOkBtn')}
                    </button>
                    <button onclick="deleteUser(${u.id})" class="btn-danger" style="padding: 5px 10px;">
                        ${t('deleteBtn')}
                    </button>
                </td>
            </tr>
        `).join('');
    }
}