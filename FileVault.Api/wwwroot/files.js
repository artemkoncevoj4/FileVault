import { apiRequest } from "./api";
import {showToast} from "./ui.js";
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

        export async function lockFile(fileName) {
            const res = await apiRequest(`/api/files/lock/${fileName}`, 'PUT');
            if (res.ok) {
                showToast("Файл закрыт для уровней ниже 4");
                loadFiles();
            } else {
                showToast("Ошибка при закрытии файла", 'error');
            }
        }
        export async function unlockFile(fileName) {
            const res = await apiRequest(`/api/files/unlock/${fileId}`, 'PUT');
            if (res.ok) {
                showToast("Файл теперь доступен всем");
                loadFiles();
            } else {
                showToast("Ошибка при открытии файла", 'error');
            }
        }
            // Функция удаления (исправленная)
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