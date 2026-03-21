import { apiRequest } from "../core/api.js";
import { showToast } from "../core/ui.js";
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

export async function loadAdminData() {
    const res = await apiRequest('/api/admin/users');
    if (res.ok) {
        const users = await res.json();
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.login}</td>
                <td><input type="number" value="${u.accessLevel}" id="lvl-${u.id}" style="width:50px"></td>
                <td>
                    <button onclick="changeLevel(${u.id})" class="btn-success">ОК</button>
                    <button onclick="deleteUser(${u.id})" class="btn-danger" style="padding: 5px 10px;">Удалить</button>
                </td>
            </tr>
        `).join('');
    } else {
        showToast("Не удалось загрузить список пользователей", 'error');
    }
}