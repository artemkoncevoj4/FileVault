import { apiRequest } from "../core/api.js";
import {showToast} from '../core/ui.js';
export function uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const xhr = new XMLHttpRequest();

        if (!fileInput.files[0]) return showToast("Выберите файл", "error");

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        xhr.withCredentials = true; 

        // Элементы прогресс-бара
        const container = document.getElementById('progress-container');
        const bar = document.getElementById('progress-bar');
        const text = document.getElementById('progress-text');

        container.classList.remove('hidden');
        text.classList.remove('hidden');

        // 1. Отслеживаем прогресс
        xhr.upload.onprogress = function(event) {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                bar.style.width = percent + '%';
                text.innerText = `Загрузка: ${percent}%`;
            }
        };

        // 2. Обработка завершения
        xhr.onload = async function() {
            container.classList.add('hidden');
            text.classList.add('hidden');
            bar.style.width = '0%';

            if (xhr.status >= 200 && xhr.status < 300) {
                showToast("Файл успешно загружен");
                fileInput.value = ''; // Сброс поля
                await loadFiles();
            } else {
                showToast("Ошибка загрузки: " + xhr.responseText, "error");
            }
        };

        // 3. Ошибка сети
        xhr.onerror = function() {
            showToast("Критическая ошибка сети", "error");
            container.classList.add('hidden');
        };

        xhr.open('POST', '/api/files/upload');
        xhr.send(formData);
}

window.onload = async () => {
        const userJson = localStorage.getItem('vault_user');
        if (!userJson) return;

        const user = JSON.parse(userJson);
        const lvl = user.accessLevel;

        // Показываем нужные блоки
        document.getElementById('auth-panel').classList.add('hidden');
        document.getElementById('profile-panel').classList.remove('hidden');
        document.getElementById('files-panel').classList.remove('hidden');
        
        document.getElementById('welcomeText').innerText = `Привет, ${user.login}!`;
        document.getElementById('userLevel').innerText = lvl;

        // РАЗГРАНИЧЕНИЕ ДОСТУПА В ИНТЕРФЕЙСЕ
        if (lvl >= 3) {
            document.getElementById('upload-section').classList.remove('hidden');
        }

        if (lvl === 5) {
            document.getElementById('admin-panel').classList.remove('hidden');
            loadAdminData();
        }
        
        loadFiles();
};

export async function downloadFile(fileId) {
        // Так как мы используем HttpOnly куки, нам не нужно вручную слать заголовок Authorization
        // Браузер сам прикрепит куку к запросу, если указано credentials: 'same-origin'
        
        const response = await fetch(`/api/files/download/${fileId}`, {
            credentials: 'same-origin'
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // Пытаемся достать имя файла из заголовков сервера
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = 'file';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^'";]+)['"]?/);
                if (match) fileName = decodeURIComponent(match[1]);
            }

            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            showToast("Ошибка при скачивании", 'error');
        }
}

export async function lockFile(fileId) {
            const res = await apiRequest(`/api/files/lock/${fileId}`, 'PUT');
            if (res.ok) {
                showToast("Файл закрыт для уровней ниже 4");
                loadFiles();
            } else {
                showToast("Ошибка при закрытии файла", 'error');
            }
}

export async function unlockFile(fileId) {
            const res = await apiRequest(`/api/files/unlock/${fileId}`, 'PUT');
            if (res.ok) {
                showToast("Файл теперь доступен всем");
                loadFiles();
            } else {
                showToast("Ошибка при открытии файла", 'error');
            }
}

export async function deleteFileOnServer(fileId) {
            if (!confirm("Удалить файл навсегда?")) return;

            const res = await apiRequest(`/api/files/delete/${fileId}`, 'DELETE');
            
            if (res.ok) {
                showToast("Файл удален");
                loadFiles(); 
            } else {
                const err = await res.text();
                showToast("Ошибка: " + err, 'error');
            }
}

let currentFileToRename = "";
export function renamePrompt(oldName) {
            currentFileToRename = oldName;
            document.getElementById('renameOldNameDisplay').innerText = oldName;
            document.getElementById('renameInput').value = ""; // Очищаем поле ввода
            document.getElementById('rename-modal').classList.remove('hidden'); // Показываем окно
}

export function closeRenameModal() {
            document.getElementById('rename-modal').classList.add('hidden');
            currentFileToRename = "";
}

export async function confirmRename() {
            const newNameRaw = document.getElementById('renameInput').value.trim();
            const oldName = currentFileToRename;

            if (!newNameRaw) {
                showToast("Имя не может быть пустым!", 'error');
                return;
            }

            // Авто-расширение файла (чтобы юзер его не потерял)
            const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
            let newName = newNameRaw.endsWith(ext) ? newNameRaw : newNameRaw + ext;

            // Прячем окно
            closeRenameModal();

            // Летим на сервер
            const res = await apiRequest('/api/files/rename', 'PUT', { 
                id: fileId, 
                NewName: newName 
            });

            if (res.ok) {
                showToast("Файл переименован!");
                loadFiles(); // Перерисовываем список
            } else {
                const err = await res.text();
                showToast("Ошибка сервера: " + err, 'error');
            }
}
document.addEventListener('DOMContentLoaded', () => {
checkAuth();
});

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
    
                        list.innerHTML = files.map(file => {
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