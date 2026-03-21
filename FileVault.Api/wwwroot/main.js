
    // Главная функция для отправки запросов с Токеном
document.getElementById('fileInput').addEventListener('change', function() {
    const display = document.getElementById('fileNameDisplay');
    if (this.files && this.files[0]) {
        display.innerText = "Выбран файл: " + this.files[0].name;
        display.style.color = "#28a745"; // Зеленый цвет при успехе
    } else {
        display.innerText = "Файл не выбран";
        display.style.color = "#666";
    }
});
    



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

        function safeAction(action, fileId, currentName = '') {
            console.log(`Действие: ${action} для файла ID: ${fileId}`);

            if (action === 'download') downloadFile(fileId);
            if (action === 'lock') lockFile(fileId);
            if (action === 'unlock') unlockFile(fileId);
            if (action === 'delete') deleteFileOnServer(fileId);
            if (action === 'rename') renamePrompt(fileId, currentName); 
        }

