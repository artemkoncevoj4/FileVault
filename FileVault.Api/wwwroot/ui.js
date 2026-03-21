function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        // Используем классы для стилей
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
    // Запускаем проверку при каждой загрузке страницы
  document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
    async function loadAdminData() {
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
        }
    }
        export async function loadFiles() {
                const list = document.getElementById('file-list');
                const user = JSON.parse(localStorage.getItem('vault_user'));
                const lvl = user.accessLevel;
                const currentUserId = user.id;
    
                const res = await apiRequest('/api/files/list');
                if (res.ok) {
                    const list = document.getElementById('file-list');
                    const user = JSON.parse(localStorage.getItem('vault-user'));
                    const lvl = user.accessLevel;
                    const currentUserId = user.id;
    
                    const res = await apiRequest('/api/files/list');
                    if (res.ok) {
                        const files = await res.json();
    
                        list.innerHTML = files.map(files => {
                            const isOwner = file.ownerId == currentUserId;
                            const isAdmin = lvl === 5;
    
                            return `
                            <div class="file-item" style="${file.isLocked ? 'background: #fff3cd;' : ''}">
                                <div>
                                    <span>${file.isLocked ? '🔒' : '📄'} <b>${file.virtualName}</b></span>
                                    <br><small style="color: gray;">Владелец: #${file.ownerId} ${isOwner ? '(Вы)' : ''}</small>
                                </div>
                                <div>
                                    ${lvl >= 2 ? `<button onclick="safeAction('download', ${file.id})" class="btn-success">Скачать</button>` : ''}
                                    
                                    ${lvl >= 4 ? 
                                        (file.isLocked ? 
                                            `<button onclick="safeAction('unlock', ${file.id})" style="background: #007bff; margin-left: 5px;">Открыть</button>` : 
                                            `<button onclick="safeAction('lock', ${file.id})" style="background: #6c757d; margin-left: 5px;">Закрыть</button>`) 
                                        : ''}
    
                                    ${(lvl >= 3 && isOwner) || isAdmin ? 
                                        `<button onclick="safeAction('rename', ${file.id}, '${file.virtualName}')" style="background: #17a2b8; margin-left: 5px;">✏️</button>` : ''}
                                    
                                    ${(lvl >= 3 && isOwner) || isAdmin ? 
                                        `<button onclick="safeAction('delete', ${file.id})" class="btn-danger" style="margin-left: 5px;">Удалить</button>` : ''}
                                </div>
                            </div>`;
                        }).join('');
                    }
                }
            }