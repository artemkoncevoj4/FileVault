import { apiRequest } from "../core/api.js";
import {showToast} from '../core/ui.js';
export async function deleteUser(userId) {
        console.log("Попытка удаления пользователя ID:", userId);
        // if (!confirm(`Удалить пользователя ${userId}?`)) return;

        const res = await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
        if (res.ok) {
            showToast("Пользователь удален");
            loadAdminData();
        } else {
            showToast("Не удалось удалить пользователя", 'error');
        }
}
    
export async function changeLevel(userId) {
        const newLvl = document.getElementById(`lvl-${userId}`).value;
        const res = await apiRequest(`/api/admin/users/${userId}/access`, 'PUT', parseInt(newLvl));
        if (res.ok) showToast("Уровень изменен!");
}