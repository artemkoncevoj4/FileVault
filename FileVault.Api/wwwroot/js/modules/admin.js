import { apiRequest } from "../core/api.js";
import { showToast } from "../core/ui.js";

export async function deleteUser(userId) {
    console.log("Attempting to delete user ID:", userId);
    // if (!confirm(`Delete user ${userId}?`)) return;

    const res = await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
    if (res.ok) {
        showToast("User deleted");
        loadAdminData();
    } else {
        showToast("Failed to delete user", 'error');
    }
}
    
export async function changeLevel(userId) {
    const newLvl = document.getElementById(`lvl-${userId}`).value;
    const res = await apiRequest(`/api/admin/users/${userId}/access`, 'PUT', parseInt(newLvl));
    if (res.ok) showToast("Access level updated!");
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
                    <button onclick="changeLevel(${u.id})" class="btn-success">OK</button>
                    <button onclick="deleteUser(${u.id})" class="btn-danger" style="padding: 5px 10px;">Delete</button>
                </td>
            </tr>
        `).join('');
    } else {
        showToast("Failed to load user list", 'error');
    }
}