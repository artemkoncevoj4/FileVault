
    // Главная функция для отправки запросов с Токеном
    async function apiRequest(url, method = 'GET', body = null) {
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

    async function login() {
        const login = document.getElementById('loginInput').value;
        const password = document.getElementById('passwordInput').value;

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('vault_user', JSON.stringify(data.user));
            
            showToast("Вход выполнен!");
            
            // 1. Переключаем экраны
            checkAuth(); 
            
            // 2. СРАЗУ грузим файлы (для всех)
            loadFiles(); 
            
            // 3. Если зашел админ (level 5+), принудительно грузим список юзеров
            if (data.user.accessLevel >= 5) {
                setTimeout(() => loadUsers(), 100); // Небольшая задержка, чтобы DOM успел обновиться
            }
        } else {
        const error = await res.text();
        showToast("Ошибка входа: " + error, 'error');
        }
    }

    function checkAuth() {
        const userData = localStorage.getItem('vault_user');
        
        if (userData) {
            const user = JSON.parse(userData);
            // Скрываем панель входа, показываем профиль и файлы
            document.getElementById('auth-panel').classList.add('hidden');
            document.getElementById('profile-panel').classList.remove('hidden');
            document.getElementById('files-panel').classList.remove('hidden');
            
            document.getElementById('welcomeText').innerText = `Привет, ${user.login}!`;
            document.getElementById('userLevel').innerText = user.accessLevel;

            // Если админ — показываем админку
            if (user.accessLevel >= 5) {
                document.getElementById('admin-panel').classList.remove('hidden');
                loadUsers();
            }

            // Если уровень 3+ — показываем секцию загрузки
            if (user.accessLevel >= 3) {
                document.getElementById('upload-section').classList.remove('hidden');
            }

            loadFiles(); // Загружаем список файлов
        } else {
            // Если данных нет — показываем только форму входа
            document.getElementById('auth-panel').classList.remove('hidden');
            document.getElementById('profile-panel').classList.add('hidden');
            document.getElementById('files-panel').classList.add('hidden');
            document.getElementById('admin-panel').classList.add('hidden');
        }
    }

    async function logout() {
        try {
            // 1. Пытаемся удалить куку на сервере
            await fetch('/api/auth/logout', { 
                method: 'POST',
                credentials: 'same-origin' 
            });
        } catch (e) {
            console.error("Ошибка при запросе на логаут:", e);
        }

        // 2. Очищаем данные пользователя из браузера
        localStorage.removeItem('vault_user');
        localStorage.removeItem('vault_token'); // На всякий случай, если остался старый

        // 3. Полностью перезагружаем страницу, чтобы сбросить состояние интерфейса
        window.location.reload();
    }

    async function register() {
        const login = document.getElementById('loginInput').value;
        const password = document.getElementById('passwordInput').value;

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        if (response.ok) {
            showToast("Регистрация успешна! Теперь войдите.");
        } else {
            const error = await response.text();
            showToast("Ошибка регистрации: " + error, 'error');
        }
    }
    async function deleteUser(userId) {
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
    function uploadFile() {
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
    // При загрузке страницы
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

    async function changeLevel(userId) {
        const newLvl = document.getElementById(`lvl-${userId}`).value;
        const res = await apiRequest(`/api/admin/users/${userId}/access`, 'PUT', parseInt(newLvl));
        if (res.ok) showToast("Уровень изменен!");
    }

        async function loadFiles() {
            const list = document.getElementById('file-list');
            const user = JSON.parse(localStorage.getItem('vault_user'));
            const lvl = user.accessLevel;
            const currentUserId = user.id;

            const res = await apiRequest('/api/files/list');
            if (res.ok) {
                const files = await res.json();
                list.innerHTML = files.map(fileName => {
                    const isLocked = fileName.startsWith('locked_');
                    
                    // Разбираем имя для показа
                    let cleanName = isLocked ? fileName.replace('locked_', '') : fileName;
                    const parts = cleanName.split('_');
                    const ownerId = parts[0];
                    const realDisplayName = parts.slice(1).join('_');
                    
                    const isOwner = ownerId == currentUserId;
                    const isAdmin = lvl === 5;

                    // Кодируем имя файла в Base64, чтобы спецсимволы не ломали onclick
                    const b64Name = btoa(unescape(encodeURIComponent(fileName)));

                    return `
                    <div class="file-item" style="${isLocked ? 'background: #fff3cd;' : ''}">
                        <div>
                            <span>${isLocked ? '🔒' : '📄'} <b>${realDisplayName}</b></span>
                            <br><small style="color: gray;">Владелец: #${ownerId} ${isOwner ? '(Вы)' : ''}</small>
                        </div>
                        <div>
                            ${lvl >= 2 ? `<button onclick="safeAction('download', '${b64Name}')" class="btn-success">Скачать</button>` : ''}
                            
                            ${lvl >= 4 ? 
                                (isLocked ? 
                                    `<button onclick="safeAction('unlock', '${b64Name}')" style="background: #007bff; margin-left: 5px;">Открыть</button>` : 
                                    `<button onclick="safeAction('lock', '${b64Name}')" style="background: #6c757d; margin-left: 5px;">Закрыть</button>`) 
                                : ''}

                            ${(lvl >= 3 && isOwner) || isAdmin ? 
                                `<button onclick="safeAction('rename', '${b64Name}')" style="background: #17a2b8; margin-left: 5px;">✏️</button>` : ''}
                            
                            ${(lvl >= 3 && isOwner) || isAdmin ? 
                                `<button onclick="safeAction('delete', '${b64Name}')" class="btn-danger" style="margin-left: 5px;">Удалить</button>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }
        }
        function safeAction(action, b64Name) {
            const fileName = decodeURIComponent(escape(atob(b64Name)));
            console.log(`Действие: ${action} для файла: ${fileName}`);

            if (action === 'download') downloadFile(fileName);
            if (action === 'lock') lockFile(fileName);
            if (action === 'unlock') unlockFile(fileName);
            if (action === 'delete') deleteFileOnServer(fileName);
            if (action === 'rename') renamePrompt(fileName); // Тот самый prompt
        }
        async function lockFile(fileName) {
            const res = await apiRequest(`/api/files/lock/${fileName}`, 'PUT');
            if (res.ok) {
                showToast("Файл закрыт для уровней ниже 4");
                loadFiles();
            } else {
                showToast("Ошибка при закрытии файла", 'error');
            }
        }
        async function unlockFile(fileName) {
            const res = await apiRequest(`/api/files/unlock/${fileName}`, 'PUT');
            if (res.ok) {
                showToast("Файл теперь доступен всем");
                loadFiles();
            } else {
                showToast("Ошибка при открытии файла", 'error');
            }
        }
        let currentFileToRename = "";

        // 1. Показываем наше красивое окно
        function renamePrompt(oldName) {
            currentFileToRename = oldName;
            document.getElementById('renameOldNameDisplay').innerText = oldName;
            document.getElementById('renameInput').value = ""; // Очищаем поле ввода
            document.getElementById('rename-modal').classList.remove('hidden'); // Показываем окно
        }

        // 2. Закрываем окно, если нажали "Отмена"
        function closeRenameModal() {
            document.getElementById('rename-modal').classList.add('hidden');
            currentFileToRename = "";
        }

        // 3. Отправляем запрос на сервер, когда нажали "Сохранить"
        async function confirmRename() {
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
                OldName: oldName, 
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
        async function downloadFile(fileName) {
        const token = localStorage.getItem('vault_token');
        
        // Для скачивания файлов через API с токеном нужно получить Blob
        const res = await fetch(`/api/files/download/${fileName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName; // Имя файла при сохранении
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            showToast("Ошибка при скачивании", 'error');
        }
    }

    async function deleteFileOnServer(fileName) {
        console.log("Попытка удаления файла:", fileName);
        
        // // ПРОВЕРКА: Если confirm по какой-то причине глючит, мы это увидим
        // if (!confirm(`Вы действительно хотите удалить файл ${fileName}?`)) {
        //     console.log("Удаление отменено пользователем");
        //     return;
        // }

        // ВАЖНО: убедись, что в FilesController путь именно такой!
        const res = await apiRequest(`/api/files/delete/${fileName}`, 'DELETE');
        
        if (res.ok) {
            showToast("Файл удален");
            await loadFiles(); 
        } else {
            const err = await res.text();
            showToast("Ошибка сервера при удалении: " + err, 'error');
        }
    }
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


    function showTerms() {
        const terms = `
    TERMS OF SERVICE (International Private Resource)

    1. GLOBAL SCOPE: This resource is a private educational project hosted globally. It does not fall under the jurisdiction of the Russian Federation.
    2. CONTENT POLICY: Users are strictly prohibited from uploading illegal content, malware, or any data that violates international copyright laws.
    3. NO WARRANTY: The service is provided "AS IS". The creator (artemkoncevoj4) is not responsible for any data loss or service interruptions.
    4. DATA PRIVACY: We do not collect personal identities. Your login is used only for access control.
    5. TERMINATION: The administrator reserves the right to terminate any account without prior notice for any reason.
        `;
        document.getElementById('legal-title').innerText = "Legal Information";
        document.getElementById('legal-content').innerText = terms;
        document.getElementById('legal-modal').classList.remove('hidden');
    }

    // Функцию register() оставляем как в твоем исходном файле, без инвайт-кода
    async function register() {
        const login = document.getElementById('loginInput').value;
        const password = document.getElementById('passwordInput').value;

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });

        if (response.ok) {
            showToast("Регистрация успешна! Теперь войдите.");
        } else {
            const error = await response.text();
            showToast("Ошибка регистрации: " + error, 'error');
        }
    }
    function showPrivacy() {
        const privacyText = `
    PRIVACY POLICY

    1. DATA COLLECTION: We collect only the minimum data required for authentication: your username and a salted hash of your password.
    2. NO PERSONAL INFO: This service does not request, store, or process real names, emails, or phone numbers.
    3. COOKIES & SESSIONS: We use local storage and secure cookies only to keep you logged in. No tracking scripts are used.
    4. THIRD PARTIES: No data is ever shared with third-party advertisers or analytics companies.
    5. DATA LOCATION: Your encrypted data is stored on a private server managed by artemkoncevoj4.
        `;
        document.getElementById('legal-title').innerText = "Privacy Policy";
        document.getElementById('legal-content').innerText = privacyText;
        document.getElementById('legal-modal').classList.remove('hidden');
    }